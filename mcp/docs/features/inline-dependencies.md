# Inline Dependencies

## Overview

SimplyMCP's **Inline Dependencies** feature allows you to declare npm package dependencies directly in your server file using PEP 723-style comment-based metadata. This makes your MCP servers truly self-contained and easy to share.

### What It Does

- Declare npm dependencies directly in your TypeScript/JavaScript files
- Use a clean, comment-based syntax inspired by Python's PEP 723
- Access declared dependencies programmatically via SimplyMCP API
- Generate package.json from inline declarations
- Validate package names and semver ranges automatically
- Enable future auto-installation (Feature 3)

### Why It's Useful

- **Self-Documenting**: Dependencies are visible right in your server code
- **Single-File Distribution**: Share one file instead of multiple files
- **Version Control**: Dependency versions tracked alongside code
- **Easy Sharing**: Recipients can see exactly what's needed
- **Auto-Installation Ready**: Foundation for automatic dependency installation
- **No Config Files**: No need for separate package.json (optional)

### When to Use It

Use inline dependencies when you want to:
- Create portable, single-file MCP servers
- Document required packages in your code
- Share servers without external config files
- Enable automatic dependency detection
- Build CLI tools or scripts with clear dependencies

## Status

- **Phase**: 2, Feature 2
- **Status**: ✅ Implemented
- **Tested**: ✅ 139+ tests passing (100% pass rate)
  - 36 parser tests
  - 78 validator tests
  - 25+ integration tests
- **Available in**: SimplyMCP v1.2.0+

## Quick Start

### Simplest Example (3 lines)

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

// Your tools here...

await server.start();
```

That's it! Your server now declares its dependencies inline.

## Core Concepts

### PEP 723 Inspiration

This feature is inspired by Python's [PEP 723](https://peps.python.org/pep-0723/), which allows embedding dependency metadata in single-file Python scripts. We've adapted this concept for TypeScript/JavaScript:

**Python (PEP 723):**
```python
# /// script
# dependencies = [
#     "requests<3",
#     "rich>=13.0.0",
# ]
# ///
```

**TypeScript (SimplyMCP):**
```typescript
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///
```

### Format Specification

#### Delimiters

- **Start**: `// /// dependencies` (exactly)
- **End**: `// ///` (exactly)
- All lines between delimiters must start with `//`

#### Dependency Line Syntax

```
// package-name@version-specifier  # optional comment
```

**Valid package names:**
- Lowercase alphanumeric with hyphens, underscores, dots
- Scoped packages: `@scope/package`
- Examples: `axios`, `date-fns`, `@types/node`

**Valid version specifiers:**
- Semver ranges: `^1.6.0`, `~1.2.3`, `>=1.0.0`, `<2.0.0`
- Wildcards: `*`, `x`, `1.x`
- Keywords: `latest`, `next`
- No version = `latest` (implicit)

#### Comments

```typescript
// /// dependencies
// # This is a comment line
// axios@^1.6.0  # HTTP client
//
// # Database libraries
// pg@^8.11.0    # PostgreSQL
// ///
```

### Grammar Reference

Complete EBNF grammar:

```ebnf
InlineMetadata   ::= StartDelimiter DependencyLine* EndDelimiter
StartDelimiter   ::= "//" Whitespace* "///" Whitespace* "dependencies" Whitespace* EOL
EndDelimiter     ::= "//" Whitespace* "///" Whitespace* EOL

DependencyLine   ::= CommentPrefix Whitespace* (Dependency | Comment | Empty) Whitespace* EOL
CommentPrefix    ::= "//"
Dependency       ::= PackageName VersionSpec? Whitespace* Comment?
Comment          ::= "#" [^\n]*
Empty            ::= ""

PackageName      ::= ScopedName | SimpleName
SimpleName       ::= [a-z0-9] [a-z0-9._-]*
ScopedName       ::= "@" SimpleName "/" SimpleName
VersionSpec      ::= "@" SemverRange

SemverRange      ::= Operator? Version | Keyword
Operator         ::= "^" | "~" | ">=" | "<=" | ">" | "<" | "="
Version          ::= Major ("." Minor ("." Patch ("-" Prerelease)? ("+" Build)?)?)?
Major            ::= [0-9]+
Minor            ::= [0-9]+
Patch            ::= [0-9]+
Prerelease       ::= [a-z0-9.-]+
Build            ::= [a-z0-9.-]+
Keyword          ::= "latest" | "next" | "*" | "x"

Whitespace       ::= " " | "\t"
EOL              ::= "\n" | "\r\n"
```

### Security Features

SimplyMCP validates all inline dependencies to prevent security issues:

1. **Package Name Validation**
   - Only npm-compliant names allowed
   - Must be lowercase
   - Maximum 214 characters (npm limit)
   - No dangerous characters (`;`, `|`, `&`, backticks, etc.)

2. **Version Validation**
   - Only valid semver ranges allowed
   - No shell metacharacters
   - No code injection attempts
   - Maximum 100 characters

