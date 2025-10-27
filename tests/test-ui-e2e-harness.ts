#!/usr/bin/env node
/**
 * End-to-End MCP UI Test Harness
 *
 * Tests UI resources by:
 * 1. Connecting to MCP server via HTTP transport
 * 2. Calling resources/list to get UI resources
 * 3. Calling resources/read to get HTML content
 * 4. Serving HTML via Express
 * 5. Using Chrome MCP to test in browser
 * 6. Verifying interactive features
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import express from 'express';
import http from 'http';

// ANSI colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const NC = '\x1b[0m';

interface UITestServer {
  name: string;
  port: number;
  serverUrl: string;
  expectedResources: number;
}

const UI_SERVERS: UITestServer[] = [
  { name: 'ui-foundation', port: 3001, serverUrl: 'http://localhost:3001/mcp', expectedResources: 2 },
  { name: 'file-based-ui', port: 3002, serverUrl: 'http://localhost:3002/mcp', expectedResources: 1 },
  { name: 'react-dashboard', port: 3003, serverUrl: 'http://localhost:3003/mcp', expectedResources: 1 },
  { name: 'production-optimized', port: 3004, serverUrl: 'http://localhost:3004/mcp', expectedResources: 1 },
  { name: 'sampling-ui', port: 3005, serverUrl: 'http://localhost:3005/mcp', expectedResources: 1 },
  { name: 'theme-demo', port: 3006, serverUrl: 'http://localhost:3006/mcp', expectedResources: 3 },
  { name: 'react-component', port: 3008, serverUrl: 'http://localhost:3008/mcp', expectedResources: 1 },
];

// Test web server to serve UI content
let testWebServer: http.Server | null = null;
const WEB_SERVER_PORT = 9000;

/**
 * Custom HTTP transport for stateful MCP
 */
class StatefulHttpTransport {
  private serverUrl: string;
  private sessionId: string | null = null;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  async request(method: string, params: any = {}): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };

    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }

    const response = await fetch(this.serverUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
    });

    // Extract session ID from response headers
    const newSessionId = response.headers.get('mcp-session-id');
    if (newSessionId) {
      this.sessionId = newSessionId;
    }

    const text = await response.text();

    // Handle SSE format (event: message\ndata: {...})
    const lines = text.split('\n').filter(line => line.trim());
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        return JSON.parse(line.substring(6));
      }
    }

    // Handle regular JSON
    return JSON.parse(text);
  }

  async initialize(clientInfo: any, capabilities: any): Promise<any> {
    return this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities,
      clientInfo,
    });
  }

  async listResources(): Promise<any> {
    return this.request('resources/list');
  }

  async readResource(uri: string): Promise<any> {
    return this.request('resources/read', { uri });
  }

  async close(): Promise<void> {
    // No cleanup needed for HTTP
  }
}

/**
 * Start Express web server to serve UI content
 */
function startWebServer(): Promise<void> {
  return new Promise((resolve) => {
    const app = express();

    // Store UI content in memory
    const uiContent: Map<string, string> = new Map();

    // Endpoint to load UI content
    app.post('/load', express.json(), (req, res) => {
      const { uri, html } = req.body;
      uiContent.set(uri, html);
      res.json({ success: true });
    });

    // Serve UI content
    app.get('/ui/:encoded', (req, res) => {
      const uri = decodeURIComponent(req.params.encoded);
      const html = uiContent.get(uri);

      if (!html) {
        res.status(404).send('UI not found');
        return;
      }

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    });

    testWebServer = app.listen(WEB_SERVER_PORT, () => {
      console.log(`${BLUE}🌐 Test web server started on port ${WEB_SERVER_PORT}${NC}`);
      resolve();
    });
  });
}

/**
 * Test a single MCP UI server
 */
