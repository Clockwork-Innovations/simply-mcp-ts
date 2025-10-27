/**
 * Security Integration Module
 *
 * Provides middleware factories and helper functions for integrating
 * the complete security system into the MCP server.
 */

import { Request, Response, NextFunction } from 'express';
import { SecurityConfig } from './types.js';
import { ApiKeyAuth, AuthenticatedRequest, createAuthMiddleware } from './ApiKeyAuth.js';
import { PermissionChecker, SessionPermissionStore } from './AccessControl.js';
import { RateLimiter, createRateLimitError } from './RateLimiter.js';
import { AuditLogger } from './AuditLogger.js';

// Re-export all types
export * from './types.js';
export * from './AccessControl.js';
export * from './RateLimiter.js';
export * from './AuditLogger.js';
export * from './ApiKeyAuth.js';

/**
 * Complete security system instance
 */
export interface SecuritySystem {
  auth: ApiKeyAuth;
  permissions: PermissionChecker;
  rateLimiter: RateLimiter;
  auditLogger: AuditLogger;
  sessionStore: SessionPermissionStore;
}

/**
 * Create a complete security system from configuration
 */
export function createSecuritySystem(config: SecurityConfig): SecuritySystem {
  // Create audit logger first (others may depend on it)
  const auditLogger = new AuditLogger(config.audit);

  // Create authentication system
  const auth = new ApiKeyAuth(config.authentication, auditLogger);

  // Create permission checker
  const permissions = new PermissionChecker(config.permissions);

  // Create rate limiter
  const rateLimiter = new RateLimiter(config.rateLimit);

  // Create session store
  const sessionStore = new SessionPermissionStore();

  return {
    auth,
    permissions,
    rateLimiter,
    auditLogger,
    sessionStore,
  };
}

/**
 * Create Express middleware for complete security system
 */
export function createSecurityMiddleware(config: SecurityConfig) {
  const system = createSecuritySystem(config);

  return {
    system,
    middleware: [
      // 1. Authentication middleware (must be first)
      system.auth.middleware(),

      // 2. Session context middleware
      (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;

        if (sessionId && req.securityContext) {
          // Store or update session context
          system.sessionStore.setContext(sessionId, req.securityContext);

          // Log session creation on first request
          const existingContext = system.sessionStore.getContext(sessionId);
          if (!existingContext) {
            system.auditLogger.logSessionCreated(sessionId, req.securityContext);
          }
        }

        next();
      },
    ],
  };
}

/**
 * Middleware to enforce specific permissions
 */
export function enforcePermissions(...requiredPermissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const securityContext = req.securityContext;

    if (!securityContext) {
      res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Authentication required',
        },
        id: null,
      });
      return;
    }

    // This will be set by the security system
    const permissions = (req as any).permissionChecker as PermissionChecker;

    if (!permissions) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Security system not initialized',
        },
        id: null,
      });
      return;
    }

    // Check permissions
    if (!permissions.hasAllPermissions(securityContext, requiredPermissions)) {
      res.status(403).json({
        jsonrpc: '2.0',
        error: {
          code: -32002,
          message: 'Insufficient permissions',
          data: {
            required: requiredPermissions,
          },
        },
        id: null,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to enforce rate limits
 */
export function enforceRateLimit(
  rateLimiter: RateLimiter,
  auditLogger: AuditLogger,
  toolName?: string
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const securityContext = req.securityContext;

    if (!sessionId) {
      // No session ID, skip rate limiting
      return next();
    }

    // Check rate limit
    const result = rateLimiter.checkLimit(sessionId, toolName);

    if (!result.allowed) {
      // Log rate limit violation
      if (securityContext) {
        auditLogger.logRateLimitExceeded(
          securityContext,
          toolName,
          result.currentRequests,
          result.maxRequests
        );
      }

      // Return 429 Too Many Requests
      res.status(429).json({
        jsonrpc: '2.0',
        error: {
          code: -32003,
          message: createRateLimitError(result),
          data: {
            currentRequests: result.currentRequests,
            maxRequests: result.maxRequests,
            resetTime: result.resetTime,
            retryAfter: result.retryAfter,
          },
        },
        id: null,
      });
      return;
    }

    // Record the request
    rateLimiter.recordRequest(sessionId, toolName);

    // Warn if approaching limit (80% threshold)
    if (result.currentRequests >= result.maxRequests * 0.8 && securityContext) {
      auditLogger.logRateLimitWarning(
        securityContext,
        toolName,
        result.currentRequests,
        result.maxRequests
      );
    }

    next();
  };
}

/**
 * Helper to check permissions in request handlers
 */
export function checkPermission(
  permissions: PermissionChecker,
  auditLogger: AuditLogger,
  context: any,
  requiredPermission: string,
  resource?: string
): boolean {
  const granted = permissions.hasPermission(context, requiredPermission);

  // Log the permission check
  auditLogger.logPermissionCheck(
    granted,
    context,
    [requiredPermission],
    resource
  );

  return granted;
}

/**
 * Helper to create permission denied error
 */
export function createPermissionDeniedError(
  requiredPermissions: string[]
): any {
  return {
    jsonrpc: '2.0',
    error: {
      code: -32002,
      message: 'Permission denied',
      data: {
        required: requiredPermissions,
      },
    },
    id: null,
  };
}

/**
 * Default security configuration (secure by default)
 */
export function getDefaultSecurityConfig(): SecurityConfig {
  return {
    enabled: true,
    authentication: {
      enabled: true,
      apiKeys: [],
      allowAnonymous: false,
    },
    permissions: {
      anonymous: [],
      authenticated: ['tools:*', 'prompts:*', 'resources:*'],
    },
    rateLimit: {
      enabled: true,
      strategy: 'sliding-window',
      window: 60000, // 1 minute
      maxRequests: 100,
    },
    audit: {
      enabled: true,
      logFile: './logs/audit.log',
      logToConsole: true,
      includeSensitiveData: false,
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
    },
  };
}

/**
 * Merge user config with defaults
 */
export function mergeSecurityConfig(
  userConfig?: Partial<SecurityConfig>
): SecurityConfig {
  const defaults = getDefaultSecurityConfig();

  if (!userConfig) {
    return defaults;
  }

  return {
    enabled: userConfig.enabled ?? defaults.enabled,
    authentication: {
      ...defaults.authentication,
      ...userConfig.authentication,
    },
    permissions: {
      ...defaults.permissions,
      ...userConfig.permissions,
    },
    rateLimit: {
      ...defaults.rateLimit,
      ...userConfig.rateLimit,
    },
    audit: {
      ...defaults.audit,
      ...userConfig.audit,
    },
  };
}