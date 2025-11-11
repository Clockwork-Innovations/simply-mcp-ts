import express, { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import cors from 'cors';

const MCP_PORT = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : 3000;

// Create an MCP server with implementation details
const getServer = () => {
  const server = new Server({
    name: 'simple-streamable-http-server',
    version: '1.0.0',
  }, { capabilities: {
    tools: {},
    prompts: {},
    resources: {},
  }});

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'greet',
          description: 'A simple greeting tool',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name to greet',
              },
            },
            required: ['name'],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'greet') {
      const name = request.params.arguments?.name as string;
      return {
        content: [
          {
            type: 'text',
            text: `Hello, ${name}!`,
          },
        ],
      };
    }
    throw new Error(`Unknown tool: ${request.params.name}`);
  });

  // List available prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: 'greeting-template',
          description: 'A simple greeting prompt template',
          arguments: [
            {
              name: 'name',
              description: 'Name to include in greeting',
              required: true,
            },
          ],
        },
      ],
    };
  });

  // Handle prompt requests
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    if (request.params.name === 'greeting-template') {
      const name = request.params.arguments?.name as string;
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please greet ${name} in a friendly manner.`,
            },
          },
        ],
      };
    }
    throw new Error(`Unknown prompt: ${request.params.name}`);
  });

  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'https://example.com/greetings/default',
          name: 'Default Greeting',
          description: 'A simple greeting resource',
          mimeType: 'text/plain',
        },
      ],
    };
  });

  // Handle resource reads
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri === 'https://example.com/greetings/default') {
      return {
        contents: [
          {
            uri: 'https://example.com/greetings/default',
            mimeType: 'text/plain',
            text: 'Hello, world!',
          },
        ],
      };
    }
    throw new Error(`Unknown resource: ${request.params.uri}`);
  });

  return server;
};

const app = express();
app.use(express.json());

// Allow CORS all domains, expose the Mcp-Session-Id header
app.use(cors({
  origin: '*',
  exposedHeaders: ['Mcp-Session-Id']
}));

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Helper to check if request is an initialize request
const isInitializeRequest = (body: any): boolean => {
  return body?.method === 'initialize';
};

// MCP POST endpoint
const mcpPostHandler = async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (sessionId) {
    console.log(`Received MCP request for session: ${sessionId}`);
  }

  try {
    let transport: StreamableHTTPServerTransport;
    if (sessionId && transports[sessionId]) {
      // Reuse existing transport
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New initialization request
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          console.log(`Session initialized with ID: ${sessionId}`);
          transports[sessionId] = transport;
        }
      });

      // Set up onclose handler
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          console.log(`Transport closed for session ${sid}`);
          delete transports[sid];
        }
      };

      // Connect the transport to the MCP server
      const server = getServer();
      await server.connect(transport);

      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      // Invalid request
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      });
      return;
    }

    // Handle the request with existing transport
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
};

app.post('/mcp', mcpPostHandler);

// Handle GET requests for SSE streams
const mcpGetHandler = async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  const lastEventId = req.headers['last-event-id'] as string | undefined;
  if (lastEventId) {
    console.log(`Client reconnecting with Last-Event-ID: ${lastEventId}`);
  } else {
    console.log(`Establishing new SSE stream for session ${sessionId}`);
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

app.get('/mcp', mcpGetHandler);

// Handle DELETE requests for session termination
const mcpDeleteHandler = async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  console.log(`Received session termination request for session ${sessionId}`);

  try {
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error('Error handling session termination:', error);
    if (!res.headersSent) {
      res.status(500).send('Error processing session termination');
    }
  }
};

app.delete('/mcp', mcpDeleteHandler);

app.listen(MCP_PORT, () => {
  console.log(`MCP Streamable HTTP Server listening on port ${MCP_PORT}`);
});

// Handle server shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');

  for (const sessionId in transports) {
    try {
      console.log(`Closing transport for session ${sessionId}`);
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }
  console.log('Server shutdown complete');
  process.exit(0);
});