import { exec as pkgExec } from 'pkg';
import { existsSync } from 'fs';
import { stat, mkdir } from 'fs/promises';
import { dirname } from 'path';

export interface ExecutableOptions {
  bundlePath: string;
  outputPath: string;
  platforms?: string[];
  compress?: boolean;
  assets?: string[];
}

const PLATFORM_TARGETS: Record<string, string> = {
  'linux': 'node18-linux-x64',
  'macos': 'node18-macos-x64',
  'macos-arm': 'node18-macos-arm64',
  'windows': 'node18-win-x64',
  'alpine': 'node18-alpine-x64',
};

/**
 * Create native executable
 */
export async function createExecutable(
  options: ExecutableOptions
): Promise<{ executables: string[]; size: number }> {
  const { bundlePath, outputPath, platforms = ['linux'], compress = true, assets } = options;

  // Create output directory
  await mkdir(dirname(outputPath), { recursive: true });

  // Build targets
  const targets = platforms.map(platform => PLATFORM_TARGETS[platform] || platform);

  console.log(`[Executable] Building for: ${targets.join(', ')}`);

  // Run pkg
  await pkgExec([
    bundlePath,
    '--targets', targets.join(','),
    '--output', outputPath,
    ...(compress ? ['--compress', 'GZip'] : []),
    ...(assets ? ['--assets', assets.join(',')] : []),
  ]);

  // Generate output paths
  const executables: string[] = [];
  let totalSize = 0;

  for (const platform of platforms) {
    let execPath = outputPath;

    if (platforms.length > 1) {
      // Multiple platforms: add suffix
      execPath = `${outputPath}-${platform}${platform === 'windows' ? '.exe' : ''}`;
    } else if (platform === 'windows') {
      // Single Windows platform
      execPath = `${outputPath}.exe`;
    }

    executables.push(execPath);

    // Get file size
    if (existsSync(execPath)) {
      const stats = await stat(execPath);
      totalSize += stats.size;
    }
  }

  return { executables, size: totalSize };
}

/**
 * Validate executable
 */
export async function validateExecutable(execPath: string): Promise<boolean> {
  if (!existsSync(execPath)) {
    return false;
  }

  // Check if executable
  const stats = await stat(execPath);
  if (!stats.isFile()) {
    return false;
  }

  // Check permissions (Unix)
  if (process.platform !== 'win32') {
    const mode = stats.mode;
    const isExecutable = (mode & 0o111) !== 0;
    if (!isExecutable) {
      console.warn(`[Executable] Warning: ${execPath} is not executable`);
    }
  }

  return true;
}