3. **DoS Prevention**
   - Maximum 1,000 dependencies per file
   - Maximum 1,000 characters per line
   - No recursive parsing
   - Fast regex-based parsing

4. **Injection Prevention**
   - Rejects backticks, semicolons, pipes
   - Blocks command injection attempts
   - No `eval()` or code execution
   - Pure string parsing only

## API Reference

### Parser API

#### `parseInlineDependencies(sourceCode, options?)`

Parse inline dependencies from source code.

**Parameters:**
- `sourceCode: string` - TypeScript/JavaScript source code
- `options?: ParseOptions` - Parsing options

**Returns:** `ParseResult`

**Options:**
```typescript
interface ParseOptions {
  strict?: boolean;          // Throw on errors (default: false)
  validateSemver?: boolean;  // Validate versions (default: true)
  allowComments?: boolean;   // Allow # comments (default: true)
}
```

**Result:**
```typescript
interface ParseResult {
  dependencies: InlineDependencies;  // { "pkg": "^1.0.0" }
  errors: DependencyError[];         // Validation errors
  warnings: string[];                // Non-fatal warnings
  raw: string;                       // Raw metadata block
}
```

**Example:**
```typescript
import { parseInlineDependencies } from './mcp/core/index.js';

const source = await readFile('./my-server.ts', 'utf-8');
const result = parseInlineDependencies(source);

if (result.errors.length > 0) {
  console.error('Errors:', result.errors);
} else {
  console.log('Dependencies:', result.dependencies);
  // { "axios": "^1.6.0", "zod": "^3.22.0" }
}
```

#### `extractDependencyBlock(sourceCode)`

Extract the raw dependency block from source.

**Parameters:**
- `sourceCode: string` - Source code to search

**Returns:** `{ content, raw, startLine, endLine } | null`

**Example:**
```typescript
import { extractDependencyBlock } from './mcp/core/dependency-parser.js';

const block = extractDependencyBlock(source);
if (block) {
  console.log('Found at lines', block.startLine, '-', block.endLine);
  console.log('Content:', block.content);
}
```

### Validator API

#### `validateDependencies(deps)`

Validate dependency specifications.

**Parameters:**
- `deps: InlineDependencies` - Dependencies to validate

**Returns:** `ValidationResult`

```typescript
interface ValidationResult {
  valid: boolean;
  errors: DependencyError[];
  warnings: string[];
}
```

**Example:**
```typescript
import { validateDependencies } from './mcp/core/dependency-validator.js';

const deps = {
  'axios': '^1.6.0',
  'INVALID': '1.0.0',  // Error: must be lowercase
};

const result = validateDependencies(deps);
console.log('Valid:', result.valid);  // false
console.log('Errors:', result.errors);
```

#### `validatePackageName(name)`

Validate a single package name.

**Returns:** `{ valid: boolean, error?: string, reason?: string }`

**Example:**
```typescript
import { validatePackageName } from './mcp/core/dependency-validator.js';

validatePackageName('axios');           // { valid: true }
validatePackageName('@types/node');     // { valid: true }
validatePackageName('UPPERCASE');       // { valid: false, reason: 'not_lowercase' }
validatePackageName('.hidden');         // { valid: false, reason: 'invalid_start' }
```

#### `validateSemverRange(version)`

Validate a version specifier.

**Returns:** `{ valid: boolean, error?: string, reason?: string }`

**Example:**
```typescript
import { validateSemverRange } from './mcp/core/dependency-validator.js';

validateSemverRange('^1.0.0');      // { valid: true }
validateSemverRange('latest');      // { valid: true }
validateSemverRange('not-a-ver');   // { valid: false }
```

#### `detectConflicts(deps)`

Detect duplicate or conflicting dependencies.

**Returns:** `ConflictReport`

**Example:**
```typescript
import { detectConflicts } from './mcp/core/dependency-validator.js';

const deps = {
  'axios': '^1.6.0',
  'AXIOS': '^1.5.0',  // Case-insensitive duplicate
};

const report = detectConflicts(deps);
console.log('Has conflicts:', report.hasConflicts);  // true
console.log('Conflicts:', report.conflicts);
```

### Utility API

#### `generatePackageJson(deps, options?)`

Generate package.json structure from inline dependencies.

**Parameters:**
- `deps: InlineDependencies` - Dependencies to export
- `options?: { name?, version?, devDeps?, peerDeps? }` - Package options

**Returns:** `PackageJson`

**Example:**
```typescript
import { generatePackageJson } from './mcp/core/dependency-utils.js';

const deps = {
  'axios': '^1.6.0',
  'zod': '^3.22.0',
  'typescript': '^5.0.0',
};

const pkg = generatePackageJson(deps, {
  name: 'my-server',
  version: '1.0.0',
  devDeps: ['typescript'],
});

console.log(JSON.stringify(pkg, null, 2));
// {
//   "name": "my-server",
//   "version": "1.0.0",
//   "dependencies": {
//     "axios": "^1.6.0",
//     "zod": "^3.22.0"
//   },
//   "devDependencies": {
//     "typescript": "^5.0.0"
//   }
// }
```

#### `mergeDependencies(inlineDeps, packageJson)`

Merge inline deps with existing package.json.

**Returns:** `{ dependencies, conflicts, warnings }`

**Example:**
```typescript
import { mergeDependencies } from './mcp/core/dependency-utils.js';

const inline = { 'axios': '^1.6.0' };
const pkg = { dependencies: { 'axios': '^1.5.0', 'zod': '^3.22.0' } };

const result = mergeDependencies(inline, pkg);
console.log('Merged:', result.dependencies);
// { "axios": "^1.5.0", "zod": "^3.22.0" }
// (package.json version wins)

console.log('Conflicts:', result.conflicts);
// ['axios']
```

#### `formatDependencyList(deps, options?)`

Format dependencies as human-readable string.

**Options:**
- `format?: 'inline' | 'list' | 'json'` - Output format
- `includeCount?: boolean` - Include dependency count

**Example:**
```typescript
import { formatDependencyList } from './mcp/core/dependency-utils.js';

const deps = { 'axios': '^1.6.0', 'zod': '^3.22.0' };

// List format (default)
console.log(formatDependencyList(deps));
// axios@^1.6.0
// zod@^3.22.0

// Inline format
console.log(formatDependencyList(deps, { format: 'inline' }));
// axios@^1.6.0, zod@^3.22.0

// With count
console.log(formatDependencyList(deps, { includeCount: true }));
// 2 dependencies:
// axios@^1.6.0
// zod@^3.22.0
```

#### `getDependencyStats(deps)`

Get statistics about dependencies.

**Returns:**
```typescript
{
  total: number;      // Total count
  scoped: number;     // @scope/package count
  unscoped: number;   // Regular package count
  types: number;      // @types/* count
  versioned: number;  // Specific version count
  wildcards: number;  // latest/*/x count
}
```

**Example:**
```typescript
import { getDependencyStats } from './mcp/core/dependency-utils.js';

const deps = {
  'axios': '^1.6.0',
  '@types/node': '^20.0.0',
  'lodash': 'latest',
};

const stats = getDependencyStats(deps);
console.log(stats);
// {
//   total: 3,
//   scoped: 1,
//   unscoped: 2,
//   types: 1,
//   versioned: 2,
//   wildcards: 1
// }
```

#### `sortDependencies(deps)`

Sort dependencies alphabetically.

**Example:**
```typescript
import { sortDependencies } from './mcp/core/dependency-utils.js';

const deps = { 'zod': '^3.22.0', 'axios': '^1.6.0' };
const sorted = sortDependencies(deps);
// { "axios": "^1.6.0", "zod": "^3.22.0" }
```

#### `filterDependencies(deps, pattern)`

Filter dependencies by name pattern.

**Parameters:**
- `pattern: string | RegExp` - Pattern to match (* wildcard supported)

**Example:**
```typescript
import { filterDependencies } from './mcp/core/dependency-utils.js';

const deps = {
  '@types/node': '^20.0.0',
  '@types/express': '^4.17.0',
  'axios': '^1.6.0',
};

// Using wildcard
const typesDeps = filterDependencies(deps, '@types/*');
// { "@types/node": "^20.0.0", "@types/express": "^4.17.0" }

// Using regex
const axiosDeps = filterDependencies(deps, /^axios/);
// { "axios": "^1.6.0" }
```

### SimplyMCP Integration API

#### `server.getDependencies()`

Get parsed inline dependencies from server.

**Returns:** `ParsedDependencies | null`

**Example:**
```typescript
const server = new SimplyMCP({
  name: 'test',
  version: '1.0.0',
});

const deps = server.getDependencies();
if (deps) {
  console.log('Dependencies:', deps.map);
  console.log('Count:', deps.dependencies.length);
}
```

#### `server.hasDependency(packageName)`

Check if a specific dependency is declared.

**Returns:** `boolean`

**Example:**
```typescript
if (server.hasDependency('axios')) {
  console.log('Server uses axios');
}
```

#### `server.getDependencyVersion(packageName)`

Get version specifier for a package.

**Returns:** `string | undefined`

**Example:**
```typescript
const version = server.getDependencyVersion('axios');
console.log(`axios version: ${version}`);  // "^1.6.0"
```

#### `SimplyMCP.fromFile(filePath, options?)`

Create SimplyMCP server from file with inline dependencies.

**Parameters:**
- `filePath: string` - Path to server file
- `options?: Partial<SimplyMCPOptions>` - Server options

**Returns:** `Promise<SimplyMCP>`

**Example:**
```typescript
import { SimplyMCP } from './mcp/SimplyMCP.js';

const server = await SimplyMCP.fromFile('./my-server.ts', {
  name: 'my-server',
  version: '1.0.0',
});

console.log('Dependencies:', server.getDependencies()?.map);
await server.start();
```

## Examples

### Example 1: Basic Usage

