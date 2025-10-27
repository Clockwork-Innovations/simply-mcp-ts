/**
 * API Key Authentication
 *
 * Implements Express middleware for API key authentication:
 * - API key validation from headers
 * - Multiple API key support
 * - Permission association with keys
 * - Authentication logging
 * - Security context creation
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticationConfig, ApiKeyConfig, SecurityContext } from './types.js';
import { AuditLogger } from './AuditLogger.js';
import { createAuthenticatedContext, createAnonymousContext } from './AccessControl.js';

/**
 * Extended Express Request with security context
 */
export interface AuthenticatedRequest extends Request {
  securityContext?: SecurityContext;
}

/**
 * API Key Authentication middleware
 */
export class ApiKeyAuth {
  private config: AuthenticationConfig;
  private auditLogger?: AuditLogger;
  private apiKeyMap: Map<string, ApiKeyConfig>;

  constructor(config: AuthenticationConfig, auditLogger?: AuditLogger) {
    this.config = config;
    this.auditLogger = auditLogger;
    this.apiKeyMap = new Map();

    // Build API key lookup map
    if (config.apiKeys) {
      for (const keyConfig of config.apiKeys) {
        if (keyConfig.enabled !== false) {
          this.apiKeyMap.set(keyConfig.key, keyConfig);
        }
      }
    }
  }

  /**
   * Express middleware for API key authentication
   */
  middleware() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      // Skip if authentication is disabled
      if (!this.config.enabled) {
        req.securityContext = createAnonymousContext();
        return next();
      }

      const headerName = this.config.headerName || 'x-api-key';
      const apiKey = req.headers[headerName] as string | undefined;
      const ipAddress = this.getClientIp(req);
      const userAgent = req.headers['user-agent'];
      const sessionId = req.headers['mcp-session-id'] as string | undefined;

      // No API key provided
      if (!apiKey) {
        // Check if anonymous access is allowed
        if (this.config.allowAnonymous) {
          req.securityContext = createAnonymousContext();
          this.auditLogger?.logAuthenticationMissing(ipAddress, userAgent);
          return next();
        }

        // Reject request
        this.auditLogger?.logAuthenticationMissing(ipAddress, userAgent);
        return this.sendAuthenticationError(res, 'No API key provided');
      }

      // Validate API key
      const keyConfig = this.apiKeyMap.get(apiKey);
      if (!keyConfig) {
        this.auditLogger?.logAuthenticationFailure(
          'Invalid API key',
          ipAddress,
          userAgent
        );
        return this.sendAuthenticationError(res, 'Invalid API key');
      }

      // Check if key is expired
      if (keyConfig.expiresAt && keyConfig.expiresAt < Date.now()) {
        this.auditLogger?.logAuthenticationFailure(
          'API key expired',
          ipAddress,
          userAgent
        );
        return this.sendAuthenticationError(res, 'API key expired');
      }

      // Authentication successful
      req.securityContext = createAuthenticatedContext(
        keyConfig.name,
        keyConfig.permissions,
        sessionId,
        ipAddress,
        userAgent
      );

      this.auditLogger?.logAuthenticationSuccess(
        keyConfig.name,
        sessionId,
        ipAddress,
        userAgent
      );

      next();
    };
  }

  /**
   * Validate an API key without middleware
   */
  validateApiKey(apiKey: string): ApiKeyConfig | null {
    const keyConfig = this.apiKeyMap.get(apiKey);

    if (!keyConfig) {
      return null;
    }

    // Check if key is expired
    if (keyConfig.expiresAt && keyConfig.expiresAt < Date.now()) {
      return null;
    }

    return keyConfig;
  }

  /**
   * Get API key configuration by name
   */
  getApiKeyByName(name: string): ApiKeyConfig | null {
    for (const keyConfig of this.apiKeyMap.values()) {
      if (keyConfig.name === name) {
        return keyConfig;
      }
    }
    return null;
  }

  /**
   * Check if a request is authenticated
   */
  isAuthenticated(req: AuthenticatedRequest): boolean {
    return req.securityContext?.authenticated || false;
  }

  /**
   * Get security context from request
   */
  getSecurityContext(req: AuthenticatedRequest): SecurityContext {
    return req.securityContext || createAnonymousContext();
  }

  /**
   * Send authentication error response
   */
  private sendAuthenticationError(res: Response, message: string): void {
    res.status(401).json({
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: 'Authentication failed',
        data: {
          reason: message,
        },
      },
      id: null,
    });
  }

  /**
   * Get client IP address from request
   */
  private getClientIp(req: Request): string {
    // Check for X-Forwarded-For header (for proxies)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      return ips.split(',')[0].trim();
    }

    // Check for X-Real-IP header
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fall back to socket address
    return req.socket.remoteAddress || 'unknown';
  }

  /**
   * Generate a secure API key
   */
  static generateApiKey(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get authentication statistics
   */
  getStatistics(): {
    enabled: boolean;
    totalKeys: number;
    activeKeys: number;
    allowAnonymous: boolean;
  } {
    let activeKeys = 0;
    for (const keyConfig of this.apiKeyMap.values()) {
      if (!keyConfig.expiresAt || keyConfig.expiresAt > Date.now()) {
        activeKeys++;
      }
    }

    return {
      enabled: this.config.enabled,
      totalKeys: this.apiKeyMap.size,
      activeKeys,
      allowAnonymous: this.config.allowAnonymous || false,
    };
  }
}

/**
 * Create Express middleware for API key authentication
 */
export function createAuthMiddleware(
  config: AuthenticationConfig,
  auditLogger?: AuditLogger
) {
  const auth = new ApiKeyAuth(config, auditLogger);
  return auth.middleware();
}

/**
 * Require authentication middleware (must be used after auth middleware)
 */
export function requireAuthentication() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.securityContext?.authenticated) {
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
    next();
  };
}