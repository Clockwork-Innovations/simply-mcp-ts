# MCP Tool Definition and Registration System Design

> **Note:** This document defines the complete type system for the MCP framework. For implementation planning and phased development, see [OVERVIEW.md](./OVERVIEW.md).

## Related Documentation
- **[OVERVIEW.md](./OVERVIEW.md)** - Phased implementation plan
- **[README.md](../../README.md)** - Framework documentation index
- **[Handler Development Guide](../guides/HANDLER-DEVELOPMENT.md)** - Practical handler development guide

---

## 1. TypeScript Interface Definitions

### Core Tool Types

```typescript
/**
 * Base tool definition interface
 */
interface ToolDefinition {
  /** Unique identifier for the tool */
  name: string;

  /** Human-readable description of what the tool does */
  description: string;

  /** JSON Schema for input parameters */
  inputSchema: JSONSchema;

  /** Handler configuration - defines how the tool executes */
  handler: ToolHandler;

  /** Optional metadata */
  metadata?: ToolMetadata;

  /** Lifecycle hooks */
  hooks?: ToolHooks;

  /** Access control configuration */
  access?: AccessControl;

  /** Performance configuration */
  performance?: PerformanceConfig;

  /** Environment-specific overrides */
  environments?: Record<string, Partial<ToolDefinition>>;
}

/**
 * Tool handler union type supporting multiple definition styles
 */
type ToolHandler =
  | InlineHandler
  | FileHandler
  | BuiltInHandler
  | PackageHandler
  | CompositeHandler;

/**
 * Inline JavaScript/TypeScript code handler
 */
interface InlineHandler {
  type: 'inline';

  /** JavaScript/TypeScript code as string */
  code: string;

  /** Optional TypeScript compiler options */
  tsConfig?: Record<string, any>;

  /** Dependencies that should be available in execution context */
  dependencies?: string[];

  /** Whether to cache the compiled function */
  cache?: boolean;
}

/**
 * External file reference handler
 */
interface FileHandler {
  type: 'file';

  /** Path to the handler file (relative or absolute) */
  path: string;

  /** Export name to use (default: 'default') */
  exportName?: string;

  /** Whether to watch file for changes and reload */
  watch?: boolean;

  /** File type for proper loading */
  fileType?: 'js' | 'ts' | 'mjs' | 'cjs';
}

/**
 * Built-in handler types
 */
interface BuiltInHandler {
  type: 'builtin';

  /** Built-in handler name */
  handler: BuiltInHandlerType;

  /** Configuration specific to the built-in handler */
  config: Record<string, any>;
}

type BuiltInHandlerType =
  | 'echo'           // Returns input as-is
  | 'fetch'          // HTTP requests
  | 'file-read'      // Read file contents
  | 'file-write'     // Write file contents
  | 'file-list'      // List directory contents
  | 'shell'          // Execute shell commands
  | 'template'       // Template rendering
  | 'transform'      // Data transformation
  | 'aggregate'      // Combine multiple tool outputs
  | 'proxy';         // Proxy to another service

/**
 * NPM package handler
 */
interface PackageHandler {
  type: 'package';

  /** NPM package name */
  package: string;

  /** Package version or semver range */
  version?: string;

  /** Export path within the package */
  exportPath?: string;

  /** Whether to auto-install if missing */
  autoInstall?: boolean;

  /** Package registry URL (for private packages) */
  registry?: string;
}

/**
 * Composite handler - chains multiple handlers
 */
interface CompositeHandler {
  type: 'composite';

  /** Execution strategy */
  strategy: 'pipeline' | 'parallel' | 'fallback' | 'conditional';

  /** Handler chain */
  handlers: ToolHandler[];

  /** Condition function for conditional strategy */
  condition?: string; // JavaScript expression
}

/**
 * Tool metadata
 */
interface ToolMetadata {
  /** Tool version */
  version?: string;

  /** Author information */
  author?: string | AuthorInfo;

  /** License identifier */
  license?: string;

  /** Tags for categorization */
  tags?: string[];

  /** Link to documentation */
  documentation?: string;

  /** Examples of usage */
  examples?: ToolExample[];

  /** Deprecation notice */
  deprecated?: boolean | DeprecationInfo;

  /** Custom metadata fields */
  [key: string]: any;
}

interface AuthorInfo {
  name: string;
  email?: string;
  url?: string;
}

interface DeprecationInfo {
  message: string;
  since?: string;
  replacement?: string;
}

interface ToolExample {
  name: string;
  description?: string;
  input: Record<string, any>;
  expectedOutput?: any;
}

/**
 * Lifecycle hooks for tool execution
 */
interface ToolHooks {
  /** Called before parameter validation */
  preValidate?: HookFunction;

  /** Called after validation, before execution */
  preExecute?: HookFunction;

  /** Called after successful execution */
  postExecute?: HookFunction;

  /** Called on execution error */
  onError?: ErrorHookFunction;

  /** Called after execution (success or failure) */
  finally?: HookFunction;

  /** Called when tool is first loaded */
  onLoad?: () => void | Promise<void>;

  /** Called when tool is unloaded */
  onUnload?: () => void | Promise<void>;
}

type HookFunction = (context: ExecutionContext) => void | Promise<void> | ExecutionContext;
type ErrorHookFunction = (error: Error, context: ExecutionContext) => void | Promise<void>;

/**
 * Execution context passed to handlers and hooks
 */
interface ExecutionContext {
  /** Tool name */
  tool: string;

  /** Input parameters */
  input: Record<string, any>;

  /** Execution result (available in post hooks) */
  result?: any;

  /** Error (available in error hooks) */
  error?: Error;

  /** Execution metadata */
  metadata: {
    /** Unique execution ID */
    executionId: string;

    /** Start timestamp */
    startTime: number;

    /** End timestamp (in post hooks) */
    endTime?: number;

    /** User/caller information */
    caller?: CallerInfo;

    /** Environment name */
    environment: string;

    /** Trace context for distributed tracing */
    traceContext?: Record<string, any>;
  };

  /** Logger instance */
  logger: Logger;

  /** Cache interface */
  cache: CacheInterface;

  /** Storage interface for persistent data */
  storage: StorageInterface;

  /** Ability to call other tools */
  callTool: (name: string, input: Record<string, any>) => Promise<any>;

  /** Custom context data (can be modified by hooks) */
  custom: Record<string, any>;
}

interface CallerInfo {
  id: string;
  type: 'user' | 'system' | 'service';
  permissions?: string[];
  metadata?: Record<string, any>;
}

/**
 * Access control configuration
 */
interface AccessControl {
  /** Whether the tool is enabled */
  enabled?: boolean;

  /** Required permissions */
  permissions?: string[];

  /** Access control strategy */
  strategy?: 'allow' | 'deny';

  /** Allowed callers (user IDs, service names, etc.) */
  allowList?: string[];

  /** Denied callers */
  denyList?: string[];

  /** Rate limiting per caller */
  rateLimiting?: RateLimitConfig;

  /** IP restrictions */
  ipRestrictions?: IPRestrictions;

  /** Time-based restrictions */
  timeRestrictions?: TimeRestrictions;
}

interface RateLimitConfig {
  /** Maximum calls per window */
  maxCalls: number;

  /** Time window in milliseconds */
  windowMs: number;

  /** Strategy when limit exceeded */
  strategy: 'reject' | 'queue' | 'throttle';

  /** Per-caller limits (overrides default) */
  perCaller?: Record<string, { maxCalls: number; windowMs: number }>;
}

interface IPRestrictions {
  /** Allowed IP addresses or CIDR ranges */
  allow?: string[];

  /** Denied IP addresses or CIDR ranges */
  deny?: string[];
}

interface TimeRestrictions {
  /** Allowed time windows (cron expressions or time ranges) */
  allow?: string[];

  /** Denied time windows */
  deny?: string[];

  /** Timezone for time evaluation */
  timezone?: string;
}

/**
 * Performance configuration
 */
interface PerformanceConfig {
  /** Timeout in milliseconds */
  timeout?: number;

  /** Caching configuration */
  cache?: CacheConfig;

  /** Retry configuration */
  retry?: RetryConfig;

  /** Circuit breaker configuration */
  circuitBreaker?: CircuitBreakerConfig;

  /** Concurrency limits */
  concurrency?: ConcurrencyConfig;
}

interface CacheConfig {
  /** Whether caching is enabled */
  enabled: boolean;

  /** Cache strategy */
  strategy: 'memory' | 'redis' | 'file' | 'custom';

  /** TTL in milliseconds */
  ttl?: number;

  /** Cache key generator function (as string) */
  keyGenerator?: string;

  /** Custom cache backend (for 'custom' strategy) */
  backend?: string;

  /** Cache invalidation patterns */
  invalidation?: CacheInvalidation;
}

interface CacheInvalidation {
  /** Tools that should invalidate this cache when called */
  invalidateOn?: string[];

  /** Custom invalidation function */
  customInvalidator?: string;
}

interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number;

  /** Delay between retries in milliseconds */
  delayMs: number;

  /** Backoff strategy */
  backoff: 'fixed' | 'exponential' | 'linear';

  /** Multiplier for backoff strategies */
  backoffMultiplier?: number;

  /** Maximum delay cap */
  maxDelayMs?: number;

  /** Conditions for retrying (error types, status codes, etc.) */
  retryOn?: string[];
}

interface CircuitBreakerConfig {
  /** Failure threshold before opening circuit */
  threshold: number;

  /** Time window for counting failures (ms) */
  windowMs: number;

  /** Time to wait before attempting reset (ms) */
  resetTimeoutMs: number;

  /** Half-open state request limit */
  halfOpenLimit?: number;
}

interface ConcurrencyConfig {
  /** Maximum concurrent executions */
  maxConcurrent: number;

  /** Queue strategy when limit reached */
  queueStrategy: 'reject' | 'wait' | 'oldest';

  /** Maximum queue size */
  maxQueueSize?: number;
}

/**
 * Logger interface
 */
interface Logger {
  debug(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  trace(message: string, meta?: Record<string, any>): void;
}

/**
 * Cache interface
 */
interface CacheInterface {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
}

/**
 * Storage interface for persistent data
 */
interface StorageInterface {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
  clear(): Promise<void>;
}

/**
 * JSON Schema type (simplified)
 */
interface JSONSchema {
  type?: string | string[];
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: any[];
  description?: string;
  default?: any;
  additionalProperties?: boolean | JSONSchema;
  [key: string]: any;
}

/**
 * Tool registry configuration
 */
interface ToolRegistryConfig {
  /** Base configuration path */
  configPath?: string;

  /** Tool definition paths (glob patterns supported) */
  toolPaths?: string[];

  /** Auto-discovery settings */
  autoDiscover?: AutoDiscoveryConfig;

  /** Global defaults */
  defaults?: Partial<ToolDefinition>;

  /** Plugin configurations */
  plugins?: PluginConfig[];

  /** Logging configuration */
  logging?: LoggingConfig;

  /** Environment settings */
  environments?: Record<string, EnvironmentConfig>;

  /** Current environment */
  environment?: string;

  /** Validation settings */
  validation?: ValidationConfig;
}

interface AutoDiscoveryConfig {
  /** Enable auto-discovery */
  enabled: boolean;

  /** Directories to scan */
  directories: string[];

  /** File patterns to match */
  patterns: string[];

  /** Whether to watch for changes */
  watch: boolean;

  /** Exclude patterns */
  exclude?: string[];
}

interface PluginConfig {
  /** Plugin name/identifier */
  name: string;

  /** Plugin type */
  type: 'file' | 'package' | 'inline';

  /** Plugin source (path or package name) */
  source: string;

  /** Plugin-specific configuration */
  config?: Record<string, any>;

  /** Whether plugin is enabled */
  enabled?: boolean;
}

interface LoggingConfig {
  /** Log level */
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error';

  /** Log format */
  format: 'json' | 'text' | 'pretty';

  /** Log outputs */
  outputs: LogOutput[];

  /** Whether to log tool inputs/outputs */
  logToolData?: boolean;

  /** Fields to redact from logs */
  redactFields?: string[];
}

interface LogOutput {
  type: 'console' | 'file' | 'http' | 'custom';
  config: Record<string, any>;
}

interface EnvironmentConfig {
  /** Environment-specific tool overrides */
  tools?: Record<string, Partial<ToolDefinition>>;

  /** Environment variables */
  env?: Record<string, string>;

  /** Feature flags */
  features?: Record<string, boolean>;

  /** Performance settings */
  performance?: Partial<PerformanceConfig>;
}

interface ValidationConfig {
  /** Strict mode (fail on unknown properties) */
  strict?: boolean;

  /** Validate input schemas */
  validateInput?: boolean;

  /** Validate output schemas */
  validateOutput?: boolean;

  /** Custom validators */
  customValidators?: Record<string, string>;
}

/**
 * Tool registry interface
 */
interface ToolRegistry {
  /** Register a single tool */
  register(tool: ToolDefinition): Promise<void>;

  /** Register multiple tools */
  registerMany(tools: ToolDefinition[]): Promise<void>;

  /** Unregister a tool */
  unregister(name: string): Promise<void>;

  /** Get a tool definition */
  get(name: string): ToolDefinition | undefined;

  /** List all registered tools */
  list(): ToolDefinition[];

  /** Check if a tool is registered */
  has(name: string): boolean;

  /** Execute a tool */
  execute(name: string, input: Record<string, any>, context?: Partial<ExecutionContext>): Promise<any>;

  /** Reload a tool (useful for file-based tools) */
  reload(name: string): Promise<void>;

  /** Validate a tool definition */
  validate(tool: ToolDefinition): ValidationResult;

  /** Get registry statistics */
  getStats(): RegistryStats;
}

interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

interface ValidationError {
  path: string;
  message: string;
  code: string;
}

interface RegistryStats {
  totalTools: number;
  enabledTools: number;
  disabledTools: number;
  toolsByType: Record<string, number>;
  executionStats: Record<string, ExecutionStats>;
}

interface ExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecuted?: number;
}

/**
 * Plugin system interface
 */
interface Plugin {
  /** Plugin name */
  name: string;

  /** Plugin version */
  version: string;

  /** Initialize the plugin */
  initialize(registry: ToolRegistry, config: Record<string, any>): Promise<void>;

  /** Shutdown the plugin */
  shutdown(): Promise<void>;

  /** Optional: Middleware function */
  middleware?(context: ExecutionContext, next: () => Promise<any>): Promise<any>;

  /** Optional: Tool transformer */
  transformTool?(tool: ToolDefinition): ToolDefinition;

  /** Optional: Custom validators */
  validators?: Record<string, (value: any, schema: JSONSchema) => boolean>;

  /** Optional: Custom cache backend */
  cacheBackend?: CacheInterface;

  /** Optional: Custom storage backend */
  storageBackend?: StorageInterface;

  /** Optional: Lifecycle hooks */
  hooks?: {
    onToolRegister?(tool: ToolDefinition): void | Promise<void>;
    onToolUnregister?(toolName: string): void | Promise<void>;
    onToolExecute?(context: ExecutionContext): void | Promise<void>;
  };
}
```