```typescript
#!/usr/bin/env npx tsx
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///

import { SimplyMCP } from './mcp/SimplyMCP.js';
import axios from 'axios';
import { z } from 'zod';

const server = new SimplyMCP({
  name: 'api-client',
  version: '1.0.0',
});

server.addTool({
  name: 'fetch_data',
  description: 'Fetch data from API',
  parameters: z.object({
    url: z.string().url(),
  }),
  execute: async (args) => {
    const response = await axios.get(args.url);
    return JSON.stringify(response.data, null, 2);
  },
});

await server.start();
```

### Example 2: Scoped Packages

```typescript
// /// dependencies
// @modelcontextprotocol/sdk@^1.0.0
// @types/node@^20.0.0
// axios@^1.6.0
// ///

import { SimplyMCP } from './mcp/SimplyMCP.js';
import axios from 'axios';

// TypeScript types available from @types/node
import { readFile } from 'fs/promises';

const server = new SimplyMCP({
  name: 'typed-server',
  version: '1.0.0',
});

// Tools using typed imports...
```

### Example 3: Version Ranges

```typescript
// /// dependencies
// lodash@^4.17.21      # Caret: 4.x.x compatible
// axios@~1.6.0         # Tilde: 1.6.x compatible
// zod@>=3.22.0         # Greater than or equal
// express@*            # Any version (not recommended)
// typescript@latest    # Latest available
// next                 # Latest (implicit)
// ///
```

### Example 4: With Comments

```typescript
// /// dependencies
// # Core dependencies
// axios@^1.6.0         # HTTP client
// zod@^3.22.0          # Schema validation
//
// # Database
// pg@^8.11.0           # PostgreSQL client
// drizzle-orm@^0.29.0  # ORM
//
// # Utilities
// lodash@^4.17.21      # Utility functions
// date-fns@^2.30.0     # Date handling
// ///
```

### Example 5: Empty Dependencies

```typescript
// /// dependencies
// ///

// This server uses only Node.js builtins
import { SimplyMCP } from './mcp/SimplyMCP.js';
import { readFile } from 'fs/promises';

const server = new SimplyMCP({
  name: 'simple-server',
  version: '1.0.0',
});

// No external dependencies needed
```

### Example 6: Accessing Dependencies

```typescript
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///

import { SimplyMCP } from './mcp/SimplyMCP.js';
import { z } from 'zod';

const server = new SimplyMCP({
  name: 'deps-aware',
  version: '1.0.0',
});

server.addTool({
  name: 'list_dependencies',
  description: 'List declared dependencies',
  parameters: z.object({}),
  execute: async () => {
    const deps = server.getDependencies();
    if (!deps) {
      return 'No dependencies declared';
    }

    const list = Object.entries(deps.map)
      .map(([name, version]) => `${name}@${version}`)
      .join('\n');

    return `Dependencies:\n${list}`;
  },
});

await server.start();
```

### Example 7: Using SimplyMCP.fromFile()

```typescript
// server-loader.ts
import { SimplyMCP } from './mcp/SimplyMCP.js';

async function loadServer(path: string) {
  // Load server and parse inline deps automatically
  const server = await SimplyMCP.fromFile(path);

  // Check what dependencies it needs
  const deps = server.getDependencies();
  if (deps && deps.dependencies.length > 0) {
    console.log('Server requires:');
    deps.dependencies.forEach(dep => {
      console.log(`  - ${dep.name}@${dep.version}`);
    });
  }

  // Start the server
  await server.start();
}

loadServer('./my-server.ts');
```

### Example 8: Generating package.json

```typescript
import { readFile } from 'fs/promises';
import { parseInlineDependencies } from './mcp/core/index.js';
import { generatePackageJson } from './mcp/core/dependency-utils.js';

// Parse inline dependencies
const source = await readFile('./server.ts', 'utf-8');
const result = parseInlineDependencies(source);

// Generate package.json
const pkg = generatePackageJson(result.dependencies, {
  name: 'my-mcp-server',
  version: '1.0.0',
  devDeps: ['typescript', '@types/node'],
});

// Save to file
await writeFile('package.json', JSON.stringify(pkg, null, 2));
```

### Example 9: Validation and Error Handling

```typescript
import { parseInlineDependencies } from './mcp/core/index.js';

const source = `
// /// dependencies
// axios@^1.6.0
// INVALID@1.0.0  # Invalid: uppercase
// zod@not-a-version  # Invalid: bad version
// ///
`;

const result = parseInlineDependencies(source, {
  strict: false,  // Don't throw, collect errors
  validateSemver: true,
});

if (result.errors.length > 0) {
  console.error('Validation errors:');
  result.errors.forEach(err => {
    console.error(`  Line ${err.line}: ${err.message}`);
  });
}

if (result.warnings.length > 0) {
  console.warn('Warnings:');
  result.warnings.forEach(warn => {
    console.warn(`  ${warn}`);
  });
}

console.log('Valid dependencies:', result.dependencies);
// Only { "axios": "^1.6.0" } is valid
```

