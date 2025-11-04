# OAuth HTTP Integration - Manual Testing Guide

This guide provides manual curl commands to test the full OAuth 2.1 flow integrated into Simply-MCP's HTTP transport.

## Prerequisites

1. Create a test server with OAuth authentication
2. Start the server on port 3456 (or adjust commands accordingly)

## Test Server Setup

Create a file `test-oauth-server.ts`:

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { SimplyMCPOAuthProvider } from 'simply-mcp';
import type { SecurityConfig } from 'simply-mcp';

const port = 3456;

// Create OAuth provider
const provider = new SimplyMCPOAuthProvider({
  clients: [
    {
      clientId: 'test-client',
      clientSecret: 'test-secret-123',
      redirectUris: ['http://localhost:3456/callback'],
      scopes: ['read', 'write'],
    },
  ],
});

// Create security config
const securityConfig: SecurityConfig = {
  enabled: true,
  authentication: {
    enabled: true,
    type: 'oauth2',
    issuerUrl: `http://localhost:${port}`,
    oauthProvider: provider,
  },
  permissions: {
    authenticated: ['*'],
    anonymous: [],
  },
  rateLimit: {
    enabled: true,
    strategy: 'sliding-window',
    window: 60000,
    maxRequests: 100,
  },
  audit: {
    enabled: true,
    logFile: './logs/oauth-audit.log',
  },
};

// Create server
const server = new BuildMCPServer({
  name: 'oauth-test-server',
  version: '1.0.0',
  description: 'OAuth test server',
});

// Add a test tool
server.addTool({
  name: 'echo',
  description: 'Echo back input',
  parameters: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Message to echo' },
    },
    required: ['message'],
  },
  execute: async (args) => {
    return { echoed: args.message };
  },
});

// Start server
await server.start({
  transport: 'http',
  port,
  stateful: true,
  securityConfig,
});

console.log(`OAuth server running on http://localhost:${port}`);
console.log('Test the OAuth flow with the manual test commands');
```

Start the server:
```bash
npx tsx test-oauth-server.ts
```

---

## Manual Test Commands

### Test 1: OAuth Metadata Endpoint

Verify OAuth metadata is accessible:

```bash
curl -X GET http://localhost:3456/.well-known/oauth-authorization-server \
  -H "Content-Type: application/json" | jq
```

**Expected Response:**
```json
{
  "issuer": "http://localhost:3456",
  "authorization_endpoint": "http://localhost:3456/oauth/authorize",
  "token_endpoint": "http://localhost:3456/oauth/token",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"]
}
```

---

### Test 2: Authorization Flow (Step 1 - Get Authorization Code)

Generate PKCE code verifier and challenge:

```bash
# Generate code verifier (random 43-128 char string)
CODE_VERIFIER=$(openssl rand -base64 32 | tr -d '=' | tr '/+' '_-')
echo "Code Verifier: $CODE_VERIFIER"

# Generate code challenge (SHA256 hash, base64url encoded)
CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | openssl dgst -sha256 -binary | base64 | tr -d '=' | tr '/+' '_-')
echo "Code Challenge: $CODE_CHALLENGE"
```

Request authorization code (open in browser or use curl with redirect):

```bash
curl -X GET "http://localhost:3456/oauth/authorize?\
client_id=test-client&\
redirect_uri=http://localhost:3456/callback&\
response_type=code&\
scope=read%20write&\
code_challenge=$CODE_CHALLENGE&\
code_challenge_method=S256&\
state=random-state-123" \
  -v -L
```

**Expected Response:**
Redirects to: `http://localhost:3456/callback?code=AUTHORIZATION_CODE&state=random-state-123`

Extract the authorization code from the redirect URL.

---

### Test 3: Token Exchange (Step 2 - Exchange Code for Tokens)

Exchange authorization code for access token:

```bash
# Set these from previous step
AUTHORIZATION_CODE="<code-from-redirect>"

curl -X POST http://localhost:3456/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=$AUTHORIZATION_CODE" \
  -d "redirect_uri=http://localhost:3456/callback" \
  -d "client_id=test-client" \
  -d "client_secret=test-secret-123" \
  -d "code_verifier=$CODE_VERIFIER" | jq
```

**Expected Response:**
```json
{
  "access_token": "UUID-ACCESS-TOKEN",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "UUID-REFRESH-TOKEN",
  "scope": "read write"
}
```

Save the `access_token` for next steps.

---

### Test 4: Use Bearer Token to Call MCP Endpoints

List available tools with bearer token:

```bash
ACCESS_TOKEN="<token-from-previous-step>"

curl -X POST http://localhost:3456/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }' | jq
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "echo",
        "description": "Echo back input",
        "inputSchema": {
          "type": "object",
          "properties": {
            "message": {
              "type": "string",
              "description": "Message to echo"
            }
          },
          "required": ["message"]
        }
      }
    ]
  }
}
```

---

### Test 5: Call Tool with Bearer Token

Execute the echo tool:

```bash
curl -X POST http://localhost:3456/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "echo",
      "arguments": {
        "message": "Hello OAuth!"
      }
    }
  }' | jq
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"echoed\":\"Hello OAuth!\"}"
      }
    ]
  }
}
```

---

### Test 6: Invalid Bearer Token (Should Fail)

Try to call MCP endpoint with invalid token:

```bash
curl -X POST http://localhost:3456/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-token-12345" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }' | jq
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32001,
    "message": "Unauthorized"
  },
  "id": 1
}
```
(Status code: 401)

---

### Test 7: Missing Bearer Token (Should Fail)

Try to call MCP endpoint without token:

```bash
curl -X POST http://localhost:3456/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }' | jq
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32001,
    "message": "Unauthorized"
  },
  "id": 1
}
```
(Status code: 401)

---

### Test 8: Refresh Token Flow

Exchange refresh token for new access token:

```bash
REFRESH_TOKEN="<refresh-token-from-step-3>"

curl -X POST http://localhost:3456/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=$REFRESH_TOKEN" \
  -d "client_id=test-client" \
  -d "client_secret=test-secret-123" | jq
```

**Expected Response:**
```json
{
  "access_token": "NEW-UUID-ACCESS-TOKEN",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "NEW-UUID-REFRESH-TOKEN",
  "scope": "read write"
}
```

---

### Test 9: Token Revocation

Revoke an access token:

```bash
curl -X POST http://localhost:3456/oauth/revoke \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=$ACCESS_TOKEN" \
  -d "token_type_hint=access_token" \
  -d "client_id=test-client" \
  -d "client_secret=test-secret-123"
```

**Expected Response:**
```
HTTP/2 200 OK
```
(Empty response body on success)

Verify token is revoked by trying to use it:

```bash
curl -X POST http://localhost:3456/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }' | jq
```

**Expected:** 401 Unauthorized

---

### Test 10: Rate Limiting on Token Endpoint

Trigger rate limiting by making 11 rapid requests:

```bash
for i in {1..11}; do
  echo "Request $i:"
  curl -X POST http://localhost:3456/oauth/token \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=authorization_code" \
    -d "code=invalid"
done
```

**Expected Response (after 10th request):**
```json
{
  "error": "too_many_requests",
  "error_description": "Rate limit exceeded for token endpoint",
  "retry_after": 60
}
```
(Status code: 429)

---

### Test 11: Health Endpoint (No Auth Required)

Verify health endpoint works without authentication:

```bash
curl -X GET http://localhost:3456/health | jq
```

**Expected Response:**
```json
{
  "status": "ok",
  "server": {
    "name": "oauth-test-server",
    "version": "1.0.0"
  },
  "transport": {
    "type": "http",
    "mode": "stateful"
  }
}
```

---

### Test 12: Wrong Client Credentials (Should Fail)

Try token exchange with wrong client secret:

```bash
curl -X POST http://localhost:3456/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=some-code" \
  -d "client_id=test-client" \
  -d "client_secret=WRONG-SECRET" \
  -d "code_verifier=some-verifier"
```

**Expected:** 401 Unauthorized or error response

---

## Complete End-to-End Flow Script

Here's a complete script that runs the entire OAuth flow:

```bash
#!/bin/bash

# OAuth Complete Flow Test Script
PORT=3456
BASE_URL="http://localhost:$PORT"

echo "=== OAuth 2.1 Complete Flow Test ==="
echo ""

# Step 1: Check OAuth metadata
echo "1. Fetching OAuth metadata..."
curl -s -X GET "$BASE_URL/.well-known/oauth-authorization-server" | jq .issuer
echo ""

# Step 2: Generate PKCE parameters
echo "2. Generating PKCE parameters..."
CODE_VERIFIER=$(openssl rand -base64 32 | tr -d '=' | tr '/+' '_-')
CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | openssl dgst -sha256 -binary | base64 | tr -d '=' | tr '/+' '_-')
echo "Code Verifier: $CODE_VERIFIER"
echo "Code Challenge: $CODE_CHALLENGE"
echo ""

# Step 3: Get authorization code (manual step - open in browser)
echo "3. Open this URL in your browser to get authorization code:"
echo "$BASE_URL/oauth/authorize?client_id=test-client&redirect_uri=http://localhost:$PORT/callback&response_type=code&scope=read%20write&code_challenge=$CODE_CHALLENGE&code_challenge_method=S256&state=test-state"
echo ""
echo "After redirect, enter the authorization code:"
read -r AUTH_CODE
echo ""

# Step 4: Exchange code for token
echo "4. Exchanging authorization code for access token..."
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=$AUTH_CODE" \
  -d "redirect_uri=http://localhost:$PORT/callback" \
  -d "client_id=test-client" \
  -d "client_secret=test-secret-123" \
  -d "code_verifier=$CODE_VERIFIER")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r .access_token)
REFRESH_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r .refresh_token)

echo "Access Token: $ACCESS_TOKEN"
echo "Refresh Token: $REFRESH_TOKEN"
echo ""

# Step 5: Call MCP endpoint with bearer token
echo "5. Calling MCP endpoint with bearer token..."
curl -s -X POST "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }' | jq .result.tools[0].name
echo ""

# Step 6: Execute tool
echo "6. Executing echo tool..."
curl -s -X POST "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "echo",
      "arguments": {
        "message": "OAuth works!"
      }
    }
  }' | jq .result.content[0].text
echo ""

echo "=== OAuth Flow Complete! ==="
```

Save this as `test-oauth-flow.sh`, make it executable (`chmod +x test-oauth-flow.sh`), and run it to test the complete OAuth flow.

---

## Troubleshooting

### 401 Unauthorized on MCP Endpoints
- Verify bearer token is valid (not expired)
- Check token is included in Authorization header
- Ensure format is `Authorization: Bearer TOKEN`

### 429 Too Many Requests
- Wait 60 seconds for rate limit to reset
- Token endpoint is limited to 10 requests per minute

### 404 Not Found on OAuth Endpoints
- Verify server is running on correct port
- Check OAuth is configured in security config
- Ensure `authentication.type === 'oauth2'`

### Invalid Authorization Code
- Authorization codes are single-use only
- Codes expire after 10 minutes
- Verify PKCE code_verifier matches code_challenge

---

## Success Criteria

✅ OAuth metadata endpoint accessible
✅ Authorization endpoint returns auth code
✅ Token endpoint exchanges code for tokens
✅ Bearer tokens authenticate MCP requests
✅ Invalid tokens are rejected
✅ Rate limiting works on token endpoint
✅ Refresh tokens can be exchanged
✅ Tokens can be revoked
✅ Health endpoint accessible without auth
✅ Complete flow works end-to-end
