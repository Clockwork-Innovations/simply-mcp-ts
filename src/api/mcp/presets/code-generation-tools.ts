/**
 * Code Generation Tools Preset - Complete the MCP Builder Workflow
 *
 * These tools bridge the gap from design to working code:
 * - Generate complete tool implementations
 * - Create server files
 * - Write code to filesystem
 * - Generate tests
 *
 * @module api/mcp/presets/code-generation-tools
 */

import { z } from 'zod';
import type { ToolPreset } from '../types.js';

/**
 * Code Generation Tools Preset
 *
 * Completes the MCP Builder workflow by generating runnable code.
 */
export const CodeGenerationToolsPreset: ToolPreset = {
  name: 'Code Generation Tools',
  description: 'Generate complete, runnable MCP server code from validated designs',
  tools: [
    {
      name: 'generate_tool_code',
      description: 'Generate complete TypeScript code for an MCP tool including imports, schema, and execute function template. Returns ready-to-use code.',
      category: 'generate',
      parameters: z.object({
        tool_name: z.string().describe('Tool name in snake_case'),
        description: z.string().describe('Tool description'),
        schema_code: z.string().describe('Zod schema code (from create_zod_schema)'),
        purpose: z.string().describe('What the tool accomplishes'),
        implementation_notes: z.string().optional().describe('Notes on how to implement the logic')
      }),
      execute: async (args) => {
        const code = `import { z } from 'zod';
import type { HandlerContext } from 'simply-mcp';

/**
 * ${args.description}
 *
 * Purpose: ${args.purpose}
 ${args.implementation_notes ? ` * Implementation: ${args.implementation_notes}` : ''}
 */

// Schema
export const ${args.tool_name}Schema = ${args.schema_code};

// Type inference
export type ${toPascalCase(args.tool_name)}Params = z.infer<typeof ${args.tool_name}Schema>;

/**
 * ${args.tool_name} - ${args.description}
 */
export async function ${args.tool_name}(
  params: ${toPascalCase(args.tool_name)}Params,
  context?: HandlerContext
): Promise<string> {
  // TODO: Implement your logic here
  // You have access to:
  // - params: Validated input parameters
  // - context.logger: For logging
  // - context.reportProgress: For progress updates (if supported)
  // - context.readResource: For reading server resources

  context?.logger?.info(\`${args.tool_name} called with params:\`, params);

  // Example implementation - replace with your logic
  throw new Error('Not implemented yet. Replace this with your tool logic.');

  // Example success response:
  // return \`Result: \${JSON.stringify(result)}\`;
}`;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              tool_name: args.tool_name,
              generated_code: code,
              file_name: `${args.tool_name}.ts`,
              next_steps: [
                'Review the generated code',
                'Implement the TODO section with your logic',
                'Call generate_server_file to create a complete server',
                'Or call write_tool_file to save this tool to a file'
              ],
              usage_example: `// In your server file:
import { ${args.tool_name}, ${args.tool_name}Schema } from './${args.tool_name}.js';

server.addTool({
  name: '${args.tool_name}',
  description: '${args.description}',
  parameters: ${args.tool_name}Schema,
  execute: ${args.tool_name}
});`
            }, null, 2)
          }]
        };
      },
      examples: [
        {
          input: {
            tool_name: 'calculate_tip',
            description: 'Calculate tip amount and total',
            schema_code: 'z.object({ amount: z.number(), percentage: z.number() })',
            purpose: 'Help users calculate tips'
          },
          output: '{ generated_code: "...", file_name: "calculate_tip.ts", ... }',
          description: 'Generate tip calculator tool code'
        }
      ]
    },

    {
      name: 'generate_server_file',
      description: 'Generate a complete MCP server file with one or more tools. Creates production-ready server code using the decorator or functional API.',
      category: 'generate',
      parameters: z.object({
        server_name: z.string().describe('Server name'),
        server_version: z.string().describe('Server version (e.g., "1.0.0")'),
        tools: z.array(z.object({
          name: z.string(),
          description: z.string(),
          schema_code: z.string(),
          implementation: z.string().optional()
        })).describe('Tools to include in the server'),
        api_style: z.enum(['functional', 'decorator', 'programmatic']).default('functional').describe('API style to use')
      }),
      execute: async (args) => {
        let serverCode = '';

        if (args.api_style === 'functional') {
          serverCode = generateFunctionalServer(args);
        } else if (args.api_style === 'decorator') {
          serverCode = generateDecoratorServer(args);
        } else {
          serverCode = generateProgrammaticServer(args);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              server_name: args.server_name,
              api_style: args.api_style,
              generated_code: serverCode,
              file_name: `${args.server_name}.ts`,
              tools_count: args.tools.length,
              next_steps: [
                'Review the generated server code',
                'Implement TODO sections for each tool',
                'Call write_server_file to save to filesystem',
                'Run: npx simply-mcp run ./' + args.server_name + '.ts'
              ],
              ready_to_run: args.tools.every(t => t.implementation),
              notes: args.tools.some(t => !t.implementation)
                ? 'Some tools need implementation (marked with TODO)'
                : 'All tools have implementations - ready to run!'
            }, null, 2)
          }]
        };
      },
      examples: [
        {
          input: {
            server_name: 'my-tools',
            server_version: '1.0.0',
            tools: [{
              name: 'greet',
              description: 'Greet a user',
              schema_code: 'z.object({ name: z.string() })'
            }],
            api_style: 'functional'
          },
          output: '{ generated_code: "...", file_name: "my-tools.ts", ... }',
          description: 'Generate complete server with greeting tool'
        }
      ]
    },

    {
      name: 'write_file',
      description: 'Write generated code to a file. Creates or overwrites files in the current directory. Use carefully!',
      category: 'generate',
      parameters: z.object({
        file_path: z.string().describe('File path relative to current directory (e.g., "./tools/my-tool.ts")'),
        content: z.string().describe('File content to write'),
        overwrite: z.boolean().default(false).describe('Allow overwriting existing files')
      }),
      execute: async (args, context) => {
        const { writeFile, mkdir } = await import('node:fs/promises');
        const { dirname, resolve, join } = await import('node:path');
        const { existsSync } = await import('node:fs');

        try {
          // Resolve path relative to current working directory
          const fullPath = resolve(process.cwd(), args.file_path);

          // Security check - don't write outside current directory
          if (!fullPath.startsWith(process.cwd())) {
            throw new Error('Security: Cannot write files outside current directory');
          }

          // Check if file exists
          if (existsSync(fullPath) && !args.overwrite) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: 'File already exists',
                  file_path: fullPath,
                  message: 'File exists and overwrite=false. Set overwrite=true to replace it.',
                  existing_file: true
                }, null, 2)
              }]
            };
          }

          // Create directory if it doesn't exist
          const dir = dirname(fullPath);
          if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
            context?.logger?.info(`Created directory: ${dir}`);
          }

          // Write file
          await writeFile(fullPath, args.content, 'utf-8');
          context?.logger?.info(`File written: ${fullPath}`);

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                file_path: fullPath,
                file_size: args.content.length,
                message: `Successfully wrote ${args.content.length} bytes to ${args.file_path}`,
                next_steps: [
                  'Review the file content',
                  'Run: npx simply-mcp run ' + args.file_path,
                  'Or build: npm run build'
                ]
              }, null, 2)
            }]
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: errorMessage,
                file_path: args.file_path
              }, null, 2)
            }],
            isError: true
          };
        }
      },
      examples: [
        {
          input: {
            file_path: './tools/greet.ts',
            content: 'export function greet(name: string) { return `Hello, ${name}!`; }',
            overwrite: false
          },
          output: '{ success: true, file_path: "...", file_size: 123 }',
          description: 'Write tool to file'
        }
      ]
    },

    {
      name: 'preview_file_write',
      description: 'Preview what would be written without actually writing. Safe way to check file operations before executing.',
      category: 'generate',
      parameters: z.object({
        file_path: z.string().describe('File path that would be written'),
        content: z.string().describe('Content that would be written')
      }),
      execute: async (args) => {
        const { resolve } = await import('node:path');
        const { existsSync } = await import('node:fs');

        const fullPath = resolve(process.cwd(), args.file_path);
        const exists = existsSync(fullPath);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              preview: {
                file_path: fullPath,
                relative_path: args.file_path,
                content_length: args.content.length,
                content_lines: args.content.split('\n').length,
                file_exists: exists,
                action: exists ? 'OVERWRITE (need overwrite=true)' : 'CREATE NEW',
                content_preview: args.content.slice(0, 200) + (args.content.length > 200 ? '...' : '')
              },
              safe_to_write: !exists,
              next_step: exists
                ? 'Call write_file with overwrite=true to replace existing file'
                : 'Call write_file to create this file'
            }, null, 2)
          }]
        };
      },
      examples: [
        {
          input: {
            file_path: './my-server.ts',
            content: 'import { defineMCP } from "simply-mcp";...'
          },
          output: '{ preview: {...}, safe_to_write: true }',
          description: 'Preview server file write'
        }
      ]
    }
  ]
};

