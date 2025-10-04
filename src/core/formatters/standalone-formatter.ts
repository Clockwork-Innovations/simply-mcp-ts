import { mkdir, writeFile, copyFile, readdir, stat } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { existsSync } from 'fs';

export interface StandaloneOptions {
  bundlePath: string;
  outputDir: string;
  includeAssets?: string[];
  includeNativeModules?: boolean;
  dependencies?: Record<string, string>;
}

/**
 * Create standalone bundle (directory format)
 */
export async function createStandaloneBundle(
  options: StandaloneOptions
): Promise<{ outputDir: string; files: string[] }> {
  const { bundlePath, outputDir, includeAssets, includeNativeModules, dependencies } = options;

  // 1. Create output directory
  await mkdir(outputDir, { recursive: true });

  // 2. Copy bundle
  const serverPath = join(outputDir, 'server.js');
  await copyFile(bundlePath, serverPath);

  const outputFiles = [serverPath];

  // 3. Generate package.json
  const packageJsonPath = await generatePackageJson(outputDir, dependencies);
  outputFiles.push(packageJsonPath);

  // 4. Copy native modules (if any)
  if (includeNativeModules && dependencies) {
    const nativeModules = await copyNativeModules(outputDir, dependencies);
    outputFiles.push(...nativeModules);
  }

  // 5. Copy assets (if specified)
  if (includeAssets && includeAssets.length > 0) {
    const assets = await copyAssets(outputDir, includeAssets);
    outputFiles.push(...assets);
  }

  return {
    outputDir,
    files: outputFiles,
  };
}

/**
 * Generate minimal package.json
 */
async function generatePackageJson(
  outputDir: string,
  dependencies?: Record<string, string>
): Promise<string> {
  // Only include native modules in dependencies
  const nativeModules = ['better-sqlite3', 'sharp', 'canvas', 'fsevents', 'sqlite3'];
  const runtimeDeps: Record<string, string> = {};

  if (dependencies) {
    for (const [name, version] of Object.entries(dependencies)) {
      if (nativeModules.includes(name)) {
        runtimeDeps[name] = version;
      }
    }
  }

  const packageJson = {
    name: 'bundled-simplemcp-server',
    version: '1.0.0',
    type: 'module',
    main: 'server.js',
    scripts: {
      start: 'node server.js',
    },
    dependencies: runtimeDeps,
  };

  const packageJsonPath = join(outputDir, 'package.json');
  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

  return packageJsonPath;
}

/**
 * Copy native modules to node_modules
 */
async function copyNativeModules(
  outputDir: string,
  dependencies: Record<string, string>
): Promise<string[]> {
  const nativeModules = Object.keys(dependencies).filter(dep =>
    ['better-sqlite3', 'sharp', 'canvas', 'fsevents', 'sqlite3'].includes(dep)
  );

  const copiedFiles: string[] = [];

  for (const moduleName of nativeModules) {
    const sourceModulePath = join(process.cwd(), 'node_modules', moduleName);
    if (existsSync(sourceModulePath)) {
      const destModulePath = join(outputDir, 'node_modules', moduleName);
      await copyDirectory(sourceModulePath, destModulePath);
      copiedFiles.push(destModulePath);
    }
  }

  return copiedFiles;
}

/**
 * Copy assets
 */
async function copyAssets(
  outputDir: string,
  assetPatterns: string[]
): Promise<string[]> {
  const assetsDir = join(outputDir, 'assets');
  await mkdir(assetsDir, { recursive: true });

  const copiedFiles: string[] = [];

  for (const pattern of assetPatterns) {
    // Handle both absolute and relative paths correctly
    const sourcePath = pattern.startsWith('/') ? pattern : join(process.cwd(), pattern);
    if (existsSync(sourcePath)) {
      const destPath = join(assetsDir, basename(pattern));
      await copyFile(sourcePath, destPath);
      copiedFiles.push(destPath);
    }
  }

  return copiedFiles;
}

/**
 * Recursively copy a directory
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  // Create destination directory
  await mkdir(dest, { recursive: true });

  // Read source directory
  const entries = await readdir(src, { withFileTypes: true });

  // Copy each entry
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectory
      await copyDirectory(srcPath, destPath);
    } else {
      // Copy file
      await copyFile(srcPath, destPath);
    }
  }
}
