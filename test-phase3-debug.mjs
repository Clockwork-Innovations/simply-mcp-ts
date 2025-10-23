import { BuildMCPServer } from './dist/src/api/programmatic/BuildMCPServer.js';
import { z } from 'zod';

async function test() {
  const server = new BuildMCPServer({
    name: 'debug-server',
    version: '1.0.0',
    instructions: 'Test instructions',
    website_url: 'https://test.com',
    settings: { foo: 'bar' }
  });

  let captured = null;

  server.addTool({
    name: 'debug-tool',
    description: 'Debug tool',
    parameters: z.object({}),
    execute: async (args, context) => {
      captured = {
        hasContext: !!context,
        hasMcp: !!context?.mcp,
        hasFastmcp: !!context?.mcp?.fastmcp,
        name: context?.mcp?.fastmcp?.name,
        version: context?.mcp?.fastmcp?.version,
        instructions: context?.mcp?.fastmcp?.instructions,
        website_url: context?.mcp?.fastmcp?.website_url,
        settings: context?.mcp?.fastmcp?.settings,
      };
      return { content: [{ type: 'text', text: 'ok' }] };
    }
  });

  await server.start();
  await server.executeToolDirect('debug-tool', {});
  await server.stop();

  console.log("=== CAPTURED CONTEXT ===");
  console.log(JSON.stringify(captured, null, 2));
}

test().catch(console.error);
