# Phase 2, Feature 2: Inline Dependencies (PEP 723-Style) - Implementation Plan

## Executive Summary

This document provides a comprehensive implementation plan for adding PEP 723-style inline dependency management to SimplyMCP servers. This feature will allow developers to declare npm dependencies directly in their server files using comment-based metadata, similar to Python's PEP 723 specification.

**Status**: Planning Phase
**Priority**: HIGH
**Estimated Complexity**: Medium-High
**Breaking Changes**: None (fully backward compatible)
**Relation to Phase 2**: Feature 2 of 4 (enables Feature 3: Auto-Installation)

---

## 1. What is PEP 723?

### 1.1 Python PEP 723 Overview

PEP 723 is a Python specification (approved October 2023, amended January 2024) that defines a standard format for embedding dependency and environment metadata directly in single-file Python scripts.

**Key Characteristics:**
- **Comment-based**: Metadata embedded in comments (doesn't affect execution)
- **TOML syntax**: Uses TOML format within comments
- **Delimited blocks**: Clear start (`# /// script`) and end (`# ///`) markers
- **Tool-agnostic**: Parsed by `uv`, `pdm`, `pipx`, `hatch`, etc.
- **Self-contained scripts**: Scripts can specify their own dependencies

### 1.2 Python PEP 723 Format

```python
#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "requests<3",
#     "rich>=13.0.0",
#     "fastmcp",
# ]
# ///

import requests
import rich
from fastmcp import FastMCP

# Script continues...
```

**Key Fields:**
1. `requires-python` - Python version specifier (e.g., `">=3.11"`)
2. `dependencies` - Array of dependency specifiers with semver ranges

**Delimiter Rules:**
- Start: `# /// script` (or `# /// {type}`)
- End: `# ///`
- All lines between delimiters must start with `#` and contain valid TOML
- Comments and whitespace within TOML are preserved

### 1.3 Why PEP 723 is Successful

1. **Zero configuration** - No separate config files needed
2. **Self-documenting** - Dependencies visible in the script itself
3. **Tool compatibility** - Multiple tools support the same format
4. **Easy distribution** - Single file contains everything
5. **Simple parsing** - Clear delimiters, standard TOML format

---

## 2. TypeScript/Node.js Adaptation

### 2.1 Design Principles

**Core Requirements:**
1. **Comment-based** - Must not affect TypeScript compilation or execution
2. **Clear delimiters** - Unambiguous start/end markers
3. **npm/yarn compatible** - Use standard package.json dependency syntax
4. **TypeScript-friendly** - Should work with `.ts` and `.js` files
5. **IDE-friendly** - Should not confuse syntax highlighters or linters
6. **Parseable** - Easy to extract with regex or simple parser

### 2.2 Format Comparison

**Option A: TOML-Style Comments (Closest to PEP 723)**

```typescript
// /// dependencies
// "axios": "^1.6.0",
// "lodash": "^4.17.21",
// "zod": "^3.22.0"
// ///
```

**Pros:**
- Most similar to PEP 723 (familiar to Python developers)
- Clear delimiters
- Maintains TOML-like structure

**Cons:**
- Not valid JSON (requires custom parser)
- Unfamiliar to JavaScript developers
- Can't paste into package.json directly

---

**Option B: JSON-Style Comments**

```typescript
// @dependencies {
//   "axios": "^1.6.0",
//   "lodash": "^4.17.21",
//   "zod": "^3.22.0"
// }
```

**Pros:**
- Valid JSON syntax (familiar to JS developers)
- Can paste into package.json
- Standard JSON parser works

**Cons:**
- Less distinctive delimiters
- @ prefix might conflict with decorators
- Harder to parse (need JSON parser)

---

**Option C: Package.json-Style Comments (RECOMMENDED)**

```typescript
#!/usr/bin/env npx tsx
// ## dependencies
// axios@^1.6.0
// lodash@^4.17.21
// zod@^3.22.0
// ## end dependencies
```

**Pros:**
- Simplest format (one dep per line)
- Easy to parse (regex-based)
- npm/yarn style (package@version)
- No JSON/TOML parser needed
- Most readable

**Cons:**
- Less structured than JSON
- Slightly different from PEP 723

---

**Option D: Hybrid Format (CHOSEN)**

```typescript
#!/usr/bin/env npx tsx
// /// dependencies
// axios@^1.6.0
// lodash@^4.17.21
// zod@^3.22.0
// ///
```

**Pros:**
- Clear delimiters from PEP 723
- Simple one-line-per-dep format
- Easy parsing (regex + split)
- Familiar npm/yarn syntax
- No parser dependencies needed

**Cons:**
- Not exactly PEP 723 (but close in spirit)

---

### 2.3 Chosen Format Specification

**Format: Hybrid (PEP 723 delimiters + npm syntax)**

```typescript
#!/usr/bin/env npx tsx
// /// dependencies
// package-name@version-specifier
// @scope/package@version-specifier
// package-name  # without version = latest
// ///

import { SimplyMCP } from './mcp/SimplyMCP.js';
import axios from 'axios';
import { z } from 'zod';

const server = new SimplyMCP({
  name: 'my-server',
  version: '1.0.0',
});

// Server implementation...
```

**Grammar:**

```
InlineDependencies ::= StartDelimiter DependencyLine* EndDelimiter

StartDelimiter     ::= "//" Space* "///" Space* "dependencies" Space* EOL
EndDelimiter       ::= "//" Space* "///" Space* EOL
DependencyLine     ::= "//" Space* Dependency Comment? Space* EOL

Dependency         ::= PackageName VersionSpec?
PackageName        ::= ScopedName | SimpleName
SimpleName         ::= [a-z0-9@/_-]+
ScopedName         ::= "@" SimpleName "/" SimpleName
VersionSpec        ::= "@" SemverRange

SemverRange        ::= [0-9.*^~<>=x\-]+ | "latest" | "next"
Comment            ::= "#" [^\n]*
Space              ::= " " | "\t"
EOL                ::= "\n" | "\r\n"
```

**Validation Rules:**

1. **Start delimiter** must be exactly: `// /// dependencies`
2. **End delimiter** must be exactly: `// ///`
3. **Between delimiters**, all lines must start with `//`
4. **Package names** must match npm naming rules (lowercase, alphanumeric, `-`, `_`, `@` for scopes)
5. **Version specifiers** must be valid semver or semver ranges
6. **Comments** (after `#`) are ignored
7. **Empty lines** (just `//`) are allowed
8. **Whitespace** is trimmed

---

## 3. Examples

### 3.1 Simple Server with Dependencies

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
  name: 'weather-server',
  version: '1.0.0',
});

server.addTool({
  name: 'get_weather',
  description: 'Get current weather',
  parameters: z.object({
    city: z.string(),
  }),
  execute: async (args) => {
    const response = await axios.get(`https://api.weather.com/${args.city}`);
    return `Weather in ${args.city}: ${response.data.temp}°C at ${format(new Date(), 'PPpp')}`;
  },
});

await server.start();
```

### 3.2 Scoped Packages

```typescript
// /// dependencies
// @modelcontextprotocol/sdk@^1.0.0
// @types/node@^20.0.0
// ///
```

### 3.3 Version Ranges

```typescript
// /// dependencies
// lodash@^4.17.21          # Caret range (^)
// axios@~1.6.0             # Tilde range (~)
// zod@>=3.22.0             # Greater than or equal
// express@*                # Any version
// typescript@latest        # Latest version
// next                     # Latest (implicit)
// ///
```

### 3.4 With Comments

```typescript
// /// dependencies
// axios@^1.6.0       # HTTP client
// zod@^3.22.0        # Schema validation
// lodash@^4.17.21    # Utility functions
//
// # Database libraries
// pg@^8.11.0         # PostgreSQL client
// redis@^4.6.0       # Redis client
// ///
```

### 3.5 Empty Dependencies

```typescript
// /// dependencies
// ///

