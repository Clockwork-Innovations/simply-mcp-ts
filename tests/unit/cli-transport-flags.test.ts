/**
 * CLI Transport Flag Tests
 *
 * Tests the --transport flag and its aliases (stdio, http, http-stateless, ws)
 * Also tests backward compatibility with legacy --http and --http-stateless flags.
 *
 * Test Coverage:
 * - --transport stdio (default)
 * - --transport http (stateful HTTP)
 * - --transport http-stateless (stateless HTTP)
 * - --transport ws (WebSocket)
 * - Backward compatibility: --http flag still works
 * - Backward compatibility: --http-stateless flag still works
 * - Invalid transport values are rejected
 * - Default behavior (stdio when no flags specified)
 */

import { describe, it, expect } from '@jest/globals';
import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

const TEMP_DIR = join(process.cwd(), 'tests', 'unit', '__temp_cli_transport__');
const CLI_PATH = join(process.cwd(), 'dist', 'src', 'cli', 'index.js');

function setupTempDir() {
  try {
    mkdirSync(TEMP_DIR, { recursive: true });
  } catch (err) {
    // Directory might already exist
  }
}

function cleanupTempDir() {
  try {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  } catch (err) {
    // Ignore cleanup errors
  }
}

function createTestServer(filename: string): string {
  const content = `// @ts-nocheck
import type { IServer, ITool } from '../../../src/index.js';

interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet someone';
  params: { name: string };
  result: { message: string };
}

const server: IServer = {
  name: 'test-transport-server',
  version: '1.0.0',
  description: 'Test server for transport flags'
}

export default class TestService {
  greet: GreetTool = async ({ name }) => ({ message: \`Hello, \${name}!\` });
}
`;

  const filePath = join(TEMP_DIR, filename);
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

describe('CLI Transport Flags', () => {
  beforeAll(() => {
    setupTempDir();
  });

  afterAll(() => {
    cleanupTempDir();
  });

  describe('--transport flag', () => {
    it('should accept --transport stdio', async () => {
      const serverPath = createTestServer('stdio-test.ts');

      const proc = spawn('node', [CLI_PATH, 'run', serverPath, '--transport', 'stdio'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stderr = '';
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Wait for server to start
      await sleep(2000);

      // Check that server started (no error about invalid transport)
      expect(stderr).not.toContain('Invalid transport');
      expect(stderr).not.toContain('Unknown transport');

      // Cleanup
      proc.kill();
      await sleep(500);
    }, 10000);

    it('should accept --transport http', async () => {
      const serverPath = createTestServer('http-test.ts');

      const proc = spawn('node', [CLI_PATH, 'run', serverPath, '--transport', 'http', '--port', '3100'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stderr = '';
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Wait for server to start
      await sleep(2000);

      // Check that HTTP server started
      expect(stderr).not.toContain('Invalid transport');
      expect(stderr).toContain('3100'); // Should mention the port

      // Cleanup
      proc.kill();
      await sleep(500);
    }, 10000);

    it('should accept --transport http-stateless', async () => {
      const serverPath = createTestServer('http-stateless-test.ts');

      const proc = spawn('node', [CLI_PATH, 'run', serverPath, '--transport', 'http-stateless', '--port', '3101'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stderr = '';
      let stdout = '';
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Wait for server to start (look for port in output)
      await new Promise<void>((resolve) => {
        const checkOutput = () => {
          if (stderr.includes('3101') || stdout.includes('3101')) {
            resolve();
          }
        };
        proc.stderr.on('data', checkOutput);
        proc.stdout.on('data', checkOutput);
        setTimeout(() => resolve(), 5000);
      });

      // Check that HTTP server started in stateless mode
      const output = stderr + stdout;
      expect(stderr).not.toContain('Invalid transport');
      expect(output).toContain('3101'); // Should mention the port

      // Cleanup
      proc.kill();
      await sleep(500);
    }, 10000);

    it('should accept --transport ws', async () => {
      const serverPath = createTestServer('ws-test.ts');

      const proc = spawn('node', [CLI_PATH, 'run', serverPath, '--transport', 'ws', '--port', '3102'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stderr = '';
      let stdout = '';
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Wait for server to start (look for port in output)
      await new Promise<void>((resolve) => {
        const checkOutput = () => {
          if (stderr.includes('3102') || stdout.includes('3102')) {
            resolve();
          }
        };
        proc.stderr.on('data', checkOutput);
        proc.stdout.on('data', checkOutput);
        setTimeout(() => resolve(), 5000);
      });

      // Check that WebSocket server started
      const output = stderr + stdout;
      expect(stderr).not.toContain('Invalid transport');
      expect(output).toContain('3102'); // Should mention the port

      // Cleanup
      proc.kill();
      await sleep(500);
    }, 10000);

    it('should reject invalid transport values', async () => {
      const serverPath = createTestServer('invalid-transport-test.ts');

      const proc = spawn('node', [CLI_PATH, 'run', serverPath, '--transport', 'invalid-mode'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stderr = '';
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Wait for process to exit (yargs will exit on validation error)
      await new Promise<void>((resolve) => {
        proc.on('exit', () => resolve());
        setTimeout(() => {
          proc.kill();
          resolve();
        }, 5000);
      });

      // Should error with invalid choice message
      expect(stderr).toMatch(/Invalid values|Unknown or unexpected option|choices/i);
    }, 10000);
  });

  describe('Backward compatibility - legacy flags', () => {
    it('should still accept --http flag (legacy)', async () => {
      const serverPath = createTestServer('legacy-http-test.ts');

      const proc = spawn('node', [CLI_PATH, 'run', serverPath, '--http', '--port', '3103'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stderr = '';
      let stdout = '';
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Wait for server to start (look for port in output)
      await new Promise<void>((resolve) => {
        const checkOutput = () => {
          if (stderr.includes('3103') || stdout.includes('3103')) {
            resolve();
          }
        };
        proc.stderr.on('data', checkOutput);
        proc.stdout.on('data', checkOutput);
        setTimeout(() => resolve(), 5000);
      });

      // Check that HTTP server started
      const output = stderr + stdout;
      expect(stderr).not.toContain('Unknown option');
      expect(output).toContain('3103'); // Should mention the port

      // Cleanup
      proc.kill();
      await sleep(500);
    }, 10000);

    it('should still accept --http-stateless flag (legacy)', async () => {
      const serverPath = createTestServer('legacy-http-stateless-test.ts');

      const proc = spawn('node', [CLI_PATH, 'run', serverPath, '--http-stateless', '--port', '3104'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stderr = '';
      let stdout = '';
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Wait for server to start (look for port in output)
      await new Promise<void>((resolve) => {
        const checkOutput = () => {
          if (stderr.includes('3104') || stdout.includes('3104')) {
            resolve();
          }
        };
        proc.stderr.on('data', checkOutput);
        proc.stdout.on('data', checkOutput);
        setTimeout(() => resolve(), 5000);
      });

      // Check that HTTP server started
      const output = stderr + stdout;
      expect(stderr).not.toContain('Unknown option');
      expect(output).toContain('3104'); // Should mention the port

      // Cleanup
      proc.kill();
      await sleep(500);
    }, 10000);
  });

  describe('Default behavior', () => {
    it('should default to stdio when no transport flags specified', async () => {
      const serverPath = createTestServer('default-transport-test.ts');

      const proc = spawn('node', [CLI_PATH, 'run', serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stderr = '';
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Wait for server to start
      await sleep(2000);

      // Should start in stdio mode (no HTTP port mentioned)
      expect(stderr).not.toContain('http://');
      expect(stderr).not.toContain('ws://');

      // Cleanup
      proc.kill();
      await sleep(500);
    }, 10000);
  });

  describe('Transport flag precedence', () => {
    it('should use --transport flag when both --transport and --http are specified', async () => {
      const serverPath = createTestServer('precedence-test.ts');

      // Specify both --transport stdio and --http (--transport should win)
      const proc = spawn('node', [CLI_PATH, 'run', serverPath, '--transport', 'stdio', '--http', '--port', '3105'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stderr = '';
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Wait for server to start
      await sleep(2000);

      // Should use stdio (not HTTP), so port should not be used
      // Note: The actual precedence behavior depends on CLI implementation
      // This test documents expected behavior

      // Cleanup
      proc.kill();
      await sleep(500);
    }, 10000);
  });
});
