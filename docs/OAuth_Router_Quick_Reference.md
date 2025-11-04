# OAuth Router - Quick Reference

## Installation

Already included in Simply-MCP. No additional dependencies required (except Express for HTTP transport).

## Basic Setup

```typescript
import express from 'express';
import {
  SimplyMCPOAuthProvider,
  createOAuthRouter,
  createOAuthMiddleware,
} from 'simply-mcp';

// 1. Create OAuth provider
const provider = new SimplyMCPOAuthProvider({
  clients: [
    {
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUris: ['http://localhost:3000/callback'],
      scopes: ['read', 'write'],
    },
  ],
});

// 2. Create Express app
const app = express();
app.use(express.json());

// 3. Mount OAuth router
const oauthRouter = createOAuthRouter({
  provider,
  issuerUrl: 'http://localhost:3000',
});
app.use(oauthRouter);

// 4. Protect endpoints
app.get('/api/data', createOAuthMiddleware({ provider }), (req, res) => {
  res.json({ data: 'protected' });
});

app.listen(3000);
```

## Configuration Options

### OAuthRouterConfig

```typescript
interface OAuthRouterConfig {
  // Required
  provider: SimplyMCPOAuthProvider;
  issuerUrl: string;

  // Optional
  baseUrl?: string;
  serviceDocumentationUrl?: string;
  scopesSupported?: string[];
  resourceName?: string;
  resourceServerUrl?: string;
}
```

### OAuthProviderConfig

```typescript
interface OAuthProviderConfig {
  clients: Array<{
    clientId: string;
    clientSecret: string;
    redirectUris: string[];
    scopes: string[];
  }>;
  tokenExpiration?: number;        // Default: 3600 (1 hour)
  refreshTokenExpiration?: number; // Default: 86400 (24 hours)
  codeExpiration?: number;         // Default: 600 (10 minutes)
}
```

## API Reference

### createOAuthRouter(config)

Creates an Express RequestHandler with OAuth 2.1 endpoints.

**Returns:** `RequestHandler`

**Endpoints created:**
- `GET /.well-known/oauth-authorization-server` - OAuth metadata
- `GET /.well-known/oauth-protected-resource` - Resource metadata

### createOAuthMiddleware(config)

Creates Express middleware that requires Bearer token authentication.

**Returns:** Express middleware function

**Usage:**
```typescript
app.get('/protected', createOAuthMiddleware({ provider }), handler);
```

## OAuth Metadata Endpoint

**URL:** `GET /.well-known/oauth-authorization-server`

**Returns:**
```json
{
  "issuer": "http://localhost:3000",
  "authorization_endpoint": "http://localhost:3000/oauth/authorize",
  "token_endpoint": "http://localhost:3000/oauth/token",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  ...
}
```

## Protected Endpoints

### Without Authentication
```bash
curl http://localhost:3000/protected
# Returns: 401 Unauthorized
```

### With Bearer Token
```bash
curl -H "Authorization: Bearer <access_token>" http://localhost:3000/protected
# Returns: 200 OK with response body
```

## Provider Methods

### authenticateClient(clientId, clientSecret)
```typescript
const isValid = await provider.authenticateClient('client-id', 'client-secret');
```

### verifyAccessToken(token)
```typescript
const authInfo = await provider.verifyAccessToken('token-string');
// Returns: { token, clientId, scopes, expiresAt }
```

### getStats()
```typescript
const stats = provider.getStats();
// Returns: { clients, tokens, refreshTokens, authorizationCodes }
```

## Examples

### Multiple Clients
```typescript
const provider = new SimplyMCPOAuthProvider({
  clients: [
    {
      clientId: 'web-app',
      clientSecret: 'web-secret',
      redirectUris: ['http://localhost:3000/callback'],
      scopes: ['read', 'write'],
    },
    {
      clientId: 'mobile-app',
      clientSecret: 'mobile-secret',
      redirectUris: ['myapp://callback'],
      scopes: ['read'],
    },
  ],
});
```

### Custom Token Expiration
```typescript
const provider = new SimplyMCPOAuthProvider({
  clients: [...],
  tokenExpiration: 7200,        // 2 hours
  refreshTokenExpiration: 172800, // 48 hours
  codeExpiration: 300,           // 5 minutes
});
```

### Full Configuration
```typescript
const oauthRouter = createOAuthRouter({
  provider,
  issuerUrl: 'https://auth.example.com',
  baseUrl: 'https://auth.example.com',
  serviceDocumentationUrl: 'https://docs.example.com/oauth',
  scopesSupported: ['read', 'write', 'admin'],
  resourceName: 'Example API',
  resourceServerUrl: 'https://api.example.com',
});
```

## Security Features

✅ **PKCE (Proof Key for Code Exchange)** - SHA256 code challenge validation
✅ **bcrypt Password Hashing** - Client secrets stored as bcrypt hashes
✅ **Single-use Authorization Codes** - Codes can only be used once
✅ **Token Expiration** - Automatic cleanup of expired tokens
✅ **Scope Validation** - Strict scope enforcement
✅ **Redirect URI Validation** - Only whitelisted URIs allowed

## Testing

### Run Tests
```bash
npm test tests/integration/oauth-router.test.ts
npm test tests/integration/oauth-e2e.test.ts
```

### Demo Server
```bash
npx tsx examples/oauth-router-demo.ts
```

## RFCs Implemented

- **RFC 8414** - OAuth 2.0 Authorization Server Metadata
- **RFC 7591** - OAuth 2.0 Dynamic Client Registration
- **RFC 7009** - OAuth 2.0 Token Revocation
- **RFC 9728** - OAuth 2.0 Protected Resource Metadata
- **RFC 7636** - PKCE for OAuth Public Clients
- **OAuth 2.1** - Latest OAuth specification

## Troubleshooting

### 401 Unauthorized on Protected Endpoint
- Ensure Bearer token is included: `Authorization: Bearer <token>`
- Verify token is not expired
- Check token was issued by this provider

### Metadata Endpoint 404
- Ensure OAuth router is mounted: `app.use(oauthRouter)`
- Check issuerUrl matches server URL
- Verify Express app is running

### TypeScript Errors
- Ensure `@types/express` is installed
- Import types from `simply-mcp` package
- Check tsconfig includes Express types

## Support

- **Documentation:** `/docs/guides/PROTOCOL.md`
- **Examples:** `/examples/oauth-router-demo.ts`
- **Tests:** `/tests/integration/oauth-*.test.ts`
