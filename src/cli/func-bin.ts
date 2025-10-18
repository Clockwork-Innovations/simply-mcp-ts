#!/usr/bin/env node
/**
 * Binary entry point for simplymcp-func command
 * Runs functional (defineMCP) MCP servers
 */

import { resolve } from 'node:path';
import { BuildMCPServer } from '../api/programmatic/BuildMCPServer.js';
import type { SingleFileMCPConfig } from '../single-file-types.js';
import { schemaToZod } from '../schema-builder.js';
import { parseCommonArgs, startServer, displayServerInfo } from './adapter-utils.js';

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
    const { pathToFileURL } = await import('node:url');
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
 * Load and validate the config file
 */
async function loadConfig(configPath: string): Promise<SingleFileMCPConfig> {
  try {
    // Resolve the config path to an absolute path
    const absolutePath = resolve(process.cwd(), configPath);

    // Dynamic import of the config file using tsx for TypeScript support
    const module = await loadTypeScriptFile(absolutePath);

    // Get the default export
    const config = module.default;

    if (!config) {
      throw new Error('Config file must have a default export');
    }

    // Validate config structure
    if (!config.name || !config.version) {
      throw new Error('Config must have "name" and "version" properties');
    }

    return config as SingleFileMCPConfig;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error loading config file: ${error.message}`);
    } else {
      console.error('Error loading config file:', error);
    }
    process.exit(1);
  }
}

/**
 * Convert string to kebab-case
 * @param str - String to convert
 * @returns Kebab-cased string
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Calculate Levenshtein distance between two strings
 * @param a - First string
 * @param b - Second string
 * @returns Number of edits needed to transform a into b
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find similar tool names for typo suggestions
 * Uses Levenshtein distance and substring matching for suggestions
 * @param missing - The missing tool name
 * @param availableTools - List of available tool names
 * @returns Array of suggested tool names (max 3)
 */
function findSimilarNames(missing: string, availableTools: string[]): string[] {
  const missingKebab = toKebabCase(missing);
  const suggestions: Array<{ name: string; score: number }> = [];

  for (const available of availableTools) {
    const availableKebab = toKebabCase(available);

    // Calculate similarity score (lower is better)
    const distance = levenshteinDistance(missingKebab, availableKebab);

    // Also check for substring matches (good for partial names)
    const isSubstring = availableKebab.includes(missingKebab) || missingKebab.includes(availableKebab);

    // Accept if:
    // 1. Levenshtein distance <= 3 (allowing for typos)
    // 2. Or it's a substring match
    if (distance <= 3 || isSubstring) {
      suggestions.push({ name: available, score: isSubstring ? distance - 0.5 : distance });
    }
  }

  // Sort by score (lower is better) and return top 3
  return suggestions
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map(s => s.name);
}

/**
 * Create BuildMCPServer server from config
 */
function createServerFromConfig(config: SingleFileMCPConfig): BuildMCPServer {
  // Create BuildMCPServer instance
  const server = new BuildMCPServer({
    name: config.name,
    version: config.version,
    basePath: config.basePath,
    defaultTimeout: config.defaultTimeout,
    transport: config.port ? { port: config.port } : undefined,
  });

  // Register tools
  if (config.tools && config.tools.length > 0) {
    for (const tool of config.tools) {
      // Convert schema to Zod if it's not already a Zod schema
      // Check if it's a Zod schema by looking for _def property
      const isZodSchema =
        tool.parameters && typeof tool.parameters === 'object' && '_def' in tool.parameters;
      const parameters: any = isZodSchema ? tool.parameters : schemaToZod(tool.parameters as any);

      server.addTool({
        name: tool.name,
        description: tool.description,
        parameters,
        execute: tool.execute,
      });
    }
  }

  // Register prompts
  if (config.prompts && config.prompts.length > 0) {
    for (const prompt of config.prompts) {
      server.addPrompt({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments,
        template: prompt.template,
      });
    }
  }

  // Register resources
  if (config.resources && config.resources.length > 0) {
    for (const resource of config.resources) {
      server.addResource({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
        content: resource.content,
      });
    }
  }

  // Register routers (Feature Layer: Validation + Advanced Features)
  // Routers group related tools together for better organization and discoverability.
  // Each router becomes a special tool that clients can call to discover available tools.
  if (config.routers && config.routers.length > 0) {
    // Build set of all registered tool names (converted to kebab-case)
    const registeredToolNames = new Set<string>();
    const toolNameMap = new Map<string, string>(); // kebab-case -> original name

    if (config.tools && config.tools.length > 0) {
      for (const tool of config.tools) {
        const kebabName = toKebabCase(tool.name);
        registeredToolNames.add(kebabName);
        toolNameMap.set(kebabName, tool.name);
      }
    }

    // Validate router name uniqueness
    const seenRouterNames = new Set<string>();

    for (const router of config.routers) {
      // Validate router name is unique
      if (seenRouterNames.has(router.name)) {
        const existingRouters = Array.from(seenRouterNames).join(', ');
        throw new Error(
          `Duplicate router name '${router.name}' in configuration\n\n` +
          `What went wrong:\n` +
          `  Router '${router.name}' is already defined in this configuration.\n\n` +
          `Existing routers: ${existingRouters}\n\n` +
          `To fix:\n` +
          `  1. Choose a unique name for each router\n` +
          `  2. Remove the duplicate router definition\n` +
          `  3. Use descriptive names like 'weather-tools', 'math-operations', etc.\n`
        );
      }
      seenRouterNames.add(router.name);

      // Validate router has tools array
      if (!router.tools || !Array.isArray(router.tools)) {
        throw new Error(
          `Router '${router.name}' is missing tools array\n\n` +
          `What went wrong:\n` +
          `  Router configuration must include a 'tools' array.\n\n` +
          `To fix:\n` +
          `  Add a 'tools' array to the router configuration:\n` +
          `  { name: '${router.name}', description: '...', tools: ['tool-1', 'tool-2'] }\n`
        );
      }

      // Validate router tools array is non-empty
      if (router.tools.length === 0) {
        throw new Error(
          `Router '${router.name}' has an empty tools array\n\n` +
          `What went wrong:\n` +
          `  Router must have at least one tool assigned.\n\n` +
          `To fix:\n` +
          `  Add tool names to the 'tools' array:\n` +
          `  { name: '${router.name}', description: '...', tools: ['tool-1', 'tool-2'] }\n`
        );
      }

      // Validate each tool in router.tools exists
      const missingTools: string[] = [];
      const availableToolNames = Array.from(registeredToolNames);

      for (const toolName of router.tools) {
        const toolKebab = toKebabCase(toolName);
        if (!registeredToolNames.has(toolKebab)) {
          missingTools.push(toolName);
        }
      }

      if (missingTools.length > 0) {
        // Generate suggestions for missing tools
        let errorMessage = `Router '${router.name}' references tools that don't exist\n\n`;
        errorMessage += `What went wrong:\n`;
        errorMessage += `  The following tools do not exist in the configuration:\n\n`;

        for (const missing of missingTools) {
          errorMessage += `  - '${missing}'\n`;

          // Find similar names for suggestions
          const originalNames = Array.from(toolNameMap.values());
          const suggestions = findSimilarNames(missing, originalNames);

          if (suggestions.length > 0) {
            errorMessage += `    Did you mean: ${suggestions.map(s => `'${s}'`).join(', ')}?\n`;
          }
        }

        errorMessage += `\nAvailable tools in configuration:\n`;
        if (availableToolNames.length === 0) {
          errorMessage += `  (none - add tools before defining routers)\n`;
        } else {
          const originalNames = Array.from(toolNameMap.values()).sort();
          for (const toolName of originalNames) {
            errorMessage += `  - ${toolName}\n`;
          }
        }

        errorMessage += `\nTo fix:\n`;
        errorMessage += `  1. Check the spelling of tool names in the router configuration\n`;
        errorMessage += `  2. Ensure tools are defined before routers in the config file\n`;
        errorMessage += `  3. Tool names are case-insensitive and underscore-tolerant (get_weather = get-weather)\n`;

        throw new Error(errorMessage);
      }

      // Add router tool (creates the router in the system)
      server.addRouterTool({
        name: router.name,
        description: router.description,
        metadata: router.metadata,
      });

      // Assign tools to the router
      // Convert router tool names to actual registered tool names (for kebab-case matching)
      const actualToolNames = router.tools.map(toolName => {
        const kebab = toKebabCase(toolName);
        return toolNameMap.get(kebab) || toolName;
      });

      server.assignTools(router.name, actualToolNames);
    }
  }

  return server;
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Functional MCP Adapter

Usage:
  simplymcp-func <config-file.ts> [options]

Options:
  --http              Use HTTP transport instead of stdio
  --port <number>     Port for HTTP server (default: 3000)
  --help, -h          Show this help message

Example:
  simplymcp-func server.ts
  simplymcp-func server.ts --http --port 3000

Config File Format:
  See examples/single-file-basic.ts for an example.
`);
    process.exit(0);
  }

  const configPath = args[0];
  if (!configPath) {
    console.error('Error: Config file path is required');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  // Check if we need TypeScript support and tsx is not already loaded
  const needsTypeScript = configPath.endsWith('.ts');
  const tsxLoaded = process.execArgv.some(arg => arg.includes('tsx') || arg.includes('--import tsx'));

  if (needsTypeScript && !tsxLoaded) {
    // Re-exec with tsx loader for proper module loading
    const { spawn } = await import('node:child_process');
    const { fileURLToPath } = await import('node:url');
    const nodeArgs = ['--import', 'tsx'];
    const scriptPath = fileURLToPath(import.meta.url);
    const scriptArgs = [scriptPath, ...args];

    const child = spawn('node', [...nodeArgs, ...scriptArgs], {
      stdio: 'inherit',
      env: process.env,
    });

    return new Promise((resolve) => {
      child.on('exit', (code) => {
        process.exit(code || 0);
      });
      child.on('error', (error) => {
        console.error('[FuncAdapter] Failed to start with tsx:', error);
        process.exit(1);
      });
    });
  }

  const { useHttp, port } = parseCommonArgs(args);

  console.error('[FuncAdapter] Loading config from:', configPath);
  const config = await loadConfig(configPath);

  console.error(`[FuncAdapter] Creating server: ${config.name} v${config.version}`);
  const server = createServerFromConfig(config);

  displayServerInfo(server);
  await startServer(server, { useHttp, port });
}

main().catch((error) => {
  console.error('[FuncAdapter] Fatal error:', error);
  process.exit(1);
});
