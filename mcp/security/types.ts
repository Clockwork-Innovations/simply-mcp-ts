/**
 * Security Configuration Types
 *
 * This module defines all TypeScript interfaces for the security layer,
 * including authentication, authorization, rate limiting, and audit logging.
 */

/**
 * API Key configuration for authentication
 */
export interface ApiKeyConfig {
  /** The API key string (should be securely generated) */
  key: string;
  /** Human-readable name for this key */
  name: string;
  /** Permissions granted to this API key */
  permissions: string[];
  /** Optional rate limit overrides for this key */
  rateLimit?: {
    window: number;
    maxRequests: number;
  };
  /** Whether this key is currently active */
  enabled?: boolean;
  /** Optional expiration timestamp */
  expiresAt?: number;
}

/**
 * Authentication configuration
 */
export interface AuthenticationConfig {
  /** Whether authentication is enabled */
  enabled: boolean;
  /** List of valid API keys */
  apiKeys: ApiKeyConfig[];
  /** Header name for API key (default: 'x-api-key') */
  headerName?: string;
  /** Whether to allow unauthenticated requests (default: false) */
  allowAnonymous?: boolean;
}

/**
 * Permission configuration
 */
export interface PermissionConfig {
  /** Default permissions for anonymous users */
  anonymous?: string[];
  /** Default permissions for authenticated users */
  authenticated?: string[];
  /** Permission inheritance rules */
  inheritance?: {
    [permission: string]: string[];
  };
}

/**
 * Rate limit strategy types
 */
export type RateLimitStrategy = 'fixed-window' | 'sliding-window';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Whether rate limiting is enabled */
  enabled: boolean;
  /** Rate limiting strategy */
  strategy?: RateLimitStrategy;
  /** Time window in milliseconds */
  window: number;
  /** Maximum requests per window */
  maxRequests: number;
  /** Per-tool rate limit overrides */
  perTool?: {
    [toolName: string]: {
      window: number;
      maxRequests: number;
    };
  };
  /** Whether to use strict mode (block at limit vs allow burst) */
  strict?: boolean;
}

/**
 * Audit event types
 */
export type AuditEventType =
  | 'authentication.success'
  | 'authentication.failure'
  | 'authentication.missing'
  | 'authorization.granted'
  | 'authorization.denied'
  | 'tool.executed'
  | 'tool.failed'
  | 'ratelimit.exceeded'
  | 'ratelimit.warning'
  | 'session.created'
  | 'session.terminated'
  | 'security.violation';

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  /** Timestamp of the event */
  timestamp: string;
  /** Type of audit event */
  eventType: AuditEventType;
  /** Session ID if available */
  sessionId?: string;
  /** API key name if authenticated */
  apiKeyName?: string;
  /** Tool name if applicable */
  toolName?: string;
  /** Resource being accessed */
  resource?: string;
  /** Permissions checked */
  permissions?: string[];
  /** Result of the operation */
  result: 'success' | 'failure' | 'warning';
  /** Additional details */
  details?: any;
  /** IP address if available */
  ipAddress?: string;
  /** User agent if available */
  userAgent?: string;
}

/**
 * Audit logging configuration
 */
export interface AuditConfig {
  /** Whether audit logging is enabled */
  enabled: boolean;
  /** Path to audit log file */
  logFile: string;
  /** Whether to also log to console */
  logToConsole?: boolean;
  /** Events to log (empty array = log all) */
  events?: AuditEventType[];
  /** Whether to include sensitive data in logs */
  includeSensitiveData?: boolean;
  /** Maximum log file size in bytes before rotation */
  maxFileSize?: number;
  /** Number of rotated log files to keep */
  maxFiles?: number;
}

/**
 * Complete security configuration
 */
export interface SecurityConfig {
  /** Authentication settings */
  authentication: AuthenticationConfig;
  /** Permission settings */
  permissions?: PermissionConfig;
  /** Rate limiting settings */
  rateLimit: RateLimitConfig;
  /** Audit logging settings */
  audit: AuditConfig;
  /** Whether to enable security by default */
  enabled?: boolean;
}

/**
 * Session context for security checks
 */
export interface SecurityContext {
  /** Session ID */
  sessionId?: string;
  /** API key used for authentication */
  apiKey?: ApiKeyConfig;
  /** Permissions for this session */
  permissions: string[];
  /** Whether the session is authenticated */
  authenticated: boolean;
  /** IP address of the client */
  ipAddress?: string;
  /** User agent of the client */
  userAgent?: string;
  /** Session creation timestamp */
  createdAt: number;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current request count in window */
  currentRequests: number;
  /** Maximum requests allowed */
  maxRequests: number;
  /** Time until window resets (ms) */
  resetTime: number;
  /** Retry after time in seconds */
  retryAfter?: number;
}