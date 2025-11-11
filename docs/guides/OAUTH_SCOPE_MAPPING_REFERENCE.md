# OAuth Scope-to-Permission Mapping Reference

## Quick Reference

Simply-MCP automatically maps OAuth 2.1 scopes to internal permissions for authorization.

## Standard Scope Mappings

| OAuth Scope | Simply-MCP Permission | Description |
|-------------|----------------------|-------------|
| `read` | `read:*` | Read access to all resources |
| `write` | `write:*` | Write access to all resources |
| `tools:execute` | `tools:*` | Execute any tool |
| `resources:read` | `resources:*` | Read any resource |
| `prompts:read` | `prompts:*` | Read any prompt |
| `admin` | `*` | Full access to everything |

## Usage Examples

### Basic Scope Usage

```typescript
// OAuth client configuration with scopes
{
  clientId: 'my-app',
  clientSecret: 'secret',
  redirectUris: ['https://myapp.com/callback'],
  scopes: ['read', 'tools:execute']  // Client can read and execute tools
}
```

### Read-Only Access

```typescript
// Client limited to reading data
{
  scopes: ['read']
}

// Mapped permissions: ['read:*']
// Can: Read resources, prompts, data
// Cannot: Execute tools, write data, admin actions
```

### Tool Execution Access

```typescript
// Client can execute tools and read data
{
  scopes: ['tools:execute', 'read']
}

// Mapped permissions: ['tools:*', 'read:*']
// Can: Execute any tool, read resources
// Cannot: Write data, admin actions
```

### Admin Access

```typescript
// Client has full access
{
  scopes: ['admin']
}

// Mapped permissions: ['*']
// Can: Everything (tools, resources, prompts, admin actions)
```

### Custom Scopes

```typescript
// Client with custom domain-specific scopes
{
  scopes: ['analytics:view', 'reports:generate']
}

// Mapped permissions: ['analytics:view', 'reports:generate']
// Custom scopes pass through unchanged
// Your authorization logic can check for these specific permissions
```

## How It Works

### 1. Token Validation

When a request arrives with a Bearer token:

```typescript
GET /api/tool
Authorization: Bearer abc123...
```

The middleware:
1. Validates the token with the OAuth provider
2. Extracts scopes from the token (e.g., `['tools:execute', 'read']`)
3. Maps scopes to permissions (e.g., `['tools:*', 'read:*']`)
4. Creates a `SecurityContext` with the permissions
5. Attaches context to `req.mcpContext`

### 2. Permission Checking

Your handlers can check permissions:

```typescript
import { PermissionChecker } from 'simply-mcp';

app.post('/api/tool', createOAuthMiddleware({ provider }), (req, res) => {
  const context = req.mcpContext;

  // Check if user has permission to execute tools
  if (!permissionChecker.hasPermission(context, 'tools:my-tool')) {
    return res.status(403).json({
      error: 'forbidden',
      message: 'Missing permission: tools:my-tool',
      yourPermissions: context.permissions
    });
  }

  // Execute tool...
});
```

### 3. Automatic Enforcement

The permission checker automatically handles wildcards:

```typescript
// Token has scope 'tools:execute' → mapped to 'tools:*'

permissionChecker.hasPermission(context, 'tools:my-tool')  // ✅ true
permissionChecker.hasPermission(context, 'tools:other-tool')  // ✅ true
permissionChecker.hasPermission(context, 'resources:data')  // ❌ false
```

## Common Patterns

### Pattern 1: Progressive Access

```typescript
// Level 1: Read-only
const readOnlyClient = {
  scopes: ['read']
};

// Level 2: Can execute tools
const toolsClient = {
  scopes: ['read', 'tools:execute']
};

// Level 3: Full access
const adminClient = {
  scopes: ['admin']
};
```

### Pattern 2: Resource-Specific Access

```typescript
// Can only access resources, not tools
const resourceClient = {
  scopes: ['resources:read']
};

// Mapped to: ['resources:*']
// ✅ Can read resources
// ❌ Cannot execute tools
// ❌ Cannot read prompts
```

### Pattern 3: Custom Domain Scopes

```typescript
// Define custom scopes for your domain
const analyticsClient = {
  scopes: ['analytics:view', 'analytics:export']
};

// Check in your handler
if (permissionChecker.hasPermission(context, 'analytics:export')) {
  // Allow export
}
```

## Scope Combinations

Scopes are automatically deduplicated and combined:

