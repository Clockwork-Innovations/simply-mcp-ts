# OAuth 2.1 Authentication

Simply-MCP provides OAuth 2.1 utilities that build on the official [Anthropic MCP SDK's OAuth primitives](https://github.com/modelcontextprotocol/typescript-sdk/tree/main/src/server/auth).

## What Simply-MCP Provides

**Storage Adapters:**
- `InMemoryStorage` - In-memory token/client storage (development)
- `RedisStorage` - Redis-backed storage (production)

**Router Helpers:**
- `createOAuthRouter()` - Wraps SDK's `mcpAuthRouter`
- `createOAuthMiddleware()` - Wraps SDK's `requireBearerAuth`

**Reference Implementation:**
- `examples/reference-oauth-provider.ts` - Sample OAuthServerProvider implementation

## What the MCP SDK Provides

The official SDK includes:
- OAuth 2.1 protocol implementation (RFC 6749, RFC 7636)
- Authorization endpoints and token management
- PKCE support (RFC 7636)
- Error classes and type definitions

**For production use, we recommend:**
1. Using an external OAuth provider (Auth0, Okta, Keycloak)
2. Implementing the SDK's `OAuthServerProvider` interface
3. Using the reference implementation as a starting point

See the [MCP SDK OAuth documentation](https://github.com/modelcontextprotocol/typescript-sdk/tree/main/src/server/auth) for the full protocol specification.

---

## Table of Contents

- [Quick Start](#quick-start)
- [What is OAuth 2.1?](#what-is-oauth-21)
- [Architecture Overview](#architecture-overview)
- [Configuration](#configuration)
  - [Interface API](#interface-api)
  - [Client Configuration](#client-configuration)
  - [Token Expiration Settings](#token-expiration-settings)
- [Authorization Flow](#authorization-flow)
- [Scope System](#scope-system)
  - [Standard Scopes](#standard-scopes)
  - [Custom Scopes](#custom-scopes)
  - [Scope-to-Permission Mapping](#scope-to-permission-mapping)
- [Client Management](#client-management)
- [Token Lifecycle](#token-lifecycle)
  - [Access Tokens](#access-tokens)
  - [Refresh Tokens](#refresh-tokens)
  - [Authorization Codes](#authorization-codes)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)
- [API Reference](#api-reference)
- [Credits](#credits)

---

## Quick Start

Get OAuth 2.1 authentication running in 5 minutes.

### 1. Create OAuth Server

```typescript
// server.ts
import type { IServer, IOAuth2Auth, ITool, IParam } from 'simply-mcp';

// Configure OAuth authentication
interface MyAuth extends IOAuth2Auth {
  type: 'oauth2';
  issuerUrl: 'http://localhost:3000';
  clients: [
    {
      clientId: 'my-app';
      clientSecret: process.env.OAUTH_CLIENT_SECRET!;
      redirectUris: ['http://localhost:8080/callback'];
      scopes: ['read', 'tools:execute'];
      name: 'My Application';
    }
  ];
}

// Configure server with OAuth
const server: IServer = {
  name: 'oauth-server',
  version: '1.0.0',
  description: 'OAuth-protected MCP server'
  transport: 'http';
  port: 3000;
  stateful: true;  // Required for OAuth
  auth: MyAuth;
}

// Define a tool
interface GreetParam extends IParam {
  type: 'string';
  description: 'Name to greet';
}

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet someone (requires tools:execute scope)';
  params: { name: GreetParam };
  result: { message: string };
}

// Implement server
export default class Server {
  greet: GreetTool = async ({ name }) => ({
    message: `Hello, ${name}!`
  });
}
```

### 2. Set Client Secret

```bash
export OAUTH_CLIENT_SECRET="your-secret-key-change-in-production"
```

### 3. Run Server

```bash
npx simply-mcp run server.ts
```

### 4. Test OAuth Flow

**Step 1: Get OAuth Metadata**
```bash
curl http://localhost:3000/.well-known/oauth-authorization-server
```

**Step 2: Generate PKCE Codes**
```bash
CODE_VERIFIER=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-43)
CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | openssl dgst -binary -sha256 | openssl base64 | tr -d "=+/" | cut -c1-43)
echo "Verifier: $CODE_VERIFIER"
echo "Challenge: $CODE_CHALLENGE"
```

**Step 3: Authorize (Open in Browser)**
```
http://localhost:3000/oauth/authorize?response_type=code&client_id=my-app&redirect_uri=http://localhost:8080/callback&scope=read%20tools:execute&code_challenge=$CODE_CHALLENGE&code_challenge_method=S256
```

**Step 4: Exchange Code for Token**
```bash
curl -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "client_id": "my-app",
    "client_secret": "'$OAUTH_CLIENT_SECRET'",
    "code": "<AUTH_CODE_FROM_STEP_3>",
    "redirect_uri": "http://localhost:8080/callback",
    "code_verifier": "'$CODE_VERIFIER'"
  }'
```

**Step 5: Call Tool with Access Token**
```bash
ACCESS_TOKEN="<token-from-step-4>"

curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "greet",
      "arguments": {"name": "World"}
    },
    "id": 1
  }'
```

**Learn More:** [Complete testing guide in example server](../../examples/interface-oauth-server.ts)

---

## What is OAuth 2.1?

OAuth 2.1 is the latest version of the OAuth authorization framework, consolidating best practices and security improvements from OAuth 2.0.

### Why OAuth 2.1?

**Better Security:**
- No long-lived credentials in applications
- PKCE (Proof Key for Code Exchange) prevents authorization code interception
- Token revocation without changing secrets
- Refresh token rotation

**Granular Permissions:**
- Scope-based access control
- Users grant specific permissions, not all-or-nothing access
- Applications request only needed scopes

**Industry Standard:**
- Widely supported by clients and libraries
- Well-understood by developers
- Extensive tooling and documentation

### OAuth 2.1 vs API Keys

| Feature | OAuth 2.1 | API Keys |
|---------|-----------|----------|
| Security | Short-lived tokens, rotating secrets | Long-lived, static |
| Permissions | Scope-based, granular | All-or-nothing |
| User Context | Knows which application | Anonymous |
| Revocation | Immediate, no secret change | Requires secret rotation |
| Complexity | Higher setup cost | Simple |
| Best For | Production, third-party apps | Internal tools, testing |

---

## Architecture Overview

Simply-MCP's OAuth implementation leverages the **MCP SDK** from Anthropic with additional features:

```
┌─────────────────────────────────────────────────────────────┐
│                    Simply-MCP OAuth Stack                    │
├─────────────────────────────────────────────────────────────┤
│  Interface API (IOAuth2Auth)                                │
│  - Type-safe configuration                                   │
│  - Client management                                         │
│  - Scope definitions                                         │
├─────────────────────────────────────────────────────────────┤
│  SimplyMCPOAuthProvider                                      │
│  - Token storage and validation                             │
│  - PKCE validation (SHA-256)                                │
│  - bcrypt-hashed client secrets                             │
│  - Authorization code lifecycle                             │
├─────────────────────────────────────────────────────────────┤
│  Scope Mapping & Access Control                             │
│  - OAuth scopes → Simply-MCP permissions                    │
│  - Permission checking (wildcards, inheritance)             │
│  - SecurityContext injection                                │
├─────────────────────────────────────────────────────────────┤
│  Audit Logging                                               │
│  - All OAuth events logged                                   │
│  - Authorization, token, revocation tracking                │
│  - Security event monitoring                                │
├─────────────────────────────────────────────────────────────┤
│  MCP SDK (from Anthropic)                                    │
│  - OAuth router (endpoints)                                  │
│  - Bearer authentication middleware                          │
│  - RFC-compliant schemas and validation                     │
│  - Well-known metadata endpoints                            │
└─────────────────────────────────────────────────────────────┘
```

### Components

**MCP SDK** (provided by Anthropic):
- OAuth router with standard endpoints
- Bearer token authentication middleware
- RFC 8414 (Authorization Server Metadata)
- RFC 7636 (PKCE)
- RFC 7009 (Token Revocation)

**SimplyMCPOAuthProvider** (Simply-MCP implementation):
- UUID-based tokens (not JWT)
- In-memory token storage (MVP - extend for production)
- bcrypt-hashed client secrets
- Single-use authorization codes
- Token cleanup and expiration

**Scope Mapping** (Simply-MCP feature):
- Converts OAuth scopes to permission system
- Standard scope mappings (read, write, tools:execute, etc.)
- Custom scope pass-through
- Wildcard permission matching

**Audit Logger** (Simply-MCP feature):
- Logs all OAuth events to file
- Authorization requests/grants/denials
- Token issuance/refresh/revocation
- Permission validation success/failure

---

## Configuration

### Interface API

OAuth is configured using the `IOAuth2Auth` interface in your server definition.

**Basic Example:**

```typescript
import type { IServer, IOAuth2Auth } from 'simply-mcp';

interface MyAuth extends IOAuth2Auth {
  type: 'oauth2';
  issuerUrl: string;
  clients: IOAuthClient[];
  tokenExpiration?: number;
  refreshTokenExpiration?: number;
  codeExpiration?: number;
}

const server: IServer = {
  name: 'my-server',
  version: '1.0.0',
  description: 'OAuth-protected server'
  transport: 'http';
  port: 3000;
  stateful: true;  // REQUIRED for OAuth
  auth: MyAuth;
}
```

### Client Configuration

Each OAuth client represents an application that can authenticate users.

**IOAuthClient Interface:**

```typescript
interface IOAuthClient {
  /**
   * Client ID (public identifier)
   * Use a descriptive, unique string
   */
  clientId: string;

  /**
   * Client secret (hashed with bcrypt)
   * SECURITY: Load from environment variables in production
   */
  clientSecret: string;

  /**
   * Allowed redirect URIs
   * Authorization codes are only sent to these URIs
   * Must match exactly (including trailing slashes)
   */
  redirectUris: string[];

  /**
   * Allowed scopes for this client
   * Client can only request these scopes
   */
  scopes: string[];

  /**
   * Optional: Human-readable client name
   * Displayed in authorization UI
   */
  name?: string;
}
```

**Example: Multiple Clients**

```typescript
interface MyAuth extends IOAuth2Auth {
  type: 'oauth2';
  issuerUrl: 'https://auth.example.com';
  clients: [
    // Admin application - full access
    {
      clientId: 'admin-dashboard';
      clientSecret: process.env.ADMIN_CLIENT_SECRET!;
      redirectUris: [
        'https://admin.example.com/callback',
        'http://localhost:3000/callback'  // Dev
      ];
      scopes: ['admin'];
      name: 'Admin Dashboard';
    },
    // Mobile app - limited access
    {
      clientId: 'mobile-app';
      clientSecret: process.env.MOBILE_CLIENT_SECRET!;
      redirectUris: [
        'myapp://oauth/callback',  // Custom URL scheme
        'https://app.example.com/callback'
      ];
      scopes: ['read', 'tools:execute'];
      name: 'Mobile App';
    },
    // Analytics platform - custom scope
    {
      clientId: 'analytics';
      clientSecret: process.env.ANALYTICS_CLIENT_SECRET!;
      redirectUris: ['https://analytics.example.com/callback'];
      scopes: ['analytics:query', 'read'];
      name: 'Analytics Platform';
    }
  ];
}
```

### Token Expiration Settings

Control token lifetimes (in seconds).

**Default Values:**

```typescript
interface MyAuth extends IOAuth2Auth {
  type: 'oauth2';
  issuerUrl: 'https://auth.example.com';
  clients: [ /* ... */ ];

  // Optional: Customize token lifetimes
  tokenExpiration: 3600;        // 1 hour (default)
  refreshTokenExpiration: 86400; // 24 hours (default)
  codeExpiration: 600;           // 10 minutes (default)
}
```

**Recommended Settings:**

| Environment | Access Token | Refresh Token | Auth Code |
|-------------|-------------|---------------|-----------|
| Development | 3600 (1h) | 86400 (24h) | 600 (10m) |
| Staging | 1800 (30m) | 43200 (12h) | 300 (5m) |
| Production | 900 (15m) | 2592000 (30d) | 300 (5m) |

**Security Considerations:**
- Shorter access tokens = more secure, more refresh calls
- Longer refresh tokens = better UX, higher risk if stolen
- Authorization codes should be short-lived (5-10 minutes)

---

## Authorization Flow

OAuth 2.1 uses the **Authorization Code + PKCE** flow for security.

### Flow Diagram

```
┌─────────┐                                  ┌──────────────┐
│ Client  │                                  │ OAuth Server │
│   App   │                                  │ (Simply-MCP) │
└────┬────┘                                  └──────┬───────┘
     │                                               │
     │ 1. Generate PKCE codes                        │
     │    code_verifier (random)                     │
     │    code_challenge = SHA256(code_verifier)     │
     │                                               │
     │ 2. Authorization Request                      │
     │    GET /oauth/authorize                       │
     │    - client_id                                │
     │    - redirect_uri                             │
     │    - scope                                    │
     │    - code_challenge                           │
     │    - code_challenge_method=S256               │
     ├──────────────────────────────────────────────►│
     │                                               │
     │ 3. User authorizes (browser)                  │
     │    Server validates:                          │
     │    - client_id exists                         │
     │    - redirect_uri allowed                     │
     │    - scopes allowed                           │
     │                                               │
     │ 4. Redirect with authorization code           │
     │    302 redirect_uri?code=AUTH_CODE            │
     │◄──────────────────────────────────────────────┤
     │                                               │
     │ 5. Token Request                              │
     │    POST /oauth/token                          │
     │    - grant_type=authorization_code            │
     │    - code=AUTH_CODE                           │
     │    - client_id                                │
     │    - client_secret                            │
     │    - redirect_uri                             │
     │    - code_verifier                            │
     ├──────────────────────────────────────────────►│
     │                                               │
     │    Server validates:                          │
     │    - Authorization code valid/not expired     │
     │    - Client credentials correct               │
     │    - PKCE: SHA256(code_verifier) =            │
     │      code_challenge                           │
     │    - redirect_uri matches                     │
     │                                               │
     │ 6. Access Token Response                      │
     │    {                                          │
     │      "access_token": "...",                   │
     │      "token_type": "Bearer",                  │
     │      "expires_in": 3600,                      │
     │      "refresh_token": "...",                  │
     │      "scope": "read tools:execute"            │
     │    }                                          │
     │◄──────────────────────────────────────────────┤
     │                                               │
     │ 7. API Request with Bearer Token              │
     │    POST /mcp                                  │
     │    Authorization: Bearer ACCESS_TOKEN         │
     ├──────────────────────────────────────────────►│
     │                                               │
     │    Server:                                    │
     │    - Validates access token                   │
     │    - Maps scopes to permissions               │
     │    - Checks permissions for operation         │
     │                                               │
     │ 8. API Response                               │
     │◄──────────────────────────────────────────────┤
     │                                               │
```

### Step-by-Step Guide

**Step 1: Generate PKCE Codes**

PKCE (Proof Key for Code Exchange) prevents authorization code interception.

```bash
# Generate code verifier (random 43-character string)
CODE_VERIFIER=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-43)

# Generate code challenge (SHA-256 hash of verifier)
CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | openssl dgst -binary -sha256 | openssl base64 | tr -d "=+/" | cut -c1-43)

echo "Verifier: $CODE_VERIFIER"
echo "Challenge: $CODE_CHALLENGE"
```

**Step 2: Authorization Request**

Direct user's browser to authorization endpoint:

```
GET http://localhost:3000/oauth/authorize?
  response_type=code&
  client_id=my-app&
  redirect_uri=http://localhost:8080/callback&
  scope=read%20tools:execute&
  code_challenge=$CODE_CHALLENGE&
  code_challenge_method=S256&
  state=random-state-string
```

**Parameters:**
- `response_type`: Must be `code`
- `client_id`: Your client ID
- `redirect_uri`: Where to send authorization code (must be registered)
- `scope`: Space-separated scopes (URL-encoded as `%20`)
- `code_challenge`: SHA-256 hash of code_verifier
- `code_challenge_method`: Must be `S256`
- `state` (optional): Random string to prevent CSRF

**Step 3: User Authorization**

Server validates request and redirects to:
```
http://localhost:8080/callback?code=AUTH_CODE&state=random-state-string
```

**Step 4: Exchange Code for Token**

```bash
curl -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "AUTH_CODE",
    "client_id": "my-app",
    "client_secret": "your-client-secret",
    "redirect_uri": "http://localhost:8080/callback",
    "code_verifier": "'$CODE_VERIFIER'"
  }'
```

**Response:**
```json
{
  "access_token": "550e8400-e29b-41d4-a716-446655440000",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "650e8400-e29b-41d4-a716-446655440000",
  "scope": "read tools:execute"
}
```

**Step 5: Use Access Token**

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "greet",
      "arguments": {"name": "World"}
    },
    "id": 1
  }'
```

---

## Scope System

Scopes control what an access token can do. Simply-MCP maps OAuth scopes to its permission system.

### Standard Scopes

Simply-MCP defines standard scopes for common access patterns:

| Scope | Permission | Description |
|-------|-----------|-------------|
| `read` | `read:*` | Read-only access to all resources |
| `write` | `write:*` | Write access to all resources |
| `tools:execute` | `tools:*` | Execute any tool |
| `resources:read` | `resources:*` | Read any resource |
| `prompts:read` | `prompts:*` | Read any prompt |
| `admin` | `*` | Full access to everything |

**Example:**

```typescript
interface MyAuth extends IOAuth2Auth {
  type: 'oauth2';
  issuerUrl: 'https://auth.example.com';
  clients: [
    {
      clientId: 'viewer-app';
      clientSecret: process.env.VIEWER_SECRET!;
      redirectUris: ['https://app.example.com/callback'];
      scopes: ['read'];  // Read-only access
      name: 'Viewer Application';
    },
    {
      clientId: 'admin-app';
      clientSecret: process.env.ADMIN_SECRET!;
      redirectUris: ['https://admin.example.com/callback'];
      scopes: ['admin'];  // Full access
      name: 'Admin Dashboard';
    }
  ];
}
```

### Custom Scopes

Define custom scopes for application-specific permissions:

```typescript
interface MyAuth extends IOAuth2Auth {
  type: 'oauth2';
  issuerUrl: 'https://auth.example.com';
  clients: [
    {
      clientId: 'analytics-app';
      clientSecret: process.env.ANALYTICS_SECRET!;
      redirectUris: ['https://analytics.example.com/callback'];
      scopes: [
        'analytics:query',    // Custom scope
        'analytics:export',   // Custom scope
        'read'                // Standard scope
      ];
      name: 'Analytics Platform';
    }
  ];
}
```

**Custom scopes:**
- Pass through to permission system as-is
- Use colon notation for namespacing: `namespace:action`
- Check permissions in tool/resource handlers

### Scope-to-Permission Mapping

Simply-MCP automatically maps OAuth scopes to permissions when a token is validated.

**Mapping Function:**

```typescript
function mapScopesToPermissions(scopes: string[]): string[] {
  const scopeMap = {
    'read': ['read:*'],
    'write': ['write:*'],
    'tools:execute': ['tools:*'],
    'resources:read': ['resources:*'],
    'prompts:read': ['prompts:*'],
    'admin': ['*'],
  };

  const permissions: string[] = [];
  for (const scope of scopes) {
    if (scopeMap[scope]) {
      permissions.push(...scopeMap[scope]);
    } else {
      // Custom scope - pass through as-is
      permissions.push(scope);
    }
  }
  return [...new Set(permissions)];  // Deduplicate
}
```

**Example Mappings:**

| OAuth Scopes | Permissions | Can Execute |
|--------------|-------------|-------------|
| `['admin']` | `['*']` | Everything |
| `['tools:execute']` | `['tools:*']` | Any tool |
| `['read', 'tools:execute']` | `['read:*', 'tools:*']` | Read resources, execute tools |
| `['analytics:query']` | `['analytics:query']` | Custom permission |

**Permission Checking:**

Permissions support wildcards:

```typescript
// Permission: 'tools:*' grants access to:
'tools:greet'      ✓
'tools:calculate'  ✓
'tools:admin'      ✓

// Permission: 'read:*' grants access to:
'read:resource1'   ✓
'read:resource2'   ✓
'write:resource1'  ✗ (different namespace)

// Permission: '*' grants access to:
'tools:greet'      ✓
'read:resource1'   ✓
'write:resource2'  ✓
'anything'         ✓
```

### Checking Scopes in Handlers

Access security context in tool/resource handlers:

```typescript
import type { ITool, IParam } from 'simply-mcp';

interface AdminParam extends IParam {
  type: 'string';
  description: 'Admin action';
}

interface AdminTool extends ITool {
  name: 'admin_action';
  description: 'Execute admin action (requires admin scope)';
  params: { action: AdminParam };
  result: { status: string };
}

export default class MyServer {
  adminAction: AdminTool = async (params, context) => {
    // Check if user has admin permission
    if (!context?.securityContext?.permissions?.includes('*')) {
      throw new Error('Unauthorized: admin scope required');
    }

    // Execute admin action
    return { status: 'executed' };
  };
}
```

**Note:** Permission checking is **automatic** for standard tools/resources. Manual checks are only needed for custom logic.

---

## Client Management

### Registering Clients

Clients are registered in your server configuration:

```typescript
interface MyAuth extends IOAuth2Auth {
  type: 'oauth2';
  issuerUrl: 'https://auth.example.com';
  clients: [
    {
      clientId: 'web-app',
      clientSecret: process.env.WEB_APP_SECRET!,
      redirectUris: [
        'https://app.example.com/callback',
        'http://localhost:3000/callback'  // Dev
      ],
      scopes: ['read', 'tools:execute'],
      name: 'Web Application'
    }
  ];
}
```

### Client Secrets

**Security Requirements:**

1. **Load from Environment Variables:**
   ```typescript
   clientSecret: process.env.OAUTH_CLIENT_SECRET!
   ```

2. **Never Hardcode:**
   ```typescript
   // ❌ NEVER DO THIS
   clientSecret: 'my-secret-123'
   ```

3. **Never Commit to Git:**
   ```bash
   # .env (add to .gitignore)
   OAUTH_CLIENT_SECRET=your-secret-here
   ```

4. **Generate Strong Secrets:**
   ```bash
   # Generate a secure random secret
   openssl rand -base64 32
   ```

**Secret Storage:**
- Secrets are hashed with bcrypt (cost factor 10) before storage
- Original secrets are never stored in memory or logs
- Use environment variables, secret managers, or HSMs in production

### Redirect URIs

**Requirements:**
- Must be exact match (including trailing slashes, query parameters)
- Use HTTPS in production
- Can include custom URL schemes for mobile apps
- Support localhost for development

**Examples:**

```typescript
redirectUris: [
  // Production
  'https://app.example.com/oauth/callback',

  // Staging
  'https://staging.example.com/oauth/callback',

  // Development
  'http://localhost:3000/callback',
  'http://localhost:8080/callback',

  // Mobile app (custom URL scheme)
  'myapp://oauth/callback',

  // Desktop app
  'http://127.0.0.1:8000/callback'
]
```

**Security Notes:**
- Wildcard URIs are NOT supported (security risk)
- Each URI must be explicitly registered
- Validate URIs match exactly in authorization flow

---

## Token Lifecycle

### Access Tokens

**Purpose:** Short-lived tokens for API access

**Characteristics:**
- Default lifetime: 1 hour (3600 seconds)
- Format: UUID (not JWT)
- Validated on every API request
- Automatically expire

**Usage:**

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

**Validation:**
- Token exists in storage
- Token not expired
- Token belongs to authenticated client
- Scopes sufficient for requested operation

### Refresh Tokens

**Purpose:** Long-lived tokens to obtain new access tokens

**Characteristics:**
- Default lifetime: 24 hours (86400 seconds)
- Format: UUID
- Single-use (rotated on refresh)
- Can be revoked

**Refresh Flow:**

```bash
curl -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "REFRESH_TOKEN",
    "client_id": "my-app",
    "client_secret": "client-secret"
  }'
```

**Response:**
```json
{
  "access_token": "NEW_ACCESS_TOKEN",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "NEW_REFRESH_TOKEN",
  "scope": "read tools:execute"
}
```

**Refresh Token Rotation:**
- Old refresh token is invalidated
- New refresh token is issued
- Prevents token reuse attacks

**Scope Narrowing:**

```bash
# Request subset of original scopes
curl -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "REFRESH_TOKEN",
    "client_id": "my-app",
    "client_secret": "client-secret",
    "scope": "read"
  }'
```

### Authorization Codes

**Purpose:** One-time codes exchanged for tokens

**Characteristics:**
- Default lifetime: 10 minutes (600 seconds)
- Format: UUID
- Single-use only
- Tied to client_id, redirect_uri, and code_challenge

**Validation:**
- Code exists and not expired
- Code not already used
- Belongs to requesting client
- PKCE code_verifier matches code_challenge
- redirect_uri matches authorization request

**Security Features:**
- Single-use prevents replay attacks
- Short lifetime limits exposure window
- PKCE prevents code interception
- Tied to client prevents unauthorized use

### Token Revocation

**Revoke Access or Refresh Token:**

```bash
curl -X POST http://localhost:3000/oauth/revoke \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_TO_REVOKE",
    "token_type_hint": "access_token",
    "client_id": "my-app",
    "client_secret": "client-secret"
  }'
```

**Parameters:**
- `token`: Access or refresh token to revoke
- `token_type_hint` (optional): `access_token` or `refresh_token`
- `client_id`: Client ID
- `client_secret`: Client secret

**Behavior:**
- Revoking access token also revokes associated refresh token
- Revoking refresh token also revokes associated access tokens
- Returns 200 OK even if token doesn't exist (OAuth 2.1 spec)
- All revocations are logged in audit log

---

## Security Best Practices

### 1. ALWAYS Use HTTPS in Production

```typescript
// ❌ Development Only
interface DevAuth extends IOAuth2Auth {
  issuerUrl: 'http://localhost:3000';
  // ...
}

// ✅ Production
interface ProdAuth extends IOAuth2Auth {
  issuerUrl: 'https://auth.example.com';
  clients: [
    {
      clientId: 'web-app';
      clientSecret: process.env.OAUTH_CLIENT_SECRET!;
      redirectUris: [
        'https://app.example.com/callback'  // HTTPS only
      ];
      scopes: ['read'];
    }
  ];
}
```

### 2. ALWAYS Enforce PKCE

Simply-MCP **automatically enforces PKCE** - you don't need to configure it.

**Why PKCE?**
- Prevents authorization code interception attacks
- Required by OAuth 2.1 specification
- No public clients without PKCE

**PKCE is always required:**
- `code_challenge` parameter required in authorization request
- `code_verifier` parameter required in token request
- SHA-256 validation enforced

### 3. Store Secrets Securely

**Environment Variables:**

```typescript
interface MyAuth extends IOAuth2Auth {
  type: 'oauth2';
  issuerUrl: 'https://auth.example.com';
  clients: [
    {
      clientId: 'web-app';
      clientSecret: process.env.OAUTH_CLIENT_SECRET!;  // ✅ Good
      redirectUris: ['https://app.example.com/callback'];
      scopes: ['read'];
    }
  ];
}
```

**Secret Managers (Production):**

```typescript
import { getSecret } from './secret-manager';

const clientSecret = await getSecret('oauth-client-secret');

interface MyAuth extends IOAuth2Auth {
  clients: [
    {
      clientSecret: clientSecret;  // From AWS Secrets Manager, etc.
      // ...
    }
  ];
}
```

**Never:**
- ❌ Hardcode secrets in source code
- ❌ Commit secrets to version control
- ❌ Log secrets (even for debugging)
- ❌ Expose secrets in error messages

### 4. Use Appropriate Scopes (Principle of Least Privilege)

**Good:**

```typescript
// Give mobile app only what it needs
{
  clientId: 'mobile-app';
  scopes: ['read', 'tools:execute'];  // Limited scopes
}
```

**Bad:**

```typescript
// ❌ Don't give admin scope to everything
{
  clientId: 'mobile-app';
  scopes: ['admin'];  // Too permissive!
}
```

**Best Practices:**
- Request minimum scopes needed for functionality
- Use custom scopes for granular permissions
- Review scope requests regularly
- Implement scope descriptions in authorization UI

### 5. Monitor Audit Logs

Simply-MCP logs all OAuth events to `./logs/oauth-audit.log`.

**Monitor for:**
- Failed authorization attempts (wrong client_id, scopes)
- Failed token validations (invalid/expired tokens)
- Token revocations (especially bulk revocations)
- Unusual scope requests
- Failed PKCE validations

**Example Log Entry:**

```json
{
  "timestamp": "2025-11-02T10:30:45.123Z",
  "event": "oauth.token.issued",
  "outcome": "success",
  "clientId": "web-app",
  "scopes": ["read", "tools:execute"],
  "tokenId": "550e8400...",
  "expiresIn": 3600
}
```

### 6. Implement Token Rotation

Simply-MCP **automatically rotates refresh tokens** on every refresh.

**How it works:**
1. Client sends refresh token
2. Server validates refresh token
3. Server generates new access token
4. Server generates new refresh token
5. Server invalidates old refresh token
6. Server returns both new tokens

**Benefits:**
- Limits exposure if refresh token is stolen
- Detects token reuse (old token becomes invalid)
- Aligns with OAuth 2.1 best practices

### 7. Set Appropriate Token Lifetimes

**Recommended:**

| Environment | Access Token | Refresh Token |
|-------------|-------------|---------------|
| Development | 3600s (1h) | 86400s (24h) |
| Production | 900s (15m) | 2592000s (30d) |

**Trade-offs:**
- Short access tokens: More secure, more refresh calls
- Long access tokens: Fewer refreshes, higher risk
- Short refresh tokens: More re-authentication, better security
- Long refresh tokens: Better UX, higher risk if stolen

### 8. Validate Redirect URIs

**Always:**
- ✅ Exact match (including scheme, host, port, path)
- ✅ HTTPS in production
- ✅ Explicitly register all URIs

**Never:**
- ❌ Wildcards (e.g., `https://*.example.com/callback`)
- ❌ HTTP in production (except localhost)
- ❌ Open redirects

### 9. Implement Rate Limiting

Protect OAuth endpoints from abuse:

```typescript
// Example: Add rate limiting middleware (not built-in)
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // 5 requests per window
  message: 'Too many authorization attempts'
});

// Apply to OAuth endpoints
app.use('/oauth/authorize', authLimiter);
app.use('/oauth/token', authLimiter);
```

### 10. Review Security Regularly

**Quarterly Security Checklist:**
- [ ] Review client list (remove unused clients)
- [ ] Rotate client secrets
- [ ] Review audit logs for anomalies
- [ ] Update token expiration settings
- [ ] Review scope definitions
- [ ] Update dependencies (npm audit)
- [ ] Test OAuth flow end-to-end
- [ ] Review redirect URIs (remove development URIs in production)

---

## Troubleshooting

### 401 Unauthorized

**Symptom:** API requests fail with 401 status code

**Possible Causes:**

1. **Missing Authorization Header:**
   ```bash
   # ❌ Missing header
   curl http://localhost:3000/mcp -d '{...}'

   # ✅ Include Bearer token
   curl -H "Authorization: Bearer TOKEN" http://localhost:3000/mcp -d '{...}'
   ```

2. **Invalid Token Format:**
   ```bash
   # ❌ Wrong format
   Authorization: TOKEN

   # ✅ Correct format
   Authorization: Bearer TOKEN
   ```

3. **Expired Token:**
   - Access tokens expire (default: 1 hour)
   - Use refresh token to get new access token
   - Check `expires_in` in token response

4. **Token Not Found:**
   - Token was revoked
   - Server restarted (in-memory storage cleared)
   - Wrong token value

**Debug:**
```bash
# Check token introspection
curl -X POST http://localhost:3000/oauth/introspect \
  -H "Content-Type: application/json" \
  -d '{
    "token": "ACCESS_TOKEN",
    "client_id": "my-app",
    "client_secret": "client-secret"
  }'
```

### 403 Forbidden

**Symptom:** Request authenticated but operation denied

**Possible Causes:**

1. **Insufficient Scopes:**
   ```
   Token has scopes: ['read']
   Tool requires: 'tools:execute'
   Result: 403 Forbidden
   ```

2. **Scope Mismatch:**
   - Check token scopes via introspection
   - Verify tool/resource permission requirements
   - Review scope-to-permission mapping

**Debug:**

```typescript
// Check what permissions token has
export default class MyServer {
  debugTool: DebugTool = async (params, context) => {
    console.log('Scopes:', context?.securityContext?.permissions);
    return { permissions: context?.securityContext?.permissions || [] };
  };
}
```

### 400 Bad Request (Token Exchange)

**Symptom:** Token endpoint returns 400 error

**Possible Causes:**

1. **Invalid PKCE Verifier:**
   ```
   Error: Invalid code_verifier (PKCE validation failed)
   ```
   - Ensure `code_verifier` matches `code_challenge`
   - Use same verifier from authorization request
   - Check SHA-256 calculation

2. **Expired Authorization Code:**
   ```
   Error: Authorization code expired
   ```
   - Codes expire in 10 minutes (default)
   - Complete token exchange quickly after authorization

3. **Code Already Used:**
   ```
   Error: Authorization code already used
   ```
   - Authorization codes are single-use
   - Generate new authorization request

4. **Redirect URI Mismatch:**
   ```
   Error: Redirect URI does not match authorization request
   ```
   - `redirect_uri` in token request must match authorization request exactly
   - Check for trailing slashes, query parameters

**Debug:**

```bash
# Verify authorization flow parameters match
# Authorization request:
redirect_uri=http://localhost:8080/callback

# Token request (must match exactly):
"redirect_uri": "http://localhost:8080/callback"
```

### Invalid code_challenge

**Symptom:** Authorization request fails with invalid challenge

**Solution:**

Regenerate PKCE codes:

```bash
CODE_VERIFIER=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-43)
CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | openssl dgst -binary -sha256 | openssl base64 | tr -d "=+/" | cut -c1-43)
```

**Requirements:**
- 43-128 characters
- base64url encoding (no `=`, `+`, `/`)
- Challenge method must be `S256` (SHA-256)

### Scope Errors

**Symptom:** Authorization fails with scope error

**Possible Causes:**

1. **Requested Scope Not Allowed:**
   ```
   Client allowed scopes: ['read']
   Requested scopes: ['read', 'admin']
   Result: Error - admin scope not allowed
   ```

2. **Invalid Scope Format:**
   ```bash
   # ❌ Wrong separator
   scope=read,tools:execute

   # ✅ Space-separated, URL-encoded
   scope=read%20tools:execute
   ```

**Solution:**

Review client configuration and scope request:

```typescript
// Client configuration
{
  clientId: 'my-app';
  scopes: ['read', 'tools:execute'];  // Allowed scopes
}

// Authorization request
scope=read%20tools:execute  // Must be subset of allowed scopes
```

### Audit Log Review

Check audit logs for detailed error information:

```bash
tail -f ./logs/oauth-audit.log
```

**Example Error Log:**

```json
{
  "timestamp": "2025-11-02T10:30:45.123Z",
  "event": "oauth.token.issued",
  "outcome": "failure",
  "clientId": "my-app",
  "error": "Invalid code_verifier (PKCE validation failed)"
}
```

---

## Production Deployment

### Pre-Deployment Checklist

**Security:**
- [ ] Load all secrets from environment variables or secret manager
- [ ] Use HTTPS for `issuerUrl`
- [ ] Update all `redirectUris` to production HTTPS URLs
- [ ] Remove development redirect URIs (localhost)
- [ ] Implement user authentication (not auto-approve)
- [ ] Add user consent screen
- [ ] Set up secure session storage (Redis, database)
- [ ] Enable audit logging to persistent storage

**Token Settings:**
- [ ] Review token expiration times for production use
- [ ] Implement token cleanup for expired tokens
- [ ] Set up token revocation on logout
- [ ] Consider shorter access token lifetime (15-60 minutes)

**Scopes:**
- [ ] Review and minimize default scopes
- [ ] Document all scopes for third-party developers
- [ ] Implement granular permissions per tool/resource
- [ ] Add scope descriptions in authorization UI

**Monitoring:**
- [ ] Set up audit log monitoring and alerts
- [ ] Alert on failed authorization attempts
- [ ] Track token usage and refresh patterns
- [ ] Monitor for unusual scope requests
- [ ] Set up error tracking (Sentry, etc.)

**Documentation:**
- [ ] Create OAuth integration guide for clients
- [ ] Document all available scopes and permissions
- [ ] Provide example code in multiple languages
- [ ] Set up developer portal for client registration

### Production Configuration Example

```typescript
import type { IServer, IOAuth2Auth } from 'simply-mcp';

// Load secrets from environment
const getSecret = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required secret: ${key}`);
  }
  return value;
};

interface ProductionAuth extends IOAuth2Auth {
  type: 'oauth2';
  issuerUrl: 'https://auth.example.com';  // HTTPS
  clients: [
    {
      clientId: 'web-app';
      clientSecret: getSecret('WEB_APP_CLIENT_SECRET');
      redirectUris: [
        'https://app.example.com/oauth/callback'  // HTTPS only
      ];
      scopes: ['read', 'tools:execute'];
      name: 'Web Application';
    },
    {
      clientId: 'mobile-app';
      clientSecret: getSecret('MOBILE_APP_CLIENT_SECRET');
      redirectUris: [
        'myapp://oauth/callback',  // Custom URL scheme for mobile
        'https://app.example.com/mobile/callback'
      ];
      scopes: ['read'];
      name: 'Mobile App';
    }
  ];
  tokenExpiration: 900;        // 15 minutes
  refreshTokenExpiration: 2592000;  // 30 days
  codeExpiration: 300;          // 5 minutes
}

const server: IServer = {
  name: 'production-server',
  version: '1.0.0',
  description: 'Production MCP server'
  transport: 'http';
  port: 443;  // HTTPS
  stateful: true;
  auth: ProductionAuth;
}
```

### Environment Variables

```bash
# .env.production (add to .gitignore)
WEB_APP_CLIENT_SECRET=<strong-random-secret>
MOBILE_APP_CLIENT_SECRET=<strong-random-secret>
NODE_ENV=production
```

### Persistent Storage

For production, replace in-memory storage with persistent storage:

**Example: Redis Token Storage**

```typescript
// Custom provider extending SimplyMCPOAuthProvider
import Redis from 'ioredis';

class RedisOAuthProvider extends SimplyMCPOAuthProvider {
  private redis: Redis;

  constructor(config: OAuthProviderConfig, redis: Redis) {
    super(config);
    this.redis = redis;
  }

  // Override token storage methods to use Redis
  async storeAccessToken(token: string, data: StoredToken): Promise<void> {
    await this.redis.setex(
      `access_token:${token}`,
      this.tokenExpiration,
      JSON.stringify(data)
    );
  }

  async getAccessToken(token: string): Promise<StoredToken | null> {
    const data = await this.redis.get(`access_token:${token}`);
    return data ? JSON.parse(data) : null;
  }

  // Similar for refresh tokens, authorization codes
}
```

**Note:** Production-ready persistent storage is recommended but not included in MVP. Extend `SimplyMCPOAuthProvider` as shown above.

### Load Balancing

**Considerations for multiple server instances:**

1. **Shared Token Storage:** Use Redis, database, or distributed cache
2. **Session Affinity:** Not required if using shared storage
3. **Audit Logging:** Centralize logs (e.g., CloudWatch, ELK stack)

---

## API Reference

### IOAuth2Auth Interface

Complete type definition for OAuth 2.1 configuration.

```typescript
export interface IOAuth2Auth extends IAuth {
  /**
   * Authentication type - must be 'oauth2'
   */
  type: 'oauth2';

  /**
   * OAuth issuer URL (e.g., 'https://auth.example.com')
   * Used in OAuth metadata and token claims (iss claim)
   */
  issuerUrl: string;

  /**
   * Registered OAuth clients
   * Each client represents an application that can authenticate users
   */
  clients: IOAuthClient[];

  /**
   * Access token expiration in seconds
   * @default 3600 (1 hour)
   */
  tokenExpiration?: number;

  /**
   * Refresh token expiration in seconds
   * @default 86400 (24 hours)
   */
  refreshTokenExpiration?: number;

  /**
   * Authorization code expiration in seconds
   * @default 600 (10 minutes)
   */
  codeExpiration?: number;
}
```

### IOAuthClient Interface

```typescript
export interface IOAuthClient {
  /**
   * OAuth client ID (unique identifier)
   * Use a descriptive, unique string
   */
  clientId: string;

  /**
   * Client secret (will be hashed with bcrypt)
   * SECURITY: Load from environment variables in production
   */
  clientSecret: string;

  /**
   * Allowed redirect URIs
   * Authorization codes only sent to these URIs
   * Must match exactly (including trailing slashes)
   */
  redirectUris: string[];

  /**
   * Allowed scopes for this client
   * Client can only request these scopes
   */
  scopes: string[];

  /**
   * Optional: Human-readable client name
   * Displayed in authorization UI
   */
  name?: string;
}
```

### OAuth Endpoints

Simply-MCP automatically creates these endpoints when OAuth is configured:

#### Authorization Server Metadata

**Endpoint:** `GET /.well-known/oauth-authorization-server`

**Description:** RFC 8414 metadata endpoint

**Response:**
```json
{
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/oauth/authorize",
  "token_endpoint": "https://auth.example.com/oauth/token",
  "token_endpoint_auth_methods_supported": ["client_secret_post"],
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "scopes_supported": ["read", "write", "tools:execute", "admin"]
}
```

#### Authorization Endpoint

**Endpoint:** `GET /oauth/authorize`

**Parameters:**
- `response_type`: Must be `code`
- `client_id`: Client identifier
- `redirect_uri`: Callback URI (must be registered)
- `scope`: Space-separated scopes
- `code_challenge`: SHA-256 hash of code_verifier
- `code_challenge_method`: Must be `S256`
- `state` (optional): CSRF protection token

**Response:** Redirects to `redirect_uri` with authorization code

#### Token Endpoint

**Endpoint:** `POST /oauth/token`

**Grant Types:**
- `authorization_code`: Exchange code for token
- `refresh_token`: Refresh access token

**Parameters (authorization_code):**
```json
{
  "grant_type": "authorization_code",
  "code": "authorization-code",
  "client_id": "client-id",
  "client_secret": "client-secret",
  "redirect_uri": "callback-uri",
  "code_verifier": "pkce-verifier"
}
```

**Parameters (refresh_token):**
```json
{
  "grant_type": "refresh_token",
  "refresh_token": "refresh-token",
  "client_id": "client-id",
  "client_secret": "client-secret",
  "scope": "optional-narrowed-scopes"
}
```

**Response:**
```json
{
  "access_token": "550e8400-e29b-41d4-a716-446655440000",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "650e8400-e29b-41d4-a716-446655440000",
  "scope": "read tools:execute"
}
```

#### Token Revocation Endpoint

**Endpoint:** `POST /oauth/revoke`

**Parameters:**
```json
{
  "token": "token-to-revoke",
  "token_type_hint": "access_token",
  "client_id": "client-id",
  "client_secret": "client-secret"
}
```

**Response:** `200 OK` (always, per OAuth 2.1 spec)

### SecurityContext API

OAuth tokens create a `SecurityContext` attached to request handlers:

```typescript
interface SecurityContext {
  /**
   * Whether request is authenticated
   */
  authenticated: boolean;

  /**
   * Granted permissions (from OAuth scopes)
   */
  permissions: string[];

  /**
   * Optional: Client IP address
   */
  ipAddress?: string;

  /**
   * Optional: User agent string
   */
  userAgent?: string;

  /**
   * Context creation timestamp
   */
  createdAt: number;
}
```

**Access in handlers:**

```typescript
export default class MyServer {
  myTool: MyTool = async (params, context) => {
    // Access security context
    const permissions = context?.securityContext?.permissions || [];
    const isAdmin = permissions.includes('*');

    // Use context for authorization
    if (!isAdmin) {
      throw new Error('Unauthorized');
    }

    return { status: 'ok' };
  };
}
```

---

## Credits

OAuth 2.1 functionality powered by **Anthropic's Model Context Protocol (MCP) SDK**:

- OAuth router and bearer authentication
- RFC 8414 (Authorization Server Metadata)
- RFC 7636 (Proof Key for Code Exchange - PKCE)
- RFC 7009 (Token Revocation)
- Well-known endpoints and metadata

Simply-MCP extends the MCP SDK with:
- TypeScript interface-driven configuration
- Scope-to-permission mapping
- Audit logging
- Integration with Simply-MCP permission system

**Resources:**
- [MCP SDK Documentation](https://modelcontextprotocol.io/)
- [OAuth 2.1 Specification](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1)
- [PKCE Specification (RFC 7636)](https://datatracker.ietf.org/doc/html/rfc7636)
- [Simply-MCP GitHub](https://github.com/QuantGeekDev/simply-mcp)

---

## See Also

- [API Reference](./API_REFERENCE.md) - Complete Simply-MCP API
- [Features Guide](./FEATURES.md) - Tools, prompts, resources
- [Transport Guide](./TRANSPORT.md) - HTTP and Stdio transports
- [OAuth Migration Guide](./OAUTH_MIGRATION.md) - Migrate from API keys
- [Example: OAuth Server](../../examples/interface-oauth-server.ts) - Comprehensive example
