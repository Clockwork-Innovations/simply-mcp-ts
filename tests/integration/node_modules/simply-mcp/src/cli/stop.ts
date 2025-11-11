/**
 * Stop command for SimplyMCP CLI
 * Stops running MCP servers
 */

import type { CommandModule } from 'yargs';
import {
  listServers,
  getServerByPid,
  getServersByName,
  getGroupServers,
  unregisterServer,
  unregisterGroup,
  isProcessAlive,
  type ServerInfo,
} from './server-tracker.js';

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

/**
 * Stop a server process
 */
async function stopServer(server: ServerInfo, force: boolean): Promise<boolean> {
  if (!isProcessAlive(server.pid)) {
    console.log(`${COLORS.yellow}Server ${server.name} (PID ${server.pid}) is not running${COLORS.reset}`);
    await unregisterServer(server.pid);
    return false;
  }

  try {
    // Try graceful shutdown first
    process.kill(server.pid, 'SIGTERM');

    if (force) {
      // In force mode, wait a bit then force kill
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (isProcessAlive(server.pid)) {
        process.kill(server.pid, 'SIGKILL');
      }
    }

    // Wait a bit for the process to exit
    await new Promise((resolve) => setTimeout(resolve, 500));

    const stopped = !isProcessAlive(server.pid);

    if (stopped) {
      console.log(`${COLORS.green}✓${COLORS.reset} Stopped ${server.name} (PID ${server.pid})`);
      await unregisterServer(server.pid);
    } else {
      console.log(`${COLORS.yellow}Process ${server.pid} may still be running${COLORS.reset}`);
      console.log(`${COLORS.dim}Try: simplymcp stop ${server.pid} --force${COLORS.reset}`);
    }

    return stopped;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ESRCH') {
      // Process doesn't exist
      console.log(`${COLORS.yellow}Server ${server.name} (PID ${server.pid}) is not running${COLORS.reset}`);
      await unregisterServer(server.pid);
      return false;
    }

    console.error(`${COLORS.red}Error stopping server:${COLORS.reset}`, error);
    return false;
  }
}

/**
 * Stop multiple servers
 */
async function stopServers(servers: ServerInfo[], force: boolean): Promise<void> {
  if (servers.length === 0) {
    console.log(`${COLORS.yellow}No matching servers found${COLORS.reset}`);
    return;
  }

  console.log(`Stopping ${servers.length} server(s)...`);
  console.log('');

  let stopped = 0;
  for (const server of servers) {
    const success = await stopServer(server, force);
    if (success) {
      stopped++;
    }
  }

  console.log('');
  console.log(`${COLORS.green}Stopped ${stopped}/${servers.length} server(s)${COLORS.reset}`);
}

/**
 * Yargs command definition for the stop command
 */
export const stopCommand: CommandModule = {
  command: 'stop [target]',
  describe: 'Stop running MCP servers',
  builder: (yargs) => {
    return yargs
      .positional('target', {
        describe: 'PID, server name, group ID, or "all"',
        type: 'string',
      })
      .option('force', {
        alias: 'f',
        describe: 'Force kill servers (SIGKILL)',
        type: 'boolean',
        default: false,
      })
      .option('group', {
        alias: 'g',
        describe: 'Stop all servers in a group',
        type: 'string',
      })
      .example('$0 stop', 'Stop all servers')
      .example('$0 stop all', 'Stop all servers')
      .example('$0 stop 12345', 'Stop server with PID 12345')
      .example('$0 stop my-server', 'Stop servers matching "my-server"')
      .example('$0 stop --group multi-123', 'Stop all servers in group');
  },
  handler: async (argv: any) => {
    const target = argv.target as string | undefined;
    const force = argv.force as boolean;
    const groupId = argv.group as string | undefined;

    try {
      // Get all servers first
      const allServers = await listServers();

      if (allServers.length === 0) {
        console.log(`${COLORS.yellow}No servers currently running${COLORS.reset}`);
        return;
      }

      let serversToStop: ServerInfo[] = [];

      // Handle group stop
      if (groupId) {
        serversToStop = await getGroupServers(groupId);

        if (serversToStop.length === 0) {
          console.error(`${COLORS.red}No servers found in group: ${groupId}${COLORS.reset}`);
          process.exit(1);
        }

        await stopServers(serversToStop, force);
        await unregisterGroup(groupId);
        return;
      }

      // Handle no target or "all"
      if (!target || target === 'all') {
        const confirm = process.env.SIMPLYMCP_AUTO_CONFIRM === 'true';

        if (!confirm && allServers.length > 1) {
          console.log(`${COLORS.yellow}About to stop ${allServers.length} server(s)${COLORS.reset}`);
          console.log(`${COLORS.dim}Set SIMPLYMCP_AUTO_CONFIRM=true to skip this check${COLORS.reset}`);
          console.log('');
        }

        await stopServers(allServers, force);
        return;
      }

      // Try to parse as PID
      const pid = parseInt(target, 10);
      if (!isNaN(pid)) {
        const server = await getServerByPid(pid);

        if (!server) {
          console.error(`${COLORS.red}No server found with PID: ${pid}${COLORS.reset}`);
          process.exit(1);
        }

        await stopServer(server, force);
        return;
      }

      // Try to match by name
      const matchingServers = await getServersByName(target);

      if (matchingServers.length === 0) {
        console.error(`${COLORS.red}No servers found matching: ${target}${COLORS.reset}`);
        console.log('');
        console.log(`${COLORS.dim}Available servers:${COLORS.reset}`);
        for (const server of allServers) {
          console.log(`  - ${server.name} (PID ${server.pid})`);
        }
        process.exit(1);
      }

      await stopServers(matchingServers, force);
    } catch (error) {
      console.error(`${COLORS.red}Error stopping servers:${COLORS.reset}`, error);
      process.exit(1);
    }
  },
};
