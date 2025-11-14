/**
 * Test server for FT-1: Dynamic Hidden validation
 *
 * This server demonstrates all dynamic hidden scenarios:
 * 1. Static boolean (backward compatibility) - 2 tools
 * 2. Sync function (role-based) - 2 tools
 * 3. Async function (permission-based) - 2 tools
 * 4. Always visible - 2 tools
 *
 * Total: 8 tools with different hidden behaviors
 */

import type { IServer, ITool, ToolHelper } from '../../src/index.js';

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================

const server: IServer = {
  name: 'dynamic-hidden-test',
  version: '1.0.0',
  description: 'Test server for dynamic hidden functionality',
};

// ============================================================================
// STATIC BOOLEAN HIDDEN (Backward Compatibility - FL-1)
// ============================================================================

interface StaticVisibleTool extends ITool {
  name: 'static_visible';
  description: 'Tool with hidden: false (explicitly visible)';
  hidden: false;
  result: { message: string };
}

interface StaticHiddenTool extends ITool {
  name: 'static_hidden';
  description: 'Tool with hidden: true (always hidden)';
  hidden: true;
  result: { message: string };
}

const static_visible: ToolHelper<StaticVisibleTool> = async () => ({
  message: 'This tool is explicitly visible (hidden: false)',
});

const static_hidden: ToolHelper<StaticHiddenTool> = async () => ({
  message: 'This tool is always hidden (hidden: true) but still callable',
});

// ============================================================================
// SYNC FUNCTION HIDDEN (Role-based)
// ============================================================================

interface AdminToolType extends ITool {
  name: 'admin_tool';
  description: 'Admin-only tool - hidden unless role=admin';
  hidden: (ctx: any) => boolean;
  result: { message: string };
}

interface ModeratorToolType extends ITool {
  name: 'moderator_tool';
  description: 'Moderator tool - hidden unless role=moderator or admin';
  hidden: (ctx: any) => boolean;
  result: { message: string };
}

const admin_tool: ToolHelper<AdminToolType> = async () => ({
  message: 'Admin tool executed - only visible to admins',
});
Object.defineProperty(admin_tool, 'hidden', {
  value: (ctx: any) => ctx.metadata?.role !== 'admin',
  writable: false,
});

const moderator_tool: ToolHelper<ModeratorToolType> = async () => ({
  message: 'Moderator tool executed - visible to moderators and admins',
});
Object.defineProperty(moderator_tool, 'hidden', {
  value: (ctx: any) =>
    ctx.metadata?.role !== 'moderator' && ctx.metadata?.role !== 'admin',
  writable: false,
});

// ============================================================================
// ASYNC FUNCTION HIDDEN (Permission-based)
// ============================================================================

// Simulate async permission check
async function checkPermission(ctx: any, permission: string): Promise<boolean> {
  // Simulate async lookup
  await new Promise((resolve) => setTimeout(resolve, 5));
  const permissions = (ctx.metadata && ctx.metadata.permissions) || [];
  return permissions.includes(permission);
}

interface WriteToolType extends ITool {
  name: 'write_tool';
  description: 'Write tool - hidden unless has write permission';
  hidden: (ctx: any) => Promise<boolean>;
  result: { message: string };
}

interface DeleteToolType extends ITool {
  name: 'delete_tool';
  description: 'Delete tool - hidden unless has delete permission';
  hidden: (ctx: any) => Promise<boolean>;
  result: { message: string };
}

const write_tool: ToolHelper<WriteToolType> = async () => ({
  message: 'Write operation executed - requires write permission',
});
Object.defineProperty(write_tool, 'hidden', {
  value: async (ctx: any) => !(await checkPermission(ctx, 'write')),
  writable: false,
});

const delete_tool: ToolHelper<DeleteToolType> = async () => ({
  message: 'Delete operation executed - requires delete permission',
});
Object.defineProperty(delete_tool, 'hidden', {
  value: async (ctx: any) => !(await checkPermission(ctx, 'delete')),
  writable: false,
});

// ============================================================================
// ALWAYS VISIBLE (No hidden field or hidden: false)
// ============================================================================

interface PublicReadTool extends ITool {
  name: 'public_read';
  description: 'Public read tool - always visible';
  result: { data: string };
}

interface PublicHelpTool extends ITool {
  name: 'public_help';
  description: 'Public help tool - always visible';
  result: { help: string };
}

const public_read: ToolHelper<PublicReadTool> = async () => ({
  data: 'Public data - everyone can read',
});

const public_help: ToolHelper<PublicHelpTool> = async () => ({
  help: 'Available commands: public_read, public_help, and others based on your permissions',
});

// ============================================================================
// EXPORTS
// ============================================================================

export {
  server,
  // Static
  static_visible,
  static_hidden,
  // Sync function
  admin_tool,
  moderator_tool,
  // Async function
  write_tool,
  delete_tool,
  // Always visible
  public_read,
  public_help,
};