### Example 10: Merging with package.json

```typescript
import { readFile } from 'fs/promises';
import { parseInlineDependencies } from './mcp/core/index.js';
import { mergeDependencies } from './mcp/core/dependency-utils.js';

// Parse inline dependencies
const source = await readFile('./server.ts', 'utf-8');
const inlineResult = parseInlineDependencies(source);

// Load existing package.json
const pkgJson = JSON.parse(await readFile('./package.json', 'utf-8'));

// Merge (package.json takes precedence)
const merged = mergeDependencies(inlineResult.dependencies, pkgJson);

// Report conflicts
if (merged.conflicts.length > 0) {
  console.warn('Version conflicts detected:');
  merged.warnings.forEach(warn => console.warn(`  ${warn}`));
}

console.log('Final dependencies:', merged.dependencies);
```

### Example 11: Complex Server

```typescript
#!/usr/bin/env npx tsx
// /// dependencies
// # Core framework
// @modelcontextprotocol/sdk@^1.0.0
//
// # Validation
// zod@^3.22.0
//
// # HTTP and API
// axios@^1.6.0
// express@^4.18.0
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
import axios from 'axios';
import { z } from 'zod';
import { format } from 'date-fns';
import _ from 'lodash';
import pg from 'pg';

const server = new SimplyMCP({
  name: 'complex-server',
  version: '1.0.0',
});

// Database connection
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});
await client.connect();

// Add tools using all dependencies...

server.addTool({
  name: 'query_and_format',
  description: 'Query database and format results',
  parameters: z.object({
    query: z.string(),
  }),
  execute: async (args, context) => {
    context?.logger.info('Executing query');

    // Query database
    const result = await client.query(args.query);

    // Process with lodash
    const grouped = _.groupBy(result.rows, 'category');

    // Format timestamp
    const timestamp = format(new Date(), 'PPpp');

    return {
      content: [
        {
          type: 'text',
          text: `Query results (${timestamp}):\n${JSON.stringify(grouped, null, 2)}`,
        },
      ],
    };
  },
});

await server.start();
```

### Example 12: Development vs Production

```typescript
// /// dependencies
// # Production dependencies
// axios@^1.6.0
// zod@^3.22.0
// pg@^8.11.0
//
// # Development dependencies (use devDeps option when generating package.json)
// typescript@^5.0.0
// @types/node@^20.0.0
// vitest@^1.0.0
// ///

// When generating package.json, specify devDeps:
import { generatePackageJson } from './mcp/core/dependency-utils.js';

const pkg = generatePackageJson(deps, {
  name: 'my-server',
  version: '1.0.0',
  devDeps: ['typescript', '@types/node', 'vitest'],
});
```

## Integration with package.json

### Scenarios

#### Scenario 1: No package.json

Inline dependencies are the source of truth. You can:
- Run the server directly (if dependencies are installed)
- Generate package.json from inline deps
- Use auto-installation (Feature 3, coming soon)

```typescript
// Generate package.json
import { generatePackageJson } from './mcp/core/dependency-utils.js';

const deps = server.getDependencies();
const pkg = generatePackageJson(deps.map, {
  name: 'my-server',
  version: '1.0.0',
});

await writeFile('package.json', JSON.stringify(pkg, null, 2));
```

#### Scenario 2: package.json Exists

Both can coexist peacefully:
- Inline deps document what the script needs
- package.json is used by npm/yarn
- Conflicts are detected and warned

```typescript
import { mergeDependencies } from './mcp/core/dependency-utils.js';

const inline = server.getDependencies().map;
const pkg = JSON.parse(await readFile('package.json', 'utf-8'));

const result = mergeDependencies(inline, pkg);

// package.json version wins
console.log('Using:', result.dependencies);

// Conflicts reported
if (result.conflicts.length > 0) {
  console.warn('Conflicts:', result.conflicts);
}
```

#### Scenario 3: Version Conflicts

When versions differ:
- package.json version takes precedence (npm/yarn use it)
- Conflict is logged as a warning
- No error thrown (non-blocking)

```typescript
// Inline: axios@^1.6.0
// package.json: axios@^1.5.0
// Result: Uses ^1.5.0 from package.json, logs warning
```

### Precedence Rules

1. **package.json** (if exists) - npm/yarn use this
2. **Inline dependencies** - Used for auto-install if no package.json
3. **node_modules** - Actually installed packages

## Best Practices

### 1. Use Specific Versions

```typescript
// Good: Specific versions prevent breaking changes
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///

// Avoid: Wildcards can cause unpredictable builds
// /// dependencies
// axios@latest
// zod@*
// ///
```

### 2. Group Related Dependencies

```typescript
// /// dependencies
// # HTTP libraries
// axios@^1.6.0
// node-fetch@^3.3.0
//
// # Validation
// zod@^3.22.0
// ajv@^8.12.0
//
// # Database
// pg@^8.11.0
// drizzle-orm@^0.29.0
// ///
```

### 3. Document Why Dependencies Are Needed

```typescript
// /// dependencies
// axios@^1.6.0      # HTTP client for external API calls
// zod@^3.22.0       # Schema validation for user inputs
// pg@^8.11.0        # PostgreSQL client for data persistence
// ///
```

### 4. Keep Dependencies Minimal

```typescript
// Good: Only declare what you actually use
// /// dependencies
// axios@^1.6.0
// ///

// Avoid: Don't declare unused dependencies
// /// dependencies
// axios@^1.6.0
// lodash@^4.17.21  # Not actually used!
// ///
```

### 5. Use Scoped Type Packages

```typescript
// /// dependencies
// express@^4.18.0
// @types/express@^4.17.0  # TypeScript types
// ///
```

### 6. Keep Inline Deps in Sync with Imports

```typescript
// Good: Dependencies match imports
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///

import axios from 'axios';
import { z } from 'zod';

// Avoid: Importing undeclared packages
import lodash from 'lodash';  // Not in inline deps!
```

### 7. Validate Before Distribution

```typescript
import { parseInlineDependencies } from './mcp/core/index.js';
import { validateDependencies } from './mcp/core/dependency-validator.js';

const source = await readFile('./server.ts', 'utf-8');
const result = parseInlineDependencies(source);

// Check for errors
if (result.errors.length > 0) {
  throw new Error('Invalid dependencies');
}

// Validate
const validation = validateDependencies(result.dependencies);
if (!validation.valid) {
  throw new Error('Dependencies failed validation');
}
```

### 8. Use Consistent Version Patterns

```typescript
// Good: Consistent caret ranges
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// lodash@^4.17.21
// ///

// Avoid: Mixing different range types without reason
// /// dependencies
// axios@^1.6.0
// zod@~3.22.0
// lodash@>=4.17.0
// ///
```

### 9. Leverage Auto-Completion

Use your IDE's auto-completion for package names and versions:

```typescript
// Type "// " and your IDE can suggest package names
// /// dependencies
// axios@  // IDE suggests available versions
// ///
```

### 10. Test Dependency Installation

Before sharing your server:

```bash
# Remove node_modules
rm -rf node_modules

# Generate package.json from inline deps
npx tsx scripts/generate-package-json.ts

# Install dependencies
npm install

# Test server
npx tsx my-server.ts
```

## Security Considerations

### Package Name Validation

SimplyMCP strictly validates package names:

```typescript
// ✅ Valid
'axios'
'date-fns'
'@types/node'
'@modelcontextprotocol/sdk'

// ❌ Invalid
'UPPERCASE'           // Must be lowercase
'.hidden'             // Can't start with .
'_private'            // Can't start with _
'my package'          // No spaces
'pkg; rm -rf /'       // No dangerous chars
'a'.repeat(215)       // Too long (max 214)
```

### Version Validation

Only safe semver ranges allowed:

```typescript
// ✅ Valid
'^1.0.0'
'~1.2.3'
'>=1.0.0 <2.0.0'
'1.2.3-alpha'
'latest'

// ❌ Invalid
'not-a-version'
'`malicious`'
'1.0.0; rm -rf /'
'1.0.0 && echo hack'
```

### Injection Prevention

All dangerous characters blocked:

```typescript
// ❌ Blocked characters
';'   // Command separator
'|'   // Pipe
'&'   // Background execution
'`'   // Command substitution
'$'   // Variable expansion
'('   // Subshell
'{'   // Brace expansion
```

### DoS Prevention

Limits prevent resource exhaustion:

```typescript
// Maximum limits
MAX_DEPENDENCIES = 1000      // Per file
MAX_LINE_LENGTH = 1000       // Per line
MAX_PACKAGE_NAME_LENGTH = 214  // npm limit
MAX_VERSION_LENGTH = 100     // Reasonable max
```

### No Code Execution

Parser is pure string processing:
- No `eval()`
- No `Function()`
- No `require()` of untrusted code
- No shell command execution
- Regex-based parsing only

### Supply Chain Security

Best practices:
1. **Verify packages** before adding to inline deps
2. **Use specific versions** rather than `latest`
3. **Audit regularly** with `npm audit`
4. **Check lock files** for unexpected changes
5. **Don't auto-install** without user confirmation (Feature 3 will ask)

## Troubleshooting

### Error: "Invalid package name"

**Cause:** Package name doesn't follow npm rules

**Solution:**
```typescript
// ❌ Wrong
// UPPERCASE@1.0.0

// ✅ Correct
// uppercase@1.0.0
```

### Error: "Invalid version specifier"

**Cause:** Version isn't valid semver

**Solution:**
```typescript
// ❌ Wrong
// axios@not-a-version

// ✅ Correct
// axios@^1.6.0
```

### Error: "Duplicate dependency"

**Cause:** Same package declared twice

**Solution:**
```typescript
// ❌ Wrong
// /// dependencies
// axios@^1.6.0
// axios@^1.5.0  # Duplicate!
// ///

// ✅ Correct
// /// dependencies
// axios@^1.6.0
// ///
```

### Error: "Line too long"

**Cause:** Line exceeds 1,000 characters (security limit)

**Solution:** Split into multiple lines or shorten comments

### Error: "Too many dependencies"

**Cause:** More than 1,000 dependencies declared

**Solution:** Reduce dependency count or split into multiple servers

### Warning: "Using wildcard version"

**Cause:** Using `*`, `x`, or `latest`

**Solution:**
```typescript
// ⚠️ Risky
// axios@latest

// ✅ Better
// axios@^1.6.0
```

### Error: "Missing end delimiter"

**Cause:** Forgot `// ///` at the end

**Solution:**
```typescript
// ❌ Wrong
// /// dependencies
// axios@^1.6.0

// ✅ Correct
// /// dependencies
// axios@^1.6.0
// ///
```

### Error: "Missing // prefix"

**Cause:** Line inside block doesn't start with `//`

**Solution:**
```typescript
// ❌ Wrong
// /// dependencies
axios@^1.6.0  # Missing //
// ///

// ✅ Correct
// /// dependencies
// axios@^1.6.0
// ///
```

### Package.json Conflict Warning

**Cause:** Inline dep version differs from package.json

**Effect:** Non-fatal warning logged

**Resolution:** package.json version is used

```typescript
// Inline: axios@^1.6.0
// package.json: axios@^1.5.0
// Result: Uses ^1.5.0, logs warning
```

### Dependencies Not Found at Runtime

**Cause:** Inline deps declared but not installed

**Solutions:**
1. Run `npm install` with matching versions
2. Generate package.json and run `npm install`
3. Wait for Feature 3 (auto-installation)

```bash
# Manual install
npm install axios@^1.6.0 zod@^3.22.0

# Or generate package.json first
npx tsx scripts/generate-package-json.ts
npm install
```

## FAQ

### Q: Do inline dependencies replace package.json?

**A:** No, they're complementary:
- Use **inline deps** for self-documenting single-file servers
- Use **package.json** for complex projects, npm publishing, or team workflows
- Both can coexist (package.json takes precedence)

### Q: Are inline dependencies automatically installed?

**A:** Not yet. Auto-installation is Feature 3 (coming soon). Currently:
1. Declare inline deps
2. Generate package.json or install manually
3. Run your server

### Q: Can I use inline deps with TypeScript?

**A:** Yes! Inline deps work in `.ts` and `.js` files. The parser treats them as comments, so TypeScript compiles them without issues.

### Q: What happens if I have both inline deps and package.json?

**A:** Both work together:
- Inline deps document what the script needs
- package.json is used by npm/yarn for actual installation
- Conflicts are detected and warned (package.json wins)

### Q: Can I declare devDependencies inline?

**A:** Not directly in the syntax, but you can:
1. Declare all deps inline
2. Use `generatePackageJson()` with `devDeps` option
3. Add comments to indicate dev-only deps

```typescript
// /// dependencies
// axios@^1.6.0       # Production
// typescript@^5.0.0  # Dev only (specify when generating package.json)
// ///
```

### Q: How do I convert my existing package.json to inline deps?

**A:** Copy dependencies from package.json:

```typescript
// From package.json:
{
  "dependencies": {
    "axios": "^1.6.0",
    "zod": "^3.22.0"
  }
}

// To inline deps:
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///
```

### Q: Can I use workspace dependencies or monorepo packages?

**A:** Yes, but:
- Workspace protocols (`workspace:*`) aren't standard semver
- Use regular versions for portable servers
- Or keep package.json for workspace-specific configs

### Q: Do inline deps work with pnpm/yarn/bun?

**A:** Yes! The syntax is package-manager agnostic:
- Inline deps declare package@version
- Your package manager installs them
- No special configuration needed

### Q: Can I use git URLs or file paths?

**A:** No, only npm package names and versions. For git URLs or file paths, use package.json.

```typescript
// ❌ Not supported
// /// dependencies
// my-pkg@git+https://github.com/user/repo
// local-pkg@file:../local-package
// ///

// ✅ Use package.json for these
```

### Q: How do I share a server with inline deps?

**A:** Just share the single `.ts` file! Recipients can:
1. Read inline deps to see requirements
2. Run `npm install` for listed packages
3. Or wait for auto-installation (Feature 3)

### Q: Can I use inline deps in class-based servers?

**A:** Yes! Inline deps work regardless of server structure:

```typescript
#!/usr/bin/env npx tsx
// /// dependencies
// zod@^3.22.0
// ///

import { MCPServer, Tool } from './mcp/decorators.js';
import { z } from 'zod';

@MCPServer({ name: 'my-server', version: '1.0.0' })
class MyServer {
  @Tool({
    description: 'Greet user',
    parameters: z.object({ name: z.string() }),
  })
  async greet(args: { name: string }) {
    return `Hello, ${args.name}!`;
  }
}
```

### Q: Do inline deps affect performance?

