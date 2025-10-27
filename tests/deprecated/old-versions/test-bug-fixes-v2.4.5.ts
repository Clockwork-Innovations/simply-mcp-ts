/**
 * Test Suite for v2.4.5 Bug Fixes
 * Tests all fixes applied in version 2.4.5
 */

import { BuildMCPServer } from '../dist/src/index.js';
import { z } from 'zod';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(name: string, fn: () => boolean | Promise<boolean>) {
  return async () => {
    totalTests++;
    process.stdout.write(`  Testing: ${name}... `);
    try {
      const result = await fn();
      if (result) {
        console.log('✅ PASS');
        passedTests++;
        return true;
      } else {
        console.log('❌ FAIL - assertion failed');
        failedTests++;
        return false;
      }
    } catch (error: any) {
      console.log(`❌ FAIL - ${error.message}`);
      failedTests++;
      return false;
    }
  };
}

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('SIMPLY-MCP v2.4.5 BUG FIXES TEST SUITE');
  console.log('='.repeat(70) + '\n');

  // BUG-002: TypeScript Type Exports
  console.log('📦 BUG-002: TypeScript Type Exports\n');

  await test('Can import ToolDefinition type', () => {
    // This compiles = types are exported
    type TD = import('../dist/src/index.js').ToolDefinition;
    return true;
  })();

  await test('Can import PromptDefinition type', () => {
    type PD = import('../dist/src/index.js').PromptDefinition;
    return true;
  })();

  await test('Can import ResourceDefinition type', () => {
    type RD = import('../dist/src/index.js').ResourceDefinition;
    return true;
  })();

  await test('Can import BuildMCPServerOptions type', () => {
    type SO = import('../dist/src/index.js').BuildMCPServerOptions;
    return true;
  })();

  await test('Can import ExecuteFunction type', () => {
    type EF = import('../dist/src/index.js').ExecuteFunction;
    return true;
  })();

  // BUG-004: Name/Version Getters
  console.log('\n🏷️  BUG-004: Server Property Getters\n');

  await test('BuildMCPServer.name getter exists and works', () => {
    const server = new BuildMCPServer({ name: 'test-name', version: '1.0.0' });
    return server.name === 'test-name';
  })();

  await test('BuildMCPServer.version getter exists and works', () => {
    const server = new BuildMCPServer({ name: 'test', version: '2.3.4' });
    return server.version === '2.3.4';
  })();

  await test('BuildMCPServer.description getter exists and works', () => {
    const server = new BuildMCPServer({
      name: 'test',
      version: '1.0.0',
      description: 'Test description',
    });
    return server.description === 'Test description';
  })();

  await test('BuildMCPServer.description returns undefined when not set', () => {
    const server = new BuildMCPServer({ name: 'test', version: '1.0.0' });
    return server.description === undefined;
  })();

  // BUG-006: Health Check Endpoints
  console.log('\n🏥 BUG-006: Health Check Endpoints\n');

  await test('HTTP server has /health endpoint', async () => {
    const server = new BuildMCPServer({
      name: 'health-test',
      version: '1.0.0',
      description: 'Health test server',
    });

    server.addTool({
      name: 'ping',
      description: 'Ping',
      parameters: z.object({}),
      execute: async () => ({ content: [{ type: 'text' as const, text: 'pong' }] }),
    });

    await server.start({ transport: 'http', port: 5001, stateful: false });
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const response = await fetch('http://localhost:5001/health', { signal: AbortSignal.timeout(5000) });
      const data = await response.json();
      const valid =
        data.status === 'ok' &&
        data.server.name === 'health-test' &&
        data.server.version === '1.0.0' &&
        data.server.description === 'Health test server' &&
        data.transport.type === 'http' &&
        data.transport.mode === 'stateless' &&
        data.resources.tools === 1 &&
        typeof data.uptime === 'number' &&
        typeof data.timestamp === 'string';

      await server.stop();
      return valid;
    } catch (error) {
      await server.stop();
      throw error;
    }
  })();

  await test('HTTP server has / root endpoint', async () => {
    const server = new BuildMCPServer({
      name: 'root-test',
      version: '1.0.0',
    });

    server.addTool({
      name: 'test',
      description: 'Test',
      parameters: z.object({}),
      execute: async () => ({ content: [{ type: 'text' as const, text: 'test' }] }),
    });

    await server.start({ transport: 'http', port: 5002, stateful: true });
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const response = await fetch('http://localhost:5002/', { signal: AbortSignal.timeout(5000) });
      const data = await response.json();
      const valid =
        data.message.includes('root-test') &&
        data.endpoints.health === '/health' &&
        data.endpoints.mcp === '/mcp' &&
        data.transport.type === 'http' &&
        data.transport.mode === 'stateful';

      await server.stop();
      return valid;
    } catch (error) {
      await server.stop();
      throw error;
    }
  })();

  await test('/health shows correct resource counts', async () => {
    const server = new BuildMCPServer({
      name: 'count-test',
      version: '1.0.0',
    });

    server.addTool({
      name: 'tool1',
      description: 'Tool 1',
      parameters: z.object({}),
      execute: async () => ({ content: [] }),
    });

    server.addTool({
      name: 'tool2',
      description: 'Tool 2',
      parameters: z.object({}),
      execute: async () => ({ content: [] }),
    });

    await server.start({ transport: 'http', port: 5003, stateful: false });
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const response = await fetch('http://localhost:5003/health');
      const data = await response.json();
      const valid = data.resources.tools === 2;

      await server.stop();
      return valid;
    } catch (error) {
      await server.stop();
      throw error;
    }
  })();

  // HTTP Transport SSE Verification
  console.log('\n🌐 HTTP Transport (SSE) - MCP Spec Compliance\n');

  await test('Stateful HTTP works with correct SSE headers', async () => {
    const server = new BuildMCPServer({
      name: 'sse-stateful',
      version: '1.0.0',
    });

    server.addTool({
      name: 'echo',
      description: 'Echo',
      parameters: z.object({ text: z.string() }),
      execute: async (args) => ({ content: [{ type: 'text' as const, text: args.text }] }),
    });

    await server.start({ transport: 'http', port: 5004, stateful: true });
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const response = await fetch(
        'http://localhost:5004/mcp',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: { name: 'test', version: '1.0.0' },
            },
          }),
          signal: AbortSignal.timeout(5000),
        }
      );

      const text = await response.text();
      const valid = response.status === 200 && text.includes('event: message');

      await server.stop();
      return valid;
    } catch (error) {
      await server.stop();
      throw error;
    }
  })();

  await test('Stateless HTTP works with correct SSE headers', async () => {
    const server = new BuildMCPServer({
      name: 'sse-stateless',
      version: '1.0.0',
    });

    server.addTool({
      name: 'test',
      description: 'Test',
      parameters: z.object({}),
      execute: async () => ({ content: [{ type: 'text' as const, text: 'ok' }] }),
    });

    await server.start({ transport: 'http', port: 5005, stateful: false });
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const response = await fetch(
        'http://localhost:5005/mcp',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/list',
            params: {},
          }),
          signal: AbortSignal.timeout(5000),
        }
      );

      const valid = response.status === 200;

      await server.stop();
      return valid;
    } catch (error) {
      await server.stop();
      throw error;
    }
  })();

  await test('HTTP returns 406 without SSE header (correct per spec)', async () => {
    const server = new BuildMCPServer({
      name: 'no-sse',
      version: '1.0.0',
    });

    server.addTool({
      name: 'test',
      description: 'Test',
      parameters: z.object({}),
      execute: async () => ({ content: [{ type: 'text' as const, text: 'ok' }] }),
    });

    await server.start({ transport: 'http', port: 5006, stateful: false });
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const response = await fetch(
        'http://localhost:5006/mcp',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json', // Missing text/event-stream
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/list',
            params: {},
          }),
          signal: AbortSignal.timeout(5000),
        }
      );

      const valid = response.status === 406; // Not Acceptable (expected)

      await server.stop();
      return valid;
    } catch (error) {
      await server.stop();
      throw error;
    }
  })();

  // Streaming HTTP Endpoint Verification
  console.log('\n🔄 Streaming HTTP - Endpoint Structure\n');

  await test('Stateful mode supports POST on /mcp', async () => {
    const server = new BuildMCPServer({ name: 'test', version: '1.0.0' });
    server.addTool({
      name: 'test',
      description: 'Test',
      parameters: z.object({}),
      execute: async () => ({ content: [] }),
    });

    await server.start({ transport: 'http', port: 5007, stateful: true });
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const response = await fetch(
        'http://localhost:5007/mcp',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: { name: 'test', version: '1.0.0' },
            },
          }),
        }
      );

      await server.stop();
      return response.status === 200;
    } catch (error) {
      await server.stop();
      throw error;
    }
  })();

  await test('Stateless mode POST returns JSON responses', async () => {
    const server = new BuildMCPServer({ name: 'test', version: '1.0.0' });
    server.addTool({
      name: 'test',
      description: 'Test',
      parameters: z.object({}),
      execute: async () => ({ content: [] }),
    });

    await server.start({ transport: 'http', port: 5008, stateful: false });
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const response = await fetch(
        'http://localhost:5008/mcp',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/list',
            params: {},
          }),
        }
      );

      // Stateless mode always uses JSON responses (SSE requires persistent connections)
      const contentType = response.headers.get('content-type');
      const data = await response.json();
      const hasJsonResponse = data && typeof data === 'object';
      await server.stop();
      return contentType?.includes('application/json') && hasJsonResponse;
    } catch (error) {
      await server.stop();
      throw error;
    }
  })();

  // Print Results
  console.log('\n' + '='.repeat(70));
  console.log('TEST RESULTS');
  console.log('='.repeat(70));
  console.log(`Total Tests:  ${totalTests}`);
  console.log(`✅ Passed:    ${passedTests}`);
  console.log(`❌ Failed:    ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log('='.repeat(70));

  if (failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED! v2.4.5 bug fixes verified.\n');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${failedTests} test(s) failed. Please review.\n`);
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('\n💥 Test runner error:', error);
  process.exit(1);
});
