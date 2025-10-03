# Inline Dependencies Migration Guide

## Overview

This guide helps you migrate your existing SimplyMCP servers to use **Inline Dependencies** (Phase 2, Feature 2). Whether you have a server using package.json or starting from scratch, this guide provides step-by-step instructions.

## Table of Contents

- [Why Migrate to Inline Dependencies?](#why-migrate-to-inline-dependencies)
- [Before You Start](#before-you-start)
- [Migration Scenarios](#migration-scenarios)
  - [Scenario 1: New Server (No Dependencies)](#scenario-1-new-server-no-dependencies)
  - [Scenario 2: Existing Server with package.json](#scenario-2-existing-server-with-packagejson)
  - [Scenario 3: Complex Multi-File Project](#scenario-3-complex-multi-file-project)
  - [Scenario 4: Converting External Dependencies](#scenario-4-converting-external-dependencies)
- [Step-by-Step Migration](#step-by-step-migration)
- [Handling Conflicts](#handling-conflicts)
- [Testing After Migration](#testing-after-migration)
- [Rollback Procedure](#rollback-procedure)
- [Common Pitfalls](#common-pitfalls)
- [Success Checklist](#success-checklist)

## Why Migrate to Inline Dependencies?

### Benefits

**Self-Documenting Code**
- Dependencies visible in the server file itself
- No need to check separate package.json
- Clear documentation of requirements

**Single-File Distribution**
- Share one file instead of multiple files
- Easier to distribute and maintain
- Perfect for CLI tools and scripts

**Version Control**
- Dependencies tracked alongside code
- Clear history of dependency changes
- Easy to review in pull requests

**Simplified Setup**
- Recipients see requirements immediately
- Foundation for auto-installation (Feature 3)
- No separate dependency file needed

### When NOT to Migrate

Consider keeping package.json if you:
- Publish to npm registry (requires package.json)
- Use complex npm scripts or configurations
- Work in a large team with established workflows
- Need workspace/monorepo features
- Use non-standard package sources (git URLs, file paths)

**Note:** You can use both! Inline deps + package.json work together.

## Before You Start

### Prerequisites

1. **SimplyMCP v1.2.0+**
   ```bash
   # Check your version
   npm list @modelcontextprotocol/sdk
   ```

2. **Backup Your Code**
   ```bash
   git add .
   git commit -m "Backup before inline deps migration"
   ```

3. **Understand Your Dependencies**
   ```bash
   # List current dependencies
   cat package.json | jq '.dependencies'
   ```

4. **Read the Documentation**
   - [Inline Dependencies Feature Doc](../features/inline-dependencies.md)
   - [API Reference](../features/inline-dependencies.md#api-reference)

## Migration Scenarios

### Scenario 1: New Server (No Dependencies)

**Starting Point:** Creating a new SimplyMCP server from scratch.

#### Before

```typescript
// my-server.ts
import { SimplyMCP } from './mcp/SimplyMCP.js';
import { z } from 'zod';

const server = new SimplyMCP({
  name: 'my-server',
  version: '1.0.0',
});

server.addTool({
  name: 'greet',
  description: 'Greet user',
  parameters: z.object({ name: z.string() }),
  execute: async (args) => `Hello, ${args.name}!`,
});

await server.start();
```

#### After

```typescript
#!/usr/bin/env npx tsx
// /// dependencies
// zod@^3.22.0
// ///

import { SimplyMCP } from './mcp/SimplyMCP.js';
import { z } from 'zod';

const server = new SimplyMCP({
  name: 'my-server',
  version: '1.0.0',
});

server.addTool({
  name: 'greet',
  description: 'Greet user',
  parameters: z.object({ name: z.string() }),
  execute: async (args) => `Hello, ${args.name}!`,
});

await server.start();
```

#### Changes

1. Added shebang: `#!/usr/bin/env npx tsx`
2. Added inline dependencies block declaring `zod@^3.22.0`

#### Next Steps

```bash
# Make executable
chmod +x my-server.ts

# Install dependencies (if needed)
npm install zod@^3.22.0

# Run server
./my-server.ts
```

### Scenario 2: Existing Server with package.json

**Starting Point:** Server with existing package.json dependencies.

#### Before

**my-server.ts:**
```typescript
import { SimplyMCP } from './mcp/SimplyMCP.js';
import axios from 'axios';
import { z } from 'zod';
import { format } from 'date-fns';

const server = new SimplyMCP({
  name: 'api-server',
  version: '1.0.0',
});

server.addTool({
  name: 'fetch_data',
  description: 'Fetch and format data',
  parameters: z.object({ url: z.string().url() }),
  execute: async (args) => {
    const response = await axios.get(args.url);
    const timestamp = format(new Date(), 'PPpp');
    return `Data fetched at ${timestamp}:\n${JSON.stringify(response.data)}`;
  },
});

await server.start();
```

**package.json:**
```json
{
  "name": "api-server",
  "version": "1.0.0",
  "dependencies": {
    "axios": "^1.6.0",
    "zod": "^3.22.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

#### After

**my-server.ts:**
```typescript
#!/usr/bin/env npx tsx
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// date-fns@^2.30.0
// ///

import { SimplyMCP } from './mcp/SimplyMCP.js';
import axios from 'axios';
import { z } from 'zod';
import { format } from 'date-fns';

const server = new SimplyMCP({
  name: 'api-server',
  version: '1.0.0',
});

server.addTool({
  name: 'fetch_data',
  description: 'Fetch and format data',
  parameters: z.object({ url: z.string().url() }),
  execute: async (args) => {
    const response = await axios.get(args.url);
    const timestamp = format(new Date(), 'PPpp');
    return `Data fetched at ${timestamp}:\n${JSON.stringify(response.data)}`;
  },
});

await server.start();
```

**package.json (optional - can keep or remove):**
```json
{
  "name": "api-server",
  "version": "1.0.0",
  "dependencies": {
    "axios": "^1.6.0",
    "zod": "^3.22.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

#### Migration Steps

1. **Copy dependencies from package.json to inline format:**
   ```typescript
   // From package.json "dependencies" section
   {
     "axios": "^1.6.0",
     "zod": "^3.22.0"
   }

   // To inline format
   // /// dependencies
   // axios@^1.6.0
   // zod@^3.22.0
   // ///
   ```

2. **Add comments for clarity:**
   ```typescript
   // /// dependencies
   // # HTTP and API
   // axios@^1.6.0      # HTTP client
   //
   // # Validation
   // zod@^3.22.0       # Schema validation
   //
   // # Utilities
   // date-fns@^2.30.0  # Date formatting
   // ///
   ```

3. **Decide on package.json:**
   - **Option A:** Keep both (recommended for existing projects)
   - **Option B:** Remove package.json (for single-file distribution)
   - **Option C:** Keep package.json, use inline for documentation

#### Decision Matrix

| Keep package.json | Use Case |
|-------------------|----------|
| ✅ Yes | Publishing to npm, complex scripts, team workflow |
| ✅ Yes | Monorepo, workspace dependencies |
| ❌ No | Single-file CLI tool, simple scripts |
| ❌ No | Maximum portability, self-contained distribution |

### Scenario 3: Complex Multi-File Project

**Starting Point:** Large project with many dependencies and dev dependencies.

#### Before

**package.json:**
```json
{
  "name": "complex-server",
  "version": "2.0.0",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "axios": "^1.6.0",
    "zod": "^3.22.0",
    "pg": "^8.11.0",
    "drizzle-orm": "^0.29.0",
    "lodash": "^4.17.21",
    "date-fns": "^2.30.0",
    "express": "^4.18.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "vitest": "^1.0.0",
    "tsx": "^4.7.0"
  }
}
```

#### After

**my-server.ts:**
```typescript
#!/usr/bin/env npx tsx
// /// dependencies
// # Core framework
// @modelcontextprotocol/sdk@^1.0.0
//
// # HTTP and API
// axios@^1.6.0
// express@^4.18.0
//
// # Validation
// zod@^3.22.0
//
// # Database
// pg@^8.11.0
// drizzle-orm@^0.29.0
//
// # Utilities
// lodash@^4.17.21
// date-fns@^2.30.0
// ///

import { SimplyMCP } from './mcp/SimplyMCP.js';
// ... rest of imports
```

**package.json (keep for devDependencies and scripts):**
```json
{
  "name": "complex-server",
  "version": "2.0.0",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "axios": "^1.6.0",
    "zod": "^3.22.0",
    "pg": "^8.11.0",
    "drizzle-orm": "^0.29.0",
    "lodash": "^4.17.21",
    "date-fns": "^2.30.0",
    "express": "^4.18.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "vitest": "^1.0.0",
    "tsx": "^4.7.0"
  },
  "scripts": {
    "dev": "tsx watch my-server.ts",
    "build": "tsc",
    "test": "vitest"
  }
}
```

#### Strategy

**Best Practice for Complex Projects:**

1. Add inline dependencies to document runtime requirements
2. Keep package.json for:
   - devDependencies (TypeScript, testing tools)
   - npm scripts
   - Project metadata
   - Publishing configuration

3. Use inline deps as "source of truth" documentation
4. Keep both in sync (manual or automated)

#### Automated Sync Script

**scripts/sync-deps.ts:**
```typescript
import { readFile, writeFile } from 'fs/promises';
import { parseInlineDependencies } from '../mcp/core/index.js';
import { generatePackageJson } from '../mcp/core/dependency-utils.js';

async function syncDependencies() {
  // Parse inline dependencies from server
  const source = await readFile('./my-server.ts', 'utf-8');
  const result = parseInlineDependencies(source);

  // Read existing package.json
  const pkgJson = JSON.parse(await readFile('./package.json', 'utf-8'));

  // Update dependencies (keep devDependencies, scripts, etc.)
  pkgJson.dependencies = result.dependencies;

  // Write back
  await writeFile('./package.json', JSON.stringify(pkgJson, null, 2));

  console.log('✅ Dependencies synced from inline to package.json');
}

syncDependencies();
```

### Scenario 4: Converting External Dependencies

**Starting Point:** Dependencies listed in various places.

#### Consolidation Strategy

1. **List all dependencies:**
   ```bash
   # From package.json
   cat package.json | jq '.dependencies'

   # From imports
   grep -r "^import.*from" *.ts | sed "s/.*from '\(.*\)'.*/\1/" | sort -u

   # From node_modules (what's actually installed)
   ls node_modules
   ```

2. **Categorize:**
   - Runtime dependencies (need inline)
   - Dev dependencies (keep in package.json)
   - Type definitions (keep in package.json)
   - Internal modules (not dependencies)

3. **Create inline block:**
   ```typescript
   // /// dependencies
   // # Runtime dependencies only
   // axios@^1.6.0
   // zod@^3.22.0
   // ///
   ```

4. **Update package.json:**
   - Keep devDependencies as-is
   - Sync dependencies with inline (or remove if going single-file)

## Step-by-Step Migration

### Step 1: Analyze Current Dependencies

```bash
# List runtime dependencies
npm list --depth=0 --prod

# List dev dependencies
npm list --depth=0 --dev

# Check for peer dependencies
npm list --depth=0 --peer
```

### Step 2: Create Inline Dependencies Block

```typescript
// Add to top of your server file (after shebang, before imports)
// /// dependencies
// package-name@version
// ///
```

### Step 3: Copy Dependencies

**From package.json to inline format:**

```bash
# Use this helper script
cat package.json | jq -r '.dependencies | to_entries[] | "// \(.key)@\(.value)"'
```

**Output:**
```typescript
// axios@^1.6.0
// zod@^3.22.0
// lodash@^4.17.21
```

**Wrap with delimiters:**
```typescript
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// lodash@^4.17.21
// ///
```

### Step 4: Add Comments (Optional but Recommended)

```typescript
// /// dependencies
// # HTTP libraries
// axios@^1.6.0         # HTTP client for API calls
//
// # Validation
// zod@^3.22.0          # Schema validation
//
// # Utilities
// lodash@^4.17.21      # General utilities
// ///
```

### Step 5: Validate Inline Dependencies

```typescript
// validate-deps.ts
import { readFile } from 'fs/promises';
import { parseInlineDependencies } from './mcp/core/index.js';
import { validateDependencies } from './mcp/core/dependency-validator.js';

const source = await readFile('./my-server.ts', 'utf-8');
const result = parseInlineDependencies(source);

if (result.errors.length > 0) {
  console.error('❌ Validation errors:');
  result.errors.forEach(err => {
    console.error(`  Line ${err.line}: ${err.message}`);
  });
  process.exit(1);
}

const validation = validateDependencies(result.dependencies);
if (!validation.valid) {
  console.error('❌ Validation failed:');
  validation.errors.forEach(err => {
    console.error(`  ${err.message}`);
  });
  process.exit(1);
}

console.log('✅ All dependencies valid!');
console.log('Dependencies:', result.dependencies);
```

Run validation:
```bash
npx tsx validate-deps.ts
```

### Step 6: Test Server

```bash
# Install dependencies (if needed)
npm install

# Run server
npx tsx my-server.ts

# Or if executable
./my-server.ts
```

### Step 7: Update package.json (If Keeping Both)

**Option A: Manual sync**
```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "zod": "^3.22.0"
  }
}
```

**Option B: Generate from inline**
```typescript
import { generatePackageJson } from './mcp/core/dependency-utils.js';

const source = await readFile('./my-server.ts', 'utf-8');
const result = parseInlineDependencies(source);

const pkg = generatePackageJson(result.dependencies, {
  name: 'my-server',
  version: '1.0.0',
  devDeps: ['typescript', '@types/node'],
});

await writeFile('./package.json', JSON.stringify(pkg, null, 2));
```

### Step 8: Commit Changes

```bash
git add my-server.ts package.json
git commit -m "Migrate to inline dependencies"
```

## Handling Conflicts

### Conflict: Different Versions

**Problem:**
```typescript
// Inline deps
// axios@^1.6.0

// package.json
"axios": "^1.5.0"
```

**Resolution:**

1. **Decide which version to use:**
   - Newer version (^1.6.0) - if compatible
   - package.json version - if already working
   - Specific version - if pinning needed

2. **Update both to match:**
   ```typescript
   // Inline deps
   // axios@^1.6.0

   // package.json
   "axios": "^1.6.0"
   ```

3. **Test thoroughly:**
   ```bash
   npm install
   npm test
   npx tsx my-server.ts
   ```

### Conflict: Missing Dependencies

**Problem:** Import not declared in inline deps

```typescript
// /// dependencies
// zod@^3.22.0
// ///

import axios from 'axios';  // Not declared!
```

**Resolution:**

1. Add missing dependency:
   ```typescript
   // /// dependencies
   // axios@^1.6.0  # Added
   // zod@^3.22.0
   // ///
   ```

2. Or remove unused import:
   ```typescript
   // /// dependencies
   // zod@^3.22.0
   // ///

   // import axios from 'axios';  // Removed
   ```

### Conflict: Extra Dependencies

**Problem:** Declared but not used

```typescript
// /// dependencies
// axios@^1.6.0
// lodash@^4.17.21  # Not actually imported
// ///

import axios from 'axios';
```

**Resolution:**

Remove unused dependencies:
```typescript
// /// dependencies
// axios@^1.6.0
// ///
```

### Detecting Conflicts Automatically

**scripts/check-conflicts.ts:**
```typescript
import { readFile } from 'fs/promises';
import { parseInlineDependencies } from './mcp/core/index.js';
import { mergeDependencies } from './mcp/core/dependency-utils.js';

// Parse inline deps
const source = await readFile('./my-server.ts', 'utf-8');
const inline = parseInlineDependencies(source);

// Load package.json
const pkg = JSON.parse(await readFile('./package.json', 'utf-8'));

// Merge and check conflicts
const result = mergeDependencies(inline.dependencies, pkg);

if (result.conflicts.length > 0) {
  console.error('⚠️  Version conflicts detected:');
  result.warnings.forEach(warn => console.error(`  ${warn}`));
  console.error('\nRecommendation: Sync versions between inline deps and package.json');
  process.exit(1);
}

console.log('✅ No conflicts detected');
```

## Testing After Migration

### Test Checklist

- [ ] **Syntax validation:** Code parses without errors
- [ ] **Dependency validation:** All deps are valid npm packages
- [ ] **Version validation:** All version specifiers are valid semver
- [ ] **Import/declaration match:** All imports have corresponding declarations
- [ ] **No duplicates:** Each package declared only once
- [ ] **Server starts:** Server runs without errors
- [ ] **Tools work:** All tools execute successfully
- [ ] **No missing deps:** No runtime "module not found" errors

### Automated Testing Script

**scripts/test-migration.ts:**
```typescript
import { readFile } from 'fs/promises';
import { parseInlineDependencies } from './mcp/core/index.js';
import { validateDependencies } from './mcp/core/dependency-validator.js';
import { SimplyMCP } from './mcp/SimplyMCP.js';

async function testMigration() {
  console.log('🧪 Testing inline dependencies migration...\n');

  // Test 1: Parse inline deps
  console.log('1. Parsing inline dependencies...');
  const source = await readFile('./my-server.ts', 'utf-8');
  const parseResult = parseInlineDependencies(source);

  if (parseResult.errors.length > 0) {
    console.error('❌ Parse errors found:');
    parseResult.errors.forEach(err => console.error(`  ${err.message}`));
    return false;
  }
  console.log('✅ Parsing successful\n');

  // Test 2: Validate dependencies
  console.log('2. Validating dependencies...');
  const validation = validateDependencies(parseResult.dependencies);

  if (!validation.valid) {
    console.error('❌ Validation failed:');
    validation.errors.forEach(err => console.error(`  ${err.message}`));
    return false;
  }
  console.log('✅ Validation passed\n');

  // Test 3: Check imports match declarations
  console.log('3. Checking imports match declarations...');
  const imports = extractImports(source);
  const declared = Object.keys(parseResult.dependencies);

  const missingDeclarations = imports.filter(imp =>
    !declared.includes(imp) && !imp.startsWith('.')
  );

  if (missingDeclarations.length > 0) {
    console.warn('⚠️  Imported but not declared:');
    missingDeclarations.forEach(pkg => console.warn(`  ${pkg}`));
  } else {
    console.log('✅ All imports declared\n');
  }

  // Test 4: Load server
  console.log('4. Loading server with SimplyMCP.fromFile()...');
  try {
    const server = await SimplyMCP.fromFile('./my-server.ts');
    const deps = server.getDependencies();
    console.log(`✅ Server loaded with ${deps?.dependencies.length || 0} dependencies\n`);
  } catch (error) {
    console.error('❌ Server load failed:', error.message);
    return false;
  }

  console.log('🎉 Migration test complete! All checks passed.');
  return true;
}

function extractImports(source: string): string[] {
  const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
  const imports = [];
  let match;

  while ((match = importRegex.exec(source)) !== null) {
    const pkg = match[1];
    // Extract package name (handle scoped packages)
    const pkgName = pkg.startsWith('@')
      ? pkg.split('/').slice(0, 2).join('/')
      : pkg.split('/')[0];
    imports.push(pkgName);
  }

  return [...new Set(imports)];
}

testMigration();
```

Run tests:
```bash
npx tsx scripts/test-migration.ts
```

## Rollback Procedure

If migration causes issues, rollback quickly:

### Quick Rollback

```bash
# Revert to previous commit
git checkout HEAD -- my-server.ts package.json

# Or reset to specific commit
git reset --hard <commit-hash>

# Reinstall dependencies
npm install
```

### Manual Rollback

1. **Remove inline dependencies block:**
   ```typescript
   // Delete these lines
   // /// dependencies
   // axios@^1.6.0
   // ///
   ```

2. **Restore package.json:**
   ```bash
   cp package.json.backup package.json
   npm install
   ```

3. **Test server:**
   ```bash
   npx tsx my-server.ts
   ```

### Partial Rollback (Keep Both)

Keep inline deps for documentation, use package.json for installation:

```typescript
// Keep inline deps (documentation only)
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///

// Keep package.json (actual installation source)
```

This way:
- Inline deps document requirements
- package.json remains source of truth
- No breaking changes

## Common Pitfalls

### Pitfall 1: Uppercase Package Names

❌ **Wrong:**
```typescript
// /// dependencies
// Axios@^1.6.0
// ///
```

✅ **Correct:**
```typescript
// /// dependencies
// axios@^1.6.0
// ///
```

**Why:** npm package names must be lowercase.

### Pitfall 2: Missing End Delimiter

❌ **Wrong:**
```typescript
// /// dependencies
// axios@^1.6.0

import { SimplyMCP } from './mcp/SimplyMCP.js';
```

✅ **Correct:**
```typescript
// /// dependencies
// axios@^1.6.0
// ///

import { SimplyMCP } from './mcp/SimplyMCP.js';
```

**Why:** End delimiter `// ///` is required.

### Pitfall 3: Missing // Prefix

❌ **Wrong:**
```typescript
// /// dependencies
axios@^1.6.0
// ///
```

✅ **Correct:**
```typescript
// /// dependencies
// axios@^1.6.0
// ///
```

**Why:** All lines between delimiters must start with `//`.

### Pitfall 4: Forgetting Scoped Package Syntax

❌ **Wrong:**
```typescript
// /// dependencies
// types/node@^20.0.0
// ///
```

✅ **Correct:**
```typescript
// /// dependencies
// @types/node@^20.0.0
// ///
```

**Why:** Scoped packages need `@` prefix.

### Pitfall 5: Invalid Semver

❌ **Wrong:**
```typescript
// /// dependencies
// axios@1.6  # Missing patch version
// ///
```

✅ **Correct:**
```typescript
// /// dependencies
// axios@^1.6.0
// ///
```

**Why:** Use complete semver or valid ranges.

### Pitfall 6: Declaring devDependencies Inline

⚠️ **Caution:**
```typescript
// /// dependencies
// typescript@^5.0.0  # This is a dev dependency!
// ///
```

**Better Approach:**
- Keep devDependencies in package.json only
- Use inline deps for runtime dependencies
- Or add comment to clarify:

```typescript
// /// dependencies
// axios@^1.6.0       # Runtime
// typescript@^5.0.0  # Dev (mark as devDep when generating package.json)
// ///
```

### Pitfall 7: Not Syncing with package.json

**Problem:** Inline deps and package.json diverge over time.

**Solution:** Automate sync or choose one source of truth:

```typescript
// Option 1: Use inline as source, generate package.json
npm run sync-deps  // Your custom script

// Option 2: Use package.json as source, update inline manually
// (Less ideal for self-contained servers)
```

### Pitfall 8: Including Private Modules

❌ **Wrong:**
```typescript
// /// dependencies
// ./utils/helper  # Local module
// ///
```

✅ **Correct:**
```typescript
// Don't declare local modules in inline deps
// Only declare npm packages
```

## Success Checklist

After migration, verify:

### Code Quality

- [ ] Inline dependencies block has correct delimiters
- [ ] All lines start with `//`
- [ ] Package names are lowercase
- [ ] Version specifiers are valid semver
- [ ] No duplicate packages
- [ ] Comments use `#` syntax
- [ ] Shebang added for executable scripts

### Functionality

- [ ] Server file is executable (`chmod +x`)
- [ ] All imports have corresponding inline declarations
- [ ] No "module not found" errors at runtime
- [ ] Server starts without errors
- [ ] All tools execute correctly
- [ ] Tests pass (if applicable)

### Documentation

- [ ] Comments explain why packages are needed
- [ ] Related packages are grouped together
- [ ] Version ranges are documented (if non-standard)
- [ ] README updated (if applicable)

### Integration

- [ ] package.json and inline deps are in sync (if keeping both)
- [ ] No version conflicts reported
- [ ] CI/CD scripts updated (if applicable)
- [ ] Team members notified of changes

### Distribution

- [ ] Single file can be shared independently
- [ ] Recipients can see requirements immediately
- [ ] Installation instructions clear
- [ ] Auto-installation ready (for Feature 3)

## Next Steps

After successful migration:

1. **Document your server:**
   - Add comments explaining dependencies
   - Update README with inline deps info

2. **Share your server:**
   - Distribute single file
   - Recipients see requirements immediately

3. **Prepare for auto-installation (Feature 3):**
   - Your server is ready for automatic dependency installation
   - No additional changes needed

4. **Consider bundling (Feature 4):**
   - Create standalone distributions
   - Bundle dependencies into single executable

## Getting Help

If you encounter issues during migration:

1. **Check validation errors:**
   ```bash
   npx tsx scripts/validate-deps.ts
   ```

2. **Review documentation:**
   - [Inline Dependencies Feature Doc](../features/inline-dependencies.md)
   - [Troubleshooting Section](../features/inline-dependencies.md#troubleshooting)

3. **Test with SimplyMCP.fromFile():**
   ```typescript
   const server = await SimplyMCP.fromFile('./my-server.ts');
   console.log('Dependencies:', server.getDependencies());
   ```

4. **Open an issue:**
   - Include your inline dependencies block
   - Include error messages
   - Include Node.js and SimplyMCP versions

## Appendix: Migration Tools

### Auto-Migration Script

**scripts/auto-migrate.ts:**
```typescript
import { readFile, writeFile } from 'fs/promises';

async function autoMigrate(serverPath: string) {
  const source = await readFile(serverPath, 'utf-8');

  // Skip if already has inline deps
  if (source.includes('/// dependencies')) {
    console.log('✅ Server already has inline dependencies');
    return;
  }

  // Load package.json
  const pkg = JSON.parse(await readFile('./package.json', 'utf-8'));
  const deps = pkg.dependencies || {};

  // Generate inline deps block
  const depsLines = Object.entries(deps).map(
    ([name, version]) => `// ${name}@${version}`
  );

  const inlineBlock = [
    '// /// dependencies',
    ...depsLines,
    '// ///',
    '',
  ].join('\n');

  // Find insertion point (after shebang, before imports)
  const lines = source.split('\n');
  let insertIndex = 0;

  // Skip shebang
  if (lines[0].startsWith('#!')) {
    insertIndex = 1;
  }

  // Insert inline deps
  lines.splice(insertIndex, 0, inlineBlock);

  // Write back
  const newSource = lines.join('\n');
  await writeFile(serverPath, newSource);

  console.log('✅ Inline dependencies added!');
  console.log(`Added ${Object.keys(deps).length} dependencies`);
}

// Usage
autoMigrate('./my-server.ts');
```

Run:
```bash
npx tsx scripts/auto-migrate.ts
```

---

**Last Updated:** October 2, 2025
**Version:** 1.0.0
**Related:** [Inline Dependencies Feature Doc](../features/inline-dependencies.md)