---

## 2. JSON Schema for Tool Configuration Validation

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://mcp.anthropic.com/schemas/tool-definition.json",
  "title": "MCP Tool Definition",
  "description": "Schema for defining MCP tools",
  "type": "object",
  "required": ["name", "description", "inputSchema", "handler"],
  "properties": {
    "name": {
      "type": "string",
      "pattern": "^[a-zA-Z][a-zA-Z0-9_-]*$",
      "description": "Unique tool identifier (alphanumeric, underscore, hyphen)"
    },
    "description": {
      "type": "string",
      "minLength": 10,
      "maxLength": 500,
      "description": "Human-readable description of the tool"
    },
    "inputSchema": {
      "$ref": "#/definitions/jsonSchema",
      "description": "JSON Schema for input parameters"
    },
    "handler": {
      "oneOf": [
        { "$ref": "#/definitions/inlineHandler" },
        { "$ref": "#/definitions/fileHandler" },
        { "$ref": "#/definitions/builtInHandler" },
        { "$ref": "#/definitions/packageHandler" },
        { "$ref": "#/definitions/compositeHandler" }
      ],
      "description": "Handler configuration"
    },
    "metadata": {
      "$ref": "#/definitions/metadata",
      "description": "Optional tool metadata"
    },
    "hooks": {
      "$ref": "#/definitions/hooks",
      "description": "Lifecycle hooks"
    },
    "access": {
      "$ref": "#/definitions/accessControl",
      "description": "Access control configuration"
    },
    "performance": {
      "$ref": "#/definitions/performanceConfig",
      "description": "Performance configuration"
    },
    "environments": {
      "type": "object",
      "additionalProperties": {
        "$ref": "#/definitions/toolDefinitionPartial"
      },
      "description": "Environment-specific overrides"
    }
  },
  "definitions": {
    "inlineHandler": {
      "type": "object",
      "required": ["type", "code"],
      "properties": {
        "type": { "const": "inline" },
        "code": {
          "type": "string",
          "minLength": 1,
          "description": "JavaScript/TypeScript code"
        },
        "tsConfig": {
          "type": "object",
          "description": "TypeScript compiler options"
        },
        "dependencies": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Required dependencies"
        },
        "cache": {
          "type": "boolean",
          "default": true,
          "description": "Cache compiled function"
        }
      }
    },
    "fileHandler": {
      "type": "object",
      "required": ["type", "path"],
      "properties": {
        "type": { "const": "file" },
        "path": {
          "type": "string",
          "description": "Path to handler file"
        },
        "exportName": {
          "type": "string",
          "default": "default",
          "description": "Export name to use"
        },
        "watch": {
          "type": "boolean",
          "default": false,
          "description": "Watch file for changes"
        },
        "fileType": {
          "enum": ["js", "ts", "mjs", "cjs"],
          "description": "File type"
        }
      }
    },
    "builtInHandler": {
      "type": "object",
      "required": ["type", "handler", "config"],
      "properties": {
        "type": { "const": "builtin" },
        "handler": {
          "enum": [
            "echo",
            "fetch",
            "file-read",
            "file-write",
            "file-list",
            "shell",
            "template",
            "transform",
            "aggregate",
            "proxy"
          ],
          "description": "Built-in handler type"
        },
        "config": {
          "type": "object",
          "description": "Handler-specific configuration"
        }
      }
    },
    "packageHandler": {
      "type": "object",
      "required": ["type", "package"],
      "properties": {
        "type": { "const": "package" },
        "package": {
          "type": "string",
          "description": "NPM package name"
        },
        "version": {
          "type": "string",
          "description": "Package version or semver range"
        },
        "exportPath": {
          "type": "string",
          "description": "Export path within package"
        },
        "autoInstall": {
          "type": "boolean",
          "default": false,
          "description": "Auto-install if missing"
        },
        "registry": {
          "type": "string",
          "format": "uri",
          "description": "Package registry URL"
        }
      }
    },
    "compositeHandler": {
      "type": "object",
      "required": ["type", "strategy", "handlers"],
      "properties": {
        "type": { "const": "composite" },
        "strategy": {
          "enum": ["pipeline", "parallel", "fallback", "conditional"],
          "description": "Execution strategy"
        },
        "handlers": {
          "type": "array",
          "minItems": 1,
          "items": {
            "oneOf": [
              { "$ref": "#/definitions/inlineHandler" },
              { "$ref": "#/definitions/fileHandler" },
              { "$ref": "#/definitions/builtInHandler" },
              { "$ref": "#/definitions/packageHandler" }
            ]
          },
          "description": "Handler chain"
        },
        "condition": {
          "type": "string",
          "description": "Condition for conditional strategy"
        }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "version": {
          "type": "string",
          "pattern": "^\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9.]+)?$"
        },
        "author": {
          "oneOf": [
            { "type": "string" },
            {
              "type": "object",
              "required": ["name"],
              "properties": {
                "name": { "type": "string" },
                "email": { "type": "string", "format": "email" },
                "url": { "type": "string", "format": "uri" }
              }
            }
          ]
        },
        "license": { "type": "string" },
        "tags": {
          "type": "array",
          "items": { "type": "string" }
        },
        "documentation": {
          "type": "string",
          "format": "uri"
        },
        "examples": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["name", "input"],
            "properties": {
              "name": { "type": "string" },
              "description": { "type": "string" },
              "input": { "type": "object" },
              "expectedOutput": {}
            }
          }
        },
        "deprecated": {
          "oneOf": [
            { "type": "boolean" },
            {
              "type": "object",
              "required": ["message"],
              "properties": {
                "message": { "type": "string" },
                "since": { "type": "string" },
                "replacement": { "type": "string" }
              }
            }
          ]
        }
      }
    },
    "hooks": {
      "type": "object",
      "properties": {
        "preValidate": { "type": "string" },
        "preExecute": { "type": "string" },
        "postExecute": { "type": "string" },
        "onError": { "type": "string" },
        "finally": { "type": "string" },
        "onLoad": { "type": "string" },
        "onUnload": { "type": "string" }
      }
    },
    "accessControl": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean", "default": true },
        "permissions": {
          "type": "array",
          "items": { "type": "string" }
        },
        "strategy": {
          "enum": ["allow", "deny"],
          "default": "allow"
        },
        "allowList": {
          "type": "array",
          "items": { "type": "string" }
        },
        "denyList": {
          "type": "array",
          "items": { "type": "string" }
        },
        "rateLimiting": {
          "$ref": "#/definitions/rateLimiting"
        },
        "ipRestrictions": {
          "type": "object",
          "properties": {
            "allow": {
              "type": "array",
              "items": { "type": "string" }
            },
            "deny": {
              "type": "array",
              "items": { "type": "string" }
            }
          }
        },
        "timeRestrictions": {
          "type": "object",
          "properties": {
            "allow": {
              "type": "array",
              "items": { "type": "string" }
            },
            "deny": {
              "type": "array",
              "items": { "type": "string" }
            },
            "timezone": { "type": "string" }
          }
        }
      }
    },
    "rateLimiting": {
      "type": "object",
      "required": ["maxCalls", "windowMs"],
      "properties": {
        "maxCalls": {
          "type": "integer",
          "minimum": 1
        },
        "windowMs": {
          "type": "integer",
          "minimum": 1000
        },
        "strategy": {
          "enum": ["reject", "queue", "throttle"],
          "default": "reject"
        },
        "perCaller": {
          "type": "object",
          "additionalProperties": {
            "type": "object",
            "required": ["maxCalls", "windowMs"],
            "properties": {
              "maxCalls": { "type": "integer", "minimum": 1 },
              "windowMs": { "type": "integer", "minimum": 1000 }
            }
          }
        }
      }
    },
    "performanceConfig": {
      "type": "object",
      "properties": {
        "timeout": {
          "type": "integer",
          "minimum": 100,
          "description": "Timeout in milliseconds"
        },
        "cache": {
          "$ref": "#/definitions/cacheConfig"
        },
        "retry": {
          "$ref": "#/definitions/retryConfig"
        },
        "circuitBreaker": {
          "$ref": "#/definitions/circuitBreakerConfig"
        },
        "concurrency": {
          "$ref": "#/definitions/concurrencyConfig"
        }
      }
    },
    "cacheConfig": {
      "type": "object",
      "required": ["enabled", "strategy"],
      "properties": {
        "enabled": { "type": "boolean" },
        "strategy": {
          "enum": ["memory", "redis", "file", "custom"]
        },
        "ttl": {
          "type": "integer",
          "minimum": 0
        },
        "keyGenerator": { "type": "string" },
        "backend": { "type": "string" },
        "invalidation": {
          "type": "object",
          "properties": {
            "invalidateOn": {
              "type": "array",
              "items": { "type": "string" }
            },
            "customInvalidator": { "type": "string" }
          }
        }
      }
    },
    "retryConfig": {
      "type": "object",
      "required": ["maxAttempts", "delayMs", "backoff"],
      "properties": {
        "maxAttempts": {
          "type": "integer",
          "minimum": 1,
          "maximum": 10
        },
        "delayMs": {
          "type": "integer",
          "minimum": 100
        },
        "backoff": {
          "enum": ["fixed", "exponential", "linear"]
        },
        "backoffMultiplier": {
          "type": "number",
          "minimum": 1
        },
        "maxDelayMs": {
          "type": "integer",
          "minimum": 1000
        },
        "retryOn": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "circuitBreakerConfig": {
      "type": "object",
      "required": ["threshold", "windowMs", "resetTimeoutMs"],
      "properties": {
        "threshold": {
          "type": "integer",
          "minimum": 1
        },
        "windowMs": {
          "type": "integer",
          "minimum": 1000
        },
        "resetTimeoutMs": {
          "type": "integer",
          "minimum": 1000
        },
        "halfOpenLimit": {
          "type": "integer",
          "minimum": 1
        }
      }
    },
    "concurrencyConfig": {
      "type": "object",
      "required": ["maxConcurrent", "queueStrategy"],
      "properties": {
        "maxConcurrent": {
          "type": "integer",
          "minimum": 1
        },
        "queueStrategy": {
          "enum": ["reject", "wait", "oldest"]
        },
        "maxQueueSize": {
          "type": "integer",
          "minimum": 1
        }
      }
    },
    "jsonSchema": {
      "type": "object",
      "description": "Standard JSON Schema"
    },
    "toolDefinitionPartial": {
      "type": "object",
      "description": "Partial tool definition for overrides"
    }
  }
}
```

---

## 3. Example Configurations

### Example 1: Inline Handler - Simple Echo Tool

```json
{
  "name": "echo",
  "description": "Returns the input message with a timestamp",
  "inputSchema": {
    "type": "object",
    "properties": {
      "message": {
        "type": "string",
        "description": "Message to echo back"
      }
    },
    "required": ["message"]
  },
  "handler": {
    "type": "inline",
    "code": "async ({ message }) => { return { message, timestamp: new Date().toISOString() }; }"
  },
  "metadata": {
    "version": "1.0.0",
    "tags": ["utility", "debug"]
  }
}
```

### Example 2: File Handler - Data Processing Tool

```json
{
  "name": "process_data",
  "description": "Processes data using custom transformation logic",
  "inputSchema": {
    "type": "object",
    "properties": {
      "data": {
        "type": "array",
        "items": { "type": "object" }
      },
      "operation": {
        "type": "string",
        "enum": ["filter", "map", "reduce"]
      }
    },
    "required": ["data", "operation"]
  },
  "handler": {
    "type": "file",
    "path": "./handlers/data-processor.ts",
    "exportName": "processData",
    "watch": true
  },
  "performance": {
    "timeout": 30000,
    "cache": {
      "enabled": true,
      "strategy": "memory",
      "ttl": 300000
    }
  },
  "metadata": {
    "version": "2.1.0",
    "author": {
      "name": "Data Team",
      "email": "data@example.com"
    },
    "examples": [
      {
        "name": "Filter example",
        "input": {
          "data": [{"id": 1, "active": true}, {"id": 2, "active": false}],
          "operation": "filter"
        },
        "expectedOutput": [{"id": 1, "active": true}]
      }
    ]
  }
}
```

### Example 3: Built-in Handler - HTTP Fetch Tool

```json
{
  "name": "http_fetch",
  "description": "Fetches data from HTTP endpoints with retry logic",
  "inputSchema": {
    "type": "object",
    "properties": {
      "url": {
        "type": "string",
        "format": "uri"
      },
      "method": {
        "type": "string",
        "enum": ["GET", "POST", "PUT", "DELETE"],
        "default": "GET"
      },
      "headers": {
        "type": "object",
        "additionalProperties": { "type": "string" }
      },
      "body": {
        "type": "object"
      }
    },
    "required": ["url"]
  },
  "handler": {
    "type": "builtin",
    "handler": "fetch",
    "config": {
      "followRedirects": true,
      "maxRedirects": 5,
      "validateStatus": [200, 201, 204]
    }
  },
  "performance": {
    "timeout": 10000,
    "retry": {
      "maxAttempts": 3,
      "delayMs": 1000,
      "backoff": "exponential",
      "backoffMultiplier": 2,
      "retryOn": ["ETIMEDOUT", "ECONNREFUSED", "5xx"]
    },
    "circuitBreaker": {
      "threshold": 5,
      "windowMs": 60000,
      "resetTimeoutMs": 30000
    }
  },
  "access": {
    "rateLimiting": {
      "maxCalls": 100,
      "windowMs": 60000,
      "strategy": "throttle"
    }
  }
}
```

### Example 4: Package Handler - AI Text Generation

```json
{
  "name": "generate_text",
  "description": "Generates text using an AI model from NPM package",
  "inputSchema": {
    "type": "object",
    "properties": {
      "prompt": {
        "type": "string",
        "minLength": 1
      },
      "maxTokens": {
        "type": "integer",
        "minimum": 1,
        "maximum": 4096,
        "default": 100
      },
      "temperature": {
        "type": "number",
        "minimum": 0,
        "maximum": 2,
        "default": 0.7
      }
    },
    "required": ["prompt"]
  },
  "handler": {
    "type": "package",
    "package": "@acme/ai-text-generator",
    "version": "^3.0.0",
    "exportPath": "generateText",
    "autoInstall": false
  },
  "hooks": {
    "preExecute": "async (ctx) => { ctx.logger.info('Generating text', { prompt: ctx.input.prompt.substring(0, 50) }); }",
    "postExecute": "async (ctx) => { ctx.logger.info('Generated', { length: ctx.result.text.length }); }",
    "onError": "async (error, ctx) => { ctx.logger.error('Generation failed', { error: error.message }); }"
  },
  "performance": {
    "timeout": 60000,
    "concurrency": {
      "maxConcurrent": 5,
      "queueStrategy": "wait",
      "maxQueueSize": 20
    }
  },
  "access": {
    "permissions": ["ai:generate"],
    "rateLimiting": {
      "maxCalls": 50,
      "windowMs": 3600000,
      "strategy": "queue"
    }
  },
  "metadata": {
    "version": "1.5.0",
    "tags": ["ai", "text-generation"],
    "deprecated": false
  }
}
```

### Example 5: Composite Handler - Pipeline Processing

```json
{
  "name": "analyze_document",
  "description": "Multi-stage document analysis pipeline",
  "inputSchema": {
    "type": "object",
    "properties": {
      "documentUrl": {
        "type": "string",
        "format": "uri"
      },
      "analysisType": {
        "type": "string",
        "enum": ["sentiment", "entities", "summary"]
      }
    },
    "required": ["documentUrl", "analysisType"]
  },
  "handler": {
    "type": "composite",
    "strategy": "pipeline",
    "handlers": [
      {
        "type": "builtin",
        "handler": "fetch",
        "config": {
          "responseType": "text"
        }
      },
      {
        "type": "inline",
        "code": "async (input, context) => { const { data } = input; return { text: data, metadata: { length: data.length } }; }"
      },
      {
        "type": "package",
        "package": "@acme/nlp-analyzer",
        "exportPath": "analyze"
      }
    ]
  },
  "performance": {
    "timeout": 120000,
    "cache": {
      "enabled": true,
      "strategy": "redis",
      "ttl": 86400000,
      "keyGenerator": "(input) => `doc:${input.documentUrl}:${input.analysisType}`"
    }
  }
}
```

### Example 6: Conditional Composite Handler

```json
{
  "name": "smart_storage",
  "description": "Intelligently stores data based on size and type",
  "inputSchema": {
    "type": "object",
    "properties": {
      "data": {
        "type": "object"
      },
      "key": {
        "type": "string"
      }
    },
    "required": ["data", "key"]
  },
  "handler": {
    "type": "composite",
    "strategy": "conditional",
    "condition": "JSON.stringify(input.data).length > 1024 * 1024",
    "handlers": [
      {
        "type": "builtin",
        "handler": "file-write",
        "config": {
          "directory": "/data/large",
          "format": "json"
        }
      },
      {
        "type": "inline",
        "code": "async (input, ctx) => { await ctx.cache.set(input.key, input.data); return { stored: 'cache' }; }"
      }
    ]
  }
}
```

### Example 7: Environment-Specific Configuration

```json
{
  "name": "database_query",
  "description": "Executes database queries with environment-specific settings",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string"
      },
      "params": {
        "type": "array"
      }
    },
    "required": ["query"]
  },
  "handler": {
    "type": "package",
    "package": "@acme/db-client",
    "exportPath": "query"
  },
  "performance": {
    "timeout": 30000,
    "retry": {
      "maxAttempts": 3,
      "delayMs": 1000,
      "backoff": "exponential"
    }
  },
  "access": {
    "permissions": ["db:read"]
  },
  "environments": {
    "development": {
      "performance": {
        "timeout": 60000
      },
      "access": {
        "permissions": ["db:read", "db:write", "db:admin"]
      }
    },
    "staging": {
      "performance": {
        "timeout": 45000
      },
      "access": {
        "rateLimiting": {
          "maxCalls": 500,
          "windowMs": 60000,
          "strategy": "throttle"
        }
      }
    },
    "production": {
      "performance": {
        "timeout": 20000,
        "circuitBreaker": {
          "threshold": 10,
          "windowMs": 60000,
          "resetTimeoutMs": 60000
        }
      },
      "access": {
        "permissions": ["db:read"],
        "rateLimiting": {
          "maxCalls": 1000,
          "windowMs": 60000,
          "strategy": "reject"
        }
      }
    }
  }
}
```

### Example 8: Tool with Comprehensive Hooks

```json
{
  "name": "secure_payment",
  "description": "Processes secure payment transactions",
  "inputSchema": {
    "type": "object",
    "properties": {
      "amount": {
        "type": "number",
        "minimum": 0.01
      },
      "currency": {
        "type": "string",
        "pattern": "^[A-Z]{3}$"
      },
      "paymentMethod": {
        "type": "string"
      }
    },
    "required": ["amount", "currency", "paymentMethod"]
  },
  "handler": {
    "type": "package",
    "package": "@acme/payment-processor",
    "version": "^5.0.0"
  },
  "hooks": {
    "preValidate": "async (ctx) => { ctx.logger.info('Payment initiated', { amount: ctx.input.amount }); }",
    "preExecute": "async (ctx) => { if (ctx.input.amount > 10000) { await ctx.callTool('fraud_check', { transaction: ctx.input }); } }",
    "postExecute": "async (ctx) => { await ctx.callTool('audit_log', { action: 'payment', result: ctx.result }); await ctx.callTool('send_notification', { type: 'payment_success', data: ctx.result }); }",
    "onError": "async (error, ctx) => { ctx.logger.error('Payment failed', { error: error.message, input: ctx.input }); await ctx.callTool('send_notification', { type: 'payment_failed', error: error.message }); }",
    "finally": "async (ctx) => { ctx.logger.info('Payment process completed', { executionId: ctx.metadata.executionId }); }"
  },
  "performance": {
    "timeout": 30000,
    "retry": {
      "maxAttempts": 2,
      "delayMs": 2000,
      "backoff": "fixed",
      "retryOn": ["NETWORK_ERROR"]
    }
  },
  "access": {
    "permissions": ["payment:process"],
    "rateLimiting": {
      "maxCalls": 10,
      "windowMs": 60000,
      "strategy": "reject"
    }
  },
  "metadata": {
    "version": "1.0.0",
    "author": "Payments Team",
    "tags": ["payment", "security"],
    "documentation": "https://docs.example.com/payment-tool"
  }
}
```

### Example 9: Registry Configuration (YAML)

```yaml
# mcp-registry-config.yaml
configPath: ./config
toolPaths:
  - ./tools/**/*.json
  - ./tools/**/*.yaml
  - ./custom-tools/*.ts

autoDiscover:
  enabled: true
  directories:
    - ./tools
    - ./plugins/*/tools
  patterns:
    - "**/*.tool.json"
    - "**/*.tool.yaml"
  watch: true
  exclude:
    - "**/node_modules/**"
    - "**/test/**"

