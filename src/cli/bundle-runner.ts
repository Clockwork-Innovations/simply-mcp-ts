/**
 * Package Bundle Runner
 *
 * This module provides functionality to run npm package bundles as MCP servers.
 * It delegates to existing API style detection and execution logic after resolving
 * the bundle's entry point.
 *
 * Features:
 * - Supports both directory bundles and archive bundles (.tar.gz, .tgz, .zip)
 * - Automatic archive extraction with caching for fast subsequent runs
 * - Reads bundle.json manifests for metadata and entry point resolution
 * - Auto-install functionality for dependencies
 * - Automatic package manager detection
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
import { extractArchive } from '../core/extractor.js';
import { BundleCache } from '../utils/cache.js';
import { readManifest, type BundleManifest } from '../core/bundle-manifest.js';

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
 * 1. Detects if input is an archive (.tar.gz, .tgz, .zip) and extracts if needed
 * 2. Uses cache for extracted archives to speed up subsequent runs
 * 3. Reads bundle.json manifest if available (for archives)
 * 4. Reads and validates package.json
 * 5. Auto-installs dependencies if needed
 * 6. Resolves the entry point file (prefers manifest entry point)
 * 7. Detects the API style (or uses forced style)
 * 8. Delegates to the appropriate adapter for execution
 *
 * @param bundlePath - Path to package bundle directory or archive file (.tar.gz, .tgz, .zip)
 * @param options - Run options (transport, port, style, etc.)
 * @throws Error if archive is corrupted, package.json is invalid, or entry point cannot be resolved
 *
 * @example
 * ```typescript
 * // Run from directory bundle
 * await runPackageBundle('./my-mcp-server', {
 *   http: true,
 *   port: 3000,
 *   verbose: true
 * });
 *
 * // Run from archive bundle
 * await runPackageBundle('./my-mcp-server.tar.gz', {
 *   verbose: true
 * });
 * ```
 */
export async function runPackageBundle(
  bundlePath: string,
  options: RunOptions
): Promise<void> {
  const absoluteBundlePath = resolve(process.cwd(), bundlePath);
  let bundlePathToUse = absoluteBundlePath;
  let manifest: BundleManifest | null = null;

  // Detect if input is an archive
  const isArchive = /\.(tar\.gz|tgz|zip)$/i.test(bundlePath);

  if (isArchive) {
    if (options.verbose) {
      console.error(`[BundleRunner] Detected archive bundle: ${bundlePath}`);
    }

    try {
      // Create BundleCache instance with default cache dir
      const cache = new BundleCache();

      // Check if already cached
      const isCached = await cache.isCached(absoluteBundlePath);

      if (isCached) {
        if (options.verbose) {
          console.error(`[BundleRunner] Using cached bundle`);
        }
        bundlePathToUse = cache.getCachePath(absoluteBundlePath);
      } else {
        if (options.verbose) {
          console.error(`[BundleRunner] Extracting archive to cache...`);
        }

        // Get cache path for extraction
        const cachePath = cache.getCachePath(absoluteBundlePath);

        // Extract archive to cache path
        try {
          await extractArchive({
            archivePath: absoluteBundlePath,
            targetDir: cachePath,
          });

          bundlePathToUse = cachePath;

          if (options.verbose) {
            console.error(`[BundleRunner] Archive extracted successfully`);
          }
        } catch (error) {
          throw new Error(
            `Failed to extract archive: ${error instanceof Error ? error.message : String(error)}. ` +
            `The archive may be corrupted. Try re-downloading the bundle.`
          );
        }
      }

      // Try to read bundle.json manifest if it exists
      try {
        manifest = await readManifest(bundlePathToUse);
        if (options.verbose) {
          console.error(`[BundleRunner] Found bundle manifest`);
          console.error(`[BundleRunner] Bundle: ${manifest.name}@${manifest.version}`);
          if (manifest.description) {
            console.error(`[BundleRunner] Description: ${manifest.description}`);
          }
          console.error(`[BundleRunner] Entry point from manifest: ${manifest.entryPoint}`);
        }
      } catch (error) {
        // Manifest is optional, continue without it
        if (options.verbose) {
          console.error(`[BundleRunner] No bundle manifest found, will use package.json`);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`[BundleRunner] Archive extraction error: ${error.message}`);
        if (options.verbose && error.stack) {
          console.error(`[BundleRunner] Stack: ${error.stack}`);
        }
      }
      throw error;
    }
  }

  if (options.verbose && !isArchive) {
    console.error(`[BundleRunner] Detected package bundle: ${bundlePath}`);
  }

  try {
    // Try to read package.json if it exists
    // For bundles with manifests, package.json is optional (only needed for dependencies)
    let pkg: any = null;
    try {
      pkg = await readPackageJson(bundlePathToUse);
      if (options.verbose) {
        console.error(`[BundleRunner] Package: ${pkg.name}@${pkg.version}`);
        if (pkg.description) {
          console.error(`[BundleRunner] Description: ${pkg.description}`);
        }
      }
    } catch (error) {
      // If no package.json but we have a manifest, that's OK
      if (manifest) {
        if (options.verbose) {
          console.error(`[BundleRunner] No package.json found, using manifest only`);
        }
      } else {
        // No package.json and no manifest - this is an error
        throw error;
      }
    }

    // Check and install dependencies if needed (only if package.json exists)
    if (pkg) {
      const autoInstall = options.autoInstall ?? true;
      const forceInstall = options.forceInstall ?? false;
      const depsInstalled = await areDependenciesInstalled(bundlePathToUse);

      if (!depsInstalled || forceInstall) {
        if (autoInstall) {
          const packageManager = options.packageManager || detectPackageManager(bundlePathToUse);

          if (options.verbose) {
            console.error(`[BundleRunner] Dependencies ${forceInstall ? 'will be reinstalled' : 'not found'}`);
            console.error(`[BundleRunner] Using package manager: ${packageManager}`);
          }

          try {
            await installDependencies(bundlePathToUse, {
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
    } else if (options.verbose) {
      console.error(`[BundleRunner] No dependencies to install (no package.json)`);
    }

    // Resolve entry point
    // Prefer manifest entry point if available, otherwise use package.json
    let entryPoint: string;
    if (manifest?.entryPoint) {
      // Manifest entry point is relative to bundle directory
      entryPoint = resolve(bundlePathToUse, manifest.entryPoint);
      if (options.verbose) {
        console.error(`[BundleRunner] Using entry point from manifest: ${manifest.entryPoint}`);
      }
    } else if (pkg) {
      entryPoint = await resolveEntryPointWithFallback(pkg, bundlePathToUse);
      if (options.verbose) {
        console.error(`[BundleRunner] Using entry point from package.json`);
      }
    } else {
      throw new Error('Cannot resolve entry point: no manifest or package.json found');
    }

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
