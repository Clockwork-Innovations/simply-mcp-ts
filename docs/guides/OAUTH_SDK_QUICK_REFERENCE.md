# OAuth SDK Integration - Quick Reference

**Last Updated**: 2025-11-02
**SDK Version**: `@modelcontextprotocol/sdk@1.19.1`

---

## ✅ SDK Error Classes (Required)

Always use SDK error classes instead of generic `Error`:

```typescript
import {
  InvalidRequestError,
  InvalidClientError,
  InvalidGrantError,
  InvalidScopeError,
  UnauthorizedClientError,
  UnsupportedGrantTypeError,
} from '@modelcontextprotocol/sdk/server/auth/errors.js';
```

### When to Use Each Error

| Error Class | Use Case | OAuth Error Code |
|-------------|----------|------------------|
| `InvalidRequestError` | Malformed request, missing required params | `invalid_request` |
| `InvalidClientError` | Client authentication failed | `invalid_client` |
| `InvalidGrantError` | Invalid/expired code or token | `invalid_grant` |
| `InvalidScopeError` | Scope validation failed | `invalid_scope` |
| `UnauthorizedClientError` | Client not allowed for grant type | `unauthorized_client` |
| `UnsupportedGrantTypeError` | Grant type not supported | `unsupported_grant_type` |

### Examples

```typescript
// ❌ DON'T: Use generic Error
throw new Error('Invalid authorization code');

// ✅ DO: Use SDK error class
throw new InvalidGrantError('Invalid authorization code');

// ❌ DON'T: Manual JSON response
res.status(400).json({
  error: 'invalid_request',
  error_description: 'Missing code_verifier'
});

// ✅ DO: Throw SDK error (router handles response)
throw new InvalidRequestError('Missing code_verifier');
```

---

## ✅ Middleware with Scope Enforcement

```typescript
import { createOAuthMiddleware } from './features/auth/oauth/router.js';

// Basic usage - just require valid token
app.use('/api', createOAuthMiddleware({ provider }));

// Require specific scopes
app.post('/admin/users', createOAuthMiddleware({
  provider,
  requiredScopes: ['admin']
}), adminHandler);

// Multiple scopes (all required)
app.put('/data', createOAuthMiddleware({
  provider,
  requiredScopes: ['data:read', 'data:write']
}), dataHandler);

// With resource metadata URL
app.get('/protected', createOAuthMiddleware({
  provider,
  requiredScopes: ['read'],
  resourceMetadataUrl: 'https://api.example.com/.well-known/oauth-protected-resource'
}), handler);
```

### What Happens When Scope Check Fails

```http
HTTP/1.1 403 Forbidden
WWW-Authenticate: Bearer error="insufficient_scope",
                  error_description="Required scopes: admin",
                  scope="admin"
```

---

## ✅ Audit Logging (Now Required)

Audit logging is always enabled (no more optional):

```typescript
// Default console logging
const provider = new SimplyMCPOAuthProvider(config);
// Logs to console automatically

// Custom logger
import { AuditLogger } from './features/auth/security/AuditLogger.js';

const customLogger = new AuditLogger({
  enabled: true,
  logToConsole: true,
  logToFile: true,
  logFilePath: '/var/log/oauth-audit.log'
});

const provider = new SimplyMCPOAuthProvider(config, customLogger);
```

### Audit Events Logged

- `oauth.authorization.requested` - Authorization flow started
- `oauth.authorization.granted` - Authorization code issued
- `oauth.authorization.denied` - Authorization rejected
- `oauth.token.issued` - Access token issued
- `oauth.token.refreshed` - Token refreshed
- `oauth.token.revoked` - Token revoked
- `oauth.token.validation.success` - Token validated
- `oauth.token.validation.failed` - Token validation failed

---

## ✅ Dynamic Client Registration

```typescript
// POST /oauth/register
const response = await fetch('https://auth.example.com/oauth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    redirect_uris: ['https://app.example.com/callback'],
    client_name: 'My Application',
    client_uri: 'https://app.example.com',
    logo_uri: 'https://app.example.com/logo.png',
    contacts: ['admin@example.com'],
  })
});

const client = await response.json();
// {
//   client_id: "550e8400-e29b-41d4-a716-446655440000",
//   client_secret: "660e8400-e29b-41d4-a716-446655440000",
//   client_id_issued_at: 1699000000,
//   redirect_uris: ["https://app.example.com/callback"],
//   client_name: "My Application",
//   ...
// }

// ⚠️ IMPORTANT: Save client_secret now - it's only shown once!
```

---

## ✅ SDK Interfaces We Implement

### 1. OAuthServerProvider

```typescript
import { OAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/provider.js';

class SimplyMCPOAuthProviderProvider {
  // Required methods:
  authorize(client, params, res): Promise<void>
  challengeForAuthorizationCode(client, code): Promise<string>
  exchangeAuthorizationCode(client, code, verifier, redirectUri): Promise<OAuthTokens>
  exchangeRefreshToken(client, refreshToken, scopes): Promise<OAuthTokens>
  revokeToken(client, request): Promise<void>
  verifyAccessToken(token): Promise<AuthInfo>
}
```

### 2. OAuthRegisteredClientsStore

```typescript
import { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';

class InMemoryClientsStore implements OAuthRegisteredClientsStore {
  // Required:
  getClient(clientId: string): OAuthClientInformationFull | undefined

  // Optional (now implemented):
  registerClient(client): OAuthClientInformationFull
}
```

### 3. OAuthTokenVerifier (extends OAuthServerProvider)

```typescript
// SimplyMCPOAuthProvider automatically implements this
// via verifyAccessToken() method

const bearerMiddleware = requireBearerAuth({
  verifier: provider, // provider is an OAuthTokenVerifier
  requiredScopes: ['admin']
});
```

---

## ✅ SDK Middleware We Use

### 1. mcpAuthRouter

Creates all OAuth endpoints automatically:

```typescript
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';

const oauthRouter = mcpAuthRouter({
  provider,
  issuerUrl: new URL('https://auth.example.com'),
  scopesSupported: ['read', 'write', 'admin'],
});

app.use(oauthRouter);
```

**Endpoints Created**:
- `GET /.well-known/oauth-authorization-server` - Metadata (RFC 8414)
- `GET /oauth/authorize` - Authorization endpoint
- `POST /oauth/token` - Token endpoint
- `POST /oauth/register` - Client registration (RFC 7591)
- `POST /oauth/revoke` - Token revocation (RFC 7009)
- `GET /.well-known/oauth-protected-resource` - Resource metadata (RFC 9728)

### 2. requireBearerAuth

Validates Bearer tokens:

```typescript
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';

const middleware = requireBearerAuth({
  verifier: provider,
  requiredScopes: ['admin'],
  resourceMetadataUrl: 'https://api.example.com/.well-known/oauth-protected-resource'
});

app.use('/admin', middleware);
```

**What It Does**:
1. Extracts `Authorization: Bearer <token>` header
2. Validates token via `provider.verifyAccessToken(token)`
3. Checks required scopes (if specified)
4. Adds `req.auth` with `AuthInfo`
5. Returns 401/403 with proper WWW-Authenticate header on failure

---

## ✅ SDK Types We Use

```typescript
import {
  OAuthClientInformationFull,
  OAuthTokens,
  OAuthTokenRevocationRequest,
} from '@modelcontextprotocol/sdk/shared/auth.js';

import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

import {
  OAuthServerProvider,
  AuthorizationParams,
  OAuthTokenVerifier,
} from '@modelcontextprotocol/sdk/server/auth/provider.js';
```

---

## ❌ Common Mistakes (Don't Do This)

### 1. Using Generic Error

```typescript
// ❌ WRONG
if (!code) {
  throw new Error('Invalid authorization code');
}

// ✅ CORRECT
if (!code) {
  throw new InvalidGrantError('Invalid authorization code');
}
```

### 2. Manual Error Responses

```typescript
// ❌ WRONG
if (invalidRedirectUri) {
  res.status(400).json({ error: 'invalid_request' });
  return;
}

// ✅ CORRECT
if (invalidRedirectUri) {
  throw new InvalidRequestError('Invalid redirect_uri');
}
```

### 3. Optional Audit Logging

```typescript
// ❌ WRONG (was allowed before)
this.auditLogger?.log('event', 'success');

// ✅ CORRECT (required now)
this.auditLogger.log('event', 'success');
```

### 4. Not Using SDK Middleware

```typescript
// ❌ WRONG (reimplementing OAuth endpoints)
app.get('/oauth/authorize', (req, res) => {
  // Custom authorization logic
});

// ✅ CORRECT (use SDK router)
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
app.use(mcpAuthRouter({ provider, issuerUrl }));
```

### 5. Not Passing requiredScopes

```typescript
// ❌ SUBOPTIMAL (scope check in handler)
app.post('/admin', createOAuthMiddleware({ provider }), (req, res) => {
  if (!req.auth.scopes.includes('admin')) {
    return res.status(403).json({ error: 'insufficient_scope' });
  }
  // ...
});

// ✅ CORRECT (let middleware handle it)
app.post('/admin', createOAuthMiddleware({
  provider,
  requiredScopes: ['admin']
}), (req, res) => {
  // Only reached if scope check passes
});
```

---

## 📚 SDK Documentation Locations

**Installed Package**:
```
node_modules/@modelcontextprotocol/sdk/dist/
├── esm/server/auth/
│   ├── provider.d.ts        # OAuthServerProvider interface
│   ├── errors.d.ts          # Error classes
│   ├── router.d.ts          # mcpAuthRouter
│   ├── clients.d.ts         # OAuthRegisteredClientsStore
│   ├── types.d.ts           # AuthInfo
│   └── middleware/
│       └── bearerAuth.d.ts  # requireBearerAuth
└── shared/auth.d.ts         # OAuthTokens, etc.
```

**Online**:
- MCP SDK: https://github.com/modelcontextprotocol/typescript-sdk
- OAuth 2.1: https://oauth.net/2.1/

---

## ✅ Checklist for New OAuth Code

When implementing OAuth features:

- [ ] Import error classes from SDK
- [ ] Use `InvalidGrantError` for invalid/expired tokens
- [ ] Use `InvalidRequestError` for malformed requests
- [ ] Use `InvalidScopeError` for scope issues
- [ ] Throw errors instead of returning JSON responses
- [ ] Let SDK router handle error formatting
- [ ] Use `createOAuthMiddleware()` with `requiredScopes` for protected endpoints
- [ ] Ensure audit logging is configured (automatic now)
- [ ] Implement `OAuthServerProvider` interface methods
- [ ] Use SDK types (`OAuthTokens`, `AuthInfo`, etc.)
- [ ] Test with all 55 OAuth unit tests

---

## 🚀 Quick Start Example

```typescript
import { SimplyMCPOAuthProvider, createOAuthRouter, createOAuthMiddleware } from 'simply-mcp';
import express from 'express';

const app = express();

// 1. Create provider
const provider = new SimplyMCPOAuthProvider({
  clients: [{
    clientId: 'my-app',
    clientSecret: 'secret-123',
    redirectUris: ['http://localhost:3000/callback'],
    scopes: ['read', 'write', 'admin']
  }],
  tokenExpiration: 3600,        // 1 hour
  refreshTokenExpiration: 86400, // 24 hours
});

// 2. Add OAuth endpoints
app.use(createOAuthRouter({
  provider,
  issuerUrl: 'https://auth.example.com',
  scopesSupported: ['read', 'write', 'admin'],
}));

// 3. Protect routes with scope requirements
app.get('/api/data', createOAuthMiddleware({
  provider,
  requiredScopes: ['read']
}), (req, res) => {
  res.json({ data: 'public data' });
});

app.post('/api/data', createOAuthMiddleware({
  provider,
  requiredScopes: ['write']
}), (req, res) => {
  res.json({ success: true });
});

app.delete('/api/admin', createOAuthMiddleware({
  provider,
  requiredScopes: ['admin']
}), (req, res) => {
  res.json({ deleted: true });
});

app.listen(3000);
```

---

**Last Updated**: 2025-11-02
**Status**: ✅ Production-ready with SDK v1.19.1
