/**
 * Interface-Driven API - Elicitation (User Input) Example
 *
 * Demonstrates:
 * - User input requests with elicitInput/IElicit
 * - Multi-step form validation flows
 * - Different elicitation patterns (API keys, configuration, confirmations)
 * - Handling accept/decline/cancel actions
 * - Production-ready error handling
 *
 * The elicitation capability allows servers to request structured input from users
 * through the MCP client during tool execution. This is useful for configuration,
 * authentication, and interactive workflows.
 *
 * Usage:
 *   npx simply-mcp run examples/interface-elicitation.ts
 *
 * Test with HTTP mode:
 *   # Start server
 *   npx simply-mcp run examples/interface-elicitation.ts --transport http --port 3000
 *
 *   # Initialize session
 *   curl -H "Content-Type: application/json" \
 *     http://localhost:3000/mcp \
 *     -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{"elicitation":{}},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}'
 *
 *   # List tools
 *   curl -H "Content-Type: application/json" \
 *     http://localhost:3000/mcp \
 *     -d '{"jsonrpc":"2.0","method":"tools/list","id":2}'
 *
 *   # Call configure_service tool
 *   curl -H "Content-Type: application/json" \
 *     http://localhost:3000/mcp \
 *     -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"configure_service","arguments":{"service":"openai"}},"id":3}'
 *
 * Note: Elicitation requires a connected MCP client that supports the elicitation capability.
 * The tools gracefully degrade if elicitation is not available.
 */

import type { ITool, IPrompt, IResource, IServer } from 'simply-mcp';

// ============================================================================
// TOOL INTERFACES
// ============================================================================

/**
 * Configure external service with API key
 *
 * Demonstrates simple text input elicitation for sensitive data.
 * Shows validation and error handling patterns.
 */
interface ConfigureServiceTool extends ITool {
  name: 'configure_service';
  description: 'Configure external service API credentials';
  params: {
    /** Service to configure */
    service: 'openai' | 'anthropic' | 'google' | 'github' | 'aws';
  };
  result: {
    /** Whether configuration was successful */
    success: boolean;
    /** Status message */
    message: string;
    /** Service name */
    service: string;
    /** Masked API key (first 8 chars + ...) */
    maskedKey?: string;
    /** Configuration timestamp */
    configuredAt?: string;
  };
}

/**
 * Setup database connection
 *
 * Demonstrates form-like elicitation with multiple fields and validation.
 * Shows complex input patterns with defaults and constraints.
 */
interface SetupDatabaseTool extends ITool {
  name: 'setup_database';
  description: 'Configure database connection with multi-field form';
  params: {
    /** Database type to configure */
    dbType?: 'postgresql' | 'mysql' | 'mongodb' | 'redis';
  };
  result: {
    /** Whether setup was successful */
    success: boolean;
    /** Configuration summary */
    summary: string;
    /** Connection details (sanitized) */
    config?: {
      host: string;
      port: number;
      database?: string;
      useSSL: boolean;
      poolSize?: number;
    };
    /** Connection test result */
    connectionTest?: 'success' | 'failed' | 'skipped';
  };
}

/**
 * Confirm dangerous operation
 *
 * Demonstrates confirmation dialog pattern for destructive actions.
 * Shows how to prevent accidental operations.
 */
interface DeleteResourceTool extends ITool {
  name: 'delete_resource';
  description: 'Delete resource with confirmation prompt';
  params: {
    /** Resource identifier */
    resourceId: string;
    /** Resource type */
    resourceType: 'file' | 'database' | 'user' | 'configuration';
  };
  result: {
    /** Whether deletion was completed */
    deleted: boolean;
    /** Operation message */
    message: string;
    /** Resource details */
    resource: {
      id: string;
      type: string;
    };
    /** Deletion timestamp (if successful) */
    deletedAt?: string;
  };
}

/**
 * Create user account with profile
 *
 * Demonstrates multi-step elicitation workflow.
 * Shows collecting related data in structured forms.
 */
interface CreateUserTool extends ITool {
  name: 'create_user';
  description: 'Create user account with profile information';
  params: {
    /** Account tier */
    tier?: 'free' | 'pro' | 'enterprise';
  };
  result: {
    /** Whether user was created */
    success: boolean;
    /** Status message */
    message: string;
    /** User details */
    user?: {
      id: string;
      username: string;
      email: string;
      tier: string;
      createdAt: string;
    };
  };
}

