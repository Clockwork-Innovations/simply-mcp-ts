# OAuth 2.1 Examples

This directory contains comprehensive OAuth 2.1 examples for Simply-MCP.

## Examples Overview

### 1. interface-oauth-minimal.ts
**Minimal OAuth configuration** (1.7K)
- Single OAuth client
- Basic authentication flow
- Getting started example

### 2. interface-oauth-basic.ts
**Basic multi-client OAuth** (7.0K)
- 3 OAuth clients (admin, developer, viewer)
- Custom token expirations
- Multiple redirect URIs
- Usage examples included

### 3. interface-oauth-server.ts ⭐ **COMPREHENSIVE**
**Production-ready OAuth implementation** (40K)
- 4 OAuth clients with different access levels
- Scope-based access control demonstrated
- 4 tools with varying permission requirements
- 4 resources with scope enforcement
- Complete testing guide (1000+ lines)
- PKCE code generation examples
- Token lifecycle management
- Troubleshooting guide
- Production deployment checklist

## Quick Start

### Minimal Example
```bash
npx simply-mcp run examples/interface-oauth-minimal.ts
```

### Comprehensive Example (Recommended)
```bash
# Validate configuration
npx simply-mcp run examples/interface-oauth-server.ts --dry-run

# Start server
npx simply-mcp run examples/interface-oauth-server.ts
```

## OAuth Clients in Comprehensive Example

| Client | Scopes | Use Case |
|--------|--------|----------|
| `admin-client` | `admin` | Full system access |
| `developer-client` | `tools:execute`, `resources:read`, `read` | Developer tools |
| `viewer-client` | `read` | Read-only monitoring |
| `analytics-client` | `analytics:query`, `read` | Custom analytics access |

## Testing OAuth Flow

### Quick Test
```bash
./examples/test-oauth-server.sh
```

### Full Manual Test

1. **Generate PKCE codes:**
   ```bash
   CODE_VERIFIER=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-43)
   CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | openssl dgst -binary -sha256 | openssl base64 | tr -d "=+/" | cut -c1-43)
   ```

2. **Get authorization code** (open in browser):
   ```
   http://localhost:3000/oauth/authorize?response_type=code&client_id=admin-client&redirect_uri=http://localhost:8080/callback&scope=admin&code_challenge=$CODE_CHALLENGE&code_challenge_method=S256
   ```

3. **Exchange code for token:**
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

4. **Call tool with Bearer token:**
   ```bash
   curl -X POST http://localhost:3000/mcp \
     -H "Authorization: Bearer <ACCESS_TOKEN>" \
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

## Documentation

### Quick Reference
**File:** `OAUTH_SERVER_QUICK_REFERENCE.md`
- Client credentials table
- Tool/resource access matrix
- Common curl commands
- Troubleshooting guide

### Comprehensive Guide
**File:** `interface-oauth-server.ts` (bottom of file)
- 1000+ lines of testing documentation
- Step-by-step OAuth flow for all 4 clients
- Scope enforcement demonstrations
- PKCE code generation
- Token lifecycle (refresh, introspect, revoke)
- Production deployment guidance

## Scope-to-Permission Mapping

Simply-MCP automatically maps OAuth scopes to permissions:

| OAuth Scope | Permission | Description |
|-------------|------------|-------------|
| `admin` | `*` | Full access to everything |
| `tools:execute` | `tools:*` | Execute any tool |
| `resources:read` | `resources:*` | Read any resource |
| `read` | `read:*` | Read-only operations |
| Custom scopes | Pass through | e.g., `analytics:query` |

## Security Features

All examples include:
- ✅ PKCE (Proof Key for Code Exchange) enforced
- ✅ Refresh token rotation
- ✅ Scope validation
- ✅ Audit logging
- ✅ Bearer token authentication
- ✅ Token introspection
- ✅ Token revocation

## Production Deployment

### Environment Variables (Recommended)
```bash
export OAUTH_ISSUER_URL="https://auth.example.com"
export ADMIN_CLIENT_SECRET="secure-random-string"
export DEV_CLIENT_SECRET="another-secure-random-string"
export VIEWER_CLIENT_SECRET="yet-another-secure-string"
export ANALYTICS_CLIENT_SECRET="final-secure-string"
```

### Security Checklist
- [ ] Use HTTPS for issuerUrl and redirectUris
- [ ] Load secrets from environment variables
- [ ] Implement real user authentication
- [ ] Add user consent screen
- [ ] Reduce token expirations (15-60 min)
- [ ] Use secure session storage (Redis/DB)
- [ ] Set up audit log monitoring
- [ ] Configure rate limiting

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid token | Check Bearer token format |
| 403 Forbidden | Wrong scope | Review required scopes |
| 400 Bad Request | PKCE mismatch | Regenerate PKCE codes |
| Redirect URI mismatch | URI not allowed | Check client config |

## Audit Logs

OAuth events are logged to: `./logs/oauth-audit.log`

```bash
tail -f ./logs/oauth-audit.log
```

## Example Comparison

| Feature | Minimal | Basic | Comprehensive |
|---------|---------|-------|---------------|
| OAuth clients | 1 | 3 | 4 |
| Scope enforcement | ❌ | ❌ | ✅ |
| Custom scopes | ❌ | ❌ | ✅ |
| Tools | 1 | 1 | 4 |
| Resources | 0 | 0 | 4 |
| Testing guide | ❌ | Basic | Comprehensive |
| Production guide | ❌ | ❌ | ✅ |
| File size | 1.7K | 7.0K | 40K |

## Additional Resources

- OAuth 2.1 Spec: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1
- PKCE Spec: https://datatracker.ietf.org/doc/html/rfc7636
- Simply-MCP Auth Docs: `/docs/guides/AUTH.md`
- MCP Protocol: https://modelcontextprotocol.io/

## Support

For questions or issues:
- Check comprehensive testing guide in `interface-oauth-server.ts`
- Review `OAUTH_SERVER_QUICK_REFERENCE.md`
- See Simply-MCP documentation in `/docs/guides/`
- GitHub Issues: https://github.com/your-org/simply-mcp/issues

## Next Steps

After exploring these examples:
1. Start with `interface-oauth-minimal.ts` to understand basics
2. Review `interface-oauth-basic.ts` for multi-client setup
3. Study `interface-oauth-server.ts` for production patterns
4. Follow the comprehensive testing guide
5. Implement your own OAuth-secured MCP server
6. Deploy to production using security checklist

---

**Note:** All examples use demo credentials for testing. Always use environment variables and strong secrets in production.
