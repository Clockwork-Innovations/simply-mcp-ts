/**
 * Environment capability detection for conditional test execution.
 *
 * These utilities detect whether the current environment supports various
 * features required by tests, allowing tests to run on capable systems
 * (like development laptops) while automatically skipping on limited
 * environments (like cloud IDEs, CI without certain features, etc.)
 */

import { spawn } from 'child_process';
import { createServer } from 'http';

/**
 * Cache for capability detection results to avoid repeated checks
 */
const capabilityCache = new Map<string, boolean>();

/**
 * Detects if the environment supports spawning child processes for servers.
 * Required for: stdio transport tests, E2E tests with server spawning
 */
export async function canSpawnServers(): Promise<boolean> {
  const cacheKey = 'canSpawnServers';
  if (capabilityCache.has(cacheKey)) {
    return capabilityCache.get(cacheKey)!;
  }

  try {
    // Try to spawn a simple echo process
    const child = spawn('node', ['--version'], {
      stdio: 'pipe',
      timeout: 2000,
    });

    const result = await new Promise<boolean>((resolve) => {
      child.on('error', () => resolve(false));
      child.on('exit', (code) => resolve(code === 0));
      setTimeout(() => {
        child.kill();
        resolve(false);
      }, 2000);
    });

    capabilityCache.set(cacheKey, result);
    return result;
  } catch {
    capabilityCache.set(cacheKey, false);
    return false;
  }
}

/**
 * Detects if the environment can bind HTTP servers to ports.
 * Required for: HTTP transport tests, integration tests with HTTP servers
 */
export async function canBindHttpServer(): Promise<boolean> {
  const cacheKey = 'canBindHttpServer';
  if (capabilityCache.has(cacheKey)) {
    return capabilityCache.get(cacheKey)!;
  }

  try {
    const server = createServer();

    const result = await new Promise<boolean>((resolve) => {
      server.once('error', () => resolve(false));
      server.listen(0, 'localhost', () => {
        server.close(() => resolve(true));
      });
      setTimeout(() => {
        server.close();
        resolve(false);
      }, 2000);
    });

    capabilityCache.set(cacheKey, result);
    return result;
  } catch {
    capabilityCache.set(cacheKey, false);
    return false;
  }
}

/**
 * Detects if the environment supports Web Worker API.
 * Required for: Browser-based tests, RemoteDOMWorker tests
 */
export function hasWorkerAPI(): boolean {
  const cacheKey = 'hasWorkerAPI';
  if (capabilityCache.has(cacheKey)) {
    return capabilityCache.get(cacheKey)!;
  }

  try {
    // In Node.js, Worker is available from 'worker_threads'
    // In browser, it's a global
    const result = typeof Worker !== 'undefined' ||
                   (typeof globalThis !== 'undefined' && 'Worker' in globalThis);
    capabilityCache.set(cacheKey, result);
    return result;
  } catch {
    capabilityCache.set(cacheKey, false);
    return false;
  }
}

/**
 * Detects if the environment supports import.meta.url.
 * Required for: Tests using dynamic imports with file paths
 */
export function hasImportMetaUrl(): boolean {
  const cacheKey = 'hasImportMetaUrl';
  if (capabilityCache.has(cacheKey)) {
    return capabilityCache.get(cacheKey)!;
  }

  try {
    // Check if we're in an ES module context with import.meta support
    const result = typeof import.meta !== 'undefined' &&
                   typeof import.meta.url === 'string';
    capabilityCache.set(cacheKey, result);
    return result;
  } catch {
    capabilityCache.set(cacheKey, false);
    return false;
  }
}

/**
 * Detects if running in a cloud IDE or restricted environment.
 * This is a heuristic based on common environment variables.
 */
export function isCloudIDE(): boolean {
  const cacheKey = 'isCloudIDE';
  if (capabilityCache.has(cacheKey)) {
    return capabilityCache.get(cacheKey)!;
  }

  // Common cloud IDE environment indicators
  const cloudEnvVars = [
    'CODESPACES',           // GitHub Codespaces
    'GITPOD_WORKSPACE_ID',  // Gitpod
    'AWS_CLOUD9_USER',      // AWS Cloud9
    'REPL_ID',              // Replit
    'GLITCH_CONTAINER',     // Glitch
    'CODESANDBOX_HOST',     // CodeSandbox
    'ANTHROPIC_AGENT_SDK',  // Claude Code / Anthropic environments
  ];

  const result = cloudEnvVars.some((envVar) => process.env[envVar] !== undefined);
  capabilityCache.set(cacheKey, result);
  return result;
}