// No external dependencies - server uses only SimplyMCP and Node.js builtins
```

### 3.6 Complex Example

```typescript
#!/usr/bin/env npx tsx
// /// dependencies
// # Core framework
// @modelcontextprotocol/sdk@^1.0.0
//
// # Validation and types
// zod@^3.22.0
// @types/node@^20.0.0
//
// # HTTP and networking
// axios@^1.6.0
// express@^4.18.0
//
// # Data processing
// lodash@^4.17.21
// date-fns@^2.30.0
//
// # Database
// pg@^8.11.0
// drizzle-orm@^0.29.0
// ///

import { SimplyMCP } from './mcp/SimplyMCP.js';
import axios from 'axios';
import { z } from 'zod';
import { format } from 'date-fns';
import _ from 'lodash';
import pg from 'pg';

// Server implementation with all dependencies available...
```

### 3.7 Backward Compatibility (No Inline Deps)

```typescript
#!/usr/bin/env npx tsx
// This server has no inline dependencies block
// It should work exactly as before

import { SimplyMCP } from './mcp/SimplyMCP.js';
import { z } from 'zod';

const server = new SimplyMCP({
  name: 'simple-server',
  version: '1.0.0',
});

// Server continues normally...
```

---

## 4. Architecture Design

### 4.1 Component Overview

```
┌─────────────────────────────────────────────────────────┐
│                 SimplyMCP Server File                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │ // /// dependencies                                │  │
│  │ // axios@^1.6.0                                   │  │
│  │ // zod@^3.22.0                                    │  │
│  │ // ///                                             │  │
│  └───────────────────────────────────────────────────┘  │
│  │                                                       │
│  │ import { SimplyMCP } from './mcp/SimplyMCP.js';      │
│  │ import axios from 'axios';                           │
│  │ ...                                                  │
│  └───────────────────────────────────────────────────────┘
                        │
                        │ read file
                        ▼
┌─────────────────────────────────────────────────────────┐
│           InlineDependencyParser                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ parseInlineDependencies(sourceCode)                │  │
│  │ ├─ extractMetadataBlock()                          │  │
│  │ ├─ parseMetadataBlock()                            │  │
│  │ └─ validateDependencies()                          │  │
│  └───────────────────────────────────────────────────┘  │
│                        │                                 │
│                        │ returns                         │
│                        ▼                                 │
│         { "axios": "^1.6.0", "zod": "^3.22.0" }         │
└─────────────────────────────────────────────────────────┘
                        │
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│          DependencyValidator                             │
│  ┌───────────────────────────────────────────────────┐  │
│  │ validateDependencies(deps)                         │  │
│  │ ├─ validatePackageName()                           │  │
│  │ ├─ validateSemverRange()                           │  │
│  │ └─ checkForConflicts()                             │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        │
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│         Feature 3: Auto-Installer                        │
│         (Future - uses parsed dependencies)              │
└─────────────────────────────────────────────────────────┘
```

### 4.2 File Structure

```
mcp/
├── core/
│   ├── inline-deps/
│   │   ├── parser.ts                (NEW - ~150 lines)
│   │   │   ├── parseInlineDependencies()
│   │   │   ├── extractMetadataBlock()
│   │   │   ├── parseMetadataBlock()
│   │   │   └── parseDependencyLine()
│   │   │
│   │   ├── validator.ts             (NEW - ~100 lines)
│   │   │   ├── validateDependencies()
│   │   │   ├── validatePackageName()
│   │   │   ├── validateSemverRange()
│   │   │   └── checkForDuplicates()
│   │   │
│   │   ├── types.ts                 (NEW - ~50 lines)
│   │   │   ├── InlineDependencies type
│   │   │   ├── DependencySpec interface
│   │   │   ├── ParseResult interface
│   │   │   └── ValidationError interface
│   │   │
│   │   └── index.ts                 (NEW - ~20 lines)
│   │       └── Re-exports all public APIs
│   │
│   └── types.ts                     (MODIFIED - add inline deps to context)
│
├── SimplyMCP.ts                     (MODIFIED - add inline dep support)
│   ├── Add inlineDependencies field
│   ├── Add parseDependencies() method
│   ├── Add getDependencies() method
│   └── Add optional auto-parse in constructor
│
├── examples/
│   ├── inline-deps-demo.ts          (NEW - ~100 lines)
│   │   └── Example server with inline dependencies
│   │
│   └── class-based-inline-deps.ts   (NEW - ~80 lines)
│       └── Class-based server with inline dependencies
│
└── tests/
    └── inline-deps/
        ├── test-parser.ts           (NEW - ~300 lines)
        ├── test-validator.ts        (NEW - ~200 lines)
        └── test-integration.ts      (NEW - ~150 lines)
```

### 4.3 Integration Points

**Where inline dependencies fit in SimplyMCP:**

1. **SimplyMCP Constructor** (Optional auto-parse)
   ```typescript
   constructor(options: SimplyMCPOptions) {
     // Existing code...

     // NEW: Optional auto-parse inline dependencies
     if (options.parseInlineDependencies) {
       this.parseDependenciesFromCaller();
     }
   }
   ```

2. **Static Method** (Recommended approach)
   ```typescript
   static async fromFile(filePath: string): Promise<SimplyMCP> {
     const source = await readFile(filePath, 'utf-8');
     const deps = parseInlineDependencies(source);

     // Create server with parsed dependencies
     const server = new SimplyMCP({
       name: 'server-from-file',
       version: '1.0.0',
       inlineDependencies: deps,
     });

     return server;
   }
   ```

3. **Manual Parsing** (Most flexible)
   ```typescript
   import { parseInlineDependencies } from './mcp/core/inline-deps/index.js';

   const source = await readFile('./my-server.ts', 'utf-8');
   const deps = parseInlineDependencies(source);

   console.log('Dependencies:', deps);
   // { "axios": "^1.6.0", "zod": "^3.22.0" }
   ```

4. **CLI Tool** (Future - Phase 2 Feature 4)
   ```bash
   npx simplemcp run server.ts  # Auto-parses inline deps
   npx simplemcp deps server.ts  # Show dependencies
   ```

### 4.4 API Design

**Core Parser API:**

```typescript
/**
 * Parse inline dependencies from source code
 */
export function parseInlineDependencies(
  sourceCode: string,
  options?: ParseOptions
): ParseResult;

export interface ParseOptions {
  strict?: boolean;          // Throw on parse errors (default: false)
  validateSemver?: boolean;  // Validate semver ranges (default: true)
  allowComments?: boolean;   // Allow # comments (default: true)
}

export interface ParseResult {
  dependencies: InlineDependencies;
  errors: ValidationError[];
  warnings: string[];
  raw: string;  // Raw metadata block
}

export type InlineDependencies = Record<string, string>;
```

**Validator API:**

```typescript
/**
 * Validate dependency specifications
 */
export function validateDependencies(
  deps: InlineDependencies
): ValidationResult;

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationError {
  type: 'INVALID_NAME' | 'INVALID_VERSION' | 'DUPLICATE' | 'CONFLICT';
  package: string;
  message: string;
  line?: number;
}
```

**SimplyMCP Integration API:**

```typescript
class SimplyMCP {
  private inlineDependencies?: InlineDependencies;

  /**
   * Get inline dependencies (if parsed)
   */
  getDependencies(): InlineDependencies | undefined;

  /**
   * Check if a dependency is declared
   */
  hasDependency(packageName: string): boolean;

  /**
   * Get version specifier for a package
   */
  getDependencyVersion(packageName: string): string | undefined;

  /**
   * Create SimplyMCP server from file (parses inline deps)
   */
  static async fromFile(filePath: string, options?: SimplyMCPOptions): Promise<SimplyMCP>;
}
```

---

## 5. Implementation Details

### 5.1 Parser Implementation

**File: `mcp/core/inline-deps/parser.ts`**

```typescript
import { InlineDependencies, ParseResult, ParseOptions, ValidationError } from './types.js';
import { validateDependencies } from './validator.js';

