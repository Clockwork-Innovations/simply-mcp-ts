# OAuth Storage Abstraction Layer

This directory contains the storage abstraction layer for OAuth data persistence. The abstraction allows for multiple storage backends (Redis, PostgreSQL, etc.) while providing a consistent interface for the OAuth provider.

## Architecture

```
┌─────────────────────────────────┐
│  SimplyMCPOAuthProvider         │
│  (Business Logic)               │
└────────────┬────────────────────┘
             │ uses
             ▼
┌─────────────────────────────────┐
│  OAuthStorageProvider Interface │
│  (This Abstraction)             │
└────────────┬────────────────────┘
             │ implemented by
             ▼
┌─────────────────────────────────┐
│  Concrete Implementations:      │
│  - InMemoryStorage (default)    │
│  - RedisStorage                 │
│  - PostgreSQLStorage            │
└─────────────────────────────────┘
```

## Key Features

### 1. Atomic Operations

The `markAuthorizationCodeUsed()` method provides atomic single-use enforcement for authorization codes, preventing race conditions when parallel requests attempt to exchange the same code.

**Redis Implementation:**
```typescript
// Use Lua script for atomicity
const script = `
  local code_data = redis.call('GET', KEYS[1])
  if not code_data then
    return -1  -- code not found
  end
  local data = cjson.decode(code_data)
  if data.used then
    return 0  -- already used
  end
  data.used = true
  redis.call('SET', KEYS[1], cjson.encode(data), 'KEEPTTL')
  return 1  -- marked as used
`;
```

**PostgreSQL Implementation:**
```sql
UPDATE authorization_codes
SET used = true
WHERE code = $1 AND used = false
RETURNING code;
-- If no rows returned, code was already used
```

### 2. Transaction Support

Transactions ensure that token rotation (delete old + create new) happens atomically:

```typescript
const txn = await storage.beginTransaction();
try {
  // Delete old tokens
  await txn.deleteToken(oldAccessToken);
  await txn.deleteRefreshToken(oldRefreshToken);

  // Create new tokens
  await txn.setToken(newAccessToken, tokenData, ttl);
  await txn.setRefreshToken(newRefreshToken, newAccessToken, refreshTtl);

  // Commit atomically
  await txn.commit();
} catch (error) {
  await txn.rollback();
  throw error;
}
```

### 3. Automatic Expiration

All storage operations include TTL (time-to-live) parameters to ensure tokens and codes expire automatically:

- Access tokens: Default 3600 seconds (1 hour)
- Refresh tokens: Default 86400 seconds (24 hours)
- Authorization codes: Default 600 seconds (10 minutes)

**Redis:** Uses native SETEX/EXPIRE for automatic cleanup
**PostgreSQL:** Requires periodic cleanup job or trigger-based deletion

## Data Model

### Clients
- **Key:** `clientId` (string)
- **Value:** `StoredClient` (hashed secret, redirect URIs, scopes)
- **TTL:** None (persistent)

### Access Tokens
- **Key:** `token` (string, random)
- **Value:** `StoredToken` (clientId, scopes, expiresAt, refreshToken)
- **TTL:** Configurable (default 3600s)

### Refresh Tokens
- **Key:** `refreshToken` (string, random)
- **Value:** `accessToken` (string, reference to access token)
- **TTL:** Configurable (default 86400s)

### Authorization Codes
- **Key:** `code` (string, random)
- **Value:** `StoredAuthorizationCode` (clientId, scopes, redirectUri, codeChallenge, used)
- **TTL:** Configurable (default 600s)

## Implementation Guide

### Creating a New Storage Backend

1. **Implement `OAuthStorageProvider` interface:**
   ```typescript
   import type { OAuthStorageProvider } from './types.js';

   export class MyStorageProvider implements OAuthStorageProvider {
     // Implement all required methods
   }
   ```

2. **Implement `StorageTransaction` interface:**
   ```typescript
   import type { StorageTransaction } from './types.js';

   class MyStorageTransaction implements StorageTransaction {
     // Implement all required methods
   }
   ```

3. **Handle TTL correctly:**
   - TTL is passed in **seconds** (not milliseconds)
   - Redis: Use `SETEX key ttl value`
   - PostgreSQL: Store `expires_at = NOW() + INTERVAL 'ttl seconds'`

4. **Implement atomic operations:**
   - Use database primitives (Lua scripts, SELECT FOR UPDATE, etc.)
   - Never use read-modify-write patterns without locks

5. **Handle errors consistently:**
   - Throw on configuration/connection errors
   - Return `undefined` for not-found (don't throw)
   - Return `false` for already-used codes (don't throw)

### Testing Your Implementation

```typescript
import { isOAuthStorageProvider } from './types.js';
import { MyStorageProvider } from './my-storage.js';

const provider = new MyStorageProvider(config);

// Verify interface compliance
if (!isOAuthStorageProvider(provider)) {
  throw new Error('Provider does not implement OAuthStorageProvider');
}

// Test basic operations
await provider.connect();
await provider.setClient('test-client', clientData);
const client = await provider.getClient('test-client');
console.assert(client?.clientId === 'test-client');

// Test atomic code marking
await provider.setAuthorizationCode('test-code', codeData, 600);
const marked1 = await provider.markAuthorizationCodeUsed('test-code');
console.assert(marked1 === true, 'First mark should succeed');

const marked2 = await provider.markAuthorizationCodeUsed('test-code');
console.assert(marked2 === false, 'Second mark should fail (already used)');

// Test transactions
const txn = await provider.beginTransaction();
await txn.setToken('token1', tokenData, 3600);
await txn.setRefreshToken('refresh1', 'token1', 86400);
await txn.commit();

await provider.disconnect();
```

## Performance Considerations

### Redis
- **Pros:** Native TTL, very fast, simple atomic operations via Lua
- **Cons:** In-memory only, limited persistence options, costs scale with data size
- **Best for:** High-throughput, short-lived tokens, development

### PostgreSQL
- **Pros:** Persistent, ACID transactions, rich query capabilities
- **Cons:** Slower than Redis, requires periodic cleanup for expired tokens
- **Best for:** Production, audit trails, complex queries

### Hybrid Approach
- Use Redis for hot data (active tokens)
- Use PostgreSQL for cold data (audit logs, revoked tokens)
- Synchronize between systems

## Migration Path

1. **Phase 1:** Create `InMemoryStorage` implementation matching current behavior
2. **Phase 2:** Refactor `SimplyMCPOAuthProvider` to use storage abstraction
3. **Phase 3:** Add Redis implementation
4. **Phase 4:** Add PostgreSQL implementation
5. **Phase 5:** Add configuration options to choose storage backend

## API Reference

See [types.ts](./types.ts) for complete interface documentation with JSDoc comments.

## Files

- `types.ts` - Core interfaces and type definitions
- `index.ts` - Public exports
- `README.md` - This file
- `in-memory.ts` - (TODO) In-memory implementation for testing/development
- `redis.ts` - (TODO) Redis implementation for production
- `postgresql.ts` - (TODO) PostgreSQL implementation for production

## Related Documentation

- [OAuth Types](../types.ts) - Core OAuth data structures
- [OAuth Provider](../SimplyMCPOAuthProvider.ts) - Main OAuth provider implementation
- [OAuth Router](../router.ts) - HTTP endpoints for OAuth flows
