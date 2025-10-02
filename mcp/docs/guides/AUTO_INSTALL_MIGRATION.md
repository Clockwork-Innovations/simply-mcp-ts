# Auto-Installation Migration Guide

## Introduction

This guide helps you migrate your SimpleMCP servers to use automatic dependency installation. Whether you're creating a new server from scratch or upgrading an existing one, this guide provides step-by-step instructions and best practices.

### Why Use Auto-Installation?

**Before Auto-Installation:**
```bash
# Users must:
1. Clone your repository
2. Read documentation to find dependencies
3. Run npm install manually
4. Hope they installed the right versions
5. Finally run your server
```

**After Auto-Installation:**
```bash
# Users just:
1. Download your server file
2. Run it
# Dependencies install automatically!
```

**Benefits:**

- **Simplified Distribution**: Share single-file servers
- **Zero Configuration**: No manual npm install needed
- **Version Control**: Dependencies tracked with code
- **Better UX**: Users spend less time on setup
- **CI/CD Ready**: Automated deployment pipelines
- **Self-Documenting**: Dependencies visible in code

## Prerequisites

Before migrating, ensure you have:

- Node.js 18+ installed
- npm 9+ (or yarn/pnpm/bun)
- SimpleMCP v1.3.0+
- Existing server using Feature 2 (Inline Dependencies) OR package.json

## Migration Scenarios

Choose your scenario:

1. [New Server from Scratch](#scenario-1-new-server-from-scratch)
2. [Existing Server with package.json](#scenario-2-existing-server-with-packagejson)
3. [Server with Inline Dependencies (Feature 2)](#scenario-3-server-with-inline-dependencies)
4. [CI/CD Integration](#scenario-4-cicd-integration)
5. [Production Deployment](#scenario-5-production-deployment)

---

## Scenario 1: New Server from Scratch

### Starting Point

You want to create a new SimpleMCP server with auto-installation from the beginning.

### Step-by-Step Migration

#### Step 1: Create Server with Inline Dependencies

```typescript
#!/usr/bin/env npx tsx
/**
 * Weather Server - Fetches weather data
 * Auto-installs dependencies on first run
 */

// Declare dependencies inline (Feature 2)
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///

import { SimpleMCP } from './mcp/SimpleMCP.js';
import { z } from 'zod';

// Create server - note: NOT using fromFile() yet
const server = new SimpleMCP({
  name: 'weather-server',
  version: '1.0.0',
});

// Add tools
server.addTool({
  name: 'get_weather',
  description: 'Get weather for a city',
  parameters: z.object({
    city: z.string(),
  }),
  execute: async (args) => {
    const axios = (await import('axios')).default;
    const response = await axios.get(`https://api.weather.com/${args.city}`);
    return `Temperature: ${response.data.temp}°C`;
  },
});

await server.start();
```

#### Step 2: Enable Auto-Installation

```typescript
#!/usr/bin/env npx tsx
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///

import { SimpleMCP } from './mcp/SimpleMCP.js';
import { z } from 'zod';

// CHANGE: Use fromFile() with autoInstall
const server = await SimpleMCP.fromFile(__filename, {
  name: 'weather-server',
  version: '1.0.0',
  autoInstall: true, // ← Enable auto-installation
});

// Rest of the code stays the same
server.addTool({
  name: 'get_weather',
  description: 'Get weather for a city',
  parameters: z.object({
    city: z.string(),
  }),
  execute: async (args) => {
    const axios = (await import('axios')).default;
    const response = await axios.get(`https://api.weather.com/${args.city}`);
    return `Temperature: ${response.data.temp}°C`;
  },
});

await server.start();
```

#### Step 3: Test Auto-Installation

```bash
# First run - installs dependencies
npx tsx weather-server.ts

# Output:
# [SimpleMCP] Auto-installing dependencies...
# [SimpleMCP] Installing 2 packages with npm...
# [SimpleMCP] Successfully installed 2 packages
# [SimpleMCP] Starting 'weather-server' v1.0.0
```

#### Step 4: Verify Installation

```bash
# Check node_modules was created
ls node_modules/
# axios  zod  ...

# Check lock file was generated
ls package-lock.json
# package-lock.json

# Second run - no installation (already installed)
npx tsx weather-server.ts
# [SimpleMCP] Starting 'weather-server' v1.0.0
```

### Success Checklist

- [ ] Inline dependencies declared
- [ ] Using `SimpleMCP.fromFile()` with `autoInstall: true`
- [ ] Server runs without manual npm install
- [ ] Lock file generated
- [ ] Dependencies in node_modules

---

## Scenario 2: Existing Server with package.json

### Starting Point

You have an existing server with a traditional package.json file.

**Directory structure:**
```
my-server/
├── package.json
├── package-lock.json
├── node_modules/
├── server.ts
└── README.md
```

### Step-by-Step Migration

#### Step 1: Review Existing Dependencies

```bash
# Check current dependencies
cat package.json

# Output:
{
  "name": "my-server",
  "version": "1.0.0",
  "dependencies": {
    "axios": "^1.6.0",
    "lodash": "^4.17.21",
    "zod": "^3.22.0"
  }
}
```

#### Step 2: Add Inline Dependencies

Add dependency declarations to your server file:

```typescript
#!/usr/bin/env npx tsx
// /// dependencies
// axios@^1.6.0
// lodash@^4.17.21
// zod@^3.22.0
// ///

import { SimpleMCP } from './mcp/SimpleMCP.js';
import axios from 'axios';
import _ from 'lodash';
import { z } from 'zod';

// Existing server code
const server = new SimpleMCP({
  name: 'my-server',
  version: '1.0.0',
});

// ... rest of your code
```

#### Step 3: Update Server Creation

Change from direct construction to `fromFile()`:

**Before:**
```typescript
const server = new SimpleMCP({
  name: 'my-server',
  version: '1.0.0',
});
```

**After:**
```typescript
const server = await SimpleMCP.fromFile(__filename, {
  name: 'my-server',
  version: '1.0.0',
  autoInstall: true,
});
```

#### Step 4: Test with Clean Install

```bash
# Remove existing node_modules (testing)
rm -rf node_modules package-lock.json

# Run server - should auto-install
npx tsx server.ts

# Output:
# [SimpleMCP] Auto-installing dependencies...
# [SimpleMCP] Installing 3 packages with npm...
# [SimpleMCP] Successfully installed 3 packages
# [SimpleMCP] Starting 'my-server' v1.0.0
```

#### Step 5: Keep or Remove package.json

**Option A: Keep package.json** (recommended for npm projects)

```json
{
  "name": "my-server",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "axios": "^1.6.0",
    "lodash": "^4.17.21",
    "zod": "^3.22.0"
  }
}
```

- Inline deps are informational
- package.json takes precedence
- Good for npm ecosystem integration

**Option B: Remove package.json** (single-file servers)

```bash
# Remove package.json (optional)
rm package.json

# Server still works with inline deps
npx tsx server.ts
```

- Truly single-file distribution
- Inline deps are source of truth
- Simpler for small scripts

### Success Checklist

- [ ] Inline dependencies match package.json
- [ ] Server uses `fromFile()` with `autoInstall`
- [ ] Clean install works (test with rm -rf node_modules)
- [ ] Decided on package.json strategy
- [ ] Documentation updated

---

## Scenario 3: Server with Inline Dependencies

### Starting Point

You're already using Feature 2 (Inline Dependencies) and want to add auto-installation.

```typescript
#!/usr/bin/env npx tsx
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///

import { SimpleMCP } from './mcp/SimpleMCP.js';
import { z } from 'zod';

const server = new SimpleMCP({
  name: 'my-server',
  version: '1.0.0',
});

// ... tools, prompts, etc.

await server.start();
```

**Current state:** Users must run `npm install` manually before running your server.

### Step-by-Step Migration

#### Step 1: Change to fromFile()

**Before:**
```typescript
const server = new SimpleMCP({
  name: 'my-server',
  version: '1.0.0',
});
```

**After:**
```typescript
const server = await SimpleMCP.fromFile(__filename, {
  name: 'my-server',
  version: '1.0.0',
  autoInstall: true, // ← Add this line
});
```

That's it! Only one line change needed.

#### Step 2: Test Auto-Installation

```bash
# Clean test
rm -rf node_modules
npx tsx server.ts

# Should auto-install and run
```

#### Step 3: Update Documentation

Update your README from:

```markdown
## Installation

1. Install dependencies:
   ```bash
   npm install axios@^1.6.0 zod@^3.22.0
   ```

2. Run the server:
   ```bash
   node server.ts
   ```
```

To:

```markdown
## Installation

Just run the server - dependencies install automatically:

```bash
npx tsx server.ts
```

First run will install dependencies. Subsequent runs are instant.
```

### Success Checklist

- [ ] Changed to `fromFile()` with `autoInstall: true`
- [ ] Tested clean installation
- [ ] Updated README/documentation
- [ ] Removed manual installation steps from docs

---

## Scenario 4: CI/CD Integration

### Starting Point

You want to use auto-installation in continuous integration/deployment pipelines.

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy MCP Server

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      # NEW: No manual npm install needed!
      # Auto-installation handles it

      - name: Run Server Tests
        run: |
          npx tsx server.ts --test

      - name: Deploy Server
        run: |
          # Server auto-installs on first run
          npx tsx server.ts --deploy
```

### Docker Example

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy server file (single file!)
COPY server.ts .
COPY mcp/ ./mcp/

# No COPY package.json needed
# No RUN npm install needed

# Server auto-installs on startup
CMD ["npx", "tsx", "server.ts"]
```

### AWS Lambda Example

```typescript
// lambda/handler.ts
import { SimpleMCP } from './mcp/SimpleMCP.js';

// Auto-install on Lambda cold start
const server = await SimpleMCP.fromFile('./server.ts', {
  autoInstall: {
    packageManager: 'npm',
    production: true, // Production deps only
    timeout: 2 * 60 * 1000, // 2 minutes (Lambda has limits)
  }
});

export const handler = async (event: any) => {
  // Your Lambda handler logic
  return await server.handleRequest(event);
};
```

### Best Practices for CI/CD

1. **Use explicit package manager:**
   ```typescript
   autoInstall: {
     packageManager: 'npm' // Don't rely on auto-detection
   }
   ```

2. **Set reasonable timeouts:**
   ```typescript
   autoInstall: {
     timeout: 10 * 60 * 1000 // 10 minutes max
   }
   ```

3. **Production mode:**
   ```typescript
   autoInstall: {
     production: true // Skip devDependencies
   }
   ```

4. **Cache dependencies:**
   ```yaml
   # GitHub Actions
   - uses: actions/cache@v3
     with:
       path: ~/.npm
       key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
   ```

---

## Scenario 5: Production Deployment

### Starting Point

You want to deploy a server to production with auto-installation.

### Recommended Approach

**Development:** Auto-install enabled
**Production:** Verify dependencies, don't auto-install

```typescript
#!/usr/bin/env npx tsx
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///

import { SimpleMCP } from './mcp/SimpleMCP.js';
import { z } from 'zod';

const isProduction = process.env.NODE_ENV === 'production';

const server = await SimpleMCP.fromFile(__filename, {
  name: 'my-server',
  version: '1.0.0',

  // Auto-install in development only
  autoInstall: !isProduction
});

// In production, verify dependencies are installed
if (isProduction) {
  const status = await server.checkDependencies();

  if (status.missing.length > 0) {
    console.error('Missing dependencies in production:');
    status.missing.forEach(pkg => console.error(`  - ${pkg}`));

    throw new Error(
      'Dependencies not installed. Run npm install before deploying.'
    );
  }

  if (status.outdated.length > 0) {
    console.warn('Outdated dependencies detected:');
    status.outdated.forEach(pkg => {
      console.warn(`  - ${pkg.name}: ${pkg.current} -> ${pkg.required}`);
    });
  }
}

await server.start();
```

### Production Deployment Steps

#### Step 1: Build/Install Locally

```bash
# On your machine or in CI
export NODE_ENV=production

# Install dependencies
npm install --production

# Verify installation
npx tsx server.ts --verify
```

#### Step 2: Package for Deployment

```bash
# Create deployment package
tar -czf server-package.tar.gz \
  server.ts \
  mcp/ \
  node_modules/ \
  package.json \
  package-lock.json
```

#### Step 3: Deploy

```bash
# On production server
tar -xzf server-package.tar.gz
export NODE_ENV=production
node server.ts
```

### Docker Production Build

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app
COPY server.ts .
COPY mcp/ ./mcp/

# Install dependencies (explicit)
RUN npx tsx server.ts --install-only

# Production image
FROM node:18-alpine

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY server.ts .
COPY mcp/ ./mcp/

ENV NODE_ENV=production

# No auto-install in production
CMD ["npx", "tsx", "server.ts"]
```

---

## Common Pitfalls

### Pitfall 1: Forgetting to Use fromFile()

**Wrong:**
```typescript
// This DOESN'T enable auto-install
const server = new SimpleMCP({
  name: 'my-server',
  version: '1.0.0',
  autoInstall: true, // ← Ignored! Wrong constructor
});
```

**Right:**
```typescript
// Use fromFile() instead
const server = await SimpleMCP.fromFile(__filename, {
  name: 'my-server',
  version: '1.0.0',
  autoInstall: true, // ← Works correctly
});
```

### Pitfall 2: Missing __filename in ESM

**Wrong:**
```typescript
// ESM doesn't have __filename
const server = await SimpleMCP.fromFile(__filename, {
  autoInstall: true
});
// Error: __filename is not defined
```

**Right:**
```typescript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);

const server = await SimpleMCP.fromFile(__filename, {
  autoInstall: true
});
```

Or use absolute path:
```typescript
const server = await SimpleMCP.fromFile('./server.ts', {
  autoInstall: true
});
```

### Pitfall 3: Not Handling Installation Errors

**Wrong:**
```typescript
// Ignores installation errors
const server = await SimpleMCP.fromFile(__filename, {
  autoInstall: true
});
```

**Right:**
```typescript
try {
  const server = await SimpleMCP.fromFile(__filename, {
    autoInstall: {
      onError: (error) => {
        console.error(`Failed to install ${error.packageName}:`, error.message);
      }
    }
  });
} catch (error) {
  console.error('Fatal installation error:', error);
  process.exit(1);
}
```

### Pitfall 4: Version Mismatches

**Wrong:**
```typescript
// Inline deps don't match package.json
// /// dependencies
// axios@^1.6.0
// ///

// package.json:
// "axios": "^1.5.0"  ← Different version!
```

**Result:** SimpleMCP uses package.json version and warns about the mismatch.

**Right:**
```typescript
// Keep versions in sync
// /// dependencies
// axios@^1.6.0
// ///

// package.json:
// "axios": "^1.6.0"  ← Same version
```

### Pitfall 5: Auto-Installing in Production

**Wrong:**
```typescript
// Always auto-install, even in production
const server = await SimpleMCP.fromFile(__filename, {
  autoInstall: true // ← Dangerous in production
});
```

**Why wrong:**
- Network requests in production
- Unpredictable startup time
- Installation failures break service

**Right:**
```typescript
const isProduction = process.env.NODE_ENV === 'production';

const server = await SimpleMCP.fromFile(__filename, {
  autoInstall: !isProduction // Only in development
});

if (isProduction) {
  // Verify deps are already installed
  const status = await server.checkDependencies();
  if (status.missing.length > 0) {
    throw new Error('Missing dependencies in production');
  }
}
```

### Pitfall 6: Ignoring Disk Space

**Wrong:**
```typescript
// Ignore disk space warnings
await server.installDependencies(); // May fail silently
```

**Right:**
```typescript
const result = await server.installDependencies();

if (!result.success) {
  console.error('Installation failed:');
  result.errors.forEach(err => {
    if (err.code === 'DISK_FULL') {
      console.error('Insufficient disk space!');
      console.error('Free up space or use a different location');
    }
  });
}
```

### Pitfall 7: Not Checking Installation Results

**Wrong:**
```typescript
await server.installDependencies();
// Assume it worked
await server.start();
```

**Right:**
```typescript
const result = await server.installDependencies();

if (!result.success) {
  console.error(`Installation failed for ${result.failed.length} packages`);

  if (result.installed.length > 0) {
    console.warn(`Partial success: ${result.installed.length} packages installed`);
    // Decide: continue with warnings or abort
  } else {
    throw new Error('No packages installed - aborting');
  }
}

await server.start();
```

### Pitfall 8: Package Manager Not Found

**Wrong:**
```typescript
await server.installDependencies({
  packageManager: 'pnpm' // But pnpm not installed!
});
```

**Right:**
```typescript
import { isPackageManagerAvailable } from './mcp/core/package-manager-detector.js';

const hasPnpm = await isPackageManagerAvailable('pnpm');

await server.installDependencies({
  packageManager: hasPnpm ? 'pnpm' : 'npm'
});
```

---

## Testing After Migration

### Test 1: Clean Install

```bash
# Remove all dependencies
rm -rf node_modules package-lock.json

# Run server
npx tsx server.ts

# Expected output:
# [SimpleMCP] Auto-installing dependencies...
# [SimpleMCP] Installing X packages...
# [SimpleMCP] Successfully installed X packages
# [SimpleMCP] Starting server...
```

### Test 2: Second Run (No Install)

```bash
# Run again
npx tsx server.ts

# Expected output:
# [SimpleMCP] Starting server...
# (no installation - already installed)
```

### Test 3: Partial Install

```bash
# Remove one package manually
rm -rf node_modules/axios

# Run server
npx tsx server.ts

# Expected: Should reinstall only missing package
```

### Test 4: Version Mismatch

```bash
# Install older version
npm install axios@1.0.0

# Run server (inline deps: axios@^1.6.0)
npx tsx server.ts

# Expected: Should detect version mismatch
```

### Test 5: Network Failure

```bash
# Disconnect network
# Run server

# Expected: Error with retry logic
# Helpful error message about network
```

---

## Success Checklist

### For All Scenarios

- [ ] Inline dependencies declared (Feature 2)
- [ ] Using `SimpleMCP.fromFile()` with `autoInstall`
- [ ] Server runs without manual npm install
- [ ] Lock file generated automatically
- [ ] Dependencies verified with `checkDependencies()`
- [ ] Installation errors handled gracefully
- [ ] Documentation updated
- [ ] README no longer mentions manual npm install
- [ ] Tests pass with clean install
- [ ] CI/CD pipeline updated (if applicable)
- [ ] Production deployment strategy decided
- [ ] Team members trained on new workflow

### Production-Specific

- [ ] Auto-install disabled in production
- [ ] Dependencies pre-installed in deployment
- [ ] Dependency verification on startup
- [ ] Error handling for missing deps
- [ ] Lock files committed to version control
- [ ] Deployment documentation updated

---

## Rollback Procedure

If auto-installation causes issues, you can easily rollback:

### Step 1: Revert to Manual Construction

**Change this:**
```typescript
const server = await SimpleMCP.fromFile(__filename, {
  autoInstall: true
});
```

**Back to this:**
```typescript
const server = new SimpleMCP({
  name: 'my-server',
  version: '1.0.0',
});
```

### Step 2: Restore Manual Installation

Add back to README:

```markdown
## Installation

Install dependencies:
```bash
npm install
```

Run the server:
```bash
node server.ts
```
```

### Step 3: Keep Inline Dependencies (Optional)

You can keep inline dependencies for documentation even without auto-install:

```typescript
// /// dependencies
// axios@^1.6.0
// ///

// Still useful as documentation
// Users know what to install manually
```

---

## Getting Help

### If Installation Fails

1. Check package manager is installed: `npm --version`
2. Check internet connection: `ping registry.npmjs.org`
3. Check disk space: `df -h`
4. Review error messages carefully
5. Try manual installation: `npm install`

### If Imports Fail

1. Verify packages are in node_modules: `ls node_modules/`
2. Check package.json has correct versions
3. Try deleting and reinstalling: `rm -rf node_modules && npx tsx server.ts`

### Resources

- [Auto-Installation Documentation](../features/auto-installation.md)
- [Example Servers](/mcp/examples/)
- [SimpleMCP Guide](../../SIMPLE_MCP_GUIDE.md)
- [GitHub Issues](https://github.com/your-repo/issues)

---

## Summary

Auto-installation migration is straightforward:

1. **Add inline dependencies** (Feature 2)
2. **Change to fromFile()** with autoInstall
3. **Test clean installation**
4. **Update documentation**
5. **Deploy with confidence**

The result: servers that "just work" for end users with zero manual setup.

**Key Takeaways:**
- Use autoInstall in development, verify in production
- Handle installation errors explicitly
- Test with clean installs regularly
- Keep inline deps and package.json in sync
- Document the new zero-config experience

Happy migrating!