/**
 * Detects if the environment supports browser automation (Puppeteer/Playwright).
 * Required for: E2E UI tests, browser-based integration tests
 */
export function hasBrowserAutomation(): boolean {
  const cacheKey = 'hasBrowserAutomation';
  if (capabilityCache.has(cacheKey)) {
    return capabilityCache.get(cacheKey)!;
  }

  try {
    // Check if puppeteer or playwright are available
    // We don't actually import them to avoid errors
    const hasPuppeteer = (() => {
      try {
        require.resolve('puppeteer');
        return true;
      } catch {
        return false;
      }
    })();

    const hasPlaywright = (() => {
      try {
        require.resolve('playwright');
        return true;
      } catch {
        return false;
      }
    })();

    const result = hasPuppeteer || hasPlaywright;
    capabilityCache.set(cacheKey, result);
    return result;
  } catch {
    capabilityCache.set(cacheKey, false);
    return false;
  }
}

/**
 * Detects if the environment enforces file permissions.
 * Required for: Tests that rely on chmod/file permission errors
 * Returns false in containers and some cloud environments where permissions aren't enforced.
 */
export async function canEnforceFilePermissions(): Promise<boolean> {
  const cacheKey = 'canEnforceFilePermissions';
  if (capabilityCache.has(cacheKey)) {
    return capabilityCache.get(cacheKey)!;
  }

  // Windows doesn't support Unix-style permissions
  if (process.platform === 'win32') {
    capabilityCache.set(cacheKey, false);
    return false;
  }

  try {
    const fs = await import('fs/promises');
    const os = await import('os');
    const path = await import('path');

    // Create a temporary test file
    const tmpDir = os.tmpdir();
    const testFile = path.join(tmpDir, `.perm-test-${Date.now()}`);

    await fs.writeFile(testFile, 'test');

    // Try to make it unreadable
    await fs.chmod(testFile, 0o000);

    // Try to read it - if permissions work, this should fail
    let permissionsWork = false;
    try {
      await fs.readFile(testFile);
      // If we can read it, permissions aren't enforced
      permissionsWork = false;
    } catch (err: any) {
      // If we get EACCES or EPERM, permissions are working
      if (err.code === 'EACCES' || err.code === 'EPERM') {
        permissionsWork = true;
      }
    }

    // Cleanup - restore permissions first
    try {
      await fs.chmod(testFile, 0o644);
      await fs.unlink(testFile);
    } catch {
      // Cleanup failed, not critical
    }

    capabilityCache.set(cacheKey, permissionsWork);
    return permissionsWork;
  } catch {
    capabilityCache.set(cacheKey, false);
    return false;
  }
}

/**
 * Composite check: Can run full integration tests?
 * Requires both server spawning and HTTP binding capabilities.
 */
export async function canRunIntegrationTests(): Promise<boolean> {
  const [canSpawn, canBind] = await Promise.all([
    canSpawnServers(),
    canBindHttpServer(),
  ]);
  return canSpawn && canBind;
}

/**
 * Composite check: Can run E2E tests?
 * Requires server spawning and optionally browser automation.
 */
export async function canRunE2ETests(requiresBrowser = false): Promise<boolean> {
  const canSpawn = await canSpawnServers();
  if (!canSpawn) return false;

  if (requiresBrowser) {
    return hasBrowserAutomation();
  }

  return true;
}

/**
 * Helper to get a summary of all capabilities for debugging
 */
export async function getCapabilitiesSummary(): Promise<Record<string, boolean>> {
  const [canSpawn, canBind, canIntegration, canE2E, canEnforcePerms] = await Promise.all([
    canSpawnServers(),
    canBindHttpServer(),
    canRunIntegrationTests(),
    canRunE2ETests(),
    canEnforceFilePermissions(),
  ]);

  return {
    canSpawnServers: canSpawn,
    canBindHttpServer: canBind,
    hasWorkerAPI: hasWorkerAPI(),
    hasImportMetaUrl: hasImportMetaUrl(),
    isCloudIDE: isCloudIDE(),
    hasBrowserAutomation: hasBrowserAutomation(),
    canEnforceFilePermissions: canEnforcePerms,
    canRunIntegrationTests: canIntegration,
    canRunE2ETests: canE2E,
  };
}

/**
 * Clear the capability cache (useful for testing)
 */
export function clearCapabilityCache(): void {
  capabilityCache.clear();
}
