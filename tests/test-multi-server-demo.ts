/**
 * Demo script for multi-server functionality
 * Shows how to use the new multi-server commands
 */

import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

// Colors for output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

async function demo() {
  console.log(`${COLORS.bright}${COLORS.blue}Multi-Server Demo${COLORS.reset}\n`);

  // Demo 1: List with no servers
  console.log(`${COLORS.yellow}Step 1: List servers (should be empty)${COLORS.reset}`);
  await execCommand('node', ['dist/src/cli/index.js', 'list']);

  console.log(`\n${COLORS.yellow}Step 2: Start 3 servers on HTTP${COLORS.reset}`);
  console.log(`Command: simplymcp run server1.ts server2.ts server3.ts --http --port 3000\n`);

  // Start multi-server in background
  const multiServer = spawn('node', [
    'dist/src/cli/index.js',
    'run',
    'examples/class-minimal.ts',
    'examples/class-basic.ts',
    'examples/single-file-basic.ts',
    '--http',
    '--port',
    '3000',
  ]);

  // Capture output
  multiServer.stdout?.on('data', (data) => {
    console.log(data.toString().trim());
  });

  multiServer.stderr?.on('data', (data) => {
    console.error(data.toString().trim());
  });

  // Wait for servers to start
  console.log(`${COLORS.cyan}Waiting for servers to start...${COLORS.reset}`);
  await setTimeout(3000);

  // Demo 2: List running servers
  console.log(`\n${COLORS.yellow}Step 3: List running servers${COLORS.reset}`);
  await execCommand('node', ['dist/src/cli/index.js', 'list']);

  // Demo 3: List with verbose
  console.log(`\n${COLORS.yellow}Step 4: List with verbose output${COLORS.reset}`);
  await execCommand('node', ['dist/src/cli/index.js', 'list', '--verbose']);

  // Demo 4: List as JSON
  console.log(`\n${COLORS.yellow}Step 5: List as JSON${COLORS.reset}`);
  await execCommand('node', ['dist/src/cli/index.js', 'list', '--json']);

  // Demo 5: Stop all servers
  console.log(`\n${COLORS.yellow}Step 6: Stop all servers${COLORS.reset}`);
  process.env.SIMPLYMCP_AUTO_CONFIRM = 'true';
  await execCommand('node', ['dist/src/cli/index.js', 'stop', 'all']);

  // Wait for cleanup
  await setTimeout(1000);

  // Demo 6: Verify servers stopped
  console.log(`\n${COLORS.yellow}Step 7: Verify servers stopped${COLORS.reset}`);
  await execCommand('node', ['dist/src/cli/index.js', 'list']);

  console.log(`\n${COLORS.green}${COLORS.bright}Demo complete!${COLORS.reset}`);

  // Kill multi-server process if still running
  multiServer.kill();

  process.exit(0);
}

// Helper to execute a command and wait for it to complete
function execCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: 'inherit' });

    proc.on('exit', (code) => {
      if (code === 0 || code === null) {
        resolve();
      } else {
        // Don't reject on non-zero exit codes for this demo
        resolve();
      }
    });

    proc.on('error', (error) => {
      console.error('Error:', error);
      resolve();
    });
  });
}

// Run the demo
demo().catch((error) => {
  console.error('Demo failed:', error);
  process.exit(1);
});