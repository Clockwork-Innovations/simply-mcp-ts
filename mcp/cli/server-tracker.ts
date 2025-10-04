/**
 * Server tracker for managing multiple running MCP servers
 * Tracks server processes, ports, and metadata
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Server information tracked in the registry
 */
export interface ServerInfo {
  /** Server name from config */
  name: string;
  /** Process ID */
  pid: number;
  /** Path to server file */
  filePath: string;
  /** Transport type */
  transport: 'stdio' | 'http';
  /** HTTP port (if using HTTP transport) */
  port?: number;
  /** Server version */
  version?: string;
  /** Start time */
  startedAt: number;
  /** Whether this is part of a multi-server run */
  isMulti?: boolean;
  /** Group ID for multi-server runs */
  groupId?: string;
}

/**
 * Server registry stored in temp directory
 */
export interface ServerRegistry {
  servers: ServerInfo[];
  lastUpdated: number;
}

/**
 * Get the path to the server registry file
 */
function getRegistryPath(): string {
  const tmpDir = tmpdir();
  const mcpDir = join(tmpDir, 'simplymcp');
  return join(mcpDir, 'servers.json');
}

/**
 * Ensure the registry directory exists
 */
async function ensureRegistryDir(): Promise<void> {
  const registryPath = getRegistryPath();
  const dir = join(registryPath, '..');

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

/**
 * Read the server registry
 */
export async function readRegistry(): Promise<ServerRegistry> {
  await ensureRegistryDir();
  const registryPath = getRegistryPath();

  if (!existsSync(registryPath)) {
    return { servers: [], lastUpdated: Date.now() };
  }

  try {
    const data = await readFile(registryPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If registry is corrupted, start fresh
    return { servers: [], lastUpdated: Date.now() };
  }
}

/**
 * Write the server registry
 */
export async function writeRegistry(registry: ServerRegistry): Promise<void> {
  await ensureRegistryDir();
  const registryPath = getRegistryPath();
  registry.lastUpdated = Date.now();
  await writeFile(registryPath, JSON.stringify(registry, null, 2), 'utf-8');
}

/**
 * Register a new server
 */
export async function registerServer(info: ServerInfo): Promise<void> {
  const registry = await readRegistry();

  // Remove any existing entry for this PID
  registry.servers = registry.servers.filter(s => s.pid !== info.pid);

  // Add new entry
  registry.servers.push(info);

  await writeRegistry(registry);
}

/**
 * Unregister a server by PID
 */
export async function unregisterServer(pid: number): Promise<void> {
  const registry = await readRegistry();
  registry.servers = registry.servers.filter(s => s.pid !== pid);
  await writeRegistry(registry);
}

/**
 * Unregister all servers in a group
 */
export async function unregisterGroup(groupId: string): Promise<void> {
  const registry = await readRegistry();
  registry.servers = registry.servers.filter(s => s.groupId !== groupId);
  await writeRegistry(registry);
}

/**
 * Get all registered servers
 */
export async function listServers(): Promise<ServerInfo[]> {
  const registry = await readRegistry();
  return registry.servers;
}

/**
 * Get servers in a specific group
 */
export async function getGroupServers(groupId: string): Promise<ServerInfo[]> {
  const registry = await readRegistry();
  return registry.servers.filter(s => s.groupId === groupId);
}

/**
 * Check if a process is still running
 */
export function isProcessAlive(pid: number): boolean {
  try {
    // Sending signal 0 checks if process exists without actually signaling it
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Clean up dead servers from the registry
 */
export async function cleanupDeadServers(): Promise<number> {
  const registry = await readRegistry();
  const aliveBefore = registry.servers.length;

  registry.servers = registry.servers.filter(s => isProcessAlive(s.pid));

  await writeRegistry(registry);
  return aliveBefore - registry.servers.length;
}

/**
 * Get a server by PID
 */
export async function getServerByPid(pid: number): Promise<ServerInfo | undefined> {
  const registry = await readRegistry();
  return registry.servers.find(s => s.pid === pid);
}

/**
 * Get servers by name pattern
 */
export async function getServersByName(namePattern: string): Promise<ServerInfo[]> {
  const registry = await readRegistry();
  const pattern = namePattern.toLowerCase();
  return registry.servers.filter(s =>
    s.name.toLowerCase().includes(pattern) ||
    s.filePath.toLowerCase().includes(pattern)
  );
}

/**
 * Check if a port is in use
 */
export async function isPortInUse(port: number): Promise<boolean> {
  const registry = await readRegistry();
  return registry.servers.some(s => s.port === port && isProcessAlive(s.pid));
}

/**
 * Find next available port starting from a given port
 */
export async function findAvailablePort(startPort: number): Promise<number> {
  let port = startPort;
  while (await isPortInUse(port)) {
    port++;
  }
  return port;
}

/**
 * Generate a unique group ID for multi-server runs
 */
export function generateGroupId(): string {
  return `multi-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
