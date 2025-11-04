/**
 * IUI v4.0 Example: Custom Build Configuration
 *
 * Override default build settings using simply-mcp.config.ts
 * Perfect for production optimization, custom CDN, etc.
 */

import { InterfaceServer, IUI } from '../../src/index.js';

const server = new InterfaceServer({
  name: 'config-ui-server',
  version: '1.0.0',
});

/**
 * Production-Optimized Dashboard
 *
 * Uses custom build config for optimization
 */
interface OptimizedDashboard extends IUI {
  uri: 'ui://optimized';
  name: 'Optimized Dashboard';
  description: 'Dashboard with production optimizations';

  source: './components/ProductionDashboard.tsx';

  // Build config is loaded from simply-mcp.config.ts:
  //
  // export default {
  //   build: {
  //     minify: true,          // Minify JS and HTML
  //     sourcemap: false,      // No sourcemaps in production
  //     external: [            // Use CDN for these
  //       'react',
  //       'react-dom',
  //       'recharts',
  //       'date-fns'
  //     ],
  //     format: 'iife',        // Immediately Invoked Function Expression
  //   },
  //   cdn: {
  //     baseUrl: 'https://cdn.example.com',  // Custom CDN
  //     sri: true,                            // Subresource Integrity
  //     compression: 'gzip',                  // Compression
  //   },
  //   performance: {
  //     track: true,           // Track performance metrics
  //     report: true,          // Generate performance reports
  //   }
  // }
}

/**
 * Development Dashboard
 *
 * Uses development-friendly settings
 */
interface DevDashboard extends IUI {
  uri: 'ui://dev';
  name: 'Dev Dashboard';
  description: 'Dashboard optimized for development';

  source: './components/DevDashboard.tsx';

  // Development config (simply-mcp.config.ts):
  //
  // export default {
  //   build: {
  //     minify: false,         // Readable code
  //     sourcemap: true,       // Enable sourcemaps
  //     external: [            // External dependencies
  //       'react',
  //       'react-dom'
  //     ],
  //   },
  //   performance: {
  //     track: true,           // Track for optimization
  //     report: false,         // Don't generate reports
  //   }
  // }
}

export default server;

/**
 * Example Config File: simply-mcp.config.ts
 *
 * Place this in your project root:
 *
 * ```typescript
 * export default {
 *   build: {
 *     // Enable/disable minification
 *     minify: process.env.NODE_ENV === 'production',
 *
 *     // Enable/disable sourcemaps
 *     sourcemap: process.env.NODE_ENV !== 'production',
 *
 *     // External dependencies (loaded from CDN)
 *     external: ['react', 'react-dom', 'recharts'],
 *
 *     // Output format
 *     format: 'iife',
 *   },
 *
 *   cdn: {
 *     // CDN base URL
 *     baseUrl: 'https://cdn.jsdelivr.net/npm',
 *
 *     // Subresource Integrity
 *     sri: false,
 *
 *     // Compression
 *     compression: 'none',
 *   },
 *
 *   performance: {
 *     // Track performance
 *     track: false,
 *
 *     // Generate reports
 *     report: false,
 *   }
 * };
 * ```
 */
