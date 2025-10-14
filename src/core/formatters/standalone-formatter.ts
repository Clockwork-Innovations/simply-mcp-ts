import { mkdir, writeFile, copyFile, readdir, stat, chmod, readFile, unlink } from 'fs/promises';
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

  // Add shebang and make executable
  await addShebangAndMakeExecutable(serverPath);

  // Remove intermediate bundle.js to avoid duplication
  if (existsSync(bundlePath)) {
    await unlink(bundlePath);
  }

  const outputFiles = [serverPath];

  // 3. Generate package.json
  const packageJsonPath = await generatePackageJson(outputDir, dependencies);
  outputFiles.push(packageJsonPath);

  // 4. Copy ALL external dependencies (not just native modules)
  if (dependencies) {
    const copiedModules = await copyDependencies(outputDir, dependencies);
    outputFiles.push(...copiedModules);
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
    main: 'server.js',
    bin: {
      'server': './server.js'
    },
    // Only include dependencies if there are native modules
    ...(Object.keys(runtimeDeps).length > 0 ? { dependencies: runtimeDeps } : {}),
  };

  const packageJsonPath = join(outputDir, 'package.json');
  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

  return packageJsonPath;
}

/**
 * Copy dependencies to node_modules
 * Copies ALL dependencies that are marked as external (not bundled)
 */
async function copyDependencies(
  outputDir: string,
  dependencies: Record<string, string>
): Promise<string[]> {
  const nodeModulesDir = join(outputDir, 'node_modules');
  await mkdir(nodeModulesDir, { recursive: true });

  const copiedFiles: string[] = [];

  // Only copy native modules (non-native deps are bundled)
  const nativeModules = Object.keys(dependencies).filter(dep =>
    ['better-sqlite3', 'sharp', 'canvas', 'fsevents', 'sqlite3', 'bufferutil', 'utf-8-validate'].includes(dep)
  );

  for (const moduleName of nativeModules) {
    const sourceModulePath = join(process.cwd(), 'node_modules', moduleName);
    if (existsSync(sourceModulePath)) {
      const destModulePath = join(nodeModulesDir, moduleName);
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

/**
 * Add shebang to file and make it executable
 */
async function addShebangAndMakeExecutable(filePath: string): Promise<void> {
  // Read current content
  const content = await readFile(filePath, 'utf-8');

  // Only add shebang if it doesn't already exist
  if (!content.startsWith('#!')) {
    const withShebang = '#!/usr/bin/env node\n' + content;
    await writeFile(filePath, withShebang);
  }

  // Make executable
  await chmod(filePath, 0o755);
}
