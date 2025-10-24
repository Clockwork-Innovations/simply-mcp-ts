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
 * Perform dry-run for decorator API style
 */
async function dryRunDecorator(filePath: string, useHttp: boolean, port: number): Promise<DryRunResult> {
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
    // Import decorator dependencies
    const { default: reflectMetadata } = await import('reflect-metadata');
    const { dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');

    // Import runtime from compiled dist
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const distPath = resolve(__dirname, '..');

    const {
      getServerConfig,
      getTools,
      getPrompts,
      getResources,
      extractJSDoc,
    } = await import(pathToFileURL(resolve(distPath, 'decorators.js')).href);

    const { parseTypeScriptFileWithCache } = await import(
      pathToFileURL(resolve(distPath, 'type-parser.js')).href
    );

    // Load the class
    const absolutePath = resolve(process.cwd(), filePath);
    const module = await loadTypeScriptFile(absolutePath);

    const ServerClass =
      module.default ||
      Object.values(module).find((exp: any) => typeof exp === 'function' && exp.prototype);

    if (!ServerClass) {
      // Check if there's a decorated class that wasn't exported
      const { readFile } = await import('node:fs/promises');
      const source = await readFile(absolutePath, 'utf-8');
      const hasDecoratedClass = /@MCPServer(\s*\(\s*\))?/.test(source) && /class\s+\w+/.test(source);

      if (hasDecoratedClass) {
        errors.push('Found @MCPServer decorated class but it is not exported');
        errors.push('Fix: Add "export default" before your class declaration');
        errors.push('Why? Classes must be exported for the module system to make them available');
      } else {
        errors.push('No class found in module');
        errors.push('Make sure your file exports a class decorated with @MCPServer()');
      }
      return {
        success: false,
        detectedStyle: 'decorator',
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

    const config = getServerConfig(ServerClass);
    if (!config) {
      errors.push('Class must be decorated with @MCPServer');
      return {
        success: false,
        detectedStyle: 'decorator',
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

    // Extract server config
    serverConfig = {
      name: config.name || '',
      version: config.version || '',
      port: config.port,
    };

    // Validate server config
    validateServerConfig(serverConfig.name, serverConfig.version, errors, warnings);

    // Parse the source file to extract types
    const parsedClass = parseTypeScriptFileWithCache(filePath);
    const instance = new ServerClass();

    // Helper function to convert method name to kebab-case
    const toKebabCase = (str: string): string =>
      str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();

    // Helper function to get public methods
    const getPublicMethods = (instance: any): string[] => {
      const methods: string[] = [];
      const proto = Object.getPrototypeOf(instance);
      Object.getOwnPropertyNames(proto).forEach((name) => {
        if (name === 'constructor' || name.startsWith('_')) return;
        if (typeof proto[name] === 'function') {
          methods.push(name);
        }
      });
      return methods;
    };

    // Get explicitly decorated items
    const decoratedTools = new Set(getTools(ServerClass).map((t: any) => t.methodName));
    const decoratedPrompts = new Set(getPrompts(ServerClass).map((p: any) => p.methodName));
    const decoratedResources = new Set(getResources(ServerClass).map((r: any) => r.methodName));

    const publicMethods = getPublicMethods(instance);

    // Extract explicitly decorated tools
    const toolsMetadata = getTools(ServerClass);
    for (const tool of toolsMetadata) {
      const method = instance[tool.methodName];
      if (!method) {
        warnings.push(`Tool method '${tool.methodName}' not found on instance`);
        continue;
      }

      const jsdoc = tool.jsdoc || extractJSDoc(method);
      const toolName = toKebabCase(tool.methodName);

      tools.push({
        name: toolName,
        description: tool.description || jsdoc?.description || `Execute ${tool.methodName}`,
      });
    }

    // Auto-register public methods that aren't decorated
    for (const methodName of publicMethods) {
      if (
        decoratedTools.has(methodName) ||
        decoratedPrompts.has(methodName) ||
        decoratedResources.has(methodName)
      ) {
        continue;
      }

      const method = instance[methodName];
      if (!method) continue;

      const jsdoc = extractJSDoc(method);
      const toolName = toKebabCase(methodName);

      tools.push({
        name: toolName,
        description: jsdoc?.description || `Execute ${methodName}`,
      });
    }

    // Extract prompts
    const promptsMetadata = getPrompts(ServerClass);
    for (const promptMeta of promptsMetadata) {
      prompts.push({
        name: promptMeta.methodName,
        description: promptMeta.description || `Generate ${promptMeta.methodName} prompt`,
      });
    }

    // Extract resources
    const resourcesMetadata = getResources(ServerClass);
    for (const resourceMeta of resourcesMetadata) {
      resources.push({
        name: resourceMeta.name,
        description: resourceMeta.description || `Resource ${resourceMeta.name}`,
      });
    }

    // Validate tools
    validateToolNames(tools, errors, warnings);

    // Validate port if HTTP is used
    if (useHttp) {
      validatePort(port, errors);
    }

    return {
      success: errors.length === 0,
      detectedStyle: 'decorator',
      serverConfig,
      tools,
      prompts,
      resources,
      transport: useHttp ? 'http' : 'stdio',
      portConfig: port,
      warnings,
      errors,
    };
  } catch (error) {
    errors.push(`Failed to load decorator server: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      detectedStyle: 'decorator',
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
      pathToFileURL(resolve(distPath, 'api/interface/parser.js')).href
    );

    // Parse the interface file directly to get metadata
    const absolutePath = resolve(process.cwd(), filePath);
    const parsed = parseInterfaceFile(absolutePath);

    // Extract server config
    if (parsed.server) {
      serverConfig = {
        name: parsed.server.name || '',
        version: parsed.server.version || '',
        port: undefined,
      };
    }

    // Validate server config
    validateServerConfig(serverConfig.name, serverConfig.version, errors, warnings);

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
    if (useHttp) {
      validatePort(port, errors);
    }

    return {
      success: errors.length === 0,
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
 * Perform dry-run for programmatic API style
 */
async function dryRunProgrammatic(filePath: string, useHttp: boolean, port: number): Promise<DryRunResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  warnings.push('Programmatic servers cannot be validated in dry-run mode');
  warnings.push('Programmatic servers manage their own configuration and lifecycle');

  return {
    success: true,
    detectedStyle: 'programmatic',
    serverConfig: {
      name: 'programmatic-server',
      version: 'unknown',
    },
    tools: [],
    prompts: [],
    resources: [],
    transport: useHttp ? 'http' : 'stdio',
    portConfig: port,
    warnings,
    errors,
  };
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

  // Perform dry-run based on API style
  switch (style) {
    case 'interface':
      result = await dryRunInterface(filePath, useHttp, port);
      break;
    case 'programmatic':
      result = await dryRunProgrammatic(filePath, useHttp, port);
      break;
    default:
      result = {
        success: false,
        detectedStyle: style,
        serverConfig: { name: '', version: '' },
        tools: [],
        prompts: [],
        resources: [],
        transport: useHttp ? 'http' : 'stdio',
        portConfig: port,
        warnings: [],
        errors: [`Unknown API style: ${style}`],
      };
  }

  // Output results
  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    displayDryRunResult(result);
  }

  // Exit with appropriate code
  process.exit(result.errors.length > 0 ? 1 : 0);
}

// Legacy adapter functions for backward compatibility
export async function dryRunDecoratorAdapter(filePath: string, useHttp: boolean, port: number): Promise<void> {
  await runDryRun(filePath, 'decorator', useHttp, port, false);
}

export async function dryRunProgrammaticAdapter(filePath: string, useHttp: boolean, port: number): Promise<void> {
  await runDryRun(filePath, 'programmatic', useHttp, port, false);
}
