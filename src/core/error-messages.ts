/**
 * Error Message Templates
 *
 * Provides consistent, actionable error messages across the codebase.
 * All error messages follow the pattern:
 * 1. Clear description of what went wrong
 * 2. Expected vs. actual (where applicable)
 * 3. Example of correct usage
 * 4. Troubleshooting steps
 * 5. Link to documentation
 */

/**
 * Standard error message templates for common scenarios
 */
export const ErrorMessages = {
  /**
   * Error when no valid MCP server is found in a file
   */
  INVALID_SERVER_CLASS: (file: string) =>
    `No MCP server found in: ${file}\n\n` +
    `Expected:\n` +
    `  - A BuildMCPServer instance exported as default\n` +
    `  - Or an Interface API implementation exported as default\n\n` +
    `Example:\n` +
    `  import { BuildMCPServer } from 'simply-mcp';\n\n` +
    `  const server = new BuildMCPServer({ name: 'my-server', version: '1.0.0' });\n` +
    `  export default server;\n\n` +
    `Documentation: https://github.com/Clockwork-Innovations/simply-mcp-ts`,

  /**
   * Error when file cannot be loaded
   */
  FILE_LOAD_ERROR: (file: string, error: string, resolvedPath?: string) =>
    `Failed to load file: ${file}\n\n` +
    `Error: ${error}\n\n` +
    `Troubleshooting:\n` +
    `  1. Check the file path is correct\n` +
    `  2. Ensure the file has no syntax errors\n` +
    `  3. Verify all imports are valid and installed\n` +
    `  4. Try running: npx tsx ${file}\n\n` +
    (resolvedPath ? `File path (resolved): ${resolvedPath}\n\n` : '') +
    `See: https://github.com/Clockwork-Innovations/simply-mcp-ts/blob/main/IMPORT_STYLE_GUIDE.md`,

  /**
   * Error when server is not properly configured
   */
  MISSING_SERVER_DECORATOR: (className: string) =>
    `Server configuration error for '${className}'\n\n` +
    `What went wrong:\n` +
    `  The file was found but doesn't contain a valid MCP server configuration.\n\n` +
    `Expected:\n` +
    `  - BuildMCPServer instance\n` +
    `  - Interface API implementation\n\n` +
    `To fix:\n` +
    `  1. Import: import { BuildMCPServer } from 'simply-mcp';\n` +
    `  2. Create server: const server = new BuildMCPServer({ name: 'my-server', version: '1.0.0' });\n` +
    `  3. Export: export default server;\n\n` +
    `Example:\n` +
    `  import { BuildMCPServer } from 'simply-mcp';\n` +
    `  import { z } from 'zod';\n\n` +
    `  const server = new BuildMCPServer({ name: 'my-server', version: '1.0.0' });\n` +
    `  server.addTool({\n` +
    `    name: 'greet',\n` +
    `    description: 'Greet a user',\n` +
    `    parameters: z.object({ name: z.string() }),\n` +
    `    execute: async (args) => \`Hello, \${args.name}!\`\n` +
    `  });\n` +
    `  export default server;\n\n` +
    `Documentation: https://github.com/Clockwork-Innovations/simply-mcp-ts`,

  /**
   * Error when tool configuration is invalid
   */
  INVALID_TOOL_CONFIG: (toolName: string, issue: string) =>
    `Invalid tool configuration for '${toolName}'\n\n` +
    `Issue: ${issue}\n\n` +
    `Required fields:\n` +
    `  - name: string (unique identifier, kebab-case recommended)\n` +
    `  - description: string (clear explanation of what the tool does)\n` +
    `  - parameters: ZodObject (Zod schema for validation)\n` +
    `  - execute: async function (implementation)\n\n` +
    `Example:\n` +
    `  import { z } from 'zod';\n\n` +
    `  server.addTool({\n` +
    `    name: 'greet-user',\n` +
    `    description: 'Greet a user by name',\n` +
    `    parameters: z.object({\n` +
    `      name: z.string().describe('User name'),\n` +
    `      formal: z.boolean().optional().describe('Use formal greeting')\n` +
    `    }),\n` +
    `    execute: async (args) => {\n` +
    `      const greeting = args.formal ? 'Good day' : 'Hello';\n` +
    `      return \`\${greeting}, \${args.name}!\`;\n` +
    `    }\n` +
    `  });\n\n` +
    `Documentation: https://github.com/Clockwork-Innovations/simply-mcp-ts#adding-tools`,

  /**
   * Error when tool is already registered
   */
  DUPLICATE_TOOL: (toolName: string) =>
    `Tool '${toolName}' is already registered\n\n` +
    `What went wrong:\n` +
    `  You attempted to register a tool with a name that's already in use.\n\n` +
    `To fix:\n` +
    `  1. Choose a different name for the new tool\n` +
    `  2. Remove the duplicate registration\n` +
    `  3. Use namespacing if needed: 'category-tool-name'\n\n` +
    `Example:\n` +
    `  // Instead of multiple 'search' tools:\n` +
    `  server.addTool({ name: 'search-users', ... });\n` +
    `  server.addTool({ name: 'search-products', ... });\n\n` +
    `Tip: Tool names should be unique and descriptive.`,

  /**
   * Error when prompt configuration is invalid
   */
  INVALID_PROMPT_CONFIG: (promptName: string, issue: string) =>
    `Invalid prompt configuration for '${promptName}'\n\n` +
    `Issue: ${issue}\n\n` +
    `Required fields:\n` +
    `  - name: string (unique identifier)\n` +
    `  - description: string (what the prompt is for)\n` +
    `  - template: string (prompt template with {{variable}} placeholders)\n\n` +
    `Example:\n` +
    `  server.addPrompt({\n` +
    `    name: 'code-review',\n` +
    `    description: 'Generate code review comments',\n` +
    `    arguments: [\n` +
    `      { name: 'language', description: 'Programming language', required: true },\n` +
    `      { name: 'code', description: 'Code to review', required: true }\n` +
    `    ],\n` +
    `    template: 'Review this {{language}} code:\\n\\n{{code}}'\n` +
    `  });\n\n` +
    `Documentation: https://github.com/Clockwork-Innovations/simply-mcp-ts#adding-prompts`,

  /**
   * Error when duplicate prompt is registered
   */
  DUPLICATE_PROMPT: (promptName: string) =>
    `Prompt '${promptName}' is already registered\n\n` +
    `What went wrong:\n` +
    `  You attempted to register a prompt with a name that's already in use.\n\n` +
    `To fix:\n` +
    `  1. Choose a different name for the new prompt\n` +
    `  2. Remove the duplicate registration\n` +
    `  3. Merge similar prompts if appropriate\n\n` +
    `Tip: Prompt names should be unique and descriptive.`,

  /**
   * Error when resource configuration is invalid
   */
  INVALID_RESOURCE_CONFIG: (resourceUri: string, issue: string) =>
    `Invalid resource configuration for '${resourceUri}'\n\n` +
    `Issue: ${issue}\n\n` +
    `Required fields:\n` +
    `  - uri: string (unique resource identifier)\n` +
    `  - name: string (display name)\n` +
    `  - description: string (what the resource contains)\n` +
    `  - mimeType: string (content type)\n` +
    `  - content: string | object | Buffer (resource data)\n\n` +
    `Example:\n` +
    `  server.addResource({\n` +
    `    uri: 'config://server',\n` +
    `    name: 'Server Configuration',\n` +
    `    description: 'Current server configuration',\n` +
    `    mimeType: 'application/json',\n` +
    `    content: JSON.stringify({ port: 3000, ... }, null, 2)\n` +
    `  });\n\n` +
    `Documentation: https://github.com/Clockwork-Innovations/simply-mcp-ts#adding-resources`,

  /**
   * Error when duplicate resource is registered
   */
  DUPLICATE_RESOURCE: (resourceUri: string) =>
    `Resource with URI '${resourceUri}' is already registered\n\n` +
    `What went wrong:\n` +
    `  You attempted to register a resource with a URI that's already in use.\n\n` +
    `To fix:\n` +
    `  1. Choose a different URI for the new resource\n` +
    `  2. Remove the duplicate registration\n` +
    `  3. Update the existing resource if needed\n\n` +
    `Tip: Resource URIs should be unique within the server.`,

  /**
   * Error when server is already running
   */
  SERVER_ALREADY_RUNNING: () =>
    `Cannot modify server: Server is already running\n\n` +
    `What went wrong:\n` +
    `  You attempted to add tools, prompts, or resources after server.start() was called.\n\n` +
    `To fix:\n` +
    `  1. Register all tools, prompts, and resources BEFORE calling server.start()\n` +
    `  2. Stop the server, make changes, then restart\n\n` +
    `Example (correct order):\n` +
    `  const server = new SimplyMCP({ name: 'my-server', version: '1.0.0' });\n` +
    `  \n` +
    `  // Add all tools/prompts/resources first\n` +
    `  server.addTool({ ... });\n` +
    `  server.addPrompt({ ... });\n` +
    `  server.addResource({ ... });\n` +
    `  \n` +
    `  // Start server last\n` +
    `  await server.start();\n\n` +
    `Tip: Design your server configuration before starting it.`,

  /**
   * Error when server fails to initialize
   */
  SERVER_INIT_ERROR: (error: string) =>
    `Failed to initialize MCP server\n\n` +
    `Error: ${error}\n\n` +
    `Troubleshooting:\n` +
    `  1. Check your server configuration is valid\n` +
    `  2. Ensure name and version are provided\n` +
    `  3. Verify transport settings (stdio vs http)\n` +
    `  4. Check for port conflicts if using HTTP transport\n\n` +
    `Example configuration:\n` +
    `  const server = new SimplyMCP({\n` +
    `    name: 'my-server',\n` +
    `    version: '1.0.0',\n` +
    `    description: 'My MCP server',\n` +
    `    transport: { type: 'stdio' } // or { type: 'http', port: 3000 }\n` +
    `  });\n\n` +
    `Documentation: https://github.com/Clockwork-Innovations/simply-mcp-ts#getting-started`,

  /**
   * Error when transport fails to start
   */
  TRANSPORT_ERROR: (transport: string, error: string) =>
    `Failed to start ${transport} transport\n\n` +
    `Error: ${error}\n\n` +
    `Troubleshooting:\n` +
    `  For HTTP transport:\n` +
    `    - Check if port is already in use\n` +
    `    - Try a different port: await server.start({ transport: 'http', port: 3001 })\n` +
    `    - Verify firewall settings\n` +
    `    - Check system port permissions\n\n` +
    `  For stdio transport:\n` +
    `    - Ensure stdin/stdout are not being used by other code\n` +
    `    - Don't mix stdio transport with console.log() in tools\n` +
    `    - Use console.error() for debugging instead\n\n` +
    `  General:\n` +
    `    - Try the other transport type to isolate the issue\n` +
    `    - Check server logs for more details\n\n` +
    `See: https://github.com/Clockwork-Innovations/simply-mcp-ts#transport-comparison`,

  /**
   * Error when adding items after server has started
   */
  CANNOT_ADD_AFTER_START: (itemType: 'tool' | 'prompt' | 'resource') =>
    `Cannot add ${itemType}s after server has started\n\n` +
    `What went wrong:\n` +
    `  The server is already running and cannot accept new ${itemType}s.\n\n` +
    `To fix:\n` +
    `  1. Add all ${itemType}s before calling server.start()\n` +
    `  2. Or stop the server, add ${itemType}s, then restart\n\n` +
    `Example:\n` +
    `  // Correct order:\n` +
    `  server.add${itemType.charAt(0).toUpperCase() + itemType.slice(1)}({ ... });\n` +
    `  await server.start();\n\n` +
    `  // Incorrect order:\n` +
    `  await server.start();\n` +
    `  server.add${itemType.charAt(0).toUpperCase() + itemType.slice(1)}({ ... }); // ERROR!`,
};

