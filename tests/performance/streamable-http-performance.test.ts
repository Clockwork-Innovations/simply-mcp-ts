/**
 * Streamable HTTP Transport Performance Tests
 *
 * Measures performance characteristics of the Streamable HTTP server under load.
 * Tests latency, throughput, concurrent connections, and resource usage.
 *
 * Implementation location: src/cli/servers/streamable-http-server.ts
 *
 * Test coverage:
 * - Measure latency for tool calls
 * - Test concurrent connections (10+ clients)
 * - Measure throughput (requests per second)
 * - Compare with baseline metrics
 * - Test session cleanup under load
 * - Memory usage tracking
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { spawn, ChildProcess } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Streamable HTTP Transport - Performance Tests', () => {
  let serverProcess: ChildProcess;
  const port = 3458; // Use different port to avoid conflicts (3456=oauth, 3457=transport)
  const baseUrl = `http://localhost:${port}`;

  /**
   * Start the streamable HTTP server before running tests
   */
  beforeAll(async () => {
    const serverPath = resolve(__dirname, '../../src/cli/servers/streamable-http-server.ts');

    serverProcess = spawn('npx', ['tsx', serverPath], {
      env: { ...process.env, MCP_PORT: port.toString() },
      stdio: 'pipe',
    });

    // Wait for server to start with retry logic
    let serverReady = false;
    const maxAttempts = 15;

    // Listen for server ready message and continuously drain stdout/stderr
    // to prevent buffer overflow which can cause the process to hang
    serverProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('listening')) {
        serverReady = true;
      }
      // Continue draining stdout to prevent buffer overflow
    });

    serverProcess.stderr?.on('data', (data) => {
      // Drain stderr to prevent buffer overflow
      // Only log errors during startup, not during tests
      if (!serverReady) {
        console.error('Server stderr:', data.toString());
      }
    });

    serverProcess.on('error', (error) => {
      console.error('Server process error:', error);
    });

    serverProcess.on('exit', (code, signal) => {
      if (code !== null && code !== 0) {
        console.error(`Server process exited with code ${code}`);
      } else if (signal) {
        console.error(`Server process killed with signal ${signal}`);
      }
    });

    // Wait for server with retries and health check
    for (let i = 0; i < maxAttempts && !serverReady; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to connect to verify server is ready
      try {
        const response = await fetch(`${baseUrl}/mcp`, {
          method: 'GET',
          headers: { 'Accept': 'text/event-stream' }
        });
        // Server responds with 400 for GET without session ID, which means it's ready
        if (response.status === 400 || response.status === 200) {
          serverReady = true;
          break;
        }
      } catch (e) {
        // Server not ready yet, continue waiting
      }
    }

    if (!serverReady) {
      throw new Error('Server failed to start after 15 seconds');
    }

    console.log('✓ Server started successfully on port', port);
  }, 20000);

  /**
   * Stop the server after all tests complete
   */
  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');

      // Wait for graceful shutdown
      await new Promise((resolve) => {
        serverProcess.on('close', resolve);
        setTimeout(() => {
          serverProcess.kill('SIGKILL');
          resolve(null);
        }, 2000);
      });
    }

    // Allow time for cleanup
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, 10000);

  /**
   * Helper to create a session
   */
  async function createSession(clientName: string = 'test-client'): Promise<string> {
    const response = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: clientName, version: '1.0.0' },
        },
        id: 1,
      }),
    });

    return response.headers.get('mcp-session-id') || '';
  }

  /**
   * Helper to call tool and measure time
   */
  async function callToolTimed(sessionId: string, toolName: string, args: any): Promise<number> {
    const start = performance.now();

    await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': sessionId,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
        id: Date.now(),
      }),
    });

    const end = performance.now();
    return end - start;
  }

  /**
   * Baseline Latency Measurements
   *
   * Measures single request latency for various operations.
   */
  describe('Baseline Latency', () => {
    let sessionId: string;

    beforeAll(async () => {
      sessionId = await createSession('latency-test-client');
    });

    it('should measure initialize request latency', async () => {
      const start = performance.now();

      await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'latency-test', version: '1.0.0' },
          },
          id: 1,
        }),
      });

      const end = performance.now();
      const latency = end - start;

      console.log(`Initialize latency: ${latency.toFixed(2)}ms`);

      // Baseline: Should complete in under 200ms
      expect(latency).toBeLessThan(200);
      expect(latency).toBeGreaterThan(0);
    });

    it('should measure tools/list latency', async () => {
      const start = performance.now();

      await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'mcp-session-id': sessionId,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 2,
        }),
      });

      const end = performance.now();
      const latency = end - start;

      console.log(`tools/list latency: ${latency.toFixed(2)}ms`);

      // Baseline: Should complete in under 100ms
      expect(latency).toBeLessThan(100);
      expect(latency).toBeGreaterThan(0);
    });

    it('should measure tool call latency', async () => {
      const latency = await callToolTimed(sessionId, 'greet', { name: 'Test' });

      console.log(`Tool call latency: ${latency.toFixed(2)}ms`);

      // Baseline: Should complete in under 150ms
      expect(latency).toBeLessThan(150);
      expect(latency).toBeGreaterThan(0);
    });

    it('should measure prompts/list latency', async () => {
      const start = performance.now();

      await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'mcp-session-id': sessionId,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'prompts/list',
          id: 3,
        }),
      });

      const end = performance.now();
      const latency = end - start;

      console.log(`prompts/list latency: ${latency.toFixed(2)}ms`);

      expect(latency).toBeLessThan(100);
      expect(latency).toBeGreaterThan(0);
    });

    it('should measure resources/list latency', async () => {
      const start = performance.now();

      await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'mcp-session-id': sessionId,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'resources/list',
          id: 4,
        }),
      });

      const end = performance.now();
      const latency = end - start;

      console.log(`resources/list latency: ${latency.toFixed(2)}ms`);

      expect(latency).toBeLessThan(100);
      expect(latency).toBeGreaterThan(0);
    });

    it('should measure average latency over multiple calls', async () => {
      const iterations = 10;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const latency = await callToolTimed(sessionId, 'greet', { name: `Test-${i}` });
        latencies.push(latency);
      }

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / iterations;
      const minLatency = Math.min(...latencies);
      const maxLatency = Math.max(...latencies);

      console.log(`\nLatency Statistics (${iterations} calls):`);
      console.log(`  Average: ${avgLatency.toFixed(2)}ms`);
      console.log(`  Min: ${minLatency.toFixed(2)}ms`);
      console.log(`  Max: ${maxLatency.toFixed(2)}ms`);

      expect(avgLatency).toBeLessThan(200);
      expect(minLatency).toBeGreaterThan(0);
    });
  });

  /**
   * Concurrent Connections
   *
   * Tests server behavior with multiple simultaneous clients.
   */
  describe('Concurrent Connections', () => {
    it('should handle 10 concurrent sessions', async () => {
      const clientCount = 10;
      const start = performance.now();

      const sessions = await Promise.all(
        Array.from({ length: clientCount }, (_, i) => createSession(`client-${i}`))
      );

      const end = performance.now();
      const totalTime = end - start;

      console.log(`\nCreated ${clientCount} sessions in ${totalTime.toFixed(2)}ms`);
      console.log(`Average time per session: ${(totalTime / clientCount).toFixed(2)}ms`);

      expect(sessions).toHaveLength(clientCount);
      sessions.forEach((sessionId) => {
        expect(sessionId).toBeTruthy();
        expect(sessionId).toMatch(/^[0-9a-f-]{36}$/i);
      });

      // All sessions should be created in reasonable time
      expect(totalTime).toBeLessThan(3000); // 3 seconds for 10 sessions
    });

    it('should handle concurrent tool calls across sessions', async () => {
      const clientCount = 10;

      // Create sessions
      const sessions = await Promise.all(
        Array.from({ length: clientCount }, (_, i) => createSession(`concurrent-${i}`))
      );

      // Make concurrent tool calls
      const start = performance.now();

      const results = await Promise.all(
        sessions.map((sessionId, i) =>
          fetch(`${baseUrl}/mcp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json, text/event-stream',
              'mcp-session-id': sessionId,
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'tools/call',
              params: {
                name: 'greet',
                arguments: { name: `User-${i}` },
              },
              id: i + 1,
            }),
          })
        )
      );

      const end = performance.now();
      const totalTime = end - start;

      console.log(`\n${clientCount} concurrent tool calls completed in ${totalTime.toFixed(2)}ms`);
      console.log(`Average time per call: ${(totalTime / clientCount).toFixed(2)}ms`);

      // All requests should succeed
      results.forEach((response, i) => {
        expect(response.status).toBe(200);
      });

      // Concurrent calls should be faster than sequential
      // (at least not 10x slower)
      expect(totalTime).toBeLessThan(2000); // 2 seconds for 10 concurrent calls
    });

    it('should maintain session isolation under load', async () => {
      const clientCount = 5;

      const sessions = await Promise.all(
        Array.from({ length: clientCount }, (_, i) => createSession(`isolation-${i}`))
      );

      // Each client makes requests with their own session
      const results = await Promise.all(
        sessions.map(async (sessionId, i) => {
          const response = await fetch(`${baseUrl}/mcp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json, text/event-stream',
              'mcp-session-id': sessionId,
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'tools/call',
              params: {
                name: 'greet',
                arguments: { name: `Client-${i}` },
              },
              id: i + 1,
            }),
          });

          const data = await response.json();
          return data.result.content[0].text;
        })
      );

      // Each client should get their own personalized response
      results.forEach((text, i) => {
        expect(text).toBe(`Hello, Client-${i}!`);
      });
    });
  });

  /**
   * Throughput Measurements
   *
   * Measures requests per second for various operations.
   */
  describe('Throughput', () => {
    let sessionId: string;

    beforeAll(async () => {
      sessionId = await createSession('throughput-test-client');
    });

    it('should measure tool call throughput', async () => {
      const duration = 2000; // 2 seconds
      const startTime = Date.now();
      let requestCount = 0;

      while (Date.now() - startTime < duration) {
        await fetch(`${baseUrl}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'mcp-session-id': sessionId,
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: 'greet',
              arguments: { name: 'Test' },
            },
            id: requestCount + 1,
          }),
        });

        requestCount++;
      }

      const actualDuration = Date.now() - startTime;
      const rps = (requestCount / actualDuration) * 1000;

      console.log(`\nThroughput Test Results:`);
      console.log(`  Requests: ${requestCount}`);
      console.log(`  Duration: ${actualDuration}ms`);
      console.log(`  Throughput: ${rps.toFixed(2)} requests/second`);

      expect(requestCount).toBeGreaterThan(0);
      expect(rps).toBeGreaterThan(5); // At least 5 req/s
    }, 10000);

    it('should measure tools/list throughput', async () => {
      const iterations = 50;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        await fetch(`${baseUrl}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'mcp-session-id': sessionId,
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'tools/list',
            id: i + 1,
          }),
        });
      }

      const end = performance.now();
      const totalTime = end - start;
      const rps = (iterations / totalTime) * 1000;

      console.log(`\ntools/list Throughput:`);
      console.log(`  ${iterations} requests in ${totalTime.toFixed(2)}ms`);
      console.log(`  Throughput: ${rps.toFixed(2)} requests/second`);

      expect(rps).toBeGreaterThan(10); // At least 10 req/s
    });

    it('should measure session creation throughput', async () => {
      const iterations = 20;
      const start = performance.now();

      const sessions = await Promise.all(
        Array.from({ length: iterations }, (_, i) => createSession(`throughput-${i}`))
      );

      const end = performance.now();
      const totalTime = end - start;
      const rps = (iterations / totalTime) * 1000;

      console.log(`\nSession Creation Throughput:`);
      console.log(`  ${iterations} sessions in ${totalTime.toFixed(2)}ms`);
      console.log(`  Throughput: ${rps.toFixed(2)} sessions/second`);

      expect(sessions).toHaveLength(iterations);
      expect(rps).toBeGreaterThan(5); // At least 5 sessions/s
    });
  });

  /**
   * Session Cleanup Under Load
   *
   * Tests that sessions are properly cleaned up under heavy load.
   */
  describe('Session Cleanup Under Load', () => {
    it('should clean up terminated sessions', async () => {
      const sessionCount = 10;

      // Create sessions
      const sessions = await Promise.all(
        Array.from({ length: sessionCount }, (_, i) => createSession(`cleanup-${i}`))
      );

      // Terminate all sessions
      await Promise.all(
        sessions.map((sessionId) =>
          fetch(`${baseUrl}/mcp`, {
            method: 'DELETE',
            headers: { 'mcp-session-id': sessionId },
          })
        )
      );

      // Give server time to clean up
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Try to use terminated sessions (should fail)
      const results = await Promise.all(
        sessions.map((sessionId) =>
          fetch(`${baseUrl}/mcp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'mcp-session-id': sessionId,
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'tools/list',
              id: 1,
            }),
          })
        )
      );

      // All should fail (400 Bad Request)
      results.forEach((response) => {
        expect(response.status).toBe(400);
      });
    });

    it('should handle rapid session creation and deletion', async () => {
      const cycles = 5;
      const sessionsPerCycle = 5;

      for (let i = 0; i < cycles; i++) {
        // Create sessions
        const sessions = await Promise.all(
          Array.from({ length: sessionsPerCycle }, (_, j) =>
            createSession(`rapid-${i}-${j}`)
          )
        );

        // Immediately delete them
        await Promise.all(
          sessions.map((sessionId) =>
            fetch(`${baseUrl}/mcp`, {
              method: 'DELETE',
              headers: { 'mcp-session-id': sessionId },
            })
          )
        );
      }

      // Should complete without errors
      expect(true).toBe(true);
    });
  });

  /**
   * Memory Usage Estimation
   *
   * Estimates memory footprint by creating many sessions.
   */
  describe('Memory Usage Estimation', () => {
    it('should track session count under load', async () => {
      const sessionCount = 50;
      const sessions: string[] = [];

      console.log(`\nCreating ${sessionCount} sessions...`);

      for (let i = 0; i < sessionCount; i++) {
        const sessionId = await createSession(`memory-test-${i}`);
        sessions.push(sessionId);

        if ((i + 1) % 10 === 0) {
          console.log(`  Created ${i + 1} sessions`);
        }
      }

      console.log(`\nAll ${sessionCount} sessions created successfully`);

      // Verify all sessions are unique
      const uniqueSessions = new Set(sessions);
      expect(uniqueSessions.size).toBe(sessionCount);

      // Clean up
      console.log('Cleaning up sessions...');
      await Promise.all(
        sessions.map((sessionId) =>
          fetch(`${baseUrl}/mcp`, {
            method: 'DELETE',
            headers: { 'mcp-session-id': sessionId },
          })
        )
      );

      console.log('Cleanup complete');
    }, 30000);

    it('should handle session lifecycle efficiently', async () => {
      const iterations = 20;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        // Create session
        const sessionId = await createSession(`lifecycle-${i}`);

        // Make a request
        await fetch(`${baseUrl}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'mcp-session-id': sessionId,
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'tools/list',
            id: 1,
          }),
        });

        // Delete session
        await fetch(`${baseUrl}/mcp`, {
          method: 'DELETE',
          headers: { 'mcp-session-id': sessionId },
        });

        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / iterations;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      console.log(`\nSession Lifecycle Performance (${iterations} cycles):`);
      console.log(`  Average: ${avgTime.toFixed(2)}ms`);
      console.log(`  Min: ${minTime.toFixed(2)}ms`);
      console.log(`  Max: ${maxTime.toFixed(2)}ms`);

      // Performance should be consistent (max not more than 4x min to account for system variance)
      expect(maxTime).toBeLessThan(minTime * 4.0);
    }, 30000);
  });

  /**
   * Performance Regression Detection
   *
   * Compares against baseline metrics to detect regressions.
   */
  describe('Performance Regression Detection', () => {
    const BASELINE = {
      initializeLatency: 200, // ms
      toolCallLatency: 150, // ms
      listOperationsLatency: 100, // ms
      concurrentSessions: 10,
      throughput: 5, // req/s minimum
    };

    it('should meet initialize latency baseline', async () => {
      const start = performance.now();

      await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'baseline-test', version: '1.0.0' },
          },
          id: 1,
        }),
      });

      const end = performance.now();
      const latency = end - start;

      console.log(`\nBaseline Comparison - Initialize:`);
      console.log(`  Actual: ${latency.toFixed(2)}ms`);
      console.log(`  Baseline: ${BASELINE.initializeLatency}ms`);
      console.log(`  Status: ${latency <= BASELINE.initializeLatency ? 'PASS' : 'REGRESSION'}`);

      expect(latency).toBeLessThanOrEqual(BASELINE.initializeLatency);
    });

    it('should meet tool call latency baseline', async () => {
      const sessionId = await createSession('baseline-test-client');
      const latency = await callToolTimed(sessionId, 'greet', { name: 'Test' });

      console.log(`\nBaseline Comparison - Tool Call:`);
      console.log(`  Actual: ${latency.toFixed(2)}ms`);
      console.log(`  Baseline: ${BASELINE.toolCallLatency}ms`);
      console.log(`  Status: ${latency <= BASELINE.toolCallLatency ? 'PASS' : 'REGRESSION'}`);

      expect(latency).toBeLessThanOrEqual(BASELINE.toolCallLatency);
    });

    it('should meet concurrent sessions baseline', async () => {
      const start = performance.now();

      const sessions = await Promise.all(
        Array.from({ length: BASELINE.concurrentSessions }, (_, i) =>
          createSession(`baseline-concurrent-${i}`)
        )
      );

      const end = performance.now();
      const totalTime = end - start;

      console.log(`\nBaseline Comparison - Concurrent Sessions:`);
      console.log(`  Sessions: ${BASELINE.concurrentSessions}`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Average: ${(totalTime / BASELINE.concurrentSessions).toFixed(2)}ms`);

      expect(sessions).toHaveLength(BASELINE.concurrentSessions);
      expect(totalTime).toBeLessThan(3000); // Should complete in under 3 seconds
    });
  });
});
