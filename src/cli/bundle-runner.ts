/**
 * Package Bundle Runner
 *
 * This module provides functionality to run npm package bundles as MCP servers.
 * It delegates to existing API style detection and execution logic after resolving
 * the bundle's entry point.
 *
 * Feature Layer: Includes auto-install functionality for dependencies.
 * Automatically detects package manager and installs dependencies if needed.
 */

import { resolve } from 'node:path';
import { readPackageJson, resolveEntryPointWithFallback } from './package-detector.js';
import { detectAPIStyle, type APIStyle } from './run.js';
import {
  areDependenciesInstalled,
  detectPackageManager,
  installDependencies,
  type PackageManager,
} from './dependency-manager.js';

/**
 * Options for running a package bundle
 * These match the existing run command options
 */
export interface RunOptions {
  /** Use HTTP transport instead of stdio */
  http?: boolean;
  /** Use HTTP transport in stateless mode */
  httpStateless?: boolean;
  /** Port for HTTP server */
  port?: number;
  /** Force specific API style */
  style?: APIStyle;
  /** Show detection details and config info */
  verbose?: boolean;
  /** Auto-install dependencies if not present (default: true) */
  autoInstall?: boolean;
  /** Specify package manager (auto-detect if not specified) */
  packageManager?: PackageManager;
  /** Force reinstall dependencies even if already installed */
  forceInstall?: boolean;
}

/**
 * Run a package bundle as an MCP server
 *
 * This function:
 * 1. Reads and validates package.json
 * 2. Resolves the entry point file
 * 3. Detects the API style (or uses forced style)
 * 4. Delegates to the appropriate adapter for execution
 *
 * @param bundlePath - Path to the package bundle directory
 * @param options - Run options (transport, port, style, etc.)
 * @throws Error if package.json is invalid or entry point cannot be resolved
 *
 * @example
 * ```typescript
 * await runPackageBundle('./my-mcp-server', {
 *   http: true,
 *   port: 3000,
 *   verbose: true
 * });
 * ```
 */
export async function runPackageBundle(
  bundlePath: string,
  options: RunOptions
): Promise<void> {
  const absoluteBundlePath = resolve(process.cwd(), bundlePath);

  if (options.verbose) {
    console.error(`[BundleRunner] Detected package bundle: ${bundlePath}`);
  }

  try {
    // Read and validate package.json
    const pkg = await readPackageJson(absoluteBundlePath);

    if (options.verbose) {
      console.error(`[BundleRunner] Package: ${pkg.name}@${pkg.version}`);
      if (pkg.description) {
        console.error(`[BundleRunner] Description: ${pkg.description}`);
      }
    }

    // Check and install dependencies if needed
    const autoInstall = options.autoInstall ?? true;
    const forceInstall = options.forceInstall ?? false;
    const depsInstalled = await areDependenciesInstalled(absoluteBundlePath);

    if (!depsInstalled || forceInstall) {
      if (autoInstall) {
        const packageManager = options.packageManager || detectPackageManager(absoluteBundlePath);

        if (options.verbose) {
          console.error(`[BundleRunner] Dependencies ${forceInstall ? 'will be reinstalled' : 'not found'}`);
          console.error(`[BundleRunner] Using package manager: ${packageManager}`);
        }

        try {
          await installDependencies(absoluteBundlePath, {
            packageManager,
            silent: !options.verbose,
            force: forceInstall,
          });
        } catch (error) {
          if (error instanceof Error) {
            console.error(`[BundleRunner] Failed to install dependencies: ${error.message}`);
            if (options.verbose && error.stack) {
              console.error(`[BundleRunner] Stack: ${error.stack}`);
            }
          }
          throw new Error(`Dependency installation failed. Cannot run bundle without dependencies.`);
        }
      } else {
        console.error(`[BundleRunner] Warning: Dependencies not installed and auto-install is disabled`);
        console.error(`[BundleRunner] The bundle may not work correctly without dependencies`);
      }
    } else if (options.verbose) {
      console.error(`[BundleRunner] Dependencies already installed`);
    }

    // Resolve entry point
    const entryPoint = await resolveEntryPointWithFallback(pkg, absoluteBundlePath);

    if (options.verbose) {
      console.error(`[BundleRunner] Resolved entry point: ${entryPoint}`);
    }

    // Detect or use forced API style
    const style = options.style || (await detectAPIStyle(entryPoint));

    if (options.verbose) {
      console.error(`[BundleRunner] Detected API style: ${style}`);
      if (options.style) {
        console.error(`[BundleRunner] Style was forced via --style flag`);
      }
    }

    // Import adapter functions
    // We use dynamic imports to avoid circular dependencies
    const { runInterfaceAdapter } = await import('./run.js').then(mod => ({
      runInterfaceAdapter: async (
        filePath: string,
        useHttp: boolean,
        useHttpStateless: boolean,
        port: number,
        verbose: boolean
      ) => {
        await import('reflect-metadata');
        const { loadInterfaceServer } = await import('../server/adapter.js');
        const { startServer, displayServerInfo } = await import('./adapter-utils.js');

        const server = await loadInterfaceServer({
          filePath: filePath,
          verbose: verbose || false,
        });

        displayServerInfo(server);
        await startServer(server, { useHttp: useHttp || useHttpStateless, port, verbose, stateful: !useHttpStateless });
      }
    }));

    const useHttp = options.http ?? false;
    const useHttpStateless = options.httpStateless ?? false;
    const port = options.port ?? 3000;
    const verbose = options.verbose ?? false;

    await runInterfaceAdapter(entryPoint, useHttp, useHttpStateless, port, verbose);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[BundleRunner] Error: ${error.message}`);
      if (options.verbose && error.stack) {
        console.error(`[BundleRunner] Stack: ${error.stack}`);
      }
    } else {
      console.error(`[BundleRunner] Error:`, error);
    }
    process.exit(1);
  }
}