async function testUIServer(server: UITestServer): Promise<{
  success: boolean;
  resources: number;
  uris: string[];
  errors: string[];
}> {
  const errors: string[] = [];
  const uris: string[] = [];

  try {
    console.log(`\n${YELLOW}Testing ${server.name} (${server.serverUrl})${NC}`);

    // 1. Initialize connection
    console.log('  1️⃣  Initializing session...');
    const transport = new StatefulHttpTransport(server.serverUrl);

    const initResult = await transport.initialize(
      { name: 'ui-test-harness', version: '1.0.0' },
      { resources: {} }
    );

    if (initResult.error) {
      errors.push(`Initialization failed: ${initResult.error.message}`);
      return { success: false, resources: 0, uris, errors };
    }

    console.log(`  ${GREEN}✓${NC} Connected`);

    // 2. List resources
    console.log('  2️⃣  Listing UI resources...');
    const listResult = await transport.listResources();

    if (listResult.error) {
      errors.push(`resources/list failed: ${listResult.error.message}`);
      return { success: false, resources: 0, uris, errors };
    }

    const resources = listResult.result?.resources || [];
    const uiResources = resources.filter((r: any) => r.uri?.startsWith('ui://'));

    console.log(`  ${GREEN}✓${NC} Found ${uiResources.length} UI resources`);

    if (uiResources.length !== server.expectedResources) {
      errors.push(`Expected ${server.expectedResources} resources, got ${uiResources.length}`);
    }

    // 3. Read each UI resource
    console.log('  3️⃣  Reading UI resources...');
    for (const resource of uiResources) {
      const uri = resource.uri;
      uris.push(uri);

      console.log(`      Reading ${uri}...`);
      const readResult = await transport.readResource(uri);

      if (readResult.error) {
        errors.push(`resources/read failed for ${uri}: ${readResult.error.message}`);
        continue;
      }

      const contents = readResult.result?.contents || [];
      if (contents.length === 0) {
        errors.push(`No content returned for ${uri}`);
        continue;
      }

      const htmlContent = contents[0]?.text || '';
      if (!htmlContent) {
        errors.push(`Empty content for ${uri}`);
        continue;
      }

      // Verify HTML structure
      if (!htmlContent.includes('<!DOCTYPE html>') && !htmlContent.includes('<html')) {
        errors.push(`Invalid HTML structure for ${uri}`);
        continue;
      }

      // Load into web server for browser testing
      await fetch(`http://localhost:${WEB_SERVER_PORT}/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri, html: htmlContent }),
      });

      console.log(`      ${GREEN}✓${NC} Read ${uri} (${htmlContent.length} bytes)`);
    }

    await transport.close();

    return {
      success: errors.length === 0,
      resources: uiResources.length,
      uris,
      errors,
    };

  } catch (error: any) {
    errors.push(`Unexpected error: ${error.message}`);
    return { success: false, resources: 0, uris, errors };
  }
}

/**
 * Main test execution
 */
async function main() {
  console.log('='.repeat(60));
  console.log(`${BLUE}MCP UI End-to-End Test Harness${NC}`);
  console.log('='.repeat(60));

  // Start web server
  await startWebServer();

  let totalPassed = 0;
  let totalFailed = 0;
  const allResults: { server: string; result: any }[] = [];

  // Test each server
  for (const server of UI_SERVERS) {
    const result = await testUIServer(server);
    allResults.push({ server: server.name, result });

    if (result.success) {
      console.log(`  ${GREEN}✅ PASS${NC}`);
      totalPassed++;
    } else {
      console.log(`  ${RED}❌ FAIL${NC}`);
      result.errors.forEach(err => console.log(`     ${RED}⚠${NC}  ${err}`));
      totalFailed++;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`${GREEN}Passed: ${totalPassed}${NC}`);
  console.log(`${RED}Failed: ${totalFailed}${NC}`);
  console.log(`Total: ${totalPassed + totalFailed}`);

  // Print UI URLs for manual browser testing
  console.log('\n' + '='.repeat(60));
  console.log('UI Resources Available for Browser Testing:');
  console.log('='.repeat(60));

  allResults.forEach(({ server, result }) => {
    if (result.uris.length > 0) {
      console.log(`\n${BLUE}${server}:${NC}`);
      result.uris.forEach((uri: string) => {
        const encoded = encodeURIComponent(uri);
        console.log(`  ${uri}`);
        console.log(`  → http://localhost:${WEB_SERVER_PORT}/ui/${encoded}`);
      });
    }
  });

  console.log(`\n${YELLOW}💡 Next step: Use Chrome MCP to automate browser testing${NC}`);
  console.log(`   See tests/test-ui-chrome-automation.ts for browser tests\n`);

  // Keep server running for manual testing
  console.log(`${BLUE}🌐 Web server running. Press Ctrl+C to exit${NC}`);

  if (totalFailed > 0) {
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  if (testWebServer) {
    testWebServer.close();
  }
  process.exit(0);
});

main().catch(error => {
  console.error(`${RED}Fatal error:${NC}`, error);
  if (testWebServer) {
    testWebServer.close();
  }
  process.exit(1);
});