**A:** No runtime impact:
- Parsing happens once at load time
- Typical parse time: <10ms for 10-50 deps
- Large deps (100+): <100ms
- No overhead during tool execution

### Q: Can I use inline deps for private npm packages?

**A:** Yes, declare them normally:

```typescript
// /// dependencies
// @mycompany/private-package@^1.0.0
// ///
```

Then configure npm authentication as usual (`.npmrc` file).

### Q: What's the maximum number of dependencies?

**A:** 1,000 dependencies per file (security limit). If you need more, consider:
- Splitting into multiple servers
- Using package.json instead
- Reviewing if all deps are necessary

### Q: Can I use different versions of the same package?

**A:** No, only one version per package:

```typescript
// ❌ Not allowed
// /// dependencies
// lodash@^4.17.0
// lodash@^4.18.0  # Duplicate!
// ///

// ✅ Choose one
// /// dependencies
// lodash@^4.18.0
// ///
```

## Related Features

- **[Auto-Installation](./auto-installation.md)** - Phase 2, Feature 3: Automatically install inline dependencies
- **[Bundling](./bundling.md)** - Phase 2, Feature 4: Create standalone server distributions
- **[SimplyMCP Guide](../../SIMPLE_MCP_GUIDE.md)** - Complete SimplyMCP documentation

## Comparison with Other Tools

### SimplyMCP vs PEP 723 (Python)

| Aspect | SimplyMCP | PEP 723 |
|--------|-----------|---------|
| Language | TypeScript/JavaScript | Python |
| Format | `// /// dependencies` | `# /// script` |
| Dependency syntax | `axios@^1.6.0` | `"requests>=1.0"` |
| Metadata format | npm-style | TOML |
| Parser | Built-in | uv, pdm, pipx |
| Auto-install | Coming (Feature 3) | Supported by uv |

### SimplyMCP vs package.json

| Aspect | Inline Deps | package.json |
|--------|-------------|--------------|
| Location | In code | Separate file |
| Self-documenting | ✅ Yes | ❌ No |
| Single-file distribution | ✅ Yes | ❌ No |
| npm publishing | ❌ No | ✅ Yes |
| Complex configs | ❌ Limited | ✅ Yes |
| Team workflows | ⚠️ OK | ✅ Better |

### SimplyMCP vs FastMCP (Python)

| Feature | SimplyMCP | FastMCP |
|---------|-----------|---------|
| Inline deps | ✅ Phase 2 | ❌ No |
| Language | TypeScript | Python |
| Auto-install | 📋 Phase 2 | ❌ No |

## Implementation Notes

### Parser Implementation

- **Technology**: Regex-based parsing (no external dependencies)
- **Performance**: <10ms for typical files (10-50 deps)
- **Memory**: <1MB for parsed data
- **Security**: Multiple validation layers

### Validation Strategy

1. **Package names**: npm naming rules + security checks
2. **Versions**: Semver validation + dangerous char blocking
3. **Format**: Delimiter matching + line format validation
4. **Limits**: DoS prevention (count, length, nesting)

### Error Handling

- **Non-strict mode** (default): Collect all errors, return them
- **Strict mode**: Throw on first error
- **Warnings**: Non-fatal issues logged separately
- **Line numbers**: Errors include line numbers for debugging

### Caching Considerations

Future optimization: Cache parsed results by file mtime

```typescript
const cache = new Map<string, { mtime: number, result: ParseResult }>();

function parseWithCache(filePath: string): ParseResult {
  const stat = statSync(filePath);
  const cached = cache.get(filePath);

  if (cached && cached.mtime === stat.mtimeMs) {
    return cached.result;
  }

  const source = readFileSync(filePath, 'utf-8');
  const result = parseInlineDependencies(source);

  cache.set(filePath, { mtime: stat.mtimeMs, result });
  return result;
}
```

## Future Enhancements

Potential improvements for later phases:

### Phase 3+: Multiple Dependency Types

```typescript
// /// dependencies
// axios@^1.6.0
// ///

// /// devDependencies
// typescript@^5.0.0
// vitest@^1.0.0
// ///

// /// peerDependencies
// @modelcontextprotocol/sdk@^1.0.0
// ///
```

### Phase 4+: Node Version Requirements

```typescript
// /// config
// requires-node: ">=20.0.0"
// ///

// /// dependencies
// axios@^1.6.0
// ///
```

### Phase 4+: Environment-Specific Dependencies

```typescript
// /// dependencies
// # Production
// axios@^1.6.0
//
// # Development only
// [dev] typescript@^5.0.0
// [dev] vitest@^1.0.0
// ///
```

### Phase 5+: Custom Registry Support

```typescript
// /// dependencies
// private-pkg@^1.0.0  # registry: https://npm.company.com
// ///
```

---

**Last Updated:** October 2, 2025
**Version:** 1.0.0
**Status:** ✅ Implemented (Phase 2, Feature 2)
**Tests:** 139+ passing (100% pass rate)
**Maintained by:** SimplyMCP Team
