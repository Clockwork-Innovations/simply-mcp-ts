/**
 * Dry-run mode for validating server configuration without starting
 * Validates server files, detects API style, and extracts metadata
 */

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { APIStyle } from './run.js';

/**
 * Dynamically load TypeScript file
 * If tsx is loaded as Node loader, use direct import for decorator support
 * Otherwise use tsImport API
 */
async function loadTypeScriptFile(absolutePath: string): Promise<any> {
  // Check if tsx is loaded as Node loader (via --import tsx)
  const tsxLoaded = process.execArgv.some(arg => arg.includes('tsx') || arg.includes('--import tsx'));

  if (tsxLoaded) {
    // tsx is loaded as loader, use direct import for full decorator support
    const fileUrl = pathToFileURL(absolutePath).href;
    return await import(fileUrl);
  }

  // Fallback to tsImport API (for backwards compatibility)
  try {
    const { tsImport } = await import('tsx/esm/api');
    return await tsImport(absolutePath, import.meta.url);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot find module')) {
      console.error('Error: tsx package is required to load TypeScript files');
      console.error('');
      console.error('Solutions:');
      console.error('  1. Install tsx: npm install tsx');
      console.error('  2. Use bundled output: simplymcp bundle ' + absolutePath);
      console.error('  3. Compile to .js first: tsc ' + absolutePath);
      console.error('');
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Result of dry-run validation
 */
export interface DryRunResult {
  success: boolean;
  detectedStyle: APIStyle;
  serverConfig: {
    name: string;
    version: string;
    port?: number;
  };
  tools: Array<{ name: string; description?: string }>;
  prompts: Array<{ name: string; description?: string }>;
  resources: Array<{ name: string; description?: string }>;
  transport: 'stdio' | 'http';
  portConfig: number;
  warnings: string[];
  errors: string[];
}

/**
 * Validation functions
 */

/**
 * Validate server configuration
 */
function validateServerConfig(name: string, version: string, errors: string[], warnings: string[]): void {
  if (!name) {
    errors.push('Missing required field: name');
  }
  if (!version) {
    errors.push('Missing required field: version');
  }
  if (version && !/^\d+\.\d+\.\d+/.test(version)) {
    warnings.push(`Version "${version}" doesn't follow semver format (x.y.z)`);
  }
}

/**
 * Validate port number
 */
function validatePort(port: number, errors: string[]): void {
  if (port < 1 || port > 65535) {
    errors.push(`Invalid port: ${port} (must be 1-65535)`);
  }
}

/**
 * Validate tool names for duplicates and valid naming
 */
function validateToolNames(tools: Array<{ name: string; description?: string }>, errors: string[], warnings: string[]): void {
  const seen = new Set<string>();

  for (const tool of tools) {
    if (!tool.name) {
      errors.push('Tool found with missing name');
      continue;
    }

    if (seen.has(tool.name)) {
      errors.push(`Duplicate tool name: ${tool.name}`);
    }
    seen.add(tool.name);

    if (!tool.description) {
      warnings.push(`Tool '${tool.name}' has no description`);
    }

    // Check for valid naming convention (lowercase, hyphens)
    if (!/^[a-z][a-z0-9-]*$/.test(tool.name)) {
      warnings.push(`Tool '${tool.name}' doesn't follow kebab-case naming convention`);
    }
  }

  // Warn if too many tools
  if (tools.length > 50) {
    warnings.push(`Large number of tools (${tools.length}). Consider splitting into multiple servers.`);
  }
}

/**
 * Perform dry-run for interface API style
 */
async function dryRunInterface(filePath: string, useHttp: boolean, port: number): Promise<DryRunResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const tools: Array<{ name: string; description?: string }> = [];
  const prompts: Array<{ name: string; description?: string }> = [];
  const resources: Array<{ name: string; description?: string }> = [];

  let serverConfig = {
    name: '',
    version: '',
    port: undefined as number | undefined,
  };

  try {
    // Import the interface parser and adapter
    const { dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const distPath = resolve(__dirname, '..');

    const { parseInterfaceFile } = await import(
      pathToFileURL(resolve(distPath, 'parser.js')).href
    );

    // Parse the interface file directly to get metadata
    const absolutePath = resolve(process.cwd(), filePath);
    const parsed = parseInterfaceFile(absolutePath);

    // Extract server config (including transport/port/stateful from IServer)
    let fileTransport: 'stdio' | 'http' | undefined;
    let filePort: number | undefined;

    if (parsed.server) {
      serverConfig = {
        name: parsed.server.name || '',
        version: parsed.server.version || '',
        port: parsed.server.port,
      };
      fileTransport = parsed.server.transport;
      filePort = parsed.server.port;
    }

    // Validate server config
    validateServerConfig(serverConfig.name, serverConfig.version, errors, warnings);

    // Determine final transport (CLI flag overrides file config)
    const finalTransport = useHttp ? 'http' : (fileTransport || 'stdio');
    // Port priority: CLI --port > file port > default 3000
    const finalPort = port !== 3000 ? port : (filePort || 3000);

    // If file specifies HTTP transport, note it in warnings (informational)
    if (fileTransport === 'http' && !useHttp) {
      warnings.push(`Server configured for HTTP transport (port ${filePort || 3000}) in IServer interface. Will use HTTP unless --stdio flag is provided.`);
    }

    // Extract tool metadata with actual names and descriptions
    for (const tool of parsed.tools) {
      tools.push({
        name: tool.name,
        description: tool.description || undefined,
      });

      // Warn if tool has no description
      if (!tool.description) {
        warnings.push(`Tool '${tool.name}' has no description. Add a description field to improve documentation.`);
      }
    }

    // Extract prompt metadata with actual names and descriptions
    for (const prompt of parsed.prompts) {
      prompts.push({
        name: prompt.name,
        description: prompt.description || undefined,
      });

      // Warn if prompt has no description
      if (!prompt.description) {
        warnings.push(`Prompt '${prompt.name}' has no description. Add a description field to improve documentation.`);
      }

      // Note dynamic prompts require implementation
      if (prompt.dynamic && !prompt.template) {
        warnings.push(`Prompt '${prompt.name}' is dynamic and requires implementation as method '${prompt.methodName}'`);
      }
    }

    // Load the server instance to check for resource implementations
    let serverInstance: any = null;
    try {
      const module = await loadTypeScriptFile(absolutePath);
      const ServerClass =
        module.default ||
        (parsed.className ? module[parsed.className] : null);

      if (ServerClass) {
        serverInstance = new ServerClass();
      }
    } catch (error) {
      // If we can't load the instance, we'll skip implementation checks
      // This is a non-fatal error for dry-run validation
    }

    // Extract resource metadata with actual URIs and descriptions
    for (const resource of parsed.resources) {
      resources.push({
        name: resource.uri,
        description: resource.description || resource.name || undefined,
      });

      // Warn if resource has no description
      if (!resource.description) {
        warnings.push(`Resource '${resource.uri}' has no description. Add a description field to improve documentation.`);
      }

      // Check if dynamic resources have implementation
      // Only warn if the resource is dynamic AND no implementation exists
      if (resource.dynamic) {
        // Check if implementation exists on server instance
        const hasImplementation = serverInstance &&
                                   serverInstance[resource.methodName] !== undefined &&
                                   typeof serverInstance[resource.methodName] === 'function';

        if (!hasImplementation) {
          warnings.push(`Resource '${resource.uri}' is dynamic and requires implementation as property '${resource.methodName}'`);
        }
      }
    }

    // Validate port if HTTP is used
    if (finalTransport === 'http') {
      validatePort(finalPort, errors);
    }

    return {
      success: errors.length === 0,
      detectedStyle: 'interface',
      serverConfig,
      tools,
      prompts,
      resources,
      transport: finalTransport,
      portConfig: finalPort,
      warnings,
      errors,
    };
  } catch (error) {
    errors.push(`Failed to load interface server: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      detectedStyle: 'interface',
      serverConfig,
      tools,
      prompts,
      resources,
      transport: useHttp ? 'http' : 'stdio',
      portConfig: port,
      warnings,
      errors,
    };
  }
}

/**
 * Display dry-run result in human-readable format
 */
function displayDryRunResult(result: DryRunResult): void {
  console.log('');

  if (result.success) {
    console.log('✓ Dry run complete\n');
  } else {
    console.log('✗ Dry run failed\n');
  }

  // Server Configuration
  console.log('Server Configuration:');
  console.log(`  Name: ${result.serverConfig.name || '(missing)'}`);
  console.log(`  Version: ${result.serverConfig.version || '(missing)'}`);
  console.log(`  API Style: ${result.detectedStyle}`);
  console.log('');

  // Transport
  console.log('Transport:');
  console.log(`  Type: ${result.transport}`);
  if (result.transport === 'http') {
    console.log(`  Port: ${result.portConfig}`);
  } else {
    console.log('  Port: N/A (stdio mode)');
  }
  console.log('');

  // Capabilities
  console.log('Capabilities:');
  console.log(`  Tools: ${result.tools.length}`);

  if (result.tools.length > 0) {
    for (const tool of result.tools.slice(0, 10)) {
      console.log(`    - ${tool.name}: ${tool.description || '(no description)'}`);
    }
    if (result.tools.length > 10) {
      console.log(`    ... and ${result.tools.length - 10} more`);
    }
  }

  console.log(`  Prompts: ${result.prompts.length}`);
  if (result.prompts.length > 0) {
    for (const prompt of result.prompts.slice(0, 5)) {
      console.log(`    - ${prompt.name}: ${prompt.description || '(no description)'}`);
    }
    if (result.prompts.length > 5) {
      console.log(`    ... and ${result.prompts.length - 5} more`);
    }
  }

  console.log(`  Resources: ${result.resources.length}`);
  if (result.resources.length > 0) {
    for (const resource of result.resources.slice(0, 5)) {
      console.log(`    - ${resource.name}: ${resource.description || '(no description)'}`);
    }
    if (result.resources.length > 5) {
      console.log(`    ... and ${result.resources.length - 5} more`);
    }
  }
  console.log('');

  // Warnings
  if (result.warnings.length > 0) {
    console.log('Warnings:');
    for (const warning of result.warnings) {
      console.log(`  - ${warning}`);
    }
    console.log('');
  }

  // Errors
  if (result.errors.length > 0) {
    console.log('Errors:');
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
    console.log('');
  }

  // Status
  if (result.success) {
    console.log('Status: ✓ Ready to run');
  } else {
    console.log('Status: ✗ Cannot run (fix errors above)');
  }
  console.log('');
}

/**
 * Main entry point for dry-run mode
 */
export async function runDryRun(
  filePath: string,
  style: APIStyle,
  useHttp: boolean,
  port: number,
  jsonOutput: boolean = false
): Promise<void> {
  let result: DryRunResult;

  // Perform dry-run for interface API
  result = await dryRunInterface(filePath, useHttp, port);

  // Output results
  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    displayDryRunResult(result);
  }

  // Exit with appropriate code
  process.exit(result.errors.length > 0 ? 1 : 0);
}

