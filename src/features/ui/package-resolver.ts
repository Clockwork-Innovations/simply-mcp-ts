/**
 * Package Resolver - NPM package resolution with CDN fallback
 *
 * Resolves npm packages from local node_modules or CDN (unpkg.com).
 * Supports version resolution and caching for performance.
 */

import { existsSync } from 'fs';
import { resolve, join } from 'path';

/**
 * Package resolution result
 */
export interface PackageResolution {
  /** Package name */
  name: string;
  /** Resolved version */
  version: string;
  /** Local path or CDN URL */
  path: string;
  /** Resolution source */
  source: 'local' | 'cdn';
}

/**
 * Package resolver options
 */
export interface ResolverOptions {
  /** Base directory for node_modules lookup */
  baseDir?: string;
  /** Force CDN (skip local lookup) */
  forceCDN?: boolean;
  /** CDN base URL */
  cdnBase?: string;
}

/**
 * Package Resolver
 *
 * Resolves npm packages to local paths or CDN URLs.
 */
export class PackageResolver {
  private cache = new Map<string, PackageResolution>();
  private baseDir: string;
  private cdnBase: string;

  constructor(options: ResolverOptions = {}) {
    this.baseDir = options.baseDir || process.cwd();
    this.cdnBase = options.cdnBase || 'https://unpkg.com';
  }

  /**
   * Resolve package to local path or CDN URL
   */
  async resolve(packageName: string, version?: string): Promise<PackageResolution> {
    const cacheKey = `${packageName}@${version || 'latest'}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Try local first
    const localResolution = this.resolveLocal(packageName, version);
    if (localResolution) {
      this.cache.set(cacheKey, localResolution);
      return localResolution;
    }

    // Fallback to CDN
    const cdnResolution = this.resolveCDN(packageName, version);
    this.cache.set(cacheKey, cdnResolution);
    return cdnResolution;
  }

  /**
   * Check if package exists in local node_modules
   */
  hasLocalPackage(packageName: string): boolean {
    const packagePath = this.getLocalPackagePath(packageName);
    return existsSync(packagePath);
  }

  /**
   * Get CDN URL for package
   */
  getCDNUrl(packageName: string, version: string = 'latest'): string {
    return `${this.cdnBase}/${packageName}@${version}`;
  }

  /**
   * Clear resolution cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Resolve package from local node_modules
   */
  private resolveLocal(packageName: string, version?: string): PackageResolution | null {
    const packagePath = this.getLocalPackagePath(packageName);

    if (!existsSync(packagePath)) {
      return null;
    }

    // Read package.json for version
    const packageJsonPath = join(packagePath, 'package.json');
    let resolvedVersion = version || 'unknown';

    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(require('fs').readFileSync(packageJsonPath, 'utf-8'));
        resolvedVersion = packageJson.version || resolvedVersion;
      } catch {
        // Ignore parse errors
      }
    }

    return {
      name: packageName,
      version: resolvedVersion,
      path: packagePath,
      source: 'local',
    };
  }

  /**
   * Resolve package from CDN
   */
  private resolveCDN(packageName: string, version?: string): PackageResolution {
    const resolvedVersion = version || 'latest';
    const cdnUrl = this.getCDNUrl(packageName, resolvedVersion);

    return {
      name: packageName,
      version: resolvedVersion,
      path: cdnUrl,
      source: 'cdn',
    };
  }

  /**
   * Get local package path in node_modules
   */
  private getLocalPackagePath(packageName: string): string {
    return resolve(this.baseDir, 'node_modules', packageName);
  }
}

/**
 * Default package resolver instance
 */
export const resolver = new PackageResolver();
