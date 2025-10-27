/**
 * Example SimpleMCP configuration file
 * Copy this to simplemcp.config.js and customize for your project
 */

// Check if we're in production mode
const isProd = process.env.NODE_ENV === 'production';

export default {
  // Entry point file (required if not provided via CLI)
  entry: './server.ts',

  // Output configuration
  output: {
    dir: 'dist',                            // Output directory
    filename: 'server.bundle.js',           // Output filename
    format: 'single-file',                  // Format: single-file | standalone | executable | esm | cjs
  },

  // Bundle options
  bundle: {
    minify: isProd,                         // Minify in production only
    sourcemap: !isProd,                     // Source maps in development only
    platform: 'node',                       // Target platform: node | neutral
    target: 'node20',                       // Target version: node18 | node20 | node22 | esnext

    // External packages (not bundled)
    external: [
      'fsevents',                           // Native module (macOS file watching)
      'better-sqlite3',                     // Native SQLite binding
    ],

    treeShake: true,                        // Enable tree-shaking (dead code elimination)

    // Optional: Add banner to output
    banner: `
/**
 * SimpleMCP Server Bundle
 * Generated: ${new Date().toISOString()}
 * Environment: ${isProd ? 'production' : 'development'}
 */
    `.trim(),
  },

  // Auto-install dependencies before bundling
  autoInstall: false,

  // Optional: Inline dependencies (can also be declared in source)
  dependencies: {
    // 'axios': '^1.6.0',
    // 'zod': '^3.22.0',
  },
};

/**
 * Alternative configurations for different scenarios:
 */

// Development configuration
// export default {
//   entry: './server.ts',
//   output: {
//     dir: 'dist',
//     filename: 'dev.js',
//     format: 'single-file',
//   },
//   bundle: {
//     minify: false,
//     sourcemap: true,
//     target: 'esnext',
//   },
// };

// Standalone distribution
// export default {
//   entry: './server.ts',
//   output: {
//     dir: 'dist',
//     format: 'standalone',
//   },
//   bundle: {
//     minify: true,
//     external: ['fsevents'],
//   },
// };

// Executable format
// export default {
//   entry: './server.ts',
//   output: {
//     dir: 'dist',
//     filename: 'server',
//     format: 'executable',
//   },
//   bundle: {
//     minify: true,
//   },
// };

// ESM format for modern Node.js
// export default {
//   entry: './server.ts',
//   output: {
//     dir: 'dist',
//     filename: 'server.mjs',
//     format: 'esm',
//   },
//   bundle: {
//     minify: true,
//     platform: 'node',
//     target: 'node20',
//   },
// };
