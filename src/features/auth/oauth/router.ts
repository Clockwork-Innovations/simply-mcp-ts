import { Router, type RequestHandler, type Request, type Response, type NextFunction } from 'express';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import type { SimplyMCPOAuthProvider } from './SimplyMCPOAuthProvider.js';
import { mapScopesToPermissions } from '../security/AccessControl.js';
import type { SecurityContext } from '../security/types.js';
import type { AuditLogger } from '../security/AuditLogger.js';

/**
 * Extended Express Request with MCP security context
 */
export interface MCPRequest extends Request {
  mcpContext?: SecurityContext;
}

/**
 * Configuration for OAuth router
 */
export interface OAuthRouterConfig {
  /** OAuth provider instance */
  provider: SimplyMCPOAuthProvider;

  /** OAuth issuer URL (e.g., 'https://auth.example.com') */
  issuerUrl: string;

  /** Optional: Base URL for OAuth endpoints (defaults to issuerUrl) */
  baseUrl?: string;

  /** Optional: URL of documentation page */
  serviceDocumentationUrl?: string;

  /** Optional: List of supported scopes */
  scopesSupported?: string[];

  /** Optional: Resource name for protected resource metadata */
  resourceName?: string;

  /** Optional: Resource server URL (defaults to issuerUrl) */
  resourceServerUrl?: string;
}

/**
 * Creates an Express router with all OAuth 2.1 endpoints
 *
 * Endpoints created:
 * - GET /.well-known/oauth-authorization-server - OAuth metadata (RFC 8414)
 * - GET /oauth/authorize - Authorization endpoint
 * - POST /oauth/token - Token endpoint
 * - POST /oauth/register - Dynamic client registration (RFC 7591)
 * - POST /oauth/revoke - Token revocation (RFC 7009)
 * - GET /.well-known/oauth-protected-resource - Resource metadata (RFC 9728)
 *
 * @param config - OAuth router configuration
 * @returns Express RequestHandler with OAuth endpoints
 */
export function createOAuthRouter(config: OAuthRouterConfig): RequestHandler {
  const {
    provider,
    issuerUrl,
    baseUrl,
    serviceDocumentationUrl,
    scopesSupported,
    resourceName,
    resourceServerUrl,
  } = config;

  // Create MCP SDK router with provider
  const handler = mcpAuthRouter({
    provider,
    issuerUrl: new URL(issuerUrl),
    baseUrl: baseUrl ? new URL(baseUrl) : undefined,
    serviceDocumentationUrl: serviceDocumentationUrl
      ? new URL(serviceDocumentationUrl)
      : undefined,
    scopesSupported,
    resourceName,
    resourceServerUrl: resourceServerUrl ? new URL(resourceServerUrl) : undefined,
  });

  return handler;
}

/**
 * Creates Express middleware that requires Bearer token authentication
 * and maps OAuth scopes to Simply-MCP permissions.
 *
 * The middleware:
 * 1. Validates the Bearer token using the OAuth provider
 * 2. Validates required scopes (if specified)
 * 3. Extracts scopes from the validated token
 * 4. Maps OAuth scopes to Simply-MCP permissions
 * 5. Creates a SecurityContext with the mapped permissions
 * 6. Attaches the context to req.mcpContext for authorization checks
 *
 * Usage:
 * ```typescript
 * // Basic usage
 * app.use('/mcp', createOAuthMiddleware({ provider }));
 *
 * // Require specific scopes
 * app.post('/admin', createOAuthMiddleware({
 *   provider,
 *   requiredScopes: ['admin']
 * }), handler);
 * ```
 *
 * @param config - OAuth middleware configuration
 * @returns Express middleware function
 */
export function createOAuthMiddleware(config: {
  provider: SimplyMCPOAuthProvider;
  requiredScopes?: string[];
  resourceMetadataUrl?: string;
  auditLogger?: AuditLogger;
}): RequestHandler {
  const { provider, requiredScopes, resourceMetadataUrl, auditLogger } = config;

  // Get the base bearer auth middleware from MCP SDK
  const bearerMiddleware = requireBearerAuth({
    verifier: provider,
    requiredScopes,
    resourceMetadataUrl,
  });

  // Wrap it to add scope-to-permission mapping
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Call the bearer middleware
      await new Promise<void>((resolve, reject) => {
        bearerMiddleware(req, res, (err?: any) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Token validated successfully by bearer middleware
      // Now extract scopes and map to permissions
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        try {
          // Verify token and get auth info (includes scopes)
          // NOTE: verifyAccessToken already logs validation success/failure
          const authInfo = await provider.verifyAccessToken(token);

          // Map OAuth scopes to Simply-MCP permissions
          const permissions = mapScopesToPermissions(authInfo.scopes || []);

          // Create SecurityContext and attach to request
          const mcpReq = req as MCPRequest;
          mcpReq.mcpContext = {
            authenticated: true,
            permissions,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            createdAt: Date.now(),
          };
        } catch (tokenError) {
          // Token verification failed - bearer middleware should have caught this,
          // but handle gracefully just in case
          // NOTE: verifyAccessToken already logged the failure
          return res.status(401).json({
            error: 'invalid_token',
            error_description: 'Token verification failed',
          });
        }
      }

      // Continue to next middleware
      next();
    } catch (error) {
      // Bearer auth failed
      next(error);
    }
  };
}
