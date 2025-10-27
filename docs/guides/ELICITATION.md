# Elicitation Guide - User Input Requests

**Implementation requirement:** ✅ Always required - uses `context.elicitInput()` within tool implementations

**Method naming:** N/A (context feature used within tool logic, not named separately)

---

Learn how to request user input from MCP clients using the elicitation capability.

**What is Elicitation?** A server-side capability that allows your tools to request structured input from users through the MCP client, enabling interactive workflows like configuration, confirmations, and form data collection.

**See working examples:**
- Foundation: [examples/interface-elicitation-foundation.ts](../../examples/interface-elicitation-foundation.ts)
- Advanced: [examples/interface-elicitation.ts](../../examples/interface-elicitation.ts)
- Comprehensive: [examples/interface-protocol-comprehensive.ts](../../examples/interface-protocol-comprehensive.ts)

---

## Overview

Elicitation enables MCP servers to request user input through the client during tool execution. This is useful when:
- **Configuration**: Collect API keys, credentials, or settings
- **Confirmations**: Request user approval before destructive operations
- **Form Data**: Gather structured information across multiple fields
- **Interactive Workflows**: Build multi-step processes with user interaction
- **Dynamic Parameters**: Request additional context based on initial input

Elicitation is a **runtime capability** accessed through the `HandlerContext` in tool implementations. The `IElicit` interface is only for type definitions.

---

## IElicit Interface

The elicitation interface defines the structure for user input requests:

```typescript
import type { IElicit } from 'simply-mcp';

/**
 * Elicitation request structure
 */
interface IElicit<TArgs = any, TResult = any> {
  /**
   * The prompt message to show the user
   * This explains what input is being requested and why
   */
  prompt: string;

  /**
   * Input field schema defining what data to collect
   * Uses JSON Schema format with field definitions
   *
   * Each field can be:
   * - string: Text input with optional format validation (email, uri, date, etc.)
   * - number/integer: Numeric input with optional min/max constraints
   * - boolean: Checkbox or toggle input
   */
  args: TArgs;

  /**
   * Expected result structure (for type checking)
   * This is the shape of the data returned when action is 'accept'
   */
  result: TResult;
}
```

**Elicitation Response:**
```typescript
interface ElicitResult {
  action: 'accept' | 'decline' | 'cancel';
  content?: Record<string, any>;  // Field values (when action is 'accept')
}
```

---

## Basic Usage

### Simple Text Input

Request a single piece of information from the user:

```typescript
import type { ITool, IServer } from 'simply-mcp';

interface ConfigureApiTool extends ITool {
  name: 'configure_api';
  description: 'Configure API key';
  params: {};
  result: {
    status: string;
    message: string;
  };
}

interface MyServer extends IServer {
  name: 'api-service';
  version: '1.0.0';
}

export default class MyServerImpl implements MyServer {
  configureApi: ConfigureApiTool = async (params, context) => {
    // Check if elicitation is available
    if (!context.elicitInput) {
      throw new Error('User input not supported by this client');
    }

    // Request API key from user
    const result = await context.elicitInput(
      'Please enter your API key',
      {
        apiKey: {
          type: 'string',
          title: 'API Key',
          description: 'Your service API key',
          minLength: 10
        }
      }
    );

    // Handle user response
    if (result.action === 'accept' && result.content) {
      const apiKey = result.content.apiKey;
      // Store API key securely
      return {
        status: 'configured',
        message: 'API key configured successfully'
      };
    } else if (result.action === 'decline') {
      return {
        status: 'declined',
        message: 'User declined to provide API key'
      };
    } else {
      return {
        status: 'cancelled',
        message: 'Configuration cancelled by user'
      };
    }
  };
}
```

**Key points:**
- Access elicitation via `context.elicitInput()` in tool handlers
- Always check if `context.elicitInput` exists before using
- Define input fields with JSON Schema properties
- Handle all response actions: accept, decline, cancel

---

## Using in Tool Handlers

### Confirmation Dialog

Request user confirmation before destructive operations:

