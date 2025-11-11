/**
 * Test Harness Server
 * Launches an MCP server and provides a web UI for testing
 */
import express from 'express';
import cors from 'cors';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/**
 * Launch the test harness with an MCP server
 * @param config Server configuration
 * @returns URLs for UI and MCP server
 */
export async function launchTestHarness(config) {
    const { serverFile, uiPort, mcpPort, mockContext, verbose } = config;
    if (verbose) {
        console.log('[TestHarness] Starting test harness...');
        console.log(`[TestHarness]   Server file: ${serverFile}`);
        console.log(`[TestHarness]   UI port: ${uiPort}`);
        console.log(`[TestHarness]   MCP port: ${mcpPort}`);
        console.log(`[TestHarness]   Mock context: ${mockContext}`);
    }
    // Import loadInterfaceServer from local build
    let server;
    let serverStarted = false;
    try {
        if (verbose) {
            console.log('[TestHarness] Loading MCP server adapter...');
        }
        // Import from local dist directory (not npm package)
        const { loadInterfaceServer } = await import('../../dist/src/server/adapter.js');
        if (verbose) {
            console.log('[TestHarness] Loading interface server from file...');
        }
        // Load the MCP server
        const absolutePath = resolve(serverFile);
        server = await loadInterfaceServer({
            filePath: absolutePath,
            verbose: verbose || false,
        });
        if (verbose) {
            console.log(`[TestHarness] Loaded server: ${server.name} v${server.version}`);
        }
        // Start the MCP server in HTTP mode
        if (verbose) {
            console.log(`[TestHarness] Starting MCP server on port ${mcpPort}...`);
        }
        await server.start({
            transport: 'http',
            port: mcpPort,
            stateful: true,
        });
        serverStarted = true;
        if (verbose) {
            console.log('[TestHarness] MCP server started successfully');
        }
    }
    catch (error) {
        console.error('[TestHarness] Failed to load or start MCP server:', error);
        if (error instanceof Error && error.stack && verbose) {
            console.error('[TestHarness] Stack trace:', error.stack);
        }
        throw error;
    }
    // Create Express app for UI
    const app = express();
    // Add middleware
    app.use(cors());
    app.use(express.json());
    // Serve static files
    // Try both development and production paths
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const staticPath = isDevelopment
        ? join(__dirname, '../src/static')
        : join(__dirname, 'static');
    if (verbose) {
        console.log(`[TestHarness] Serving static files from: ${staticPath}`);
        console.log(`[TestHarness] Environment: ${isDevelopment ? 'development' : 'production'}`);
    }
    app.use(express.static(staticPath));
    // API endpoint: Get server info
    app.get('/api/server-info', (req, res) => {
        try {
            if (!server) {
                res.status(500).json({
                    error: 'MCP server not loaded',
                });
                return;
            }
            const response = {
                name: server.name || 'unknown',
                version: server.version || '0.0.0',
                mcpPort: mcpPort,
                status: 'running',
                capabilities: {},
            };
            // Get capabilities from server if available
            if (server.capabilities) {
                response.capabilities = server.capabilities;
            }
            if (verbose) {
                console.log('[TestHarness] Server info requested:', response);
            }
            res.json(response);
        }
        catch (error) {
            console.error('[TestHarness] Error getting server info:', error);
            res.status(500).json({
                error: 'Failed to get server info',
            });
        }
    });
    // API endpoint: List all tools
    app.get('/api/tools', (req, res) => {
        try {
            if (!server) {
                res.status(500).json({
                    error: 'MCP server not loaded',
                });
                return;
            }
            const tools = server.listTools();
            if (verbose) {
                console.log(`[TestHarness] Listing ${tools.length} tools`);
            }
            res.json({ tools });
        }
        catch (error) {
            console.error('[TestHarness] Error listing tools:', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to list tools',
            });
        }
    });
    // API endpoint: Execute a tool
    app.post('/api/tools/:name', async (req, res) => {
        try {
            if (!server) {
                res.status(500).json({
                    success: false,
                    error: 'MCP server not loaded',
                });
                return;
            }
            const toolName = req.params.name;
            const params = req.body.params || {};
            if (verbose) {
                console.log(`[TestHarness] Executing tool: ${toolName}`, params);
            }
            const result = await server.executeTool(toolName, params);
            if (verbose) {
                console.log(`[TestHarness] Tool execution result:`, result);
            }
            res.json({
                success: true,
                result,
            });
        }
        catch (error) {
            console.error('[TestHarness] Error executing tool:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to execute tool',
            });
        }
    });
    // API endpoint: List all resources
    app.get('/api/resources', (req, res) => {
        try {
            if (!server) {
                res.status(500).json({
                    error: 'MCP server not loaded',
                });
                return;
            }
            const resources = server.listResources();
            if (verbose) {
                console.log(`[TestHarness] Listing ${resources.length} resources`);
            }
            res.json({ resources });
        }
        catch (error) {
            console.error('[TestHarness] Error listing resources:', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to list resources',
            });
        }
    });
    // API endpoint: Read a resource
    app.get('/api/resources/:uri', async (req, res) => {
        try {
            if (!server) {
                res.status(500).json({
                    success: false,
                    error: 'MCP server not loaded',
                });
                return;
            }
            const uri = decodeURIComponent(req.params.uri);
            if (verbose) {
                console.log(`[TestHarness] Reading resource: ${uri}`);
            }
            const result = await server.readResource(uri);
            if (verbose) {
                console.log(`[TestHarness] Resource read result:`, result);
            }
            res.json({
                success: true,
                uri,
                ...result,
            });
        }
        catch (error) {
            console.error('[TestHarness] Error reading resource:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to read resource',
            });
        }
    });
    // API endpoint: List all prompts
    app.get('/api/prompts', (req, res) => {
        try {
            if (!server) {
                res.status(500).json({
                    error: 'MCP server not loaded',
                });
                return;
            }
            const prompts = server.listPrompts();
            if (verbose) {
                console.log(`[TestHarness] Listing ${prompts.length} prompts`);
            }
            res.json({ prompts });
        }
        catch (error) {
            console.error('[TestHarness] Error listing prompts:', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to list prompts',
            });
        }
    });
    // API endpoint: Get prompt with arguments
    app.post('/api/prompts/:name', async (req, res) => {
        try {
            if (!server) {
                res.status(500).json({
                    success: false,
                    error: 'MCP server not loaded',
                });
                return;
            }
            const promptName = req.params.name;
            const args = req.body.args || {};
            if (verbose) {
                console.log(`[TestHarness] Getting prompt: ${promptName}`, args);
            }
            const result = await server.getPrompt(promptName, args);
            if (verbose) {
                console.log(`[TestHarness] Prompt result:`, result);
            }
            res.json({
                success: true,
                ...result,
            });
        }
        catch (error) {
            console.error('[TestHarness] Error getting prompt:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get prompt',
            });
        }
    });
    // API endpoint: Get completions (for autocomplete)
    app.post('/api/completions', async (req, res) => {
        try {
            if (!server) {
                res.status(500).json({
                    success: false,
                    error: 'MCP server not loaded',
                });
                return;
            }
            const { ref, arg } = req.body;
            if (!ref || arg === undefined) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields: ref and arg',
                });
                return;
            }
            if (verbose) {
                console.log(`[TestHarness] Getting completions for: ${ref}`, arg);
            }
            // Check if server has completion handler
            if (typeof server.handleCompletion !== 'function') {
                res.json({
                    success: true,
                    completions: [],
                });
                return;
            }
            const result = await server.handleCompletion(ref, arg);
            if (verbose) {
                console.log(`[TestHarness] Completion result:`, result);
            }
            res.json({
                success: true,
                completions: result?.values || [],
            });
        }
        catch (error) {
            console.error('[TestHarness] Error getting completions:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get completions',
            });
        }
    });
    // API endpoint: Get server metrics
    app.get('/api/metrics', (req, res) => {
        try {
            if (!server) {
                res.status(500).json({
                    error: 'MCP server not loaded',
                });
                return;
            }
            const stats = server.getStats();
            if (verbose) {
                console.log('[TestHarness] Server metrics requested:', stats);
            }
            res.json(stats);
        }
        catch (error) {
            console.error('[TestHarness] Error getting metrics:', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to get metrics',
            });
        }
    });
    // API endpoint: Get server configuration
    app.get('/api/config', (req, res) => {
        try {
            if (!server) {
                res.status(500).json({
                    error: 'MCP server not loaded',
                });
                return;
            }
            const response = {
                serverFile: config.serverFile,
                uiPort: config.uiPort,
                mcpPort: config.mcpPort,
                mockContext: config.mockContext,
                verbose: config.verbose,
                serverName: server.name || 'unknown',
                serverVersion: server.version || '0.0.0',
            };
            if (verbose) {
                console.log('[TestHarness] Server config requested:', response);
            }
            res.json(response);
        }
        catch (error) {
            console.error('[TestHarness] Error getting config:', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to get config',
            });
        }
    });
    // Start UI server
    return new Promise((resolve, reject) => {
        const uiServer = app.listen(uiPort, () => {
            if (verbose) {
                console.log(`[TestHarness] UI server listening on port ${uiPort}`);
            }
            const urls = {
                ui: `http://localhost:${uiPort}`,
                mcp: `http://localhost:${mcpPort}`,
            };
            // Set up graceful shutdown handlers
            const shutdown = async () => {
                console.log('\n[TestHarness] Shutting down...');
                // Close UI server
                uiServer.close(() => {
                    if (verbose) {
                        console.log('[TestHarness] UI server closed');
                    }
                });
                // Close MCP server if it was started
                if (server && serverStarted) {
                    try {
                        if (verbose) {
                            console.log('[TestHarness] Stopping MCP server...');
                        }
                        await server.stop();
                        if (verbose) {
                            console.log('[TestHarness] MCP server stopped');
                        }
                    }
                    catch (error) {
                        console.error('[TestHarness] Error stopping MCP server:', error);
                    }
                }
                console.log('[TestHarness] Shutdown complete');
                process.exit(0);
            };
            // Handle termination signals
            process.on('SIGINT', shutdown);
            process.on('SIGTERM', shutdown);
            resolve(urls);
        });
        uiServer.on('error', (error) => {
            console.error('[TestHarness] Failed to start UI server:', error);
            reject(error);
        });
    });
}
//# sourceMappingURL=server.js.map