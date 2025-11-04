# OAuth Comprehensive Server - Quick Reference

## Overview

`interface-oauth-server.ts` demonstrates production-ready OAuth 2.1 implementation with:
- 4 OAuth clients with different access levels
- Scope-based access control
- 4 tools with varying permission requirements
- 4 resources with scope enforcement
- Complete testing guide with curl commands

## OAuth Clients

| Client | Client ID | Scopes | Access Level |
|--------|-----------|--------|--------------|
| **Admin** | `admin-client` | `admin` | Full access to everything |
| **Developer** | `developer-client` | `tools:execute`, `resources:read`, `read` | Tools + Resources |
| **Viewer** | `viewer-client` | `read` | Read-only |
| **Analytics** | `analytics-client` | `analytics:query`, `read` | Custom analytics access |

## Client Secrets (Demo Only - Change in Production)

```bash
Admin:     admin-secret-12345-change-in-production
Developer: dev-secret-67890-change-in-production
Viewer:    viewer-secret-11111-change-in-production
Analytics: analytics-secret-22222-change-in-production
```

## Scope-to-Permission Mapping

Simply-MCP automatically maps OAuth scopes to permissions:

| Scope | Permission | Access |
|-------|------------|--------|
| `admin` | `*` | Everything |
| `tools:execute` | `tools:*` | All tools |
| `resources:read` | `resources:*` | All resources |
| `read` | `read:*` | Read-only operations |
| `analytics:query` | `analytics:query` | Custom scope (passes through) |

## Tools and Required Scopes

| Tool | Required Scope | Admin | Developer | Viewer | Analytics |
|------|----------------|-------|-----------|--------|-----------|
| `calculate` | `tools:execute` | ✓ | ✓ | ✗ | ✗ |
| `get_data` | `resources:read` | ✓ | ✓ | ✗ | ✗ |
| `admin_action` | `admin` | ✓ | ✗ | ✗ | ✗ |
| `query_analytics` | `analytics:query` | ✓ | ✗ | ✗ | ✓ |

## Resources and Required Scopes

| Resource URI | Required Scope | Admin | Developer | Viewer | Analytics |
|--------------|----------------|-------|-----------|--------|-----------|
| `config://app/settings` | `resources:read` | ✓ | ✓ | ✗ | ✗ |
| `data://users/list` | `admin` | ✓ | ✗ | ✗ | ✗ |
| `analytics://dashboard` | `analytics:query` | ✓ | ✗ | ✗ | ✓ |
| `status://health` | `read` | ✓ | ✓ | ✓ | ✓ |

## Quick Start

### 1. Start Server
```bash
npx simply-mcp run examples/interface-oauth-server.ts
```

### 2. Generate PKCE Codes
```bash
CODE_VERIFIER=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-43)
CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | openssl dgst -binary -sha256 | openssl base64 | tr -d "=+/" | cut -c1-43)
echo "Verifier: $CODE_VERIFIER"
echo "Challenge: $CODE_CHALLENGE"
```

### 3. Get Authorization Code (Browser)

**Admin Client:**
```
http://localhost:3000/oauth/authorize?response_type=code&client_id=admin-client&redirect_uri=http://localhost:8080/callback&scope=admin&code_challenge=$CODE_CHALLENGE&code_challenge_method=S256
```

**Developer Client:**
```
http://localhost:3000/oauth/authorize?response_type=code&client_id=developer-client&redirect_uri=http://localhost:8080/callback&scope=tools:execute%20resources:read%20read&code_challenge=$CODE_CHALLENGE&code_challenge_method=S256
```

### 4. Exchange Code for Token

```bash
curl -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "client_id": "admin-client",
    "client_secret": "admin-secret-12345-change-in-production",
    "code": "<AUTH_CODE>",
    "redirect_uri": "http://localhost:8080/callback",
    "code_verifier": "'$CODE_VERIFIER'"
  }' | jq
```

### 5. Call Tool with Bearer Token

```bash
ACCESS_TOKEN="<your-access-token>"

curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "calculate",
      "arguments": {"expression": "2 + 2"}
    },
    "id": 1
  }' | jq
```

## OAuth Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/.well-known/oauth-authorization-server` | GET | OAuth metadata |
| `/oauth/authorize` | GET | Authorization (PKCE) |
| `/oauth/token` | POST | Token exchange/refresh |
| `/oauth/introspect` | POST | Token introspection |
| `/oauth/revoke` | POST | Token revocation |

## Testing Scope Enforcement

### Test Admin Access (Should Succeed All)
```bash
# All tools should work
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"admin_action","arguments":{"action":"test"}},"id":1}' | jq
```

### Test Developer Access
```bash
# Calculate should work (has tools:execute)
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"calculate","arguments":{"expression":"10 * 5"}},"id":1}' | jq

# Admin action should FAIL (lacks admin scope)
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"admin_action","arguments":{"action":"test"}},"id":2}' | jq
# Expected: 403 Forbidden
```

### Test Viewer Access
```bash
# Calculate should FAIL (lacks tools:execute)
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"calculate","arguments":{"expression":"1 + 1"}},"id":1}' | jq
# Expected: 403 Forbidden

# Status resource should work (has read scope)
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"resources/read","params":{"uri":"status://health"},"id":2}' | jq
# Expected: Success
```

### Test Analytics Access
```bash
# Query analytics should work (has analytics:query)
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer $ANALYTICS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"query_analytics","arguments":{"query":"revenue"}},"id":1}' | jq

# Calculate should FAIL (lacks tools:execute)
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer $ANALYTICS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"calculate","arguments":{"expression":"1 + 1"}},"id":2}' | jq
# Expected: 403 Forbidden
```

## Token Refresh

```bash
curl -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "<REFRESH_TOKEN>",
    "client_id": "admin-client",
    "client_secret": "admin-secret-12345-change-in-production"
  }' | jq
```

## Token Introspection

```bash
curl -X POST http://localhost:3000/oauth/introspect \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<ACCESS_TOKEN>",
    "client_id": "admin-client",
    "client_secret": "admin-secret-12345-change-in-production"
  }' | jq
```

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Missing/invalid token | Check Bearer token format |
| 403 Forbidden | Valid token, wrong scope | Review scope requirements |
| 400 Bad Request | PKCE mismatch | Regenerate PKCE codes |
| Redirect URI mismatch | URI not in allowed list | Check redirectUris config |

## Audit Logs

OAuth events logged to: `./logs/oauth-audit.log`

```bash
tail -f ./logs/oauth-audit.log
```

## Production Deployment

### Environment Variables (Recommended)

```bash
export OAUTH_ISSUER_URL="https://auth.example.com"
export ADMIN_CLIENT_SECRET="secure-random-string-here"
export DEV_CLIENT_SECRET="another-secure-random-string"
export VIEWER_CLIENT_SECRET="yet-another-secure-string"
export ANALYTICS_CLIENT_SECRET="final-secure-string"
```

### Security Checklist

- [ ] Use HTTPS for issuerUrl
- [ ] Update all redirectUris to HTTPS
- [ ] Load secrets from environment variables
- [ ] Implement real user authentication
- [ ] Add user consent screen
- [ ] Reduce token expirations (15-60 min)
- [ ] Set up audit log monitoring
- [ ] Configure rate limiting
- [ ] Implement token revocation on logout
- [ ] Use secure session storage (Redis/DB)

## Reference

- Full testing guide: See comprehensive comments in `interface-oauth-server.ts`
- OAuth 2.1 Spec: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1
- PKCE Spec: https://datatracker.ietf.org/doc/html/rfc7636
- Simply-MCP Auth Docs: `/docs/guides/AUTH.md`
