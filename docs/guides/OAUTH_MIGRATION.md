# Migrating from API Keys to OAuth 2.1

This guide helps you migrate existing Simply-MCP servers from API key authentication to OAuth 2.1.

---

## Table of Contents

- [Why Migrate?](#why-migrate)
- [Migration Checklist](#migration-checklist)
- [Step-by-Step Migration](#step-by-step-migration)
- [Backward Compatibility](#backward-compatibility)
- [Testing Your Migration](#testing-your-migration)
- [Rollback Plan](#rollback-plan)
- [Common Migration Patterns](#common-migration-patterns)

---

## Why Migrate?

### Benefits of OAuth 2.1

**Better Security:**
- No long-lived credentials in client applications
- Short-lived access tokens (default: 1 hour)
- Token revocation without changing secrets
- PKCE prevents authorization code interception

**Granular Permissions:**
- Scope-based access control (read, write, tools:execute, etc.)
- Users grant specific permissions, not all-or-nothing
- Custom scopes for application-specific features

**User Context:**
- Know which application is making requests
- Audit logs show client_id for every operation
- Better security monitoring and analytics

**Standard Protocol:**
- OAuth 2.1 is industry-standard
- Existing client libraries in all languages
- Well-documented and widely understood

### When to Use API Keys vs OAuth

**API Keys are better for:**
- Internal tools and services
- Server-to-server communication
- Development and testing
- Simple authentication needs

**OAuth 2.1 is better for:**
- Third-party applications
- User-facing applications
- Mobile and web apps
- Production deployments with multiple clients

---

## Migration Checklist

### Planning Phase

- [ ] Review current API key usage
  - [ ] Identify all clients using API keys
  - [ ] Document their permission requirements
  - [ ] Map API key permissions to OAuth scopes
- [ ] Define OAuth clients
  - [ ] One client per application/platform
  - [ ] Determine scopes for each client
  - [ ] Generate client secrets
- [ ] Plan migration timeline
  - [ ] Coordinate with client application teams
  - [ ] Schedule testing windows
  - [ ] Define migration period (run both auth methods)
- [ ] Set up infrastructure
  - [ ] Environment variables for client secrets
  - [ ] Audit logging (if not already enabled)
  - [ ] Monitoring and alerting

### Implementation Phase

- [ ] Update server configuration
  - [ ] Add OAuth configuration alongside API keys
  - [ ] Enable mixed authentication mode
  - [ ] Test OAuth flow in development
- [ ] Update client applications
  - [ ] Implement OAuth flow
  - [ ] Test with development server
  - [ ] Deploy to staging
- [ ] Monitor migration
  - [ ] Track API key vs OAuth usage
  - [ ] Review audit logs for errors
  - [ ] Address issues as they arise

### Deprecation Phase

- [ ] Verify all clients migrated
  - [ ] Check audit logs for API key usage
  - [ ] Confirm with application teams
- [ ] Announce deprecation timeline
  - [ ] Notify remaining API key users
  - [ ] Set sunset date
- [ ] Remove API key authentication
  - [ ] Update server configuration
  - [ ] Deploy to production
  - [ ] Monitor for errors

---

## Step-by-Step Migration

### Step 1: Current State (API Keys Only)

**Current server configuration:**

```typescript
import type { IServer, IApiKeyAuth } from 'simply-mcp';

interface CurrentAuth extends IApiKeyAuth {
  type: 'apiKey';
  keys: [
    {
      name: 'web-app';
      key: process.env.WEB_APP_API_KEY!;
      permissions: ['read', 'tools:*'];
    },
    {
      name: 'mobile-app';
      key: process.env.MOBILE_APP_API_KEY!;
      permissions: ['read'];
    },
    {
      name: 'admin-tool';
      key: process.env.ADMIN_API_KEY!;
      permissions: ['*'];
    }
  ];
}

interface MyServer extends IServer {
  name: 'my-server';
  transport: 'http';
  port: 3000;
  auth: CurrentAuth;
}
```

### Step 2: Map API Key Permissions to OAuth Scopes

Create a mapping from your current permissions to OAuth scopes:

| API Key Client | Current Permissions | OAuth Scopes |
|----------------|-------------------|--------------|
| web-app | `['read', 'tools:*']` | `['read', 'tools:execute']` |
| mobile-app | `['read']` | `['read']` |
| admin-tool | `['*']` | `['admin']` |

**Notes:**
- `tools:*` → `tools:execute` (standard scope)
- `*` → `admin` (full access)
- Custom permissions can become custom scopes

### Step 3: Define OAuth Clients

Create OAuth client configurations based on your API key clients:

```typescript
import type { IOAuth2Auth } from 'simply-mcp';

interface NewAuth extends IOAuth2Auth {
  type: 'oauth2';
  issuerUrl: 'https://auth.example.com';  // Your OAuth issuer
  clients: [
    // Web app (was API key: web-app)
    {
      clientId: 'web-app';
      clientSecret: process.env.WEB_APP_OAUTH_SECRET!;  // New secret
      redirectUris: [
        'https://app.example.com/oauth/callback',
        'http://localhost:3000/callback'  // For dev
      ];
      scopes: ['read', 'tools:execute'];  // Mapped from permissions
      name: 'Web Application';
    },
    // Mobile app (was API key: mobile-app)
    {
      clientId: 'mobile-app';
      clientSecret: process.env.MOBILE_APP_OAUTH_SECRET!;
      redirectUris: [
        'myapp://oauth/callback',  // Custom URL scheme
        'https://app.example.com/mobile/callback'
      ];
      scopes: ['read'];  // Read-only
      name: 'Mobile App';
    },
    // Admin tool (was API key: admin-tool)
    {
      clientId: 'admin-dashboard';
      clientSecret: process.env.ADMIN_OAUTH_SECRET!;
      redirectUris: [
        'https://admin.example.com/oauth/callback',
        'http://localhost:8080/callback'  // For dev
      ];
      scopes: ['admin'];  // Full access
      name: 'Admin Dashboard';
    }
  ];
  tokenExpiration: 3600;        // 1 hour
  refreshTokenExpiration: 86400; // 24 hours
  codeExpiration: 600;           // 10 minutes
}
```

### Step 4: Enable Mixed Authentication (Transition Period)

Simply-MCP **does not currently support mixed authentication** (API keys + OAuth simultaneously). You must choose one.

**Recommended Migration Approach:**

**Option 1: Blue-Green Deployment**
1. Deploy new server instance with OAuth
2. Run both servers in parallel (old with API keys, new with OAuth)
3. Migrate clients one by one to new server
4. Decommission old server

**Option 2: Feature Flag**
1. Add feature flag to clients (use OAuth if flag enabled)
2. Deploy OAuth-enabled server
3. Enable feature flag per client
4. Remove API key support after all clients migrated

**Option 3: Coordinated Cutover**
1. Schedule maintenance window
2. Update all clients to use OAuth
3. Deploy OAuth-only server
4. Verify all clients working

### Step 5: Update Client Applications

Each client application needs to implement the OAuth flow.

**Before (API Key):**

```typescript
// Client code using API key
const response = await fetch('https://api.example.com/mcp', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,  // Static API key
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: { name: 'greet', arguments: { name: 'World' } },
    id: 1
  })
});
```

**After (OAuth 2.1):**

```typescript
// Client code using OAuth
class OAuthClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  // Step 1: Start authorization flow
  async authorize() {
    // Generate PKCE codes
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    // Store verifier for later
    sessionStorage.setItem('pkce_verifier', codeVerifier);

    // Redirect to authorization endpoint
    const authUrl = new URL('https://auth.example.com/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', 'web-app');
    authUrl.searchParams.set('redirect_uri', 'https://app.example.com/oauth/callback');
    authUrl.searchParams.set('scope', 'read tools:execute');
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', this.generateState());

    window.location.href = authUrl.toString();
  }

  // Step 2: Handle callback and exchange code for token
  async handleCallback(code: string) {
    const codeVerifier = sessionStorage.getItem('pkce_verifier')!;

    const response = await fetch('https://auth.example.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: 'web-app',
        client_secret: CLIENT_SECRET,  // Securely stored
        redirect_uri: 'https://app.example.com/oauth/callback',
        code_verifier: codeVerifier
      })
    });

    const tokens = await response.json();
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;

    // Store tokens securely
    this.storeTokens(tokens);
  }

  // Step 3: Make API calls with access token
  async callTool(name: string, args: any) {
    // Refresh token if expired
    if (this.isTokenExpired()) {
      await this.refreshAccessToken();
    }

    const response = await fetch('https://api.example.com/mcp', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,  // OAuth access token
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name, arguments: args },
        id: 1
      })
    });

    return response.json();
  }

  // Helper: Refresh access token
  async refreshAccessToken() {
    const response = await fetch('https://auth.example.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: 'web-app',
        client_secret: CLIENT_SECRET
      })
    });

    const tokens = await response.json();
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    this.storeTokens(tokens);
  }

  // Helper: Generate PKCE code verifier
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  }

  // Helper: Generate PKCE code challenge
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncode(new Uint8Array(hash));
  }

  // Helper: Base64 URL encoding
  private base64URLEncode(buffer: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...buffer));
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // Helper: Generate random state
  private generateState(): string {
    return this.generateCodeVerifier();
  }

  // Helper: Check if token expired
  private isTokenExpired(): boolean {
    // Check stored expiration time
    const expiresAt = localStorage.getItem('token_expires_at');
    return !expiresAt || Date.now() >= parseInt(expiresAt);
  }

  // Helper: Store tokens securely
  private storeTokens(tokens: any) {
    // In production, use secure storage (encrypted localStorage, secure cookie, etc.)
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    localStorage.setItem('token_expires_at',
      String(Date.now() + tokens.expires_in * 1000));
  }
}
```

### Step 6: Test OAuth Flow

**Development Testing:**

1. Start OAuth server:
   ```bash
   npx simply-mcp run server.ts
   ```

2. Test authorization flow:
   ```bash
   # Generate PKCE codes
   CODE_VERIFIER=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-43)
   CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | openssl dgst -binary -sha256 | openssl base64 | tr -d "=+/" | cut -c1-43)

   # Open in browser
   open "http://localhost:3000/oauth/authorize?response_type=code&client_id=web-app&redirect_uri=http://localhost:3000/callback&scope=read%20tools:execute&code_challenge=$CODE_CHALLENGE&code_challenge_method=S256"
   ```

3. Exchange code for token:
   ```bash
   curl -X POST http://localhost:3000/oauth/token \
     -H "Content-Type: application/json" \
     -d '{
       "grant_type": "authorization_code",
       "code": "<CODE_FROM_STEP_2>",
       "client_id": "web-app",
       "client_secret": "'$WEB_APP_OAUTH_SECRET'",
       "redirect_uri": "http://localhost:3000/callback",
       "code_verifier": "'$CODE_VERIFIER'"
     }'
   ```

4. Test API call:
   ```bash
   ACCESS_TOKEN="<token-from-step-3>"
   curl -X POST http://localhost:3000/mcp \
     -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "method": "tools/list",
       "id": 1
     }'
   ```

### Step 7: Monitor Migration

**Audit Log Review:**

```bash
# Monitor OAuth events
tail -f ./logs/oauth-audit.log

# Look for:
# - Successful token issuance
# - Failed authentications
# - Scope denials
```

**Metrics to Track:**
- Number of successful OAuth authentications
- Token refresh rate
- Failed authorization attempts
- Scope denial rate
- API response times (OAuth vs API key)

### Step 8: Deprecate API Keys

Once all clients have migrated to OAuth:

1. **Announce Sunset Date:**
   ```
   Subject: API Key Authentication Deprecation - Action Required

   We are deprecating API key authentication in favor of OAuth 2.1.

   Timeline:
   - November 15: OAuth migration complete
   - November 30: API key authentication disabled
   - December 1: API keys no longer work

   Action Required:
   - Migrate to OAuth 2.1 before November 30
   - Follow migration guide: docs/guides/OAUTH_MIGRATION.md
   - Contact support if you need assistance
   ```

2. **Verify No API Key Usage:**
   ```bash
   # Check audit logs for API key authentications
   grep "apikey.validation" ./logs/audit.log | tail -n 100
   ```

3. **Remove API Key Configuration:**
   ```typescript
   // Before (mixed auth - not supported)
   interface MyServer extends IServer {
     auth: MyApiKeyAuth | MyOAuthAuth;  // Not possible
   }

   // After (OAuth only)
   interface MyServer extends IServer {
     auth: MyOAuthAuth;  // OAuth only
   }
   ```

4. **Deploy and Monitor:**
   ```bash
   # Deploy OAuth-only server
   npx simply-mcp run server.ts

   # Monitor for errors
   tail -f ./logs/oauth-audit.log
   ```

---

## Backward Compatibility

**Important:** Simply-MCP does **not support running API keys and OAuth simultaneously** in the same server instance.

### Migration Strategies

**Strategy 1: Parallel Deployment (Recommended)**

Run two server instances during migration:

```
┌─────────────────────┐     ┌─────────────────────┐
│   Old Server        │     │   New Server        │
│   (API Keys)        │     │   (OAuth 2.1)       │
│   Port 3000         │     │   Port 3001         │
└─────────────────────┘     └─────────────────────┘
         │                           │
         │                           │
    ┌────▼───────────────────────────▼────┐
    │      Load Balancer / Proxy          │
    │   (Route by client or path)         │
    └─────────────────────────────────────┘
```

**Configuration:**

```typescript
// old-server.ts (API Keys)
interface OldServer extends IServer {
  name: 'my-server-legacy';
  port: 3000;
  auth: ApiKeyAuth;
}

// new-server.ts (OAuth)
interface NewServer extends IServer {
  name: 'my-server-oauth';
  port: 3001;
  auth: OAuthAuth;
}
```

**Load Balancer Rules:**
- Route `/api/v1/*` → Old server (API keys)
- Route `/api/v2/*` → New server (OAuth)
- Or route by client identifier in header

**Strategy 2: Feature Flag in Clients**

Add feature flag to client applications:

```typescript
const USE_OAUTH = localStorage.getItem('use_oauth') === 'true';

if (USE_OAUTH) {
  // Use OAuth flow
  await oauthClient.authorize();
} else {
  // Use API key
  headers['Authorization'] = `Bearer ${API_KEY}`;
}
```

**Enable feature flag progressively:**
1. Deploy feature flag to all clients (default: OFF)
2. Deploy OAuth server
3. Enable feature flag for 10% of users
4. Monitor for issues
5. Gradually increase to 100%
6. Remove API key support

**Strategy 3: Coordinated Cutover**

Schedule maintenance window for migration:

```
Maintenance Window: Saturday 2 AM - 6 AM

Tasks:
1. Deploy OAuth-only server (2:00 AM)
2. Update client applications (2:15 AM)
3. Test OAuth flow (2:30 AM)
4. Monitor for errors (2:30 AM - 6:00 AM)
5. Rollback if critical issues (before 6:00 AM)
```

---

## Testing Your Migration

### Test Plan

**1. OAuth Metadata**
```bash
curl http://localhost:3000/.well-known/oauth-authorization-server | jq
```
Expected: OAuth server metadata

**2. Authorization Flow**
```bash
# Generate PKCE codes
CODE_VERIFIER=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-43)
CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | openssl dgst -binary -sha256 | openssl base64 | tr -d "=+/" | cut -c1-43)

# Open authorization URL in browser
open "http://localhost:3000/oauth/authorize?response_type=code&client_id=web-app&redirect_uri=http://localhost:3000/callback&scope=read&code_challenge=$CODE_CHALLENGE&code_challenge_method=S256"
```
Expected: Redirect with authorization code

**3. Token Exchange**
```bash
curl -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "<AUTH_CODE>",
    "client_id": "web-app",
    "client_secret": "'$WEB_APP_OAUTH_SECRET'",
    "redirect_uri": "http://localhost:3000/callback",
    "code_verifier": "'$CODE_VERIFIER'"
  }' | jq
```
Expected: Access and refresh tokens

**4. API Call**
```bash
ACCESS_TOKEN="<token-from-step-3>"
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }' | jq
```
Expected: List of tools

**5. Token Refresh**
```bash
curl -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "<REFRESH_TOKEN>",
    "client_id": "web-app",
    "client_secret": "'$WEB_APP_OAUTH_SECRET'"
  }' | jq
```
Expected: New access and refresh tokens

**6. Scope Enforcement**
```bash
# Test with limited scope token
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer $LIMITED_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "admin_action",
      "arguments": {"action": "reset"}
    },
    "id": 1
  }'
```
Expected: 403 Forbidden (insufficient scopes)

**7. Token Revocation**
```bash
curl -X POST http://localhost:3000/oauth/revoke \
  -H "Content-Type: application/json" \
  -d '{
    "token": "$ACCESS_TOKEN",
    "client_id": "web-app",
    "client_secret": "'$WEB_APP_OAUTH_SECRET'"
  }'
```
Expected: 200 OK, subsequent API calls fail with 401

### Integration Tests

Create automated tests for the OAuth flow:

```typescript
import { describe, it, expect } from '@jest/globals';

describe('OAuth Migration Tests', () => {
  it('should complete authorization flow', async () => {
    // 1. Generate PKCE codes
    const { verifier, challenge } = generatePKCE();

    // 2. Get authorization code
    const code = await authorize({
      clientId: 'web-app',
      redirectUri: 'http://localhost:3000/callback',
      scope: 'read',
      codeChallenge: challenge
    });

    // 3. Exchange for token
    const tokens = await exchangeCode({
      code,
      clientId: 'web-app',
      clientSecret: process.env.WEB_APP_OAUTH_SECRET!,
      redirectUri: 'http://localhost:3000/callback',
      codeVerifier: verifier
    });

    expect(tokens.access_token).toBeDefined();
    expect(tokens.token_type).toBe('Bearer');
  });

  it('should enforce scopes', async () => {
    const token = await getTokenWithScopes(['read']);

    // Should succeed: read operation
    const readResult = await callTool(token, 'get_data', { id: '123' });
    expect(readResult).toBeDefined();

    // Should fail: admin operation
    await expect(
      callTool(token, 'admin_action', { action: 'reset' })
    ).rejects.toThrow('403');
  });

  it('should refresh tokens', async () => {
    const tokens = await getInitialTokens();

    const newTokens = await refreshToken({
      refreshToken: tokens.refresh_token,
      clientId: 'web-app',
      clientSecret: process.env.WEB_APP_OAUTH_SECRET!
    });

    expect(newTokens.access_token).not.toBe(tokens.access_token);
    expect(newTokens.refresh_token).not.toBe(tokens.refresh_token);
  });
});
```

---

## Rollback Plan

If migration encounters critical issues, you need a rollback plan.

### Rollback Triggers

Rollback if:
- More than 5% of API calls fail
- Authentication failure rate > 10%
- Critical clients unable to authenticate
- Performance degradation > 50%

### Rollback Procedure

**If using parallel deployment:**
1. Update load balancer to route all traffic to old server (API keys)
2. Disable new server (OAuth)
3. Investigate issues
4. Fix and re-attempt migration

**If using coordinated cutover:**
1. Deploy old server configuration (API keys)
2. Notify clients to stop using OAuth (if they've updated)
3. Restore API key-based authentication
4. Investigate issues in development
5. Fix and schedule new migration window

### Rollback Script Example

```bash
#!/bin/bash
# rollback-to-apikeys.sh

echo "Rolling back to API key authentication..."

# 1. Stop current server
pm2 stop oauth-server

# 2. Deploy old server with API keys
git checkout main
npm install
npx simply-mcp run old-server.ts &

# 3. Verify old server working
sleep 5
curl -H "Authorization: Bearer $OLD_API_KEY" \
  http://localhost:3000/mcp \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

echo "Rollback complete. Monitor logs for issues."
```

---

## Common Migration Patterns

### Pattern 1: Web Application

**Current:** SPA using API key in localStorage

**Migration:**
1. Implement OAuth flow in frontend
2. Store tokens in secure cookie (httpOnly, secure)
3. Handle token refresh automatically
4. Redirect to login when token expires

**Example:**

```typescript
// Before: API key
const apiKey = localStorage.getItem('api_key');
fetch('/api/mcp', {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});

// After: OAuth
class AuthService {
  async getAccessToken(): Promise<string> {
    let token = this.getStoredToken();

    if (!token || this.isExpired(token)) {
      token = await this.refreshToken();
    }

    return token;
  }

  async callAPI(method: string, params: any): Promise<any> {
    const token = await this.getAccessToken();
    return fetch('/api/mcp', {
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 })
    });
  }
}
```

### Pattern 2: Mobile Application

**Current:** Mobile app using hardcoded API key

**Migration:**
1. Implement OAuth with custom URL scheme
2. Use native secure storage for tokens
3. Handle background token refresh
4. Re-authenticate on app launch if tokens expired

**Example (React Native):**

```typescript
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';

class MobileAuthService {
  async authorize() {
    const discovery = await AuthSession.fetchDiscoveryAsync(
      'https://auth.example.com'
    );

    const request = new AuthSession.AuthRequest({
      clientId: 'mobile-app',
      redirectUri: AuthSession.makeRedirectUri({ scheme: 'myapp' }),
      scopes: ['read'],
      usePKCE: true,
    });

    const result = await request.promptAsync(discovery);

    if (result.type === 'success') {
      const tokens = await this.exchangeCode(result.params.code);
      await this.storeTokens(tokens);
    }
  }

  async storeTokens(tokens: any) {
    await SecureStore.setItemAsync('access_token', tokens.access_token);
    await SecureStore.setItemAsync('refresh_token', tokens.refresh_token);
  }

  async getAccessToken(): Promise<string> {
    const token = await SecureStore.getItemAsync('access_token');
    // Check expiration, refresh if needed
    return token!;
  }
}
```

### Pattern 3: Server-to-Server

**Current:** Backend service using API key

**Migration:**
1. Use client credentials grant (if MCP server supports it)
2. Or use long-lived OAuth client with refresh token
3. Store tokens in secure backend storage
4. Refresh tokens automatically

**Example (Node.js):**

```typescript
class BackendAuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async getAccessToken(): Promise<string> {
    if (!this.accessToken || this.isExpired()) {
      await this.refreshOrAuthorize();
    }
    return this.accessToken!;
  }

  async refreshOrAuthorize() {
    if (this.refreshToken) {
      // Refresh existing token
      const tokens = await this.refresh(this.refreshToken);
      this.accessToken = tokens.access_token;
      this.refreshToken = tokens.refresh_token;
    } else {
      // Initial authorization (manual or automated)
      // For server-to-server, consider pre-authorized refresh token
      throw new Error('Not authenticated');
    }
  }

  async callAPI(method: string, params: any): Promise<any> {
    const token = await this.getAccessToken();
    return fetch('https://api.example.com/mcp', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 })
    });
  }
}
```

---

## See Also

- [OAuth 2.1 Guide](./OAUTH2.md) - Complete OAuth documentation
- [API Reference](./API_REFERENCE.md) - IOAuth2Auth interface
- [Example: OAuth Server](../../examples/interface-oauth-server.ts) - Full example
