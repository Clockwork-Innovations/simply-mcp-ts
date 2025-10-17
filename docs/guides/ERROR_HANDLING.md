# Error Handling Guide

Robust error handling patterns for Simply MCP servers.

**See working example:** [examples/auto-install-error-handling.ts](../../examples/auto-install-error-handling.ts)

---

## Core Principles

1. **Fail gracefully** - Catch errors and provide meaningful messages
2. **Validate input** - Check parameters before processing
3. **Log errors** - Use console or logging library for debugging
4. **Retry when safe** - Implement retry logic for transient failures
5. **Clear messages** - User-friendly error descriptions

---

## Basic Pattern

```typescript
{
  name: 'my-tool',
  description: 'Does something',
  execute: async (args) => {
    try {
      // Validate input
      if (!args.required_param) {
        throw new Error('required_param is required');
      }

      // Your logic
      const result = await doSomething(args);
      return result;

    } catch (error) {
      // Log for debugging
      console.error('Tool error:', error);

      // Re-throw with user-friendly message
      throw new Error(`Failed: ${error.message}`);
    }
  }
}
```

---

## Error Types

### Validation Errors

```typescript
execute: async (args) => {
  // Check required fields
  if (!args.email || !args.email.includes('@')) {
    throw new Error('Invalid email format');
  }

  // Check constraints
  if (args.count < 0 || args.count > 100) {
    throw new Error('Count must be between 0 and 100');
  }

  // Process
  return processEmail(args.email);
}
```

### Network Errors

```typescript
execute: async (args) => {
  try {
    const response = await fetch(args.url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.text();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Network error: Check URL and connection`);
    }
    throw error;
  }
}
```

### Timeout Errors

```typescript
execute: async (args) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const result = await fetch(args.url, { signal: controller.signal });
    return result.text();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout (5s)');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### Dependency Errors

```typescript
execute: async (args) => {
  try {
    const module = require('optional-module');
    return module.process(args);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      throw new Error('Required module not installed: npm install optional-module');
    }
    throw error;
  }
}
```

---

## Async Operation Safety

```typescript
execute: async (args) => {
  const operations = [];

  try {
    // Run multiple async operations safely
    const results = await Promise.allSettled([
      asyncOp1(args),
      asyncOp2(args),
      asyncOp3(args)
    ]);

    // Check each result
    const errors = results
      .filter(r => r.status === 'rejected')
      .map(r => r.reason.message);

    if (errors.length > 0) {
      throw new Error(`Some operations failed: ${errors.join(', ')}`);
    }

    return results.map(r => r.value);

  } catch (error) {
    console.error('Operation failed:', error);
    throw error;
  }
}
```

---

## Environment Configuration

```typescript
// Validate required environment variables at startup
const requiredEnv = ['API_KEY', 'DATABASE_URL'];
const missing = requiredEnv.filter(key => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}`
  );
}

const apiKey = process.env.API_KEY;
const dbUrl = process.env.DATABASE_URL;

// Now safe to use
```

---

## Logging Best Practices

```typescript
execute: async (args) => {
  console.log('Starting tool with args:', args);

  try {
    const result = await processData(args);
    console.log('Tool succeeded:', result);
    return result;

  } catch (error) {
    // Log with context
    console.error('Tool failed:', {
      error: error.message,
      args: args,
      stack: error.stack
    });

    throw new Error(`Processing failed: ${error.message}`);
  }
}
```

---

## Retry Logic

```typescript
async function retryableOperation(fn, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}`);
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed:`, error.message);

      // Don't retry on last attempt
      if (attempt < maxRetries) {
        // Exponential backoff: 100ms, 200ms, 400ms
        await new Promise(resolve =>
          setTimeout(resolve, 100 * Math.pow(2, attempt - 1))
        );
      }
    }
  }

  throw new Error(
    `Operation failed after ${maxRetries} attempts: ${lastError.message}`
  );
}

// Usage
execute: async (args) => {
  return retryableOperation(() => fetch(args.url));
}
```

---

## Input Validation with Zod

```typescript
import { z } from 'zod';

const inputSchema = z.object({
  email: z.string().email('Invalid email format'),
  count: z.number().int().min(0).max(100),
  tags: z.array(z.string()).optional()
});

execute: async (args) => {
  try {
    const validated = inputSchema.parse(args);
    return processValidated(validated);
  } catch (error) {
    throw new Error(`Validation failed: ${error.message}`);
  }
}
```

---

## Server-Level Error Handling

```typescript
// Wrap entire server with error handling
import { defineMCP } from 'simply-mcp';

export default defineMCP({
  name: 'my-server',
  version: '1.0.0',
  tools: [
    {
      name: 'my-tool',
      execute: async (args) => {
        try {
          return await myLogic(args);
        } catch (error) {
          console.error('[my-tool]', error);
          throw error;
        }
      }
    }
  ]
});
```

---

## Testing Error Cases

```typescript
// Test error handling
async function testErrorHandling() {
  const tests = [
    { args: {}, expected: 'required_param is required' },
    { args: { invalid: true }, expected: 'Invalid input' },
    { args: { valid: true }, expected: 'success' }
  ];

  for (const test of tests) {
    try {
      await myTool.execute(test.args);
      console.log('✓ Test passed:', test.expected);
    } catch (error) {
      console.log('✓ Error caught:', error.message);
    }
  }
}
```

---

## Common Mistakes

❌ **Swallowing errors silently**
```typescript
// Bad
execute: async (args) => {
  try {
    return await risky();
  } catch (e) {
    return null; // No feedback!
  }
}

// Good
execute: async (args) => {
  try {
    return await risky();
  } catch (e) {
    throw new Error(`Operation failed: ${e.message}`);
  }
}
```

❌ **Unclear error messages**
```typescript
// Bad
throw new Error('Error');

// Good
throw new Error('Database connection failed: ECONNREFUSED localhost:5432');
```

❌ **Not validating inputs**
```typescript
// Bad - crashes on undefined
execute: async (args) => args.name.toUpperCase();

// Good - validates first
execute: async (args) => {
  if (!args.name) throw new Error('name required');
  return args.name.toUpperCase();
}
```

---

## Debugging Tips

1. **Use `--verbose` flag:**
   ```bash
   npx simply-mcp run server.ts --verbose
   ```

2. **Check error stack traces:**
   ```typescript
   console.error('Full stack:', error.stack);
   ```

3. **Test locally first:**
   ```bash
   npx simply-mcp run server.ts --dry-run
   ```

4. **Use debugger:**
   ```bash
   node --inspect server.ts
   ```

---

## See Also

- [TOOLS.md](./TOOLS.md) - More tool examples
- [examples/auto-install-error-handling.ts](../../examples/auto-install-error-handling.ts) - Working example
- [DEBUGGING.md](./DEBUGGING.md) - Debugging techniques
- [docs/README.md](../README.md) - Full documentation index