```typescript
interface DeleteFileTool extends ITool {
  name: 'delete_file';
  description: 'Delete a file with confirmation';
  params: {
    /** Path to file to delete */
    filepath: string;
  };
  result: {
    deleted: boolean;
    message: string;
  };
}

export default class FileManager implements IServer {
  deleteFile: DeleteFileTool = async (params, context) => {
    if (!context.elicitInput) {
      throw new Error('Cannot confirm deletion - elicitation not available');
    }

    // Request confirmation
    const result = await context.elicitInput(
      `Are you sure you want to delete ${params.filepath}? This cannot be undone.`,
      {
        confirm: {
          type: 'boolean',
          title: 'Confirm Deletion',
          description: 'Check to confirm you want to delete this file',
          default: false
        }
      }
    );

    if (result.action === 'accept' && result.content?.confirm === true) {
      // Perform deletion
      await deleteFile(params.filepath);
      return {
        deleted: true,
        message: `File ${params.filepath} deleted successfully`
      };
    } else {
      return {
        deleted: false,
        message: 'Deletion cancelled'
      };
    }
  };
}

async function deleteFile(path: string): Promise<void> {
  // Implementation
}
```

### Form-like Input

Collect multiple pieces of structured information:

```typescript
interface CreateUserTool extends ITool {
  name: 'create_user';
  description: 'Create a new user with interactive form';
  params: {
    /** User role */
    role: 'admin' | 'user' | 'guest';
  };
  result: {
    userId?: string;
    status: string;
  };
}

export default class UserManager implements IServer {
  createUser: CreateUserTool = async (params, context) => {
    if (!context.elicitInput) {
      throw new Error('Interactive user creation not available');
    }

    // Multi-field form
    const result = await context.elicitInput(
      'Enter user information',
      {
        username: {
          type: 'string',
          title: 'Username',
          description: 'Unique username (3-20 characters)',
          minLength: 3,
          maxLength: 20,
          pattern: '^[a-zA-Z0-9_]+$'
        },
        email: {
          type: 'string',
          title: 'Email',
          description: 'User email address',
          format: 'email'
        },
        age: {
          type: 'integer',
          title: 'Age',
          description: 'User age (18+)',
          min: 18,
          max: 150
        },
        sendWelcome: {
          type: 'boolean',
          title: 'Send Welcome Email',
          description: 'Send a welcome email to the user',
          default: true
        }
      }
    );

    if (result.action === 'accept' && result.content) {
      const userId = await createUserInDatabase({
        ...result.content,
        role: params.role
      });

      return {
        userId,
        status: 'User created successfully'
      };
    } else {
      return {
        status: 'User creation cancelled'
      };
    }
  };
}

async function createUserInDatabase(data: any): Promise<string> {
  // Implementation
  return 'user-' + Math.random().toString(36).substr(2, 9);
}
```

---

## Action Handling

### Accept Action

User provided input and confirmed:

```typescript
configureTool: ConfigureTool = async (params, context) => {
  const result = await context.elicitInput!('Enter configuration', {
    apiKey: { type: 'string', title: 'API Key', description: 'Your API key' }
  });

  if (result.action === 'accept' && result.content) {
    // User provided input
    const { apiKey } = result.content;

    // Validate and store
    if (apiKey.length < 10) {
      throw new Error('API key too short');
    }

    await storeApiKey(apiKey);
    return { status: 'configured' };
  }

  // Handle other actions...
};
```

### Handling Different Actions

All elicitation actions follow the same pattern shown above:

| Action | Meaning | Typical Response |
|--------|---------|------------------|
| `accept` | User provided input and confirmed | Process the `result.content` data |
| `decline` | User explicitly declined | Return graceful error or cancel operation |
| `cancel` | User cancelled dialog | Abort workflow, no action taken |

The Accept example above demonstrates the complete pattern for all action types.

---

## Multi-Step Flows

### Sequential Elicitation

Chain multiple elicitation requests for complex workflows:

```typescript
interface DeployAppTool extends ITool {
  name: 'deploy_app';
  description: 'Deploy application with multi-step configuration';
  params: {
    appName: string;
  };
  result: {
    deployed: boolean;
    url?: string;
    message: string;
  };
}

export default class Deployer implements IServer {
  deployApp: DeployAppTool = async (params, context) => {
    if (!context.elicitInput) {
      throw new Error('Interactive deployment not available');
    }

    // Step 1: Environment selection
    const envResult = await context.elicitInput(
      'Select deployment environment',
      {
        environment: {
          type: 'string',
          title: 'Environment',
          description: 'Target deployment environment',
          enum: ['development', 'staging', 'production']
        }
      }
    );

    if (envResult.action !== 'accept' || !envResult.content) {
      return {
        deployed: false,
        message: 'Deployment cancelled at environment selection'
      };
    }

    const environment = envResult.content.environment;

    // Step 2: Confirmation with details
    const confirmResult = await context.elicitInput(
      `Deploy ${params.appName} to ${environment}?`,
      {
        confirm: {
          type: 'boolean',
          title: 'Confirm Deployment',
          description: `Deploying to ${environment} - this may take several minutes`,
          default: false
        },
        notifyOnComplete: {
          type: 'boolean',
          title: 'Send Notification',
          description: 'Notify when deployment completes',
          default: true
        }
      }
    );

    if (confirmResult.action !== 'accept' || !confirmResult.content?.confirm) {
      return {
        deployed: false,
        message: 'Deployment cancelled'
      };
    }

    // Perform deployment
    const url = await deployToEnvironment(params.appName, environment);

    if (confirmResult.content.notifyOnComplete) {
      await sendNotification(`${params.appName} deployed to ${url}`);
    }

    return {
      deployed: true,
      url,
      message: `Successfully deployed to ${environment}`
    };
  };
}

async function deployToEnvironment(app: string, env: string): Promise<string> {
  // Implementation
  return `https://${app}.${env}.example.com`;
}

async function sendNotification(message: string): Promise<void> {
  // Implementation
}
```

### Complex Form Validation

Validate user input and re-prompt if invalid:

```typescript
interface RegisterServiceTool extends ITool {
  name: 'register_service';
  description: 'Register external service with validation';
  params: {};
  result: {
    registered: boolean;
    serviceId?: string;
  };
}

export default class ServiceRegistry implements IServer {
  registerService: RegisterServiceTool = async (params, context) => {
    if (!context.elicitInput) {
      throw new Error('Interactive registration not available');
    }

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      const result = await context.elicitInput(
        attempts === 0
          ? 'Register a new service'
          : `Invalid configuration (attempt ${attempts + 1}/${maxAttempts}). Please try again.`,
        {
          serviceName: {
            type: 'string',
            title: 'Service Name',
            description: 'Unique service name',
            minLength: 3,
            maxLength: 50
          },
          endpoint: {
            type: 'string',
            title: 'Endpoint URL',
            description: 'Service API endpoint',
            format: 'uri'
          },
          apiKey: {
            type: 'string',
            title: 'API Key',
            description: 'Service API key for authentication',
            minLength: 20
          }
        }
      );

      if (result.action !== 'accept' || !result.content) {
        return {
          registered: false
        };
      }

      // Validate configuration
      const validation = await validateServiceConfig(result.content);

      if (validation.valid) {
        const serviceId = await registerService(result.content);
        return {
          registered: true,
          serviceId
        };
      }

      attempts++;
    }

    return {
      registered: false
    };
  };
}

async function validateServiceConfig(config: any): Promise<{ valid: boolean }> {
  // Implementation - test endpoint connectivity, validate API key, etc.
  return { valid: true };
}

async function registerService(config: any): Promise<string> {
  // Implementation
  return 'svc-' + Math.random().toString(36).substr(2, 9);
}
```

---

## Best Practices

### Clear Prompts

Write clear, concise prompts that explain what input is needed and why:

```typescript
// Good: Clear and specific
const result = await context.elicitInput!(
  'Enter your OpenAI API key to enable AI features. This will be stored securely.',
  {
    apiKey: {
      type: 'string',
      title: 'OpenAI API Key',
      description: 'Your API key (starts with sk-)',
      minLength: 20
    }
  }
);

// Bad: Vague and unclear
const result = await context.elicitInput!(
  'Enter key',
  {
    key: { type: 'string', title: 'Key', description: 'Key' }
  }
);
```

### Validation Patterns

Use JSON Schema constraints to validate input:

```typescript
const result = await context.elicitInput!(
  'Configure database connection',
  {
    host: {
      type: 'string',
      title: 'Database Host',
      description: 'Hostname or IP address',
      pattern: '^[a-zA-Z0-9.-]+$'  // Valid hostname pattern
    },
    port: {
      type: 'integer',
      title: 'Port',
      description: 'Database port number',
      min: 1,
      max: 65535
    },
    username: {
      type: 'string',
      title: 'Username',
      description: 'Database username',
      minLength: 1,
      maxLength: 100
    }
  }
);
```

### Default Values

Provide sensible defaults when appropriate:

```typescript
const result = await context.elicitInput!(
  'Configure deployment settings',
  {
    replicas: {
      type: 'integer',
      title: 'Replicas',
      description: 'Number of instances',
      default: 3,
      min: 1,
      max: 10
    },
    autoScale: {
      type: 'boolean',
      title: 'Auto-scaling',
      description: 'Enable automatic scaling',
      default: true  // Sensible default
    }
  }
);
```

### Security Considerations

Never expose sensitive data in prompts or descriptions:

```typescript
// Good: Secure prompt
const result = await context.elicitInput!(
  'Enter your password',
  {
    password: {
      type: 'string',
      title: 'Password',
      description: 'Your account password (not stored)',
      minLength: 8
    }
  }
);

// Bad: Exposing sensitive data
const result = await context.elicitInput!(
  `Your current password is ${currentPassword}. Enter new password:`,  // NEVER DO THIS
  { newPassword: { type: 'string', title: 'New Password' } }
);
```

---

## Error Handling

### User Cancellation

Handle cases where user cancels input:

```typescript
setupTool: SetupTool = async (params, context) => {
  if (!context.elicitInput) {
    throw new Error('Interactive setup not available');
  }

  const result = await context.elicitInput!(
    'Complete setup',
    { apiKey: { type: 'string', title: 'API Key' } }
  );

  if (result.action === 'cancel') {
    // Graceful handling
    return {
      configured: false,
      message: 'Setup cancelled by user'
    };
  }

  if (result.action === 'accept' && result.content) {
    await configure(result.content);
    return {
      configured: true,
      message: 'Setup complete'
    };
  }

  return {
    configured: false,
    message: 'Setup declined'
  };
};
```

### Validation Failures

Handle invalid input gracefully:

```typescript
validateAndProcessTool: ValidateAndProcessTool = async (params, context) => {
  const result = await context.elicitInput!(
    'Enter configuration',
    { config: { type: 'string', title: 'Config' } }
  );

  if (result.action !== 'accept' || !result.content) {
    return { success: false, error: 'Input not provided' };
  }

  try {
    // Validate input
    const validated = validateConfig(result.content.config);
    await processConfig(validated);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Validation failed: ${error.message}`
    };
  }
};

function validateConfig(config: string): any {
  // Throw on invalid config
  if (!config || config.length < 5) {
    throw new Error('Configuration too short');
  }
  return JSON.parse(config);
}
```

### Missing Capability

Always check if elicitation is available:

```typescript
interactiveTool: InteractiveTool = async (params, context) => {
  if (!context.elicitInput) {
    // Fallback to non-interactive mode
    console.log('Elicitation not available - using defaults');
    return await processWithDefaults(params);
  }

  // Interactive mode
  const result = await context.elicitInput!(...);
  return await processWithUserInput(result.content);
};
```

---

## Integration Examples

See `examples/interface-protocol-comprehensive.ts` for integration patterns combining multiple protocol features.

---

## Examples

**See working examples:**
- Foundation: [examples/interface-elicitation-foundation.ts](../../examples/interface-elicitation-foundation.ts)
- Advanced: [examples/interface-elicitation.ts](../../examples/interface-elicitation.ts)
- Comprehensive: [examples/interface-protocol-comprehensive.ts](../../examples/interface-protocol-comprehensive.ts)

---

## Next Steps

- **Request LLM completions?** See [SAMPLING.md](./SAMPLING.md)
- **List client roots?** See [ROOTS.md](./ROOTS.md)
- **Add subscriptions?** See [SUBSCRIPTIONS.md](./SUBSCRIPTIONS.md)
- **Learn more about Interface API?** See [API_PROTOCOL.md](./API_PROTOCOL.md)

---

**Need help?** Check [docs/README.md](../README.md) for the full documentation index.
