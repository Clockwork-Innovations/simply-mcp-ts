/**
 * Interface-Driven API - Elicitation Foundation Example
 *
 * Demonstrates the foundation layer for elicitation (user input requests).
 * Elicitation allows servers to request structured input from users through
 * the MCP client during tool execution.
 *
 * This example shows:
 * - Simple text input elicitation
 * - Form-like input with multiple fields
 * - Handling user responses (accept/decline/cancel)
 * - Basic error handling
 *
 * Usage:
 *   npm run build
 *   node dist/bin/interface-bin.js examples/interface-elicitation-foundation.ts
 *
 * Requirements:
 * - MCP client must support elicitation capability
 * - Server must enable elicitation in capabilities
 */

import type { ITool, IServer } from 'simply-mcp';

// ============================================================================
// TOOL INTERFACES
// ============================================================================

/**
 * Simple tool that requests user's API key via elicitation
 */
interface ConfigureApiKeyTool extends ITool {
  name: 'configure_api_key';
  description: 'Configure API key for external service';
  params: {
    /** Service name to configure */
    service: 'openai' | 'anthropic' | 'google';
  };
  result: {
    /** Whether configuration was successful */
    success: boolean;
    /** Status message */
    message: string;
    /** Masked API key (first 8 chars + ...) */
    maskedKey?: string;
  };
}

/**
 * Tool that requests database configuration via form-like elicitation
 */
interface ConfigureDatabaseTool extends ITool {
  name: 'configure_database';
  description: 'Configure database connection settings';
  params: {};
  result: {
    /** Whether configuration was successful */
    success: boolean;
    /** Configuration summary */
    summary: string;
    /** Connection details (sanitized) */
    config?: {
      host: string;
      port: number;
      useSSL: boolean;
    };
  };
}

// ============================================================================
// SERVER INTERFACE
// ============================================================================

interface ElicitationServer extends IServer {
  name: 'elicitation-demo';
  version: '1.0.0';
  description: 'Demonstrates elicitation (user input requests)';
}

// ============================================================================
// SERVER IMPLEMENTATION
// ============================================================================

/**
 * Server implementation with elicitation tools
 */
export default class ElicitationDemoServer implements ElicitationServer {
  /**
   * Configure API key by requesting input from user
   */
  configureApiKey: ConfigureApiKeyTool = async (params, context) => {
    // Check if elicitation is available
    if (!context?.elicitInput) {
      return {
        success: false,
        message: 'Elicitation not supported by this client',
      };
    }

    try {
      // Request API key from user
      const result = await context.elicitInput(
        `Please enter your ${params.service} API key`,
        {
          apiKey: {
            type: 'string',
            title: 'API Key',
            description: `Your ${params.service} API key`,
            minLength: 10,
          },
        }
      );

      // Handle user response
      if (result.action === 'accept') {
        const apiKey = result.content?.apiKey;

        if (!apiKey) {
          return {
            success: false,
            message: 'No API key provided',
          };
        }

        // In a real implementation, you would:
        // 1. Validate the API key format
        // 2. Test the API key with the service
        // 3. Store it securely (encrypted)

        // For demo, just mask and return success
        const masked = apiKey.substring(0, 8) + '...';

        return {
          success: true,
          message: `API key configured successfully for ${params.service}`,
          maskedKey: masked,
        };
      } else if (result.action === 'decline') {
        return {
          success: false,
          message: 'User declined to provide API key',
        };
      } else {
        // action === 'cancel'
        return {
          success: false,
          message: 'User cancelled the operation',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Elicitation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  };

  /**
   * Configure database by requesting multiple fields from user
   */
  configureDatabase: ConfigureDatabaseTool = async (params, context) => {
    // Check if elicitation is available
    if (!context?.elicitInput) {
      return {
        success: false,
        summary: 'Elicitation not supported by this client',
      };
    }

    try {
      // Request database configuration with multiple fields
      const result = await context.elicitInput(
        'Please configure your database connection',
        {
          host: {
            type: 'string',
            title: 'Database Host',
            description: 'Hostname or IP address',
            default: 'localhost',
          },
          port: {
            type: 'integer',
            title: 'Port',
            description: 'Database port number',
            default: 5432,
            min: 1,
            max: 65535,
          },
          useSSL: {
            type: 'boolean',
            title: 'Use SSL',
            description: 'Enable SSL connection',
            default: true,
          },
        }
      );

      // Handle user response
      if (result.action === 'accept') {
        const { host, port, useSSL } = result.content || {};

        if (!host || !port) {
          return {
            success: false,
            summary: 'Missing required configuration fields',
          };
        }

        // In a real implementation, you would:
        // 1. Validate the connection settings
        // 2. Test the database connection
        // 3. Store configuration securely

        return {
          success: true,
          summary: `Database configured: ${host}:${port} (SSL: ${useSSL ? 'enabled' : 'disabled'})`,
          config: {
            host: host as string,
            port: port as number,
            useSSL: useSSL as boolean,
          },
        };
      } else if (result.action === 'decline') {
        return {
          success: false,
          summary: 'User declined to configure database',
        };
      } else {
        // action === 'cancel'
        return {
          success: false,
          summary: 'User cancelled database configuration',
        };
      }
    } catch (error) {
      return {
        success: false,
        summary: `Configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  };
}