/**
 * Format an error with additional context
 *
 * @param message - The error message
 * @param context - Additional context to include
 * @returns Formatted error message with context
 */
export function formatError(message: string, context?: Record<string, any>): string {
  let formatted = message;

  if (context && Object.keys(context).length > 0) {
    formatted += '\n\nAdditional Context:\n';
    for (const [key, value] of Object.entries(context)) {
      const valueStr = typeof value === 'object'
        ? JSON.stringify(value, null, 2).substring(0, 200)
        : String(value).substring(0, 200);
      formatted += `  ${key}: ${valueStr}\n`;
    }
  }

  return formatted;
}

/**
 * Create a helpful error for missing configuration
 *
 * @param field - The missing field name
 * @param location - Where the field should be (e.g., "server options", "tool definition")
 * @returns Error message
 */
export function missingFieldError(field: string, location: string): string {
  return (
    `Missing required field: ${field}\n\n` +
    `Where: ${location}\n\n` +
    `This field is required for the operation to succeed.\n` +
    `Please check the documentation for the correct configuration format.`
  );
}

/**
 * Create a helpful error for type mismatches
 *
 * @param field - The field name
 * @param expected - Expected type
 * @param received - Actual type received
 * @returns Error message
 */
export function typeMismatchError(field: string, expected: string, received: string): string {
  return (
    `Type error for field '${field}'\n\n` +
    `Expected: ${expected}\n` +
    `Received: ${received}\n\n` +
    `Please provide a value of the correct type.`
  );
}