defaults:
  performance:
    timeout: 30000
    cache:
      enabled: false
  access:
    enabled: true
    rateLimiting:
      maxCalls: 100
      windowMs: 60000
      strategy: reject

plugins:
  - name: logging-plugin
    type: package
    source: "@mcp/plugin-logging"
    config:
      level: info
      format: json
    enabled: true

  - name: metrics-plugin
    type: package
    source: "@mcp/plugin-metrics"
    config:
      provider: prometheus
      port: 9090
    enabled: true

  - name: auth-plugin
    type: file
    source: ./plugins/auth/index.js
    config:
      provider: oauth2
      tokenEndpoint: https://auth.example.com/token
    enabled: true

logging:
  level: info
  format: json
  logToolData: true
  redactFields:
    - password
    - apiKey
    - token
    - secret
  outputs:
    - type: console
      config:
        colorize: true
    - type: file
      config:
        path: ./logs/mcp-tools.log
        maxSize: 10485760
        maxFiles: 5
    - type: http
      config:
        url: https://logs.example.com/ingest
        batchSize: 100
        flushInterval: 5000

environments:
  development:
    tools:
      database_query:
        access:
          permissions: ["db:read", "db:write", "db:admin"]
    features:
      debugMode: true
      verboseLogging: true
    performance:
      timeout: 120000

  production:
    tools:
      database_query:
        access:
          permissions: ["db:read"]
          rateLimiting:
            maxCalls: 1000
            windowMs: 60000
    features:
      debugMode: false
      verboseLogging: false
    performance:
      timeout: 30000

