#!/usr/bin/env node
/**
 * Binary entry point for simplymcp-class command
 * Runs class-based (decorator) MCP servers
 */

import 'reflect-metadata';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
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
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Class-Based MCP Adapter

Usage:
  simplymcp-class <class-file.ts> [options]

Options:
  --http              Use HTTP transport instead of stdio
  --port <number>     Port for HTTP server (default: 3000)
  --help, -h          Show this help message

Example:
  simplymcp-class server.ts
  simplymcp-class server.ts --http --port 3000
`);
    process.exit(0);
  }

  const classFile = args[0];
  if (!classFile) {
    console.error('Error: Class file path is required');
    process.exit(1);
  }

  // Check if we need TypeScript support and tsx is not already loaded
  const needsTypeScript = classFile.endsWith('.ts');
  const tsxLoaded = process.execArgv.some(arg => arg.includes('tsx') || arg.includes('--import tsx'));

  if (needsTypeScript && !tsxLoaded) {
    // Re-exec with tsx loader for proper decorator support
    const { spawn } = await import('node:child_process');
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
        console.error('[ClassAdapter] Failed to start with tsx:', error);
        process.exit(1);
      });
    });
  }

  const { useHttp, port } = parseCommonArgs(args);

  // Import runtime from compiled dist
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const distPath = resolve(__dirname, '..');

  const { BuildMCPServer } = await import(pathToFileURL(resolve(distPath, 'api/programmatic/BuildMCPServer.js')).href);
  const {
    getServerConfig,
    getTools,
    getPrompts,
    getResources,
    getParameterNames,
    getParameterInfo,
    inferZodSchema,
    extractJSDoc,
  } = await import(pathToFileURL(resolve(distPath, 'decorators.js')).href);

  const { parseTypeScriptFileWithCache, getMethodParameterTypes } = await import(
    pathToFileURL(resolve(distPath, 'type-parser.js')).href
  );

  // Load the class
  console.error('[ClassAdapter] Loading class from:', classFile);
  const absolutePath = resolve(process.cwd(), classFile);

  try {
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
        console.error('Error: Found @MCPServer decorated class but it is not exported');
        console.error('');
        console.error('Fix: Add "export default" to your class:');
        console.error('');
        console.error('  @MCPServer()');
        console.error('  export default class MyServer {');
        console.error('    // ...');
        console.error('  }');
        console.error('');
        console.error('Why? Classes must be exported for the module system to make them available.');
      } else {
        console.error('Error: No class found in module');
        console.error('');
        console.error('Make sure your file exports a class decorated with @MCPServer()');
      }
      process.exit(1);
    }

    const config = getServerConfig(ServerClass);
    if (!config) {
      console.error('Error: Class must be decorated with @MCPServer');
      process.exit(1);
    }

    console.error(`[ClassAdapter] Creating server: ${config.name} v${config.version}`);

    // Parse the source file to extract types
    const parsedClass = parseTypeScriptFileWithCache(classFile);

    const server = new BuildMCPServer({
      name: config.name!,
      version: config.version!,
      port: config.port,
    });

    const instance = new ServerClass();

    // Helper functions
    const toKebabCase = (str: string): string =>
      str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();

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

    const mergeParameterTypes = (runtimeParams: any[], parsedParams: any[]): any[] => {
      return runtimeParams.map((param: any, index: number) => {
        const parsed = parsedParams[index];
        if (parsed && parsed.name === param.name) {
          return {
            ...param,
            type: parsed.type || param.type,
            optional: parsed.optional,
            hasDefault: parsed.hasDefault,
            defaultValue:
              parsed.defaultValue !== undefined ? parsed.defaultValue : param.defaultValue,
          };
        }
        return param;
      });
    };

    // Get explicitly decorated items
    const decoratedTools = new Set(getTools(ServerClass).map((t: any) => t.methodName));
    const decoratedPrompts = new Set(getPrompts(ServerClass).map((p: any) => p.methodName));
    const decoratedResources = new Set(getResources(ServerClass).map((r: any) => r.methodName));

    const publicMethods = getPublicMethods(instance);

    // Register explicitly decorated tools
    const tools = getTools(ServerClass);
    for (const tool of tools) {
      const method = instance[tool.methodName];
      if (!method) continue;

      const runtimeParamInfo = getParameterInfo(method);
      const parsedParams = getMethodParameterTypes(parsedClass, tool.methodName);
      const paramInfo = mergeParameterTypes(runtimeParamInfo, parsedParams);
      const paramTypes = paramInfo.map((p: any) => p.type).filter(Boolean);
      const jsdoc = tool.jsdoc || extractJSDoc(method);
      const zodSchema = inferZodSchema(paramTypes, tool.methodName, paramInfo, jsdoc);
      const toolName = toKebabCase(tool.methodName);

      server.addTool({
        name: toolName,
        description: tool.description || jsdoc?.description || `Execute ${tool.methodName}`,
        parameters: zodSchema,
        execute: async (args: any) => {
          const params = paramInfo.map((p: any) => args[p.name]);
          const result = await method.apply(instance, params);
          return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        },
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

      const runtimeParamInfo = getParameterInfo(method);
      const parsedParams = getMethodParameterTypes(parsedClass, methodName);
      const paramInfo = mergeParameterTypes(runtimeParamInfo, parsedParams);
      const paramTypes = paramInfo.map((p: any) => p.type).filter(Boolean);
      const jsdoc = extractJSDoc(method);
      const zodSchema = inferZodSchema(paramTypes, methodName, paramInfo, jsdoc);
      const toolName = toKebabCase(methodName);

      server.addTool({
        name: toolName,
        description: jsdoc?.description || `Execute ${methodName}`,
        parameters: zodSchema,
        execute: async (args: any) => {
          const params = paramInfo.map((p: any) => args[p.name]);
          const result = await method.apply(instance, params);
          return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        },
      });
    }

    // Register prompts
    const prompts = getPrompts(ServerClass);
    for (const promptMeta of prompts) {
      const method = instance[promptMeta.methodName];
      if (!method) continue;

      const paramNames = getParameterNames(method);

      server.addPrompt({
        name: promptMeta.methodName,
        description: promptMeta.description || `Generate ${promptMeta.methodName} prompt`,
        arguments: paramNames.map((name: string) => ({
          name,
          description: `Parameter ${name}`,
          required: true,
        })),
        template: '{{__dynamic__}}',
      });
    }

    // Register resources
    const resources = getResources(ServerClass);
    for (const resourceMeta of resources) {
      const method = instance[resourceMeta.methodName];
      if (!method) continue;

      const content = method.apply(instance);

      server.addResource({
        uri: resourceMeta.uri,
        name: resourceMeta.name,
        description: resourceMeta.description || `Resource ${resourceMeta.name}`,
        mimeType: resourceMeta.mimeType,
        content,
      });
    }

    displayServerInfo(server);
    await startServer(server, { useHttp, port });
  } catch (error) {
    console.error('[ClassAdapter] Error:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[ClassAdapter] Fatal error:', error);
  process.exit(1);
});
