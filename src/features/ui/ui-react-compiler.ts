/**
 * UI React Compiler - Babel-based JSX/TSX compilation
 *
 * Compiles React components (.tsx, .jsx) to browser-ready JavaScript
 * with automatic React runtime injection.
 *
 * This compiler:
 * - Uses @babel/standalone for browser-compatible compilation
 * - Supports automatic JSX runtime (React 17+ style, no import needed)
 * - Strips TypeScript types while preserving JSX
 * - Generates source maps for debugging
 * - Injects React 18.x from CDN
 * - Wraps components in HTML boilerplate with root rendering
 *
 * @module ui-react-compiler
 */

import * as Babel from '@babel/standalone';

/**
 * React compilation result
 */
export interface CompiledReactComponent {
  /**
   * Complete HTML document with React runtime and compiled component
   */
  html: string;

  /**
   * Compiled JavaScript code (without HTML wrapper)
   */
  javascript: string;

  /**
   * Extracted component name from source code
   */
  componentName: string;

  /**
   * Source map for debugging (if enabled)
   */
  sourceMap?: string;
}

/**
 * React compiler options
 */
export interface ReactCompilerOptions {
  /**
   * Path to component file (used for source maps and error messages)
   */
  componentPath: string;

  /**
   * Component source code (TSX/JSX)
   */
  componentCode: string;

  /**
   * External dependencies to load from CDN
   * Example: ['recharts@2.5.0', 'lodash@4.17.21']
   */
  dependencies?: string[];

  /**
   * Generate source maps for debugging
   * @default true
   */
  sourceMaps?: boolean;

  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;
}

/**
 * Compile a React component to browser-ready HTML
 *
 * This function:
 * 1. Validates the component code structure
 * 2. Extracts the component name
 * 3. Compiles JSX/TSX to JavaScript using Babel
 * 4. Generates source maps (if enabled)
 * 5. Wraps in HTML with React runtime injection
 *
 * @param options - Compilation options
 * @returns Compiled component with HTML wrapper and metadata
 * @throws {Error} If compilation fails or component is invalid
 *
 * @example
 * ```typescript
 * const result = await compileReactComponent({
 *   componentPath: './ui/Counter.tsx',
 *   componentCode: `
 *     export default function Counter() {
 *       return <div><button>Click me</button></div>;
 *     }
 *   `,
 *   sourceMaps: true,
 *   verbose: false
 * });
 *
 * console.log(result.componentName); // 'Counter'
 * console.log(result.html); // Full HTML document
 * ```
 */
export async function compileReactComponent(
  options: ReactCompilerOptions
): Promise<CompiledReactComponent> {
  const {
    componentPath,
    componentCode,
    dependencies = [],
    sourceMaps = true,
    verbose = false,
  } = options;

  if (verbose) {
    console.log(`[React Compiler] Compiling: ${componentPath}`);
  }

  // Step 1: Validate component code before compilation
  validateComponentCode(componentCode, componentPath);

  // Step 2: Extract component name from source code
  const componentName = extractComponentName(componentCode);

  if (verbose) {
    console.log(`[React Compiler] Extracted component name: ${componentName}`);
  }

  // Step 3: Compile with Babel
  const babelOptions: any = {
    filename: componentPath,
    presets: [
      // Modern JSX transform (no React import needed)
      ['react', { runtime: 'automatic' }],
      // TypeScript preset - strip types, keep JSX
      ['typescript', { isTSX: true, allExtensions: true }],
    ],
    sourceMaps: sourceMaps,
  };

  let compiledCode: string;
  let sourceMap: string | undefined;

  try {
    const result = Babel.transform(componentCode, babelOptions);

    if (!result || !result.code) {
      throw new Error('Babel compilation failed: No output generated');
    }

    compiledCode = result.code;
    sourceMap = result.map ? JSON.stringify(result.map) : undefined;

    if (verbose) {
      console.log(
        `[React Compiler] Compiled successfully: ${compiledCode.length} bytes`
      );
    }
  } catch (error: any) {
    throw new Error(
      `Failed to compile React component: ${componentPath}\n` +
        `Error: ${error.message}\n` +
        `Hint: Check for syntax errors in your component.`
    );
  }

  // Step 4: Generate HTML wrapper with React runtime
  const html = generateHTMLWrapper({
    componentName,
    compiledCode,
    dependencies,
    sourceMap,
  });

  return {
    html,
    javascript: compiledCode,
    componentName,
    sourceMap,
  };
}

/**
 * Extract component name from source code
 *
 * Tries multiple patterns in order:
 * 1. export default function ComponentName
 * 2. export default ComponentName
 * 3. const ComponentName = () =>
 * 4. function ComponentName
 *
 * Falls back to 'App' if no pattern matches.
 *
 * @param code - Component source code
 * @returns Extracted component name or 'App' as fallback
 *
 * @internal
 */
function extractComponentName(code: string): string {
  // Try to extract from: export default function ComponentName
  const functionMatch = code.match(/export\s+default\s+function\s+(\w+)/);
  if (functionMatch) return functionMatch[1];

  // Try to extract from: export default ComponentName
  const directMatch = code.match(/export\s+default\s+(\w+)/);
  if (directMatch) return directMatch[1];

  // Try to extract from: const ComponentName = () =>
  const constArrowMatch = code.match(/const\s+(\w+)\s*=\s*\(/);
  if (constArrowMatch) return constArrowMatch[1];

  // Try to extract from: function ComponentName
  const namedFunctionMatch = code.match(/function\s+(\w+)/);
  if (namedFunctionMatch) return namedFunctionMatch[1];

  // Fallback to 'App'
  return 'App';
}

/**
 * Generate HTML wrapper with React runtime
 *
 * Creates a complete HTML document with:
 * - React 18.x runtime from CDN (production builds)
 * - External dependencies from CDN
 * - Compiled component code
 * - Root rendering logic
 * - Source maps (if provided)
 *
 * @param params - Wrapper generation parameters
 * @returns Complete HTML document string
 *
 * @internal
 */
function generateHTMLWrapper(params: {
  componentName: string;
  compiledCode: string;
  dependencies: string[];
  sourceMap?: string;
}): string {
  const { componentName, compiledCode, dependencies, sourceMap } = params;

  // React 18.x from CDN (unpkg)
  const reactVersion = '18.2.0';
  const reactURL = `https://unpkg.com/react@${reactVersion}/umd/react.production.min.js`;
  const reactDOMURL = `https://unpkg.com/react-dom@${reactVersion}/umd/react-dom.production.min.js`;

  // External dependencies from CDN (if any)
  // Format: 'package@version' or just 'package' for latest
  const dependencyScripts = dependencies
    .map((dep) => {
      // Parse package@version or just package
      const hasVersion = dep.includes('@');
      const packageSpec = hasVersion ? dep : `${dep}@latest`;
      return `<script src="https://unpkg.com/${packageSpec}/dist/index.umd.js"></script>`;
    })
    .join('\n    ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React UI Component</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #root { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>

  <!-- React Runtime (CDN) -->
  <script crossorigin src="${reactURL}"></script>
  <script crossorigin src="${reactDOMURL}"></script>

  <!-- External Dependencies -->
  ${dependencyScripts ? dependencyScripts : '<!-- No external dependencies -->'}

  <!-- Compiled Component -->
  <script>
    ${compiledCode}

    // Render component to root
    const container = document.getElementById('root');
    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(${componentName}));
  </script>

  ${sourceMap ? `<!-- Source Map -->\n  <script type="application/json" id="source-map">${sourceMap}</script>` : ''}
</body>
</html>`;
}

/**
 * Validate component code before compilation
 *
 * Performs basic validation to catch common errors early:
 * - Checks for JSX syntax (< and > tags)
 * - Ensures component has an export
 *
 * Throws descriptive errors for invalid components.
 * Warnings are logged for suspicious but valid code.
 *
 * @param code - Component source code to validate
 * @param componentPath - Path to component (for error messages)
 * @throws {Error} If component is missing required exports
 *
 * @example
 * ```typescript
 * // Valid component
 * validateComponentCode('export default function App() { return <div />; }', './App.tsx');
 *
 * // Invalid - throws error
 * validateComponentCode('function App() { return <div />; }', './App.tsx');
 * // Error: Component must have a default export
 * ```
 */
export function validateComponentCode(
  code: string,
  componentPath: string
): void {
  // Check for JSX/TSX syntax
  const hasJSX = code.includes('<') && code.includes('>');
  const hasExport = code.includes('export default') || code.includes('export {');

  if (!hasJSX) {
    console.warn(
      `[React Compiler] Warning: Component may not contain JSX: ${componentPath}\n` +
        `This might not be a valid React component.`
    );
  }

  if (!hasExport) {
    throw new Error(
      `Component must have a default export: ${componentPath}\n` +
        `Add: export default function YourComponent() { ... }`
    );
  }
}

/**
 * React component compilation cache
 *
 * Caches compiled components to avoid redundant compilation.
 * Cache is keyed by absolute file path.
 *
 * @internal
 */
const compilationCache = new Map<string, CompiledReactComponent>();

/**
 * Invalidate React compilation cache for a specific file
 *
 * Used in watch mode when a component file changes.
 * Removes the cached compilation result, forcing recompilation
 * on next access.
 *
 * @param componentPath - Absolute path to component file
 *
 * @example
 * ```typescript
 * // In watch mode handler
 * invalidateReactCache('/path/to/Counter.tsx');
 * ```
 */
export function invalidateReactCache(componentPath: string): void {
  compilationCache.delete(componentPath);
}

/**
 * Clear entire React compilation cache
 *
 * Removes all cached compilation results. Useful for:
 * - Development mode restarts
 * - Memory management
 * - Testing scenarios
 *
 * @example
 * ```typescript
 * // Clear all cached compilations
 * clearReactCache();
 * ```
 */
export function clearReactCache(): void {
  compilationCache.clear();
}

/**
 * Get React compilation cache statistics
 *
 * Returns information about cached components for debugging
 * and monitoring purposes.
 *
 * @returns Cache statistics including size and component paths
 *
 * @example
 * ```typescript
 * const stats = getReactCacheStats();
 * console.log(`Cached ${stats.size} components`);
 * console.log('Components:', stats.components);
 * ```
 */
export function getReactCacheStats(): { size: number; components: string[] } {
  return {
    size: compilationCache.size,
    components: Array.from(compilationCache.keys()),
  };
}
