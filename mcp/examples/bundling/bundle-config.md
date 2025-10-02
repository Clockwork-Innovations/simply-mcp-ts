# Configuration Files

Use configuration files for complex bundling setups and repeatable builds.

## Configuration File Formats

SimpleMCP supports multiple config file formats:

- `simplemcp.config.js` (JavaScript)
- `simplemcp.config.ts` (TypeScript)
- `simplemcp.config.mjs` (ESM)
- `simplemcp.config.json` (JSON)
- `mcp.config.js` (Alternative naming)

## Basic Configuration

### JavaScript Config

Create `simplemcp.config.js`:

```javascript
export default {
  entry: './src/server.ts',
  output: {
    dir: 'dist',
    filename: 'server.bundle.js',
    format: 'single-file',
  },
  bundle: {
    minify: true,
    sourcemap: false,
    platform: 'node',
    target: 'node20',
    external: ['fsevents'],
  },
};
```

Run bundling:

```bash
simplemcp bundle
```

The CLI automatically finds and uses the config file!

### TypeScript Config

Create `simplemcp.config.ts`:

```typescript
import { SimpleMCPConfig } from 'simplemcp/bundler';

export default {
  entry: './src/server.ts',
  output: {
    dir: 'dist',
    filename: 'server.bundle.js',
    format: 'single-file',
  },
  bundle: {
    minify: true,
    sourcemap: false,
    platform: 'node',
    target: 'node20',
    external: ['fsevents', 'better-sqlite3'],
  },
} satisfies SimpleMCPConfig;
```

Benefits:
- Type checking
- IntelliSense
- Catch errors early

### JSON Config

Create `simplemcp.config.json`:

```json
{
  "entry": "./src/server.ts",
  "output": {
    "dir": "dist",
    "filename": "server.bundle.js",
    "format": "single-file"
  },
  "bundle": {
    "minify": true,
    "sourcemap": false,
    "platform": "node",
    "target": "node20",
    "external": ["fsevents"]
  }
}
```

Simple but no logic/comments.

## Configuration Options

### Entry Point

```javascript
export default {
  entry: './src/server.ts',  // Required: entry point file
};
```

### Output Configuration

```javascript
export default {
  output: {
    dir: 'dist',              // Output directory
    filename: 'bundle.js',    // Output filename
    format: 'single-file',    // Format: single-file|standalone|executable|esm|cjs
  },
};
```

### Bundle Options

```javascript
export default {
  bundle: {
    minify: true,             // Minify output
    sourcemap: false,         // Generate source maps
    platform: 'node',         // Platform: node|neutral
    target: 'node20',         // Target: node18|node20|node22|esnext
    external: [],             // External packages
    treeShake: true,          // Enable tree-shaking
    banner: '// My Server',   // Prepend to output
    footer: '// End',         // Append to output
  },
};
```

### Auto-Install

```javascript
export default {
  autoInstall: true,          // Auto-install dependencies
};
```

## Environment-Based Configuration

Use Node.js environment variables:

```javascript
const isProd = process.env.NODE_ENV === 'production';

export default {
  entry: './src/server.ts',
  output: {
    dir: 'dist',
    filename: isProd ? 'server.min.js' : 'server.dev.js',
    format: 'single-file',
  },
  bundle: {
    minify: isProd,
    sourcemap: !isProd,
    target: isProd ? 'node20' : 'esnext',
  },
};
```

Run with:

```bash
# Development
NODE_ENV=development simplemcp bundle

# Production
NODE_ENV=production simplemcp bundle
```

## Multiple Configurations

### Development & Production

Create separate configs:

**simplemcp.config.dev.js:**
```javascript
export default {
  entry: './src/server.ts',
  output: {
    dir: 'dist',
    filename: 'dev.js',
  },
  bundle: {
    minify: false,
    sourcemap: true,
  },
};
```

**simplemcp.config.prod.js:**
```javascript
export default {
  entry: './src/server.ts',
  output: {
    dir: 'dist',
    filename: 'prod.js',
  },
  bundle: {
    minify: true,
    sourcemap: false,
    target: 'node20',
  },
};
```

Use specific config:

```bash
simplemcp bundle --config simplemcp.config.dev.js
simplemcp bundle --config simplemcp.config.prod.js
```

## CLI Override

CLI options override config file:

```bash
# Config says minify: true, but CLI overrides
simplemcp bundle --no-minify

# Config says output: dist/bundle.js, but CLI overrides
simplemcp bundle --output build/server.js
```

## Complete Example

### Project Structure

```
my-server/
├── src/
│   └── server.ts
├── simplemcp.config.js
├── package.json
└── README.md
```

### Config File

```javascript
// simplemcp.config.js
const isProd = process.env.NODE_ENV === 'production';

export default {
  entry: './src/server.ts',

  output: {
    dir: 'dist',
    filename: isProd ? 'server.min.js' : 'server.dev.js',
    format: 'single-file',
  },

  bundle: {
    minify: isProd,
    sourcemap: !isProd,
    platform: 'node',
    target: 'node20',
    external: [
      'fsevents',           // Native module
      'better-sqlite3',     // Native module
    ],
    treeShake: true,
    banner: `
// SimpleMCP Server
// Generated: ${new Date().toISOString()}
// Environment: ${isProd ? 'production' : 'development'}
    `.trim(),
  },

  autoInstall: true,
};
```

### Package.json Scripts

```json
{
  "scripts": {
    "build": "NODE_ENV=production simplemcp bundle",
    "build:dev": "NODE_ENV=development simplemcp bundle",
    "watch": "simplemcp bundle --watch"
  }
}
```

### Usage

```bash
# Development build
npm run build:dev

# Production build
npm run build

# Watch mode
npm run watch
```

## Advanced Patterns

### Dynamic Entry Points

```javascript
const servers = ['server1.ts', 'server2.ts'];

export default servers.map(entry => ({
  entry: `./src/${entry}`,
  output: {
    dir: 'dist',
    filename: entry.replace('.ts', '.js'),
  },
}));
```

### Conditional Externals

```javascript
export default {
  bundle: {
    external: [
      'fsevents',
      ...(process.platform === 'win32' ? [] : ['better-sqlite3']),
    ],
  },
};
```

### Custom Banner/Footer

```javascript
import { readFileSync } from 'fs';

const version = JSON.parse(readFileSync('./package.json', 'utf-8')).version;

export default {
  bundle: {
    banner: `
/**
 * SimpleMCP Server v${version}
 * Copyright (c) 2025
 * Licensed under MIT
 */
    `.trim(),
  },
};
```

## Configuration Schema

Full TypeScript interface:

```typescript
interface SimpleMCPConfig {
  entry?: string;
  output?: {
    dir?: string;
    filename?: string;
    format?: 'single-file' | 'standalone' | 'executable' | 'esm' | 'cjs';
  };
  bundle?: {
    minify?: boolean;
    sourcemap?: 'inline' | 'external' | 'both' | false;
    platform?: 'node' | 'neutral';
    target?: 'node18' | 'node20' | 'node22' | 'esnext';
    external?: string[];
    treeShake?: boolean;
    banner?: string;
    footer?: string;
  };
  autoInstall?: boolean;
  dependencies?: Record<string, string>;
}
```

## Best Practices

1. **Use TypeScript config** for type safety
2. **Environment-based config** for flexibility
3. **Version in git** for reproducibility
4. **Document your config** with comments
5. **Test both dev and prod builds**

## Next Steps

- [Basic Bundling](./bundle-basic.md) - Start with simple examples
- [Advanced Bundling](./bundle-advanced.md) - Learn all CLI options