// Helper functions
function toPascalCase(snakeCase: string): string {
  return snakeCase
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function generateFunctionalServer(args: any): string {
  const toolsCode = args.tools.map((tool: any) => `  {
    name: '${tool.name}',
    description: '${tool.description}',
    parameters: ${tool.schema_code},
    execute: async (params, context) => {
      ${tool.implementation || `// TODO: Implement ${tool.name} logic here
      context?.logger?.info('${tool.name} called with params:', params);
      throw new Error('Not implemented yet');`}
    }
  }`).join(',\n');

  return `/**
 * ${args.server_name} - MCP Server
 * Generated by MCP Builder
 * Version: ${args.server_version}
 */

import { defineMCP } from 'simply-mcp';
import { z } from 'zod';

export default defineMCP({
  name: '${args.server_name}',
  version: '${args.server_version}',
  description: 'MCP server with ${args.tools.length} tool(s)',

  tools: [
${toolsCode}
  ]
});`;
}

function generateDecoratorServer(args: any): string {
  const methodsCode = args.tools.map((tool: any) => `  /**
   * ${tool.description}
   */
  async ${tool.name}(params: z.infer<typeof ${tool.name}Schema>): Promise<string> {
    ${tool.implementation || `// TODO: Implement ${tool.name} logic
    throw new Error('Not implemented yet');`}
  }`).join('\n\n');

  const schemasCode = args.tools.map((tool: any) =>
    `const ${tool.name}Schema = ${tool.schema_code};`
  ).join('\n');

  return `/**
 * ${args.server_name} - MCP Server
 * Generated by MCP Builder
 * Version: ${args.server_version}
 */

import { MCPServer, tool } from 'simply-mcp';
import { z } from 'zod';

// Schemas
${schemasCode}

@MCPServer({
  name: '${args.server_name}',
  version: '${args.server_version}',
  description: 'MCP server with ${args.tools.length} tool(s)'
})
export default class ${toPascalCase(args.server_name)}Server {
${methodsCode}
}`;
}

function generateProgrammaticServer(args: any): string {
  const toolsCode = args.tools.map((tool: any) => `
server.addTool({
  name: '${tool.name}',
  description: '${tool.description}',
  parameters: ${tool.schema_code},
  execute: async (params, context) => {
    ${tool.implementation || `// TODO: Implement ${tool.name} logic
    context?.logger?.info('${tool.name} called');
    throw new Error('Not implemented yet');`}
  }
});`).join('\n');

  return `/**
 * ${args.server_name} - MCP Server
 * Generated by MCP Builder
 * Version: ${args.server_version}
 */

import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: '${args.server_name}',
  version: '${args.server_version}',
  description: 'MCP server with ${args.tools.length} tool(s)'
});
${toolsCode}

// Start the server
await server.start();`;
}
