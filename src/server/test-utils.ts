/**
 * Test Utilities for Server Testing
 *
 * Helper functions for compiling and testing MCP servers in unit/integration tests.
 */

import { compileInterfaceFile } from './compiler/index.js';
import { BuildMCPServer } from './builder-server.js';
import { InterfaceServer } from './interface-server.js';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { pathToFileURL } from 'url';
import { z } from 'zod';
import type { ParseResult } from './compiler/types.js';

export interface CompileOptions {
  name: string;
  version: string;
  silent?: boolean;
}

export interface CompileResult {
  server: InterfaceServer;
  parsed: ParseResult;
}

/**
 * Compile inline TypeScript server code for testing
 *
 * @param code - TypeScript server code
 * @param options - Compilation options
 * @returns Compiled server and parse result
 *
 * @example
 * const { server, parsed } = await compileServerFromCode(code, {
 *   name: 'test',
 *   version: '1.0.0',
 *   silent: true
 * });
 *
 * const interfaceServer = server.toInterfaceServer();
 * const tools = await interfaceServer.listTools({});
 */
export async function compileServerFromCode(
  code: string,
  options: CompileOptions
): Promise<CompileResult> {
  const { name, version, silent = false } = options;

  // Create temp directory if it doesn't exist
  const testDir = join(tmpdir(), 'simply-mcp-test-' + Date.now());
  mkdirSync(testDir, { recursive: true });

  // Create temp file
  const testFile = join(testDir, 'test-server.ts');
  writeFileSync(testFile, code);

  try {
    // Compile the interface file
    const parsed = await compileInterfaceFile(testFile);

    if (!silent && parsed.validationErrors && parsed.validationErrors.length > 0) {
      console.log(`[Compile] ${parsed.validationErrors.length} validation warnings`);
    }

    // Load the compiled module using dynamic import
    const fileUrl = pathToFileURL(testFile).href;
    const moduleUrl = `${fileUrl}?t=${Date.now()}`;
    const module = await import(moduleUrl);

    // Get the default export (server class or instance) or use module directly
    let ServerClass = module.default;

    // Handle CommonJS bundles
    if (ServerClass && typeof ServerClass === 'object' && ServerClass.default) {
      ServerClass = ServerClass.default;
    }

    // Instantiate if it's a class, use as-is if object, or use module directly if no default export
    let moduleInstance: any;
    if (ServerClass) {
      moduleInstance = typeof ServerClass === 'function' ? new ServerClass() : ServerClass;
    } else {
      // No default export - use module directly (handles named exports like const testSkill = ...)
      moduleInstance = module;
    }

    // Create server
    const builder = new BuildMCPServer({ name, version });

    // Register tools
    for (const tool of parsed.tools || []) {
      const handler = moduleInstance[tool.methodName];
      if (handler) {
        // Use permissive schema (we don't have detailed param info in ParsedTool)
        const parameters = z.any();

        builder.addTool({
          name: tool.name || tool.methodName,
          description: tool.description,
          hidden: tool.hidden,
          parameters,
          execute: handler
        });
      }
    }

    // Register resources
    for (const resource of parsed.resources || []) {
      const handler = moduleInstance[resource.methodName];
      if (handler) {
        builder.addResource({
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
          hidden: resource.hidden,
          content: handler
        });
      }
    }

    // Register prompts
    for (const prompt of parsed.prompts || []) {
      const handler = moduleInstance[prompt.methodName];
      if (handler) {
        builder.addPrompt({
          name: prompt.name,
          description: prompt.description,
          arguments: prompt.argsMetadata ? Object.entries(prompt.argsMetadata).map(([name, meta]) => ({
            name,
            description: meta.description || '',
            required: meta.required !== false
          })) : [],
          hidden: prompt.hidden,
          template: handler
        });
      }
    }

    // Register skills as resources (Phase 1 - MCP-Native Skills)
    if (parsed.skills && parsed.skills.length > 0) {
      // Import the registration function
      const { registerSkillsAsResources } = await import('../handlers/resource-handler.js');
      registerSkillsAsResources(builder, moduleInstance, parsed.skills, silent);
    }

    return { server: new InterfaceServer(builder), parsed };
  } finally {
    // Clean up temp file
    try {
      unlinkSync(testFile);
    } catch (err) {
      // Ignore cleanup errors
    }
  }
}