```typescript
// Token with multiple scopes
scopes: ['read', 'write', 'tools:execute']

// Mapped permissions
permissions: ['read:*', 'write:*', 'tools:*']

// Permission checks
hasPermission(context, 'read:data')      // ✅ true
hasPermission(context, 'write:data')     // ✅ true
hasPermission(context, 'tools:execute')  // ✅ true
hasPermission(context, 'resources:data') // ❌ false (need resources:read)
```

## Error Responses

### 401 Unauthorized - Invalid Token

```json
{
  "error": "invalid_token",
  "error_description": "Token verification failed"
}
```

**Causes:**
- Token expired
- Token invalid/malformed
- Token revoked

### 403 Forbidden - Insufficient Permissions

```json
{
  "error": "forbidden",
  "message": "Missing required permission: tools:my-tool",
  "requiredScopes": ["tools:execute", "admin"],
  "yourPermissions": ["read:*"]
}
```

**Causes:**
- Token valid but lacks required scope
- Scope doesn't map to required permission

## Best Practices

### 1. Principle of Least Privilege

Grant only the minimum scopes needed:

```typescript
// ✅ Good: Specific scopes
scopes: ['resources:read', 'tools:execute']

// ⚠️ Avoid unless necessary
scopes: ['admin']  // Grants everything
```

### 2. Use Standard Scopes

Prefer standard scopes over custom ones:

```typescript
// ✅ Good: Standard scopes
scopes: ['read', 'tools:execute']

// ⚠️ Custom scopes require manual permission checking
scopes: ['custom:feature']
```

### 3. Document Required Scopes

Document which scopes each endpoint requires:

```typescript
/**
 * Execute analytics report
 *
 * Required scopes: tools:execute OR admin
 * Required permissions: tools:generate-report
 */
app.post('/api/reports/generate', ...);
```

### 4. Validate Scopes at Authorization Time

Check scopes during OAuth authorization, not just at API time:

```typescript
// In OAuth provider configuration
const client = {
  clientId: 'app',
  scopes: ['read', 'tools:execute']  // Only these scopes allowed
};

// Client cannot request 'admin' scope
```

## Testing Scope Enforcement

### Unit Test Example

```typescript
import { mapScopesToPermissions } from 'simply-mcp';

test('maps scopes correctly', () => {
  const permissions = mapScopesToPermissions(['read', 'tools:execute']);
  expect(permissions).toEqual(['read:*', 'tools:*']);
});
```

### Integration Test Example

```typescript
test('enforces tool execution scope', async () => {
  const token = await getTokenWithScopes(['read']); // No tools:execute

  const response = await request(app)
    .post('/api/tool')
    .set('Authorization', `Bearer ${token}`)
    .expect(403);

  expect(response.body.error).toBe('forbidden');
});
```

## Debugging

### Check Token Scopes

```typescript
// In your handler
app.get('/debug/token', createOAuthMiddleware({ provider }), (req, res) => {
  const context = req.mcpContext;
  res.json({
    authenticated: context.authenticated,
    permissions: context.permissions,
    // Decode what you can access
    canRead: permissionChecker.hasPermission(context, 'read:data'),
    canExecuteTools: permissionChecker.hasPermission(context, 'tools:any'),
    canAccessResources: permissionChecker.hasPermission(context, 'resources:any'),
    isAdmin: permissionChecker.hasPermission(context, 'admin:any')
  });
});
```

### Check Provider Scopes

```typescript
// Verify token scopes directly
const authInfo = await provider.verifyAccessToken(token);
console.log('Token scopes:', authInfo.scopes);
console.log('Mapped permissions:', mapScopesToPermissions(authInfo.scopes));
```

## Migration from API Keys

If migrating from API key auth to OAuth:

| API Key Permission | Equivalent OAuth Scope |
|-------------------|----------------------|
| `read:*` | `read` |
| `write:*` | `write` |
| `tools:*` | `tools:execute` |
| `resources:*` | `resources:read` |
| `prompts:*` | `prompts:read` |
| `*` | `admin` |

```typescript
// Before (API Key)
const apiKey = {
  permissions: ['tools:*', 'read:*']
};

// After (OAuth)
const oauthClient = {
  scopes: ['tools:execute', 'read']  // Maps to same permissions
};
```

## See Also

- [OAuth 2.1 Specification](https://oauth.net/2.1/)
- [OAuth 2.1 Guide](./OAUTH2.md) - Complete OAuth documentation
- [OAuth Migration Guide](./OAUTH_MIGRATION.md) - Upgrading to OAuth
- [API Reference](./API_REFERENCE.md) - Authentication interfaces