const START_DELIMITER = /^\/\/\s*\/\/\/\s*dependencies\s*$/;
const END_DELIMITER = /^\/\/\s*\/\/\/\s*$/;
const COMMENT_LINE = /^\/\/\s*(.*)$/;
const DEPENDENCY_PATTERN = /^([a-z0-9@/_-]+)(?:@([0-9.*^~<>=x\-]+|latest|next))?\s*(?:#.*)?$/i;

/**
 * Parse inline dependencies from source code
 */
export function parseInlineDependencies(
  sourceCode: string,
  options: ParseOptions = {}
): ParseResult {
  const {
    strict = false,
    validateSemver = true,
    allowComments = true,
  } = options;

  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  const dependencies: InlineDependencies = {};

  // Extract metadata block
  const metadataBlock = extractMetadataBlock(sourceCode);
  if (!metadataBlock) {
    return {
      dependencies: {},
      errors: [],
      warnings: [],
      raw: '',
    };
  }

  // Parse each line
  const lines = metadataBlock.content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line || line === '//') continue;

    // Check if line is a comment
    const commentMatch = COMMENT_LINE.exec(line);
    if (!commentMatch) {
      errors.push({
        type: 'INVALID_FORMAT',
        package: '',
        message: `Line ${i + 1}: Invalid format (missing // prefix)`,
        line: i + 1,
      });
      continue;
    }

    const content = commentMatch[1].trim();

    // Skip comment-only lines
    if (content.startsWith('#')) continue;

    // Parse dependency
    const depMatch = DEPENDENCY_PATTERN.exec(content);
    if (!depMatch) {
      if (content.length > 0) {  // Not an empty line
        errors.push({
          type: 'INVALID_FORMAT',
          package: content,
          message: `Line ${i + 1}: Invalid dependency format: "${content}"`,
          line: i + 1,
        });
      }
      continue;
    }

    const [, packageName, versionSpec] = depMatch;
    const version = versionSpec || 'latest';

    // Check for duplicates
    if (dependencies[packageName]) {
      errors.push({
        type: 'DUPLICATE',
        package: packageName,
        message: `Duplicate dependency: ${packageName}`,
        line: i + 1,
      });
      continue;
    }

    dependencies[packageName] = version;
  }

  // Validate dependencies
  if (validateSemver) {
    const validation = validateDependencies(dependencies);
    errors.push(...validation.errors);
    warnings.push(...validation.warnings);
  }

  // Throw if strict mode and errors exist
  if (strict && errors.length > 0) {
    throw new Error(
      `Failed to parse inline dependencies:\n${errors.map(e => `  - ${e.message}`).join('\n')}`
    );
  }

  return {
    dependencies,
    errors,
    warnings,
    raw: metadataBlock.raw,
  };
}

/**
 * Extract metadata block from source code
 */
function extractMetadataBlock(sourceCode: string): { content: string; raw: string } | null {
  const lines = sourceCode.split('\n');
  let inBlock = false;
  let startLine = -1;
  let endLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inBlock && START_DELIMITER.test(line)) {
      inBlock = true;
      startLine = i;
    } else if (inBlock && END_DELIMITER.test(line)) {
      endLine = i;
      break;
    }
  }

  if (startLine === -1 || endLine === -1) {
    return null;  // No metadata block found
  }

  const blockLines = lines.slice(startLine + 1, endLine);
  return {
    content: blockLines.join('\n'),
    raw: lines.slice(startLine, endLine + 1).join('\n'),
  };
}
```

### 5.2 Validator Implementation

**File: `mcp/core/inline-deps/validator.ts`**

```typescript
import { InlineDependencies, ValidationResult, ValidationError } from './types.js';

// npm package name rules
const PACKAGE_NAME_PATTERN = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

// Semver pattern (simplified - full semver is complex)
const SEMVER_PATTERN = /^(\^|~|>=?|<=?|=)?\d+(\.\d+)?(\.\d+)?(-[a-z0-9.-]+)?(\+[a-z0-9.-]+)?$/i;
const SEMVER_RANGE_PATTERN = /^(\^|~|>=?|<=?|\*|x|latest|next)/i;

/**
 * Validate dependency specifications
 */
export function validateDependencies(deps: InlineDependencies): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  for (const [packageName, versionSpec] of Object.entries(deps)) {
    // Validate package name
    if (!validatePackageName(packageName)) {
      errors.push({
        type: 'INVALID_NAME',
        package: packageName,
        message: `Invalid package name: "${packageName}"`,
      });
    }

    // Validate version specifier
    if (!validateSemverRange(versionSpec)) {
      errors.push({
        type: 'INVALID_VERSION',
        package: packageName,
        message: `Invalid version specifier for ${packageName}: "${versionSpec}"`,
      });
    }

    // Warn about wildcard versions
    if (versionSpec === '*' || versionSpec === 'x' || versionSpec === 'latest') {
      warnings.push(`Using wildcard version for ${packageName}: "${versionSpec}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate npm package name
 */
export function validatePackageName(name: string): boolean {
  if (!name || name.length === 0) return false;
  if (name.length > 214) return false;  // npm limit
  if (name.startsWith('.') || name.startsWith('_')) return false;
  if (name !== name.toLowerCase()) return false;  // Must be lowercase

  return PACKAGE_NAME_PATTERN.test(name);
}

/**
 * Validate semver range
 */
export function validateSemverRange(version: string): boolean {
  if (!version || version.length === 0) return false;

  // Allow special keywords
  if (['latest', 'next', '*', 'x'].includes(version)) return true;

  // Check semver pattern
  return SEMVER_PATTERN.test(version) || SEMVER_RANGE_PATTERN.test(version);
}

/**
 * Check for duplicate dependencies
 */
export function checkForDuplicates(deps: InlineDependencies): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const packageName of Object.keys(deps)) {
    const normalized = packageName.toLowerCase();
    if (seen.has(normalized)) {
      duplicates.push(packageName);
    }
    seen.add(normalized);
  }

  return duplicates;
}
```

### 5.3 Type Definitions

**File: `mcp/core/inline-deps/types.ts`**

```typescript
/**
 * Inline dependencies as package name -> version map
 */
export type InlineDependencies = Record<string, string>;

/**
 * Options for parsing inline dependencies
 */
export interface ParseOptions {
  strict?: boolean;          // Throw on parse errors (default: false)
  validateSemver?: boolean;  // Validate semver ranges (default: true)
  allowComments?: boolean;   // Allow # comments (default: true)
}

/**
 * Result of parsing inline dependencies
 */
export interface ParseResult {
  dependencies: InlineDependencies;
  errors: ValidationError[];
  warnings: string[];
  raw: string;  // Raw metadata block text
}

/**
 * Result of validating dependencies
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Validation error
 */
export interface ValidationError {
  type: 'INVALID_NAME' | 'INVALID_VERSION' | 'INVALID_FORMAT' | 'DUPLICATE' | 'CONFLICT';
  package: string;
  message: string;
  line?: number;
}

/**
 * Dependency specification
 */
export interface DependencySpec {
  name: string;
  version: string;
  resolved?: string;  // Resolved version (after install)
}
```

### 5.4 SimplyMCP Integration

**File: `mcp/SimplyMCP.ts` (additions)**

```typescript
import { parseInlineDependencies, InlineDependencies } from './core/inline-deps/index.js';

export interface SimplyMCPOptions {
  name: string;
  version: string;
  port?: number;
  basePath?: string;
  defaultTimeout?: number;
  capabilities?: {
    sampling?: boolean;
    logging?: boolean;
  };

  // NEW: Inline dependencies support
  inlineDependencies?: InlineDependencies;  // Pre-parsed dependencies
  parseInlineDependencies?: boolean;        // Auto-parse from caller (experimental)
}

export class SimplyMCP {
  private options: Required<SimplyMCPOptions>;
  private inlineDependencies?: InlineDependencies;

  constructor(options: SimplyMCPOptions) {
    // Existing initialization...

    // Store inline dependencies if provided
    if (options.inlineDependencies) {
      this.inlineDependencies = options.inlineDependencies;
    }

    // Auto-parse if requested (experimental - uses stack traces)
    if (options.parseInlineDependencies) {
      this.parseDependenciesFromCaller();
    }
  }

  /**
   * Get inline dependencies
   */
  getDependencies(): InlineDependencies | undefined {
    return this.inlineDependencies;
  }

  /**
   * Check if a dependency is declared
   */
  hasDependency(packageName: string): boolean {
    return this.inlineDependencies?.[packageName] !== undefined;
  }

  /**
   * Get version specifier for a package
   */
  getDependencyVersion(packageName: string): string | undefined {
    return this.inlineDependencies?.[packageName];
  }

  /**
   * Create SimplyMCP from file (parses inline dependencies)
   * @param filePath - Path to server file
   * @param options - Server options
   */
  static async fromFile(filePath: string, options?: Partial<SimplyMCPOptions>): Promise<SimplyMCP> {
    const source = await readFile(filePath, 'utf-8');
    const parseResult = parseInlineDependencies(source);

    // Log warnings
    if (parseResult.warnings.length > 0) {
      console.warn('[SimplyMCP] Inline dependency warnings:');
      parseResult.warnings.forEach(w => console.warn(`  - ${w}`));
    }

    // Throw on errors
    if (parseResult.errors.length > 0) {
      throw new Error(
        `Failed to parse inline dependencies from ${filePath}:\n${
          parseResult.errors.map(e => `  - ${e.message}`).join('\n')
        }`
      );
    }

    return new SimplyMCP({
      name: options?.name || 'server-from-file',
      version: options?.version || '1.0.0',
      ...options,
      inlineDependencies: parseResult.dependencies,
    });
  }

  /**
   * Parse dependencies from caller's file (EXPERIMENTAL)
   */
  private parseDependenciesFromCaller(): void {
    // This is experimental and uses stack traces
    // Implementation details omitted for now
    // Will be added if there's demand for this feature
  }
}
```

---

## 6. Integration with package.json

### 6.1 Scenarios

**Scenario 1: No package.json exists**
- Inline dependencies are the source of truth
- Feature 3 (Auto-Installation) can generate package.json from inline deps
- SimplyMCP can provide a method to export dependencies

**Scenario 2: package.json exists**
- Both inline deps and package.json coexist
- Inline deps are informational (document what the script needs)
- package.json is the actual source for npm/yarn
- Warning if mismatch detected

**Scenario 3: Conflicts**
- Inline dep: `axios@^1.6.0`
- package.json: `axios@^1.5.0`
- Behavior: Log warning, use package.json version
- Rationale: package.json is the npm standard

### 6.2 Precedence Rules

**Priority Order:**
1. **package.json** (if exists) - npm/yarn use this
2. **Inline dependencies** - Used for auto-install if no package.json
3. **node_modules** - Actual installed packages

**Detection Strategy:**
```typescript
async function detectDependencies(serverPath: string): Promise<{
  inline: InlineDependencies;
  packageJson: InlineDependencies;
  conflicts: string[];
}> {
  const source = await readFile(serverPath, 'utf-8');
  const inline = parseInlineDependencies(source).dependencies;

  const packageJsonPath = resolve(dirname(serverPath), 'package.json');
  let packageJson = {};

  if (existsSync(packageJsonPath)) {
    const pkg = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    packageJson = { ...pkg.dependencies, ...pkg.devDependencies };
  }

  // Detect conflicts
  const conflicts = [];
  for (const [name, inlineVersion] of Object.entries(inline)) {
    if (packageJson[name] && packageJson[name] !== inlineVersion) {
      conflicts.push(name);
    }
  }

  return { inline, packageJson, conflicts };
}
```

### 6.3 Export to package.json

**Utility Function:**

```typescript
/**
 * Export inline dependencies to package.json format
 */
export function exportToPackageJson(
  deps: InlineDependencies,
  options?: {
    includeDevDeps?: string[];  // Which packages are devDependencies
  }
): { dependencies: InlineDependencies; devDependencies: InlineDependencies } {
  const dependencies: InlineDependencies = {};
  const devDependencies: InlineDependencies = {};
  const devDepSet = new Set(options?.includeDevDeps || []);

  for (const [name, version] of Object.entries(deps)) {
    if (devDepSet.has(name)) {
      devDependencies[name] = version;
    } else {
      dependencies[name] = version;
    }
  }

  return { dependencies, devDependencies };
}
```

---

## 7. Test Scenarios

### 7.1 Positive Tests (What Should Work)

**Test 1: Parse simple dependencies**
```typescript
const source = `
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///
`;
const result = parseInlineDependencies(source);
expect(result.dependencies).toEqual({
  'axios': '^1.6.0',
  'zod': '^3.22.0',
});
```

**Test 2: Parse scoped packages**
```typescript
const source = `
// /// dependencies
// @modelcontextprotocol/sdk@^1.0.0
// @types/node@^20.0.0
// ///
`;
const result = parseInlineDependencies(source);
expect(result.dependencies['@modelcontextprotocol/sdk']).toBe('^1.0.0');
```

**Test 3: Parse with comments**
```typescript
const source = `
// /// dependencies
// axios@^1.6.0  # HTTP client
// # This is a comment
// zod@^3.22.0   # Validation
// ///
`;
const result = parseInlineDependencies(source);
expect(Object.keys(result.dependencies)).toHaveLength(2);
```

**Test 4: Parse with empty lines**
```typescript
const source = `
// /// dependencies
// axios@^1.6.0
//
// zod@^3.22.0
//
// ///
`;
const result = parseInlineDependencies(source);
expect(result.dependencies).toHaveProperty('axios');
expect(result.dependencies).toHaveProperty('zod');
```

**Test 5: Parse version ranges**
```typescript
const source = `
// /// dependencies
// lodash@^4.17.21
// axios@~1.6.0
// zod@>=3.22.0
// express@*
// typescript@latest
// ///
`;
const result = parseInlineDependencies(source);
expect(result.dependencies.lodash).toBe('^4.17.21');
expect(result.dependencies.typescript).toBe('latest');
```

**Test 6: Parse without version (implicit latest)**
```typescript
const source = `
// /// dependencies
// axios
// zod@^3.22.0
// ///
`;
const result = parseInlineDependencies(source);
expect(result.dependencies.axios).toBe('latest');
```

**Test 7: Empty dependencies block**
```typescript
const source = `
// /// dependencies
// ///
`;
const result = parseInlineDependencies(source);
expect(result.dependencies).toEqual({});
```

**Test 8: No metadata block**
```typescript
const source = `
import { SimplyMCP } from './mcp/SimplyMCP.js';
// Regular code without inline dependencies
`;
const result = parseInlineDependencies(source);
expect(result.dependencies).toEqual({});
expect(result.errors).toHaveLength(0);
```

**Test 9: Whitespace tolerance**
```typescript
const source = `
//    ///    dependencies
//   axios@^1.6.0
//     zod@^3.22.0
//    ///
`;
const result = parseInlineDependencies(source);
expect(Object.keys(result.dependencies)).toHaveLength(2);
```

**Test 10: Multiple blocks (only first is used)**
```typescript
const source = `
// /// dependencies
// axios@^1.6.0
// ///

// /// dependencies
// zod@^3.22.0
// ///
`;
const result = parseInlineDependencies(source);
expect(result.dependencies).toEqual({ 'axios': '^1.6.0' });
```

### 7.2 Negative Tests (Error Handling)

**Test 11: Invalid package name**
```typescript
const source = `
// /// dependencies
// UPPERCASE@^1.0.0  # Invalid: must be lowercase
// ///
`;
const result = parseInlineDependencies(source, { strict: false });
expect(result.errors).toHaveLength(1);
expect(result.errors[0].type).toBe('INVALID_NAME');
```

**Test 12: Invalid version specifier**
```typescript
const source = `
// /// dependencies
// axios@not-a-version
// ///
`;
const result = parseInlineDependencies(source, { strict: false });
expect(result.errors).toHaveLength(1);
expect(result.errors[0].type).toBe('INVALID_VERSION');
```

**Test 13: Duplicate dependencies**
```typescript
const source = `
// /// dependencies
// axios@^1.6.0
// axios@^1.5.0  # Duplicate
// ///
`;
const result = parseInlineDependencies(source, { strict: false });
expect(result.errors).toContainEqual(
  expect.objectContaining({ type: 'DUPLICATE' })
);
```

**Test 14: Missing end delimiter**
```typescript
const source = `
// /// dependencies
// axios@^1.6.0
`;
const result = parseInlineDependencies(source);
expect(result.dependencies).toEqual({});
```

**Test 15: Missing start delimiter**
```typescript
const source = `
// axios@^1.6.0
// ///
`;
const result = parseInlineDependencies(source);
expect(result.dependencies).toEqual({});
```

**Test 16: Invalid line format (no // prefix)**
```typescript
const source = `
// /// dependencies
axios@^1.6.0  # Missing //
// ///
`;
const result = parseInlineDependencies(source, { strict: false });
expect(result.errors).toContainEqual(
  expect.objectContaining({ type: 'INVALID_FORMAT' })
);
```

**Test 17: Strict mode throws on errors**
```typescript
const source = `
// /// dependencies
// INVALID-NAME@^1.0.0
// ///
`;
expect(() => {
  parseInlineDependencies(source, { strict: true });
}).toThrow();
```

**Test 18: Package name too long**
```typescript
const source = `
// /// dependencies
// ${'a'.repeat(215)}@^1.0.0
// ///
`;
const result = parseInlineDependencies(source, { strict: false });
expect(result.errors).toHaveLength(1);
```

**Test 19: Package name with invalid characters**
```typescript
const source = `
// /// dependencies
// my package@^1.0.0  # Spaces not allowed
// ///
`;
const result = parseInlineDependencies(source, { strict: false });
expect(result.errors.length).toBeGreaterThan(0);
```

**Test 20: Version with invalid characters**
```typescript
const source = `
// /// dependencies
// axios@^1.6.0-alpha#beta  # Invalid semver
// ///
`;
const result = parseInlineDependencies(source, { strict: false });
expect(result.errors).toContainEqual(
  expect.objectContaining({ type: 'INVALID_VERSION' })
);
```

### 7.3 Integration Tests

**Test 21: SimplyMCP.fromFile() parses dependencies**
```typescript
const serverFile = '/tmp/test-server.ts';
await writeFile(serverFile, `
// /// dependencies
// axios@^1.6.0
// ///

import { SimplyMCP } from './SimplyMCP.js';
const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
`);

const server = await SimplyMCP.fromFile(serverFile);
expect(server.getDependencies()).toEqual({ 'axios': '^1.6.0' });
```

**Test 22: SimplyMCP.hasDependency()**
```typescript
const server = new SimplyMCP({
  name: 'test',
  version: '1.0.0',
  inlineDependencies: { 'axios': '^1.6.0', 'zod': '^3.22.0' },
});

expect(server.hasDependency('axios')).toBe(true);
expect(server.hasDependency('lodash')).toBe(false);
```

**Test 23: SimplyMCP.getDependencyVersion()**
```typescript
const server = new SimplyMCP({
  name: 'test',
  version: '1.0.0',
  inlineDependencies: { 'axios': '^1.6.0' },
});

expect(server.getDependencyVersion('axios')).toBe('^1.6.0');
expect(server.getDependencyVersion('zod')).toBeUndefined();
```

**Test 24: Export to package.json format**
```typescript
const deps = { 'axios': '^1.6.0', 'zod': '^3.22.0', 'typescript': '^5.0.0' };
const exported = exportToPackageJson(deps, {
  includeDevDeps: ['typescript'],
});

expect(exported.dependencies).toEqual({
  'axios': '^1.6.0',
  'zod': '^3.22.0',
});
expect(exported.devDependencies).toEqual({
  'typescript': '^5.0.0',
});
```

**Test 25: Detect conflicts with package.json**
```typescript
const serverPath = '/tmp/server.ts';
await writeFile(serverPath, `
// /// dependencies
// axios@^1.6.0
// ///
`);

await writeFile('/tmp/package.json', JSON.stringify({
  dependencies: { 'axios': '^1.5.0' },
}));

const { inline, packageJson, conflicts } = await detectDependencies(serverPath);
expect(conflicts).toContain('axios');
```

### 7.4 Edge Cases

**Test 26: Very long dependency list (100 packages)**
```typescript
const lines = ['// /// dependencies'];
for (let i = 0; i < 100; i++) {
  lines.push(`// package-${i}@^1.0.0`);
}
lines.push('// ///');

const source = lines.join('\n');
const result = parseInlineDependencies(source);
expect(Object.keys(result.dependencies)).toHaveLength(100);
```

**Test 27: Unicode package names (should fail)**
```typescript
const source = `
// /// dependencies
// 中文包@^1.0.0
// ///
`;
const result = parseInlineDependencies(source, { strict: false });
expect(result.errors.length).toBeGreaterThan(0);
```

**Test 28: Mixed line endings (CRLF and LF)**
```typescript
const source = "// /// dependencies\r\n// axios@^1.6.0\n// zod@^3.22.0\r\n// ///";
const result = parseInlineDependencies(source);
expect(Object.keys(result.dependencies)).toHaveLength(2);
```

**Test 29: Tabs vs spaces**
```typescript
const source = `
//\t///\tdependencies
//\taxios@^1.6.0
//   zod@^3.22.0
//\t///
`;
const result = parseInlineDependencies(source);
expect(Object.keys(result.dependencies)).toHaveLength(2);
```

**Test 30: Nested delimiters (should only parse outer)**
```typescript
const source = `
// /// dependencies
// axios@^1.6.0
// # /// nested
// # zod@^3.22.0
// # ///
// ///
`;
const result = parseInlineDependencies(source);
expect(result.dependencies).toEqual({ 'axios': '^1.6.0' });
```

---

## 8. Security Considerations

### 8.1 Package Name Validation

**Threats:**
- Malicious package names with special characters
- Path traversal attempts (`../../malicious`)
- Command injection attempts (`package; rm -rf /`)

**Mitigations:**
1. **Strict regex validation** - Only allow alphanumeric, `-`, `_`, `@`, `/`
2. **Lowercase enforcement** - npm requires lowercase
3. **Length limits** - Max 214 characters (npm limit)
4. **No leading dots or underscores**

**Implementation:**
```typescript
function validatePackageName(name: string): boolean {
  // Reject if too long
  if (name.length > 214) return false;

  // Reject if starts with . or _
  if (name.startsWith('.') || name.startsWith('_')) return false;

  // Reject if not lowercase
  if (name !== name.toLowerCase()) return false;

  // Reject if contains invalid characters
  const validPattern = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  return validPattern.test(name);
}
```

### 8.2 Version Specifier Validation

**Threats:**
- Injection attacks via version string
- Arbitrary code execution
- File system access

**Mitigations:**
1. **Semver-only** - Only allow valid semver ranges
2. **No shell characters** - Reject `;`, `|`, `&`, etc.
3. **Whitelist approach** - Only allow known-safe characters

**Implementation:**
```typescript
function validateSemverRange(version: string): boolean {
  // Allow special keywords
  if (['latest', 'next', '*', 'x'].includes(version)) return true;

  // Only allow semver characters
  const safePattern = /^[\d.*^~<>=x\-+]+$/i;
  if (!safePattern.test(version)) return false;

  // Additional validation...
  return true;
}
```

### 8.3 Denial of Service

**Threats:**
- Very large dependency lists (thousands of packages)
- Recursive parsing loops
- Memory exhaustion

**Mitigations:**
1. **Size limits** - Max 1000 dependencies
2. **Line limits** - Max 10,000 lines in metadata block
3. **Timeout** - Max parse time 5 seconds

**Implementation:**
```typescript
const MAX_DEPENDENCIES = 1000;
const MAX_METADATA_LINES = 10000;

function parseInlineDependencies(source: string): ParseResult {
  const lines = source.split('\n');

  // Limit total lines processed
  if (lines.length > MAX_METADATA_LINES) {
    throw new Error(`Metadata block too large (max ${MAX_METADATA_LINES} lines)`);
  }

  const dependencies = {};
  // ... parse ...

  if (Object.keys(dependencies).length > MAX_DEPENDENCIES) {
    throw new Error(`Too many dependencies (max ${MAX_DEPENDENCIES})`);
  }

  return { dependencies, errors: [], warnings: [], raw: '' };
}
```

### 8.4 Supply Chain Security

**Considerations:**
1. **Inline deps are just metadata** - Don't auto-install without user consent
2. **Verify package.json match** - Warn if mismatch detected
3. **No automatic execution** - Parsing doesn't install packages
4. **User confirmation** - Feature 3 (Auto-Install) should ask first

### 8.5 Input Sanitization

**Best Practices:**
1. Never use `eval()` or `Function()` on parsed data
2. Never execute shell commands with parsed data
3. Always validate before using in file paths
4. Always escape before displaying in logs

---

## 9. Performance Considerations

### 9.1 Parsing Performance

**Expected:**
- Parse time: <10ms for typical servers (10-50 dependencies)
- Parse time: <100ms for large servers (100-500 dependencies)

**Optimizations:**
1. **Early exit** - Stop at first metadata block
2. **Regex compilation** - Compile patterns once
3. **String operations** - Minimize allocations
4. **Lazy validation** - Only validate if requested

### 9.2 Memory Usage

**Expected:**
- Memory: <1MB for parsed dependencies
- No memory leaks from repeated parsing

**Optimizations:**
1. **Stream processing** - Don't load entire file if metadata is at top
2. **String interning** - Reuse common package names
3. **Garbage collection** - Clear temporary data

### 9.3 Caching

**Strategy:**
```typescript
const parseCache = new Map<string, ParseResult>();

function parseInlineDependenciesCached(
  filePath: string,
  mtime: number
): ParseResult {
  const cacheKey = `${filePath}:${mtime}`;

  if (parseCache.has(cacheKey)) {
    return parseCache.get(cacheKey)!;
  }

  const source = readFileSync(filePath, 'utf-8');
  const result = parseInlineDependencies(source);

  parseCache.set(cacheKey, result);
  return result;
}
```

---

## 10. Comparison with PEP 723

### 10.1 Similarities

1. **Comment-based metadata** - ✅ Both use comments
2. **Clear delimiters** - ✅ Both use `///` markers
3. **Dependency arrays** - ✅ Both support multiple dependencies
4. **Self-contained** - ✅ Both enable single-file distribution
5. **Tool-agnostic** - ✅ Both can be parsed by any tool

### 10.2 Differences

| Aspect | PEP 723 (Python) | SimplyMCP (TypeScript) |
|--------|------------------|------------------------|
| **Format** | TOML within comments | npm syntax within comments |
| **Delimiter** | `# /// script` | `// /// dependencies` |
| **Dependency syntax** | `["package>=1.0.0"]` | `package@^1.0.0` |
| **Multiple fields** | `requires-python`, `dependencies` | Only `dependencies` (for now) |
| **Language version** | `requires-python = ">=3.11"` | Not supported (could add `requires-node`) |
| **Ecosystem** | Python packaging (uv, pdm, pipx) | npm/yarn ecosystem |

### 10.3 Rationale for Differences

**Why not TOML?**
- JavaScript ecosystem uses JSON, not TOML
- npm uses `package@version` syntax everywhere
- Simpler parsing (no TOML parser needed)
- More familiar to JavaScript developers

**Why not JSON in comments?**
- Harder to parse (need JSON parser)
- More verbose
- Not as readable

**Why this hybrid approach?**
- Best of both worlds: PEP 723 delimiters + npm syntax
- Easy to parse (regex + string split)
- Familiar to both Python and JavaScript developers
- No external dependencies

---

## 11. Migration Path & Backward Compatibility

### 11.1 Existing Servers (No Changes Required)

**Before:**
```typescript
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

**After (still works):**
```typescript
// No changes needed - exact same code still works
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

### 11.2 Adding Inline Dependencies (Opt-In)

**Step 1: Add metadata block**
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

// ... rest of server ...
```

**Step 2: Use parsed dependencies (optional)**
```typescript
// If you want to access parsed dependencies:
const source = await readFile('./my-server.ts', 'utf-8');
const { dependencies } = parseInlineDependencies(source);

console.log('Dependencies:', dependencies);
// { "zod": "^3.22.0" }
```

**Step 3: Use SimplyMCP.fromFile() (optional)**
```typescript
// server-loader.ts
import { SimplyMCP } from './mcp/SimplyMCP.js';

const server = await SimplyMCP.fromFile('./my-server.ts');
console.log('Dependencies:', server.getDependencies());
```

### 11.3 Adoption Strategy

**Phase 1: Documentation (Week 1)**
- Document inline dependency format
- Provide examples
- Show migration path

**Phase 2: Examples (Week 2)**
- Update example servers to use inline deps
- Create tutorial
- Record demo video

**Phase 3: Tooling (Feature 3)**
- Add auto-installation support
- Add CLI commands
- Add validation tools

**Phase 4: Ecosystem (Future)**
- IDE extensions
- Linter rules
- Package managers

---

## 12. Open Questions & Design Decisions

### 12.1 Should we support `requires-node`?

**Question:**
Should we add a `requires-node` field like PEP 723's `requires-python`?

**Example:**
```typescript
// /// config
// requires-node: ">=20.0.0"
// ///

// /// dependencies
// axios@^1.6.0
// ///
```

**Decision: NO (for now)**
- Adds complexity
- Node version management is less common than Python
- Can be added later if needed
- Keep it simple for MVP

### 12.2 Should we support multiple metadata blocks?

**Question:**
Allow separate blocks for dependencies, devDependencies, etc.?

**Example:**
```typescript
// /// dependencies
// axios@^1.6.0
// ///

// /// devDependencies
// typescript@^5.0.0
// ///
```

**Decision: NO (for now)**
- Adds complexity
- Can distinguish later by convention (e.g., `# dev:` prefix)
- Most servers don't need this distinction
- Can be added in a future enhancement

### 12.3 Should we auto-parse in constructor?

**Question:**
Should `new SimplyMCP()` automatically parse inline deps from the caller file?

**Pros:**
- Zero-config experience
- Automatic without manual parsing

**Cons:**
- Requires stack trace analysis (fragile)
- Performance overhead
- Only works if SimplyMCP is created in same file
- Doesn't work with imports/exports

**Decision: NO (primary), YES (optional flag)**
- Provide `SimplyMCP.fromFile()` as recommended approach
- Allow `parseInlineDependencies: true` option for experimental auto-parse
- Document limitations clearly

### 12.4 How to handle version conflicts?

**Question:**
If inline dep says `axios@^1.6.0` but package.json says `axios@^1.5.0`, what should we do?

**Decision: WARN but use package.json**
- package.json is npm's source of truth
- Inline deps are informational/for auto-install
- Log warning if mismatch detected
- Don't throw error (non-blocking)

### 12.5 Should we generate package.json?

**Question:**
Should SimplyMCP provide a method to generate package.json from inline deps?

**Decision: YES (utility function)**
```typescript
import { exportToPackageJson } from './mcp/core/inline-deps/index.js';

const deps = { 'axios': '^1.6.0', 'zod': '^3.22.0' };
const { dependencies, devDependencies } = exportToPackageJson(deps);

// Write to package.json
const pkg = { name: 'my-server', version: '1.0.0', dependencies };
await writeFile('package.json', JSON.stringify(pkg, null, 2));
```

---

## 13. Implementation Checklist

### Phase 1: Core Parser (Days 1-2)

- [ ] Create `mcp/core/inline-deps/` directory
- [ ] Implement `types.ts`
  - [ ] `InlineDependencies` type
  - [ ] `ParseOptions` interface
  - [ ] `ParseResult` interface
  - [ ] `ValidationError` interface
- [ ] Implement `parser.ts`
  - [ ] `parseInlineDependencies()` function
  - [ ] `extractMetadataBlock()` helper
  - [ ] `parseMetadataBlock()` helper
  - [ ] `parseDependencyLine()` helper
  - [ ] Delimiter regex patterns
  - [ ] Comment handling
  - [ ] Error collection

### Phase 2: Validation (Day 3)

- [ ] Implement `validator.ts`
  - [ ] `validateDependencies()` function
  - [ ] `validatePackageName()` function
  - [ ] `validateSemverRange()` function
  - [ ] `checkForDuplicates()` function
  - [ ] npm package name rules
  - [ ] Semver pattern matching
  - [ ] Security checks

### Phase 3: SimplyMCP Integration (Day 4)

- [ ] Update `SimplyMCP.ts`
  - [ ] Add `inlineDependencies` field
  - [ ] Add `getDependencies()` method
  - [ ] Add `hasDependency()` method
  - [ ] Add `getDependencyVersion()` method
  - [ ] Add `static fromFile()` method
  - [ ] Update `SimplyMCPOptions` interface
- [ ] Create `core/inline-deps/index.ts`
  - [ ] Export all public APIs
  - [ ] Re-export types

### Phase 4: Utilities (Day 5)

- [ ] Implement utility functions
  - [ ] `exportToPackageJson()` function
  - [ ] `detectDependencies()` function
  - [ ] `mergeDependencies()` function
- [ ] Add caching (optional)
  - [ ] File mtime-based cache
  - [ ] Cache invalidation

### Phase 5: Examples (Day 6)

- [ ] Create `examples/inline-deps-demo.ts`
  - [ ] Simple server with inline deps
  - [ ] Use multiple dependencies
  - [ ] Show version ranges
  - [ ] Include comments
- [ ] Create `examples/class-based-inline-deps.ts`
  - [ ] Class-based server
  - [ ] Use `SimplyMCP.fromFile()`
  - [ ] Show dependency access
- [ ] Update existing examples
  - [ ] Add inline deps to `simple-server.ts`
  - [ ] Add inline deps to `binary-content-demo.ts`

### Phase 6: Tests (Days 7-8)

- [ ] Create `tests/inline-deps/test-parser.ts`
  - [ ] Test 1-10: Positive parsing tests
  - [ ] Test 11-20: Negative parsing tests
  - [ ] Test 21-25: Integration tests
  - [ ] Test 26-30: Edge cases
- [ ] Create `tests/inline-deps/test-validator.ts`
  - [ ] Package name validation tests
  - [ ] Semver validation tests
  - [ ] Duplicate detection tests
  - [ ] Security validation tests
- [ ] Create `tests/inline-deps/test-integration.ts`
  - [ ] SimplyMCP.fromFile() tests
  - [ ] Dependency access tests
  - [ ] Export to package.json tests
  - [ ] Conflict detection tests

### Phase 7: Documentation (Day 9)

- [ ] Create `docs/inline-dependencies.md`
  - [ ] Overview and motivation
  - [ ] Format specification
  - [ ] Grammar reference
  - [ ] Examples (10+)
  - [ ] API reference
  - [ ] Migration guide
  - [ ] Best practices
  - [ ] Troubleshooting
  - [ ] Comparison with PEP 723
- [ ] Update main README
  - [ ] Add inline dependencies section
  - [ ] Link to detailed docs
  - [ ] Quick example
- [ ] Update CHANGELOG
  - [ ] Document new feature
  - [ ] List all new APIs

### Phase 8: Polish & Review (Day 10)

- [ ] Code review
  - [ ] Security review
  - [ ] Performance review
  - [ ] API review
- [ ] Final testing
  - [ ] Run all tests
  - [ ] Test examples
  - [ ] Manual testing
- [ ] Documentation review
  - [ ] Accuracy check
  - [ ] Clarity check
  - [ ] Example validation

---

## 14. Feature 3 Integration (Auto-Installation)

### 14.1 How Inline Dependencies Enable Auto-Installation

**Current State (without inline deps):**
```bash
# User must manually create package.json
# User must manually run npm install
# No way to know what dependencies are needed
```

**With Inline Dependencies:**
```bash
# Tool can read inline deps
npx simplemcp run server.ts

# Tool parses: // /// dependencies ... ///
# Tool detects: axios@^1.6.0, zod@^3.22.0
# Tool asks: "Install 2 dependencies? (y/n)"
# Tool runs: npm install axios@^1.6.0 zod@^3.22.0
# Tool starts: server.ts
```

### 14.2 Shared Components

**Parser** (Feature 2 provides):
```typescript
// Feature 3 uses this to know what to install
const { dependencies } = parseInlineDependencies(source);
```

**Validator** (Feature 2 provides):
```typescript
// Feature 3 uses this to validate before install
const { valid, errors } = validateDependencies(dependencies);
if (!valid) throw new Error('Invalid dependencies');
```

**Package.json Integration** (Feature 2 provides):
```typescript
// Feature 3 uses this to update package.json
const pkgJson = exportToPackageJson(dependencies);
await writeFile('package.json', JSON.stringify(pkgJson, null, 2));
```

### 14.3 Design Considerations for Feature 3

**Feature 2 must provide:**
1. **Reliable parsing** - Feature 3 depends on accurate parsing
2. **Validation** - Feature 3 needs to validate before installing
3. **Conflict detection** - Feature 3 should warn about conflicts
4. **Export utilities** - Feature 3 needs to generate package.json

**Feature 2 should NOT do:**
1. **Auto-install** - That's Feature 3's job
2. **File system writes** - Only reading, not writing
3. **Network requests** - No npm API calls
4. **Package manager interaction** - Feature 3 handles this

---

## 15. Success Criteria

### 15.1 Feature Complete When:

- [ ] Parser extracts inline dependencies from source files
- [ ] Validator checks package names and semver ranges
- [ ] SimplyMCP can access parsed dependencies
- [ ] SimplyMCP.fromFile() parses and creates server
- [ ] Export to package.json format works
- [ ] All 30 test scenarios pass
- [ ] Examples demonstrate the feature
- [ ] Documentation is complete
- [ ] No critical or high-severity bugs
- [ ] Code review approved
- [ ] Performance benchmarks met (<10ms parse time)

### 15.2 User Acceptance Criteria:

1. **User can declare dependencies in server file**
   ```typescript
   // /// dependencies
   // axios@^1.6.0
   // ///
   ```

2. **User can access dependencies programmatically**
   ```typescript
   const deps = server.getDependencies();
   // { "axios": "^1.6.0" }
   ```

3. **User can create server from file**
   ```typescript
   const server = await SimplyMCP.fromFile('./server.ts');
   ```

4. **Existing servers work without changes**
   ```typescript
   // No inline deps → works exactly as before
   ```

5. **Clear errors for invalid syntax**
   ```typescript
   // Invalid package name → helpful error message
   ```

---

## 16. Risk Assessment

### 16.1 Technical Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **Parsing complexity** | MEDIUM | LOW | Use simple regex-based parser, extensive testing |
| **Security vulnerabilities** | HIGH | LOW | Strict validation, no code execution |
| **Performance issues** | LOW | LOW | Optimize parsing, add caching |
| **Breaking backward compatibility** | CRITICAL | VERY LOW | All new features are opt-in |
| **Integration with Feature 3** | MEDIUM | MEDIUM | Design with Feature 3 in mind, clear interfaces |

### 16.2 Implementation Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **Scope creep** | MEDIUM | MEDIUM | Stick to defined feature set, defer extras |
| **Testing gaps** | MEDIUM | LOW | Follow 30-scenario test plan |
| **Documentation incomplete** | LOW | LOW | Write docs alongside code |
| **API design changes** | MEDIUM | LOW | Review API early, get feedback |

### 16.3 User Experience Risks

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **Confusion about format** | MEDIUM | MEDIUM | Clear examples, comprehensive docs |
| **Not compatible with tools** | LOW | LOW | Use standard npm syntax |
| **Hard to debug** | MEDIUM | LOW | Clear error messages, validation |
| **Adoption resistance** | MEDIUM | MEDIUM | Show clear benefits, optional adoption |

---

## 17. Future Enhancements (Out of Scope)

### 17.1 Multiple Dependency Types (Phase 3+)

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

### 17.2 Node Version Requirement (Phase 4+)

```typescript
// /// config
// requires-node: ">=20.0.0"
// ///

// /// dependencies
// axios@^1.6.0
// ///
```

### 17.3 Custom Registry (Phase 4+)

```typescript
// /// dependencies
// private-package@^1.0.0  # registry: https://npm.company.com
// ///
```

### 17.4 Environment-Specific Dependencies (Phase 5+)

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

### 17.5 Dependency Groups (Phase 5+)

```typescript
// /// dependencies
// # Core
// @core/http: axios@^1.6.0
// @core/validation: zod@^3.22.0
//
// # Database
// @db/client: pg@^8.11.0
// @db/orm: drizzle-orm@^0.29.0
// ///
```

---

## 18. Examples Gallery

### Example 1: Weather Server

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
  name: 'weather-server',
  version: '1.0.0',
});

server.addTool({
  name: 'get_weather',
  description: 'Get current weather for a city',
  parameters: z.object({
    city: z.string().describe('City name'),
  }),
  execute: async (args) => {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${args.city}`
    );

    return `Weather in ${args.city}: ${response.data.main.temp}°C at ${format(new Date(), 'PPpp')}`;
  },
});

await server.start();
```

### Example 2: Database Server

```typescript
#!/usr/bin/env npx tsx
// /// dependencies
// pg@^8.11.0
// drizzle-orm@^0.29.0
// zod@^3.22.0
// ///

import { SimplyMCP } from './mcp/SimplyMCP.js';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const server = new SimplyMCP({
  name: 'database-server',
  version: '1.0.0',
});

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const db = drizzle(client);

server.addTool({
  name: 'query_users',
  description: 'Query users from database',
  parameters: z.object({
    limit: z.number().default(10),
  }),
  execute: async (args) => {
    const users = await db.select().from('users').limit(args.limit);
    return JSON.stringify(users, null, 2);
  },
});

await server.start();
```

### Example 3: No Dependencies

```typescript
#!/usr/bin/env npx tsx
// This server uses no external dependencies
// Just SimplyMCP and Node.js builtins

import { SimplyMCP } from './mcp/SimplyMCP.js';
import { readFile } from 'fs/promises';
import { z } from 'zod';

const server = new SimplyMCP({
  name: 'simple-server',
  version: '1.0.0',
});

server.addTool({
  name: 'read_file',
  description: 'Read a file from disk',
  parameters: z.object({
    path: z.string(),
  }),
  execute: async (args) => {
    const content = await readFile(args.path, 'utf-8');
    return content;
  },
});

await server.start();
```

### Example 4: Using SimplyMCP.fromFile()

```typescript
#!/usr/bin/env npx tsx
// server-loader.ts
// This file loads a server from another file and inspects its dependencies

import { SimplyMCP } from './mcp/SimplyMCP.js';

async function loadServer(serverPath: string) {
  console.log(`Loading server from ${serverPath}...`);

  const server = await SimplyMCP.fromFile(serverPath);

  console.log(`Server: ${server.getInfo().name}`);
  console.log(`Version: ${server.getInfo().version}`);

  const deps = server.getDependencies();
  if (deps) {
    console.log(`Dependencies:`);
    for (const [name, version] of Object.entries(deps)) {
      console.log(`  - ${name}@${version}`);
    }
  } else {
    console.log(`No inline dependencies declared`);
  }

  return server;
}

// Load and start server
const server = await loadServer('./weather-server.ts');
await server.start();
```

---

## 19. Summary

### 19.1 What This Feature Adds

- **Inline dependency declarations** - Declare dependencies in server files
- **PEP 723-inspired format** - Clear delimiters, comment-based
- **npm/yarn compatible** - Uses standard `package@version` syntax
- **Programmatic access** - Read dependencies via API
- **SimplyMCP.fromFile()** - Create servers from files with auto-parsing
- **Validation** - Check package names and semver ranges
- **Export utilities** - Generate package.json from inline deps
- **Fully backward compatible** - Existing servers work unchanged

### 19.2 What Users Can Do

**Before:**
```typescript
// Dependencies in package.json (separate file)
// No way to know what a server needs just by looking at it
```

**After:**
```typescript
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// ///

// Dependencies visible in the server file
// Self-contained, easy to share
// Ready for auto-installation (Feature 3)
```

### 19.3 Key Design Principles

1. **Simplicity** - Easy to read and write
2. **Compatibility** - Works with npm/yarn ecosystem
3. **Clarity** - Clear delimiters, unambiguous syntax
4. **Safety** - Strict validation, security checks
5. **Flexibility** - Multiple ways to use (manual parse, fromFile, etc.)
6. **Opt-in** - Existing servers work without changes

---

## 20. Next Steps for Agent 2 (Implementer)

1. **Read this entire plan carefully**
2. **Understand the chosen format** (Hybrid: PEP 723 delimiters + npm syntax)
3. **Follow the Implementation Checklist** (Section 13) in order
4. **Start with parser.ts** (easiest to test in isolation)
5. **Then implement validator.ts**
6. **Integrate with SimplyMCP.ts**
7. **Create examples** to validate the API
8. **Write all 30+ tests** from Section 7
9. **Document the feature** comprehensively
10. **Ask questions** if any requirements are unclear

**Estimated Implementation Time: 10 days**

**Critical Success Factors:**
- Parser must be robust (handles all edge cases)
- Validation must be strict (security is critical)
- API must be intuitive (users should understand it immediately)
- Documentation must be clear (examples for every use case)
- Tests must be comprehensive (cover all scenarios)

---

**Plan Version:** 1.0
**Created:** 2025-10-02
**Author:** Agent 1 (Planner)
**For:** SimplyMCP Phase 2, Feature 2
**Next:** Agent 2 (Implementer) executes this plan

---

## Appendix A: Complete Grammar Specification

```ebnf
(* Complete EBNF grammar for inline dependencies *)

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

## Appendix B: Test Data Examples

**Valid Inline Dependency Blocks:**

```typescript
// Example 1: Simple
// /// dependencies
// axios@^1.6.0
// ///

// Example 2: Multiple
// /// dependencies
// axios@^1.6.0
// zod@^3.22.0
// lodash@^4.17.21
// ///

// Example 3: With comments
// /// dependencies
// # HTTP libraries
// axios@^1.6.0  # HTTP client
//
// # Validation
// zod@^3.22.0   # Schema validation
// ///

// Example 4: Scoped packages
// /// dependencies
// @modelcontextprotocol/sdk@^1.0.0
// @types/node@^20.0.0
// ///

// Example 5: Version ranges
// /// dependencies
// lodash@^4.17.21
// axios@~1.6.0
// zod@>=3.22.0
// express@*
// typescript@latest
// next
// ///
```

**Invalid Inline Dependency Blocks:**

```typescript
// Invalid 1: Missing end delimiter
// /// dependencies
// axios@^1.6.0

// Invalid 2: Missing start delimiter
// axios@^1.6.0
// ///

// Invalid 3: Invalid package name
// /// dependencies
// UPPERCASE@^1.0.0
// ///

// Invalid 4: Invalid version
// /// dependencies
// axios@not-a-version
// ///

// Invalid 5: Missing comment prefix
// /// dependencies
axios@^1.6.0
// ///
```

---

**END OF PLAN**