environment: development

validation:
  strict: true
  validateInput: true
  validateOutput: false
```

---

## 4. Plugin Architecture Specification

### Plugin Interface Design

```typescript
/**
 * Plugin lifecycle and capabilities
 */
interface PluginSpec {
  /** Plugin metadata */
  metadata: {
    name: string;
    version: string;
    description: string;
    author?: string;
    dependencies?: Record<string, string>;
    mcpVersion?: string; // Minimum MCP version required
  };

  /** Plugin capabilities */
  capabilities: {
    /** Can modify tool definitions before registration */
    toolTransformation?: boolean;

    /** Provides middleware for execution */
    middleware?: boolean;

    /** Provides custom validators */
    customValidators?: boolean;

    /** Provides cache backend */
    cacheBackend?: boolean;

    /** Provides storage backend */
    storageBackend?: boolean;

    /** Provides custom handlers */
    customHandlers?: string[];

    /** Hooks into registry lifecycle */
    registryHooks?: boolean;
  };

  /** Plugin lifecycle methods */
  lifecycle: {
    /** Called when plugin is loaded */
    initialize(context: PluginContext): Promise<void>;

    /** Called when plugin is unloaded */
    shutdown(): Promise<void>;

    /** Health check for the plugin */
    healthCheck?(): Promise<PluginHealth>;
  };

  /** Optional implementations */
  implementations?: {
    /** Middleware function */
    middleware?: MiddlewareFunction;

    /** Tool transformer */
    transformTool?: (tool: ToolDefinition) => ToolDefinition | Promise<ToolDefinition>;

    /** Custom validators */
    validators?: Record<string, ValidatorFunction>;

    /** Cache backend factory */
    createCacheBackend?: (config: Record<string, any>) => CacheInterface;

    /** Storage backend factory */
    createStorageBackend?: (config: Record<string, any>) => StorageInterface;

    /** Custom handler implementations */
    handlers?: Record<string, HandlerFunction>;
  };

  /** Registry lifecycle hooks */
  hooks?: {
    onToolRegister?: (tool: ToolDefinition) => void | Promise<void>;
    onToolUnregister?: (toolName: string) => void | Promise<void>;
    onToolExecute?: (context: ExecutionContext) => void | Promise<void>;
    onToolComplete?: (context: ExecutionContext, result: any) => void | Promise<void>;
    onToolError?: (context: ExecutionContext, error: Error) => void | Promise<void>;
  };

  /** Configuration schema */
  configSchema?: JSONSchema;
}

interface PluginContext {
  /** Tool registry instance */
  registry: ToolRegistry;

  /** Plugin configuration */
  config: Record<string, any>;

  /** Logger instance */
  logger: Logger;

  /** Access to other plugins */
  plugins: PluginManager;

  /** MCP version */
  mcpVersion: string;

  /** Environment info */
  environment: {
    name: string;
    nodeVersion: string;
    platform: string;
  };
}

interface PluginHealth {
  healthy: boolean;
  message?: string;
  details?: Record<string, any>;
}

type MiddlewareFunction = (
  context: ExecutionContext,
  next: () => Promise<any>
) => Promise<any>;

type ValidatorFunction = (
  value: any,
  schema: JSONSchema,
  context: ValidationContext
) => ValidationResult;

type HandlerFunction = (
  input: Record<string, any>,
  context: ExecutionContext
) => Promise<any>;

interface ValidationContext {
  path: string;
  rootValue: any;
  parentValue: any;
}

interface PluginManager {
  /** Get a plugin by name */
  get(name: string): PluginSpec | undefined;

  /** List all loaded plugins */
  list(): PluginSpec[];

  /** Check if a plugin is loaded */
  has(name: string): boolean;

  /** Get plugin by capability */
  getByCapability(capability: keyof PluginSpec['capabilities']): PluginSpec[];
}
```

### Plugin Registration Flow

```
1. Plugin Discovery
   ├─ Scan plugin directories
   ├─ Read package.json for MCP plugins
   └─ Load explicit plugin configurations

2. Plugin Validation
   ├─ Validate plugin structure
   ├─ Check version compatibility
   ├─ Verify dependencies
   └─ Validate configuration schema

3. Plugin Loading
   ├─ Load plugin module
   ├─ Initialize plugin context
   ├─ Call initialize() lifecycle method
   └─ Register plugin capabilities

4. Plugin Registration
   ├─ Register middleware
   ├─ Register validators
   ├─ Register backends
   ├─ Register custom handlers
   └─ Register hooks

5. Plugin Activation
   └─ Mark plugin as active

6. Runtime Operations
   ├─ Execute middleware chain
   ├─ Apply tool transformations
   ├─ Use custom validators
   └─ Invoke lifecycle hooks

7. Plugin Shutdown
   ├─ Call shutdown() lifecycle method
   ├─ Unregister capabilities
   ├─ Cleanup resources
   └─ Remove from registry
```

### Example Plugin Implementation

```typescript
// example-logging-plugin.ts

import type { PluginSpec, PluginContext, ExecutionContext } from '@mcp/core';

export const plugin: PluginSpec = {
  metadata: {
    name: 'logging-plugin',
    version: '1.0.0',
    description: 'Advanced logging plugin with multiple transports',
    author: 'MCP Team',
    mcpVersion: '>=1.0.0'
  },

  capabilities: {
    middleware: true,
    registryHooks: true
  },

  lifecycle: {
    async initialize(context: PluginContext) {
      context.logger.info('Logging plugin initialized', {
        config: context.config
      });

      // Setup logging transports based on config
      if (context.config.elasticsearch) {
        // Initialize Elasticsearch transport
      }
    },

    async shutdown() {
      // Cleanup logging transports
    },

    async healthCheck() {
      return {
        healthy: true,
        message: 'All transports operational'
      };
    }
  },

  implementations: {
    middleware: async (context: ExecutionContext, next: () => Promise<any>) => {
      const startTime = Date.now();

      context.logger.info('Tool execution started', {
        tool: context.tool,
        executionId: context.metadata.executionId,
        input: context.input
      });

      try {
        const result = await next();

        const duration = Date.now() - startTime;
        context.logger.info('Tool execution completed', {
          tool: context.tool,
          executionId: context.metadata.executionId,
          duration,
          success: true
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        context.logger.error('Tool execution failed', {
          tool: context.tool,
          executionId: context.metadata.executionId,
          duration,
          error: error.message,
          stack: error.stack
        });

        throw error;
      }
    }
  },

  hooks: {
    async onToolRegister(tool) {
      console.log(`Tool registered: ${tool.name}`);
    },

    async onToolUnregister(toolName) {
      console.log(`Tool unregistered: ${toolName}`);
    }
  },

  configSchema: {
    type: 'object',
    properties: {
      level: {
        type: 'string',
        enum: ['trace', 'debug', 'info', 'warn', 'error'],
        default: 'info'
      },
      format: {
        type: 'string',
        enum: ['json', 'text'],
        default: 'json'
      },
      elasticsearch: {
        type: 'object',
        properties: {
          node: { type: 'string' },
          index: { type: 'string' }
        }
      }
    }
  }
};
```

---

## 5. Registration and Lifecycle Management Design

### Tool Lifecycle States

```
UNREGISTERED → VALIDATING → VALIDATED → LOADING → LOADED → ACTIVE ⇄ SUSPENDED → UNLOADING → UNREGISTERED
                    ↓            ↓           ↓         ↓        ↓          ↓
                 ERROR       ERROR       ERROR     ERROR    ERROR      ERROR
```

### State Transitions

```typescript
enum ToolState {
  UNREGISTERED = 'unregistered',
  VALIDATING = 'validating',
  VALIDATED = 'validated',
  LOADING = 'loading',
  LOADED = 'loaded',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  UNLOADING = 'unloading',
  ERROR = 'error'
}

interface ToolLifecycle {
  /** Current state */
  state: ToolState;

  /** State history */
  history: StateTransition[];

  /** Last error (if any) */
  lastError?: Error;

  /** Timestamps */
  timestamps: {
    registered?: number;
    loaded?: number;
    activated?: number;
    suspended?: number;
    unloaded?: number;
  };

  /** Statistics */
  stats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    totalExecutionTime: number;
    averageExecutionTime: number;
    lastExecuted?: number;
  };
}

interface StateTransition {
  from: ToolState;
  to: ToolState;
  timestamp: number;
  reason?: string;
  error?: Error;
}
```

### Registration Process

```typescript
interface RegistrationProcess {
  /**
   * Step 1: Pre-registration validation
   * - Validate tool name uniqueness
   * - Check for naming conflicts
   * - Verify required fields
   */
  preValidation(tool: ToolDefinition): ValidationResult;

  /**
   * Step 2: Schema validation
   * - Validate against JSON Schema
   * - Check handler configuration
   * - Verify access control settings
   */
  schemaValidation(tool: ToolDefinition): ValidationResult;

  /**
   * Step 3: Plugin transformation
   * - Apply plugin transformations
   * - Allow plugins to modify tool definition
   */
  pluginTransformation(tool: ToolDefinition): Promise<ToolDefinition>;

  /**
   * Step 4: Handler initialization
   * - Load handler code (file/package)
   * - Compile inline handlers
   * - Verify handler function signature
   */
  handlerInitialization(tool: ToolDefinition): Promise<HandlerFunction>;

  /**
   * Step 5: Hook initialization
   * - Compile hook functions
   * - Validate hook signatures
   */
  hookInitialization(tool: ToolDefinition): Promise<CompiledHooks>;

  /**
   * Step 6: Performance setup
   * - Initialize cache
   * - Setup rate limiter
   * - Configure circuit breaker
   */
  performanceSetup(tool: ToolDefinition): Promise<PerformanceRuntime>;

  /**
   * Step 7: Access control setup
   * - Initialize permissions
   * - Setup rate limiting
   * - Configure IP restrictions
   */
  accessControlSetup(tool: ToolDefinition): Promise<AccessControlRuntime>;

  /**
   * Step 8: Final registration
   * - Add to registry
   * - Trigger onLoad hooks
   * - Notify plugins
   */
  finalizeRegistration(tool: ToolDefinition): Promise<void>;
}

interface CompiledHooks {
  preValidate?: HookFunction;
  preExecute?: HookFunction;
  postExecute?: HookFunction;
  onError?: ErrorHookFunction;
  finally?: HookFunction;
  onLoad?: () => void | Promise<void>;
  onUnload?: () => void | Promise<void>;
}

interface PerformanceRuntime {
  cache?: CacheInterface;
  rateLimiter?: RateLimiter;
  circuitBreaker?: CircuitBreaker;
  retryHandler?: RetryHandler;
  timeoutHandler?: TimeoutHandler;
}

interface AccessControlRuntime {
  permissionChecker: (caller: CallerInfo) => boolean;
  rateLimiter?: RateLimiter;
  ipChecker?: (ip: string) => boolean;
  timeChecker?: () => boolean;
}
```

### Execution Lifecycle

```typescript
interface ExecutionLifecycle {
  /**
   * Phase 1: Pre-execution
   * - Create execution context
   * - Check access control
   * - Apply rate limiting
   */
  preExecution(
    tool: ToolDefinition,
    input: Record<string, any>,
    caller?: CallerInfo
  ): Promise<ExecutionContext>;

  /**
   * Phase 2: Validation
   * - Call preValidate hook
   * - Validate input against schema
   * - Apply custom validators
   */
  validation(context: ExecutionContext): Promise<void>;

  /**
   * Phase 3: Pre-execute hooks
   * - Call preExecute hook
   * - Apply middleware
   */
  preExecuteHooks(context: ExecutionContext): Promise<void>;

  /**
   * Phase 4: Cache check
   * - Check if result is cached
   * - Return cached result if available
   */
  cacheCheck(context: ExecutionContext): Promise<any | null>;

  /**
   * Phase 5: Execution
   * - Execute handler
   * - Apply timeout
   * - Handle retries
   * - Monitor circuit breaker
   */
  execution(context: ExecutionContext): Promise<any>;

  /**
   * Phase 6: Post-execution
   * - Call postExecute hook
   * - Cache result
   * - Update statistics
   */
  postExecution(context: ExecutionContext, result: any): Promise<any>;

  /**
   * Phase 7: Error handling
   * - Call onError hook
   * - Log error
   * - Update circuit breaker
   */
  errorHandling(context: ExecutionContext, error: Error): Promise<never>;

  /**
   * Phase 8: Finalization
   * - Call finally hook
   * - Cleanup resources
   * - Emit metrics
   */
  finalization(context: ExecutionContext): Promise<void>;
}
```

### Registry Manager Design

```typescript
interface RegistryManager {
  /** Registry state */
  state: {
    tools: Map<string, ToolDefinition>;
    lifecycles: Map<string, ToolLifecycle>;
    handlers: Map<string, HandlerFunction>;
    runtimes: Map<string, ToolRuntime>;
  };

  /** Hot reload support */
  hotReload: {
    /** Enable/disable hot reload */
    enabled: boolean;

    /** Watch for file changes */
    watchers: Map<string, FileWatcher>;

    /** Reload a tool */
    reload(toolName: string): Promise<void>;

    /** Handle file change */
    handleFileChange(filePath: string): Promise<void>;
  };

  /** Dependency management */
  dependencies: {
    /** Track tool dependencies */
    graph: DependencyGraph;

    /** Check for circular dependencies */
    checkCircular(): ValidationResult;

    /** Get dependent tools */
    getDependents(toolName: string): string[];
  };

  /** Version management */
  versioning: {
    /** Track tool versions */
    versions: Map<string, ToolVersion[]>;

    /** Register a new version */
    registerVersion(tool: ToolDefinition): Promise<void>;

    /** Get version history */
    getHistory(toolName: string): ToolVersion[];

    /** Rollback to previous version */
    rollback(toolName: string, version: string): Promise<void>;
  };

  /** Batch operations */
  batch: {
    /** Register multiple tools atomically */
    registerMany(tools: ToolDefinition[]): Promise<BatchResult>;

    /** Unregister multiple tools */
    unregisterMany(toolNames: string[]): Promise<BatchResult>;

    /** Reload multiple tools */
    reloadMany(toolNames: string[]): Promise<BatchResult>;
  };

  /** Query interface */
  query: {
    /** Find tools by criteria */
    find(criteria: ToolQueryCriteria): ToolDefinition[];

    /** Get tools by tag */
    byTag(tag: string): ToolDefinition[];

    /** Get tools by capability */
    byCapability(capability: string): ToolDefinition[];

    /** Search tools */
    search(query: string): ToolDefinition[];
  };
}

interface ToolRuntime {
  definition: ToolDefinition;
  lifecycle: ToolLifecycle;
  handler: HandlerFunction;
  hooks: CompiledHooks;
  performance: PerformanceRuntime;
  accessControl: AccessControlRuntime;
}

interface DependencyGraph {
  nodes: Map<string, ToolNode>;
  edges: Map<string, string[]>;
}

interface ToolNode {
  name: string;
  dependencies: string[];
  dependents: string[];
}

interface ToolVersion {
  version: string;
  tool: ToolDefinition;
  timestamp: number;
  author?: string;
}

interface BatchResult {
  successful: string[];
  failed: Array<{ name: string; error: Error }>;
  total: number;
  successCount: number;
  failureCount: number;
}

interface ToolQueryCriteria {
  name?: string | RegExp;
  tags?: string[];
  state?: ToolState;
  hasPermission?: string;
  createdAfter?: number;
  createdBefore?: number;
}
```

---

## 6. Security Considerations and Best Practices

### Security Framework

```typescript
interface SecurityFramework {
  /** Input sanitization */
  sanitization: {
    /** Sanitize input before validation */
    sanitizeInput(input: Record<string, any>, schema: JSONSchema): Record<string, any>;

    /** Remove dangerous characters */
    sanitizeString(value: string): string;

    /** Validate and sanitize URLs */
    sanitizeURL(url: string): string;

    /** Sanitize file paths */
    sanitizePath(path: string): string;
  };

  /** Code execution sandbox */
  sandbox: {
    /** Sandbox configuration */
    config: SandboxConfig;

    /** Execute code in sandbox */
    execute(code: string, context: Record<string, any>): Promise<any>;

    /** Validate code for dangerous patterns */
    validateCode(code: string): SecurityValidation;
  };

  /** Secret management */
  secrets: {
    /** Store encrypted secrets */
    store(key: string, value: string): Promise<void>;

    /** Retrieve decrypted secrets */
    retrieve(key: string): Promise<string>;

    /** Rotate secrets */
    rotate(key: string): Promise<void>;

    /** Detect secrets in logs */
    redactSecrets(text: string): string;
  };

  /** Audit logging */
  audit: {
    /** Log security events */
    log(event: SecurityEvent): Promise<void>;

    /** Query audit logs */
    query(criteria: AuditQueryCriteria): Promise<SecurityEvent[]>;
  };

  /** Threat detection */
  threatDetection: {
    /** Detect suspicious patterns */
    analyze(context: ExecutionContext): ThreatAnalysis;

    /** Check against threat intelligence */
    checkThreatIntel(indicator: string): Promise<ThreatInfo>;

    /** Anomaly detection */
    detectAnomaly(context: ExecutionContext): AnomalyResult;
  };
}

interface SandboxConfig {
  /** Allowed built-in modules */
  allowedModules: string[];

  /** Memory limit */
  memoryLimit: number;

  /** CPU limit */
  cpuLimit: number;

  /** Timeout */
  timeout: number;

  /** Network access */
  allowNetwork: boolean;

  /** File system access */
  allowFilesystem: boolean;

  /** Allowed file system paths */
  allowedPaths?: string[];
}

interface SecurityValidation {
  safe: boolean;
  issues: SecurityIssue[];
}

interface SecurityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  location?: { line: number; column: number };
}

interface SecurityEvent {
  timestamp: number;
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actor: CallerInfo;
  tool?: string;
  action: string;
  outcome: 'success' | 'failure';
  details: Record<string, any>;
}

enum SecurityEventType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  ACCESS_DENIED = 'access_denied',
  RATE_LIMIT = 'rate_limit',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  CODE_EXECUTION = 'code_execution',
  DATA_ACCESS = 'data_access'
}

interface AuditQueryCriteria {
  startTime?: number;
  endTime?: number;
  type?: SecurityEventType;
  severity?: string;
  actor?: string;
  tool?: string;
}

interface ThreatAnalysis {
  threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  indicators: ThreatIndicator[];
  recommended Action: 'allow' | 'monitor' | 'block';
}

interface ThreatIndicator {
  type: string;
  value: string;
  confidence: number;
}

interface ThreatInfo {
  malicious: boolean;
  categories: string[];
  lastSeen?: number;
  reputation: number;
}