/**
 * Deploy application with settings
 *
 * Demonstrates collecting deployment configuration through elicitation.
 * Shows validation and pre-flight checks.
 */
interface DeployApplicationTool extends ITool {
  name: 'deploy_application';
  description: 'Deploy application with configuration settings';
  params: {
    /** Application name */
    appName: string;
    /** Environment */
    environment: 'development' | 'staging' | 'production';
  };
  result: {
    /** Whether deployment was initiated */
    deployed: boolean;
    /** Deployment status */
    status: string;
    /** Deployment details */
    deployment?: {
      appName: string;
      environment: string;
      region: string;
      instances: number;
      autoScale: boolean;
    };
    /** Deployment URL (if successful) */
    url?: string;
  };
}

// ============================================================================
// PROMPT INTERFACES
// ============================================================================

/**
 * Configuration wizard prompt
 *
 * Guides users through configuration process.
 */
interface ConfigWizardPrompt extends IPrompt {
  name: 'config_wizard';
  description: 'Interactive configuration wizard';
  args: {
    /** Service being configured */
    service: string;
    /** Configuration step */
    step: string;
  };
  template: `# Configuration Wizard: {service}

**Step: {step}**

Please provide the required information to configure {service}. This wizard will guide you through the setup process step by step.

Follow the prompts carefully and ensure all required fields are filled correctly.`;
}

/**
 * Confirmation prompt
 *
 * Template for confirmation dialogs.
 */
interface ConfirmationPrompt extends IPrompt {
  name: 'confirm_action';
  description: 'Confirmation dialog for destructive actions';
  args: {
    /** Action being confirmed */
    action: string;
    /** Resource affected */
    resource: string;
    /** Warning message */
    warning: string;
  };
  template: `⚠️  WARNING: Confirm Destructive Action

**Action:** {action}
**Resource:** {resource}

{warning}

This action cannot be undone. Please confirm that you want to proceed.`;
}

// ============================================================================
// RESOURCE INTERFACES
// ============================================================================

/**
 * Elicitation patterns resource
 *
 * Documents common elicitation patterns and best practices.
 */
interface PatternsResource extends IResource {
  uri: 'docs://patterns';
  name: 'Elicitation Patterns';
  description: 'Common user input patterns and best practices';
  mimeType: 'text/markdown';
  data: `# Elicitation Patterns

## Single Field Input
Request one piece of information (e.g., API key, name).

**Use case:** Simple configuration, single value input

## Multi-Field Form
Request multiple related fields in one dialog.

**Use case:** Database configuration, user registration

## Confirmation Dialog
Request explicit confirmation for destructive actions.

**Use case:** Delete operations, deployment to production

## Multi-Step Workflow
Break complex configuration into multiple elicitation steps.

**Use case:** Onboarding, complex setup wizards

## Best Practices

1. **Clear Prompts:** Explain what information is needed and why
2. **Validation:** Use field constraints (minLength, format, etc.)
3. **Defaults:** Provide sensible defaults where possible
4. **Handle Actions:** Support accept, decline, and cancel
5. **Error Messages:** Provide helpful error messages for validation failures
6. **Security:** Mask sensitive data in responses
7. **Testing:** Always test without elicitation support (graceful degradation)
`;
}

/**
 * Configuration history resource
 *
 * Dynamic resource tracking configuration operations.
 */
interface ConfigHistoryResource extends IResource {
  uri: 'config://history';
  name: 'Configuration History';
  description: 'Recent configuration operations';
  mimeType: 'application/json';
  dynamic: true;
  data: {
    operations: Array<{
      timestamp: string;
      operation: string;
      service: string;
      success: boolean;
    }>;
    totalOperations: number;
  };
}

// ============================================================================
// SERVER INTERFACE
// ============================================================================

interface ElicitationDemoServer extends IServer {
  name: 'elicitation-demo';
  version: '1.0.0';
  description: 'Production-ready elicitation (user input) demonstration';
}

// ============================================================================
// SERVER IMPLEMENTATION
// ============================================================================

/**
 * Elicitation Demo Server Implementation
 *
 * All tools check for elicitation availability and provide graceful degradation.
 * Demonstrates production-ready error handling and validation patterns.
 */
export default class ElicitationDemo implements ElicitationDemoServer {
  // Track configuration history
  private configHistory: Array<{
    timestamp: string;
    operation: string;
    service: string;
    success: boolean;
  }> = [];

  // Store configurations (in-memory for demo)
  private configurations = new Map<string, { key: string; configuredAt: string }>();

  // ========================================================================
  // TOOL IMPLEMENTATIONS
  // ========================================================================

  /**
   * Configure service with API key
   */
  configureService: ConfigureServiceTool = async (params, context) => {
    // Check if elicitation is available
    if (!context?.elicitInput) {
      this.configHistory.push({
        timestamp: new Date().toISOString(),
        operation: 'configure_service',
        service: params.service,
        success: false,
      });

      return {
        success: false,
        message: 'Elicitation not supported by this client. Cannot request API key.',
        service: params.service,
      };
    }

    try {
      // Map services to their API key formats
      const serviceInfo = {
        openai: { name: 'OpenAI', pattern: 'sk-', minLength: 20 },
        anthropic: { name: 'Anthropic', pattern: 'sk-ant-', minLength: 30 },
        google: { name: 'Google Cloud', pattern: '', minLength: 20 },
        github: { name: 'GitHub', pattern: 'ghp_', minLength: 30 },
        aws: { name: 'AWS', pattern: 'AKIA', minLength: 20 },
      };

      const info = serviceInfo[params.service];

      // Request API key from user
      const result = await context.elicitInput(
        `Please enter your ${info.name} API key`,
        {
          apiKey: {
            type: 'string',
            title: 'API Key',
            description: `Your ${info.name} API key${info.pattern ? ` (starts with ${info.pattern})` : ''}`,
            minLength: info.minLength,
          },
        }
      );

      // Handle user response
      if (result.action === 'accept') {
        const apiKey = result.content?.apiKey as string;

        if (!apiKey) {
          this.configHistory.push({
            timestamp: new Date().toISOString(),
            operation: 'configure_service',
            service: params.service,
            success: false,
          });

          return {
            success: false,
            message: 'No API key provided',
            service: params.service,
          };
        }

        // Validate API key format (basic validation)
        if (info.pattern && !apiKey.startsWith(info.pattern)) {
          return {
            success: false,
            message: `Invalid API key format. ${info.name} keys should start with ${info.pattern}`,
            service: params.service,
          };
        }

        // Store configuration (in production, encrypt this!)
        const configuredAt = new Date().toISOString();
        this.configurations.set(params.service, { key: apiKey, configuredAt });

        // Record success
        this.configHistory.push({
          timestamp: configuredAt,
          operation: 'configure_service',
          service: params.service,
          success: true,
        });

        // Mask the API key for response
        const masked = apiKey.substring(0, 8) + '...';

        return {
          success: true,
          message: `API key configured successfully for ${info.name}`,
          service: params.service,
          maskedKey: masked,
          configuredAt,
        };
      } else if (result.action === 'decline') {
        this.configHistory.push({
          timestamp: new Date().toISOString(),
          operation: 'configure_service',
          service: params.service,
          success: false,
        });

        return {
          success: false,
          message: 'User declined to provide API key',
          service: params.service,
        };
      } else {
        // action === 'cancel'
        return {
          success: false,
          message: 'User cancelled the operation',
          service: params.service,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.configHistory.push({
        timestamp: new Date().toISOString(),
        operation: 'configure_service',
        service: params.service,
        success: false,
      });

      return {
        success: false,
        message: `Elicitation error: ${errorMessage}`,
        service: params.service,
      };
    }
  };

  /**
   * Setup database connection
   */
  setupDatabase: SetupDatabaseTool = async (params, context) => {
    // Check if elicitation is available
    if (!context?.elicitInput) {
      return {
        success: false,
        summary: 'Elicitation not supported by this client. Cannot configure database.',
      };
    }

    try {
      const dbType = params.dbType || 'postgresql';

      // Get default port based on database type
      const defaultPorts = {
        postgresql: 5432,
        mysql: 3306,
        mongodb: 27017,
        redis: 6379,
      };

      // Request database configuration
      const result = await context.elicitInput(
        `Configure ${dbType} database connection`,
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
            default: defaultPorts[dbType],
            min: 1,
            max: 65535,
          },
          database: {
            type: 'string',
            title: 'Database Name',
            description: 'Database/schema name',
            default: dbType === 'redis' ? undefined : 'myapp',
          },
          username: {
            type: 'string',
            title: 'Username',
            description: 'Database username',
            minLength: 1,
          },
          password: {
            type: 'string',
            title: 'Password',
            description: 'Database password',
            minLength: 1,
          },
          useSSL: {
            type: 'boolean',
            title: 'Use SSL',
            description: 'Enable SSL/TLS connection',
            default: true,
          },
          poolSize: {
            type: 'integer',
            title: 'Connection Pool Size',
            description: 'Maximum connections in pool',
            default: 10,
            min: 1,
            max: 100,
          },
        }
      );

      // Handle user response
      if (result.action === 'accept') {
        const { host, port, database, username, password, useSSL, poolSize } = result.content || {};

        if (!host || !port || !username || !password) {
          return {
            success: false,
            summary: 'Missing required configuration fields',
          };
        }

        // In production: validate, test connection, store securely
        const config = {
          host: host as string,
          port: port as number,
          database: database as string,
          useSSL: useSSL as boolean,
          poolSize: poolSize as number,
        };

        this.configHistory.push({
          timestamp: new Date().toISOString(),
          operation: 'setup_database',
          service: dbType,
          success: true,
        });

        return {
          success: true,
          summary: `Database configured: ${dbType}://${host}:${port}/${database || '(default)'} (SSL: ${useSSL ? 'enabled' : 'disabled'}, Pool: ${poolSize})`,
          config,
          connectionTest: 'success', // In production, actually test the connection
        };
      } else if (result.action === 'decline') {
        return {
          success: false,
          summary: 'User declined to configure database',
        };
      } else {
        return {
          success: false,
          summary: 'User cancelled database configuration',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        summary: `Configuration error: ${errorMessage}`,
      };
    }
  };

  /**
   * Delete resource with confirmation
   */
  deleteResource: DeleteResourceTool = async (params, context) => {
    // Check if elicitation is available
    if (!context?.elicitInput) {
      return {
        deleted: false,
        message: 'Elicitation not supported. Cannot confirm deletion.',
        resource: {
          id: params.resourceId,
          type: params.resourceType,
        },
      };
    }

    try {
      // Request confirmation with warning
      const result = await context.elicitInput(
        `⚠️  Confirm deletion of ${params.resourceType}: ${params.resourceId}`,
        {
          confirmation: {
            type: 'string',
            title: 'Type DELETE to confirm',
            description: 'This action cannot be undone. Type DELETE in all caps to confirm.',
            pattern: '^DELETE$',
          },
          reason: {
            type: 'string',
            title: 'Reason (optional)',
            description: 'Why is this resource being deleted?',
          },
        }
      );

      // Handle user response
      if (result.action === 'accept') {
        const { confirmation, reason } = result.content || {};

        if (confirmation !== 'DELETE') {
          return {
            deleted: false,
            message: 'Confirmation text did not match. Deletion cancelled.',
            resource: {
              id: params.resourceId,
              type: params.resourceType,
            },
          };
        }

        // In production: actually delete the resource
        const deletedAt = new Date().toISOString();

        this.configHistory.push({
          timestamp: deletedAt,
          operation: 'delete_resource',
          service: params.resourceType,
          success: true,
        });

        return {
          deleted: true,
          message: `Successfully deleted ${params.resourceType} ${params.resourceId}${reason ? `. Reason: ${reason}` : ''}`,
          resource: {
            id: params.resourceId,
            type: params.resourceType,
          },
          deletedAt,
        };
      } else if (result.action === 'decline') {
        return {
          deleted: false,
          message: 'User declined deletion',
          resource: {
            id: params.resourceId,
            type: params.resourceType,
          },
        };
      } else {
        return {
          deleted: false,
          message: 'User cancelled deletion',
          resource: {
            id: params.resourceId,
            type: params.resourceType,
          },
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        deleted: false,
        message: `Error: ${errorMessage}`,
        resource: {
          id: params.resourceId,
          type: params.resourceType,
        },
      };
    }
  };

  /**
   * Create user account
   */
  createUser: CreateUserTool = async (params, context) => {
    // Check if elicitation is available
    if (!context?.elicitInput) {
      return {
        success: false,
        message: 'Elicitation not supported. Cannot create user.',
      };
    }

    try {
      const tier = params.tier || 'free';

      // Request user information
      const result = await context.elicitInput(
        `Create new ${tier} tier user account`,
        {
          username: {
            type: 'string',
            title: 'Username',
            description: 'Unique username (3-20 characters, alphanumeric)',
            minLength: 3,
            maxLength: 20,
            pattern: '^[a-zA-Z0-9_]+$',
          },
          email: {
            type: 'string',
            title: 'Email Address',
            description: 'Valid email address',
            format: 'email',
          },
          fullName: {
            type: 'string',
            title: 'Full Name',
            description: 'User full name',
            minLength: 1,
            maxLength: 100,
          },
          notifyByEmail: {
            type: 'boolean',
            title: 'Email Notifications',
            description: 'Receive email notifications',
            default: true,
          },
        }
      );

      // Handle user response
      if (result.action === 'accept') {
        const { username, email, fullName, notifyByEmail } = result.content || {};

        if (!username || !email || !fullName) {
          return {
            success: false,
            message: 'Missing required fields',
          };
        }

        // In production: validate uniqueness, create user in database
        const userId = `user_${Date.now()}`;
        const createdAt = new Date().toISOString();

        this.configHistory.push({
          timestamp: createdAt,
          operation: 'create_user',
          service: 'user_management',
          success: true,
        });

        return {
          success: true,
          message: `User account created successfully. Welcome, ${fullName}!`,
          user: {
            id: userId,
            username: username as string,
            email: email as string,
            tier,
            createdAt,
          },
        };
      } else if (result.action === 'decline') {
        return {
          success: false,
          message: 'User declined account creation',
        };
      } else {
        return {
          success: false,
          message: 'User cancelled account creation',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Error: ${errorMessage}`,
      };
    }
  };

  /**
   * Deploy application
   */
  deployApplication: DeployApplicationTool = async (params, context) => {
    // Check if elicitation is available
    if (!context?.elicitInput) {
      return {
        deployed: false,
        status: 'Elicitation not supported. Cannot deploy.',
      };
    }

    try {
      // Request deployment configuration
      const result = await context.elicitInput(
        `Deploy ${params.appName} to ${params.environment}`,
        {
          region: {
            type: 'string',
            title: 'Region',
            description: 'Deployment region',
            default: 'us-east-1',
          },
          instances: {
            type: 'integer',
            title: 'Instance Count',
            description: 'Number of instances to deploy',
            default: params.environment === 'production' ? 3 : 1,
            min: 1,
            max: 10,
          },
          autoScale: {
            type: 'boolean',
            title: 'Auto-scaling',
            description: 'Enable automatic scaling',
            default: params.environment === 'production',
          },
          confirmProduction: {
            type: 'boolean',
            title: 'Confirm Production Deploy',
            description: params.environment === 'production'
              ? 'I understand this will deploy to PRODUCTION'
              : 'Confirmation not required for non-production',
            default: false,
          },
        }
      );

      // Handle user response
      if (result.action === 'accept') {
        const { region, instances, autoScale, confirmProduction } = result.content || {};

        // Extra check for production deployments
        if (params.environment === 'production' && !confirmProduction) {
          return {
            deployed: false,
            status: 'Production deployment requires explicit confirmation',
          };
        }

        // In production: actually trigger deployment
        const deployment = {
          appName: params.appName,
          environment: params.environment,
          region: region as string,
          instances: instances as number,
          autoScale: autoScale as boolean,
        };

        this.configHistory.push({
          timestamp: new Date().toISOString(),
          operation: 'deploy_application',
          service: params.appName,
          success: true,
        });

        const url = `https://${params.appName}.${params.environment}.example.com`;

        return {
          deployed: true,
          status: `Deployment initiated successfully to ${params.environment}`,
          deployment,
          url,
        };
      } else if (result.action === 'decline') {
        return {
          deployed: false,
          status: 'User declined deployment',
        };
      } else {
        return {
          deployed: false,
          status: 'User cancelled deployment',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        deployed: false,
        status: `Error: ${errorMessage}`,
      };
    }
  };

  // ========================================================================
  // STATIC PROMPTS - No implementation needed
  // ========================================================================

  // ConfigWizardPrompt - template auto-interpolated
  // ConfirmationPrompt - template auto-interpolated

  // ========================================================================
  // STATIC RESOURCES - No implementation needed
  // ========================================================================

  // PatternsResource - markdown documentation served as-is

  // ========================================================================
  // DYNAMIC RESOURCES - Require implementation
  // ========================================================================

  /**
   * Configuration history resource
   */
  'config://history': ConfigHistoryResource = async () => {
    return {
      operations: this.configHistory.slice(-10), // Last 10 operations
      totalOperations: this.configHistory.length,
    };
  };
}