interface AnomalyResult {
  isAnomaly: boolean;
  score: number;
  reasons: string[];
}
```

### Security Best Practices

#### 1. **Input Validation**
```typescript
// Always validate and sanitize inputs
const securityPractices = {
  inputValidation: {
    // Use strict JSON Schema validation
    schema: {
      type: "object",
      additionalProperties: false, // Prevent extra properties
      properties: {
        email: {
          type: "string",
          format: "email",
          maxLength: 255
        }
      }
    },

    // Sanitize all string inputs
    sanitize: true,

    // Reject inputs with dangerous patterns
    dangerousPatterns: [
      /\.\.\//,  // Path traversal
      /<script/i,  // XSS
      /javascript:/i,  // XSS
      /on\w+\s*=/i  // Event handlers
    ]
  }
};
```

#### 2. **Code Execution Safety**
```typescript
const codeExecutionSafety = {
  // Always use sandboxing for inline code
  sandbox: {
    enabled: true,
    allowedModules: ['crypto', 'buffer'], // Whitelist only
    memoryLimit: 128 * 1024 * 1024, // 128MB
    timeout: 5000,
    allowNetwork: false,
    allowFilesystem: false
  },

  // Code review patterns
  bannedPatterns: [
    'eval(',
    'Function(',
    'require(',
    'import(',
    'process.exit',
    'process.kill',
    'child_process',
    'fs.unlink',
    'fs.rmdir'
  ],

  // Static analysis before execution
  staticAnalysis: true
};
```

#### 3. **Access Control**
```typescript
const accessControlBestPractices = {
  // Principle of least privilege
  defaultPermissions: [], // No permissions by default

  // Explicit permission grants
  permissions: [
    'resource:action', // Specific format
    'db:read',         // Example: read database
    'api:call'         // Example: call external API
  ],

  // Multi-factor authorization
  requireMultiplePermissions: true,

  // Time-based access
  timeRestrictions: {
    allow: ['Mon-Fri 09:00-17:00']
  },

  // IP-based access
  ipRestrictions: {
    allow: ['10.0.0.0/8', '192.168.0.0/16']
  }
};
```

#### 4. **Secrets Management**
```typescript
const secretsManagement = {
  // Never store secrets in tool definitions
  secrets: {
    storage: 'encrypted-vault',
    encryption: 'AES-256-GCM',
    keyRotation: '90d'
  },

  // Use environment variables or secret vaults
  retrieveSecret: async (key: string) => {
    // Retrieve from HashiCorp Vault, AWS Secrets Manager, etc.
    return await vault.get(key);
  },

  // Redact secrets from logs
  logging: {
    redactFields: [
      'password',
      'apiKey',
      'token',
      'secret',
      'privateKey',
      /.*_key$/i,
      /.*_secret$/i
    ]
  }
};
```

#### 5. **Rate Limiting**
```typescript
const rateLimitingStrategy = {
  // Global rate limits
  global: {
    maxCalls: 1000,
    windowMs: 60000
  },

  // Per-user rate limits (stricter)
  perUser: {
    maxCalls: 100,
    windowMs: 60000
  },

  // Per-IP rate limits
  perIP: {
    maxCalls: 500,
    windowMs: 60000
  },

  // Adaptive rate limiting
  adaptive: {
    enabled: true,
    increaseOnSuccess: 1.1,
    decreaseOnFailure: 0.5,
    min: 10,
    max: 1000
  }
};
```

#### 6. **Audit Logging**
```typescript
const auditLogging = {
  // Log all security-relevant events
  events: [
    'tool_execution',
    'permission_check',
    'access_denied',
    'rate_limit_exceeded',
    'suspicious_activity'
  ],

  // Include comprehensive context
  contextFields: [
    'timestamp',
    'executionId',
    'userId',
    'ipAddress',
    'userAgent',
    'toolName',
    'action',
    'outcome',
    'duration'
  ],

  // Tamper-proof logging
  integrity: {
    enabled: true,
    method: 'hash-chain',
    algorithm: 'SHA-256'
  },

  // Retention policy
  retention: {
    period: '7y', // 7 years for compliance
    archiveAfter: '1y'
  }
};
```

#### 7. **Dependency Security**
```typescript
const dependencySecurity = {
  // Package verification
  verification: {
    checksum: true,
    signature: true
  },

  // Vulnerability scanning
  scanning: {
    enabled: true,
    frequency: 'daily',
    severity: ['critical', 'high']
  },

  // Lockfile enforcement
  enforceLockfile: true,

  // Private package restrictions
  allowedRegistries: [
    'https://registry.npmjs.org',
    'https://private-registry.company.com'
  ]
};
```

#### 8. **Error Handling**
```typescript
const secureErrorHandling = {
  // Never expose internal details
  production: {
    exposeStackTrace: false,
    exposeInternalPaths: false,
    genericErrors: true
  },

  // Detailed errors only in development
  development: {
    exposeStackTrace: true,
    exposeInternalPaths: true,
    genericErrors: false
  },

  // Error messages
  errorMessages: {
    generic: 'An error occurred while processing your request',
    authFailure: 'Authentication failed',
    permissionDenied: 'Permission denied',
    rateLimitExceeded: 'Rate limit exceeded'
  }
};
```

#### 9. **Network Security**
```typescript
const networkSecurity = {
  // HTTPS only
  enforceHTTPS: true,

  // Certificate validation
  verifyCertificates: true,

  // Request timeouts
  timeout: 30000,

  // Host validation
  allowedHosts: [
    'api.example.com',
    '*.trusted-domain.com'
  ],

  // Block private IPs
  blockPrivateIPs: true,

  // Proxy configuration
  proxy: {
    enabled: true,
    url: 'http://proxy.company.com:8080'
  }
};
```

#### 10. **Monitoring and Alerting**
```typescript
const securityMonitoring = {
  // Real-time monitoring
  monitoring: {
    enabled: true,
    metrics: [
      'execution_count',
      'error_rate',
      'authentication_failures',
      'permission_denials',
      'rate_limit_hits'
    ]
  },

  // Alert thresholds
  alerts: {
    errorRate: {
      threshold: 0.05, // 5%
      window: '5m',
      action: 'notify'
    },
    authFailures: {
      threshold: 10,
      window: '1m',
      action: 'block_ip'
    },
    suspiciousActivity: {
      action: 'notify_security_team'
    }
  },

  // Integration with SIEM
  siem: {
    enabled: true,
    endpoint: 'https://siem.company.com/ingest'
  }
};
```

### Security Checklist

#### Pre-deployment Checklist
- [ ] All inputs validated with strict JSON schemas
- [ ] All inline code executed in sandbox
- [ ] Secrets stored in encrypted vault, not in configuration
- [ ] Rate limiting configured appropriately
- [ ] Access control policies defined
- [ ] Audit logging enabled
- [ ] Dependencies scanned for vulnerabilities
- [ ] Error messages sanitized
- [ ] HTTPS enforced for all network requests
- [ ] Monitoring and alerting configured

#### Runtime Checklist
- [ ] Monitor execution patterns for anomalies
- [ ] Review audit logs regularly
- [ ] Rotate secrets periodically
- [ ] Update dependencies regularly
- [ ] Test access control policies
- [ ] Verify rate limiting effectiveness
- [ ] Check for privilege escalation attempts
- [ ] Monitor resource usage

#### Incident Response
- [ ] Incident response plan documented
- [ ] Security contacts defined
- [ ] Tool suspension mechanism available
- [ ] Audit log backup and retention
- [ ] Forensics capabilities
- [ ] Communication templates
- [ ] Post-incident review process

---

## Summary

This design specification provides a comprehensive framework for the MCP tool definition and registration system. Key features include:

1. **Flexible Handler Types**: Support for inline code, external files, built-in handlers, NPM packages, and composite handlers
2. **Comprehensive Configuration**: Type-safe definitions with environment-specific overrides
3. **Robust Lifecycle Management**: Complete state management from registration through execution to unloading
4. **Plugin Architecture**: Extensible system with middleware, transformers, and custom implementations
5. **Security First**: Built-in sandboxing, access control, audit logging, and threat detection
6. **Performance Optimizations**: Caching, rate limiting, circuit breakers, and retry logic
7. **Developer Experience**: Clear interfaces, validation, examples, and documentation

The system is designed to be production-ready with enterprise-grade security, monitoring, and operational capabilities while remaining flexible and developer-friendly for rapid tool development and iteration.