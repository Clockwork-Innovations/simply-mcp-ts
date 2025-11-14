/**
 * Auth-Gated MCP Server Example
 *
 * Demonstrates role-based access control using dynamic hidden evaluation.
 *
 * **Features:**
 * - Public tools visible to everyone (search, info)
 * - Admin tools visible only to admin users (delete_user, reset_database)
 * - Moderator tools visible to admins and moderators (ban_user, delete_post)
 * - Dynamic hidden evaluation based on user role
 * - Auto-generated skills for hidden capabilities
 *
 * **Usage:**
 * ```bash
 * # Compile and run
 * npm run cli -- compile examples/auth-gated-server.ts
 * npm run cli -- run examples/auth-gated-server.ts
 *
 * # Test with Claude CLI
 * cat > /tmp/auth-mcp-config.json << 'EOF'
 * {
 *   "mcpServers": {
 *     "auth-demo": {
 *       "command": "node",
 *       "args": ["dist/src/cli/index.js", "run", "examples/auth-gated-server.ts"]
 *     }
 *   }
 * }
 * EOF
 *
 * # Anonymous user - only public tools visible
 * claude --print --model haiku \
 *   --mcp-config /tmp/auth-mcp-config.json \
 *   "List all available tools"
 * # Expected: [search, info]
 *
 * # Discover admin capabilities via skill
 * claude --print --model haiku \
 *   --mcp-config /tmp/auth-mcp-config.json \
 *   "Get the admin_panel skill"
 * # Returns: Documentation for admin tools
 *
 * # Discover moderator capabilities via skill
 * claude --print --model haiku \
 *   --mcp-config /tmp/auth-mcp-config.json \
 *   "Get the moderator_tools skill"
 * # Returns: Documentation for moderator tools
 * ```
 *
 * **Note:** The Simply-MCP CLI doesn't support passing context metadata yet.
 * To test role-based hiding, use HTTP transport where you control session data:
 *
 * ```typescript
 * // HTTP transport example
 * app.post('/mcp', async (req, res) => {
 *   const context = {
 *     metadata: {
 *       user: req.session.user  // { id, role, permissions }
 *     }
 *   };
 *
 *   const tools = await server.listTools(context);
 *   res.json({ tools });
 * });
 * ```
 */

import {
  ITool,
  IResource,
  IPrompt,
  ISkill,
  IServer,
  ToolHelper,
  ResourceHelper,
  PromptHelper,
  HiddenEvaluationContext,
} from '../src/index.js';

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================

const server: IServer = {
  name: 'auth-gated-demo',
  version: '1.0.0',
  description: 'Role-based access control demo server',
};

// ============================================================================
// TYPE DEFINITIONS (User & Roles)
// ============================================================================

interface User {
  id: string;
  username: string;
  role: 'admin' | 'moderator' | 'user' | 'anonymous';
  permissions: string[];
}

// Helper function to extract user from context
function getUser(ctx?: HiddenEvaluationContext): User | undefined {
  return ctx?.metadata?.user as User | undefined;
}

// Helper functions for role checks
function isAdmin(ctx?: HiddenEvaluationContext): boolean {
  const user = getUser(ctx);
  return user?.role === 'admin';
}

function isModerator(ctx?: HiddenEvaluationContext): boolean {
  const user = getUser(ctx);
  return user?.role === 'moderator' || user?.role === 'admin';
}

// ============================================================================
// PUBLIC TOOLS (Visible to everyone)
// ============================================================================

interface SearchTool extends ITool {
  name: 'search';
  description: 'Search public content';
  params: { query: string; limit?: number };
  result: { results: Array<{ id: string; title: string; snippet: string }> };
  // No hidden flag = visible to everyone
}

interface InfoTool extends ITool {
  name: 'get_info';
  description: 'Get server information';
  params: {};
  result: { version: string; uptime: number; total_users: number };
  // No hidden flag = visible to everyone
}

// ============================================================================
// ADMIN TOOLS (Visible only to admins)
// ============================================================================

interface DeleteUserTool extends ITool {
  name: 'delete_user';
  description: 'Permanently delete a user account';
  params: { user_id: string; reason: string };
  result: { deleted: boolean; user_id: string };
  // Dynamic hidden: only visible to admins
  hidden: (ctx?: HiddenEvaluationContext) => !isAdmin(ctx);
}

interface ResetDatabaseTool extends ITool {
  name: 'reset_database';
  description: 'Reset database to initial state';
  params: { confirm: boolean; backup?: boolean };
  result: { reset: boolean; backup_created: boolean };
  // Dynamic hidden: only visible to admins
  hidden: (ctx?: HiddenEvaluationContext) => !isAdmin(ctx);
}

interface ConfigureServerTool extends ITool {
  name: 'configure_server';
  description: 'Update server configuration';
  params: { key: string; value: any };
  result: { updated: boolean; old_value: any; new_value: any };
  // Dynamic hidden: only visible to admins
  hidden: (ctx?: HiddenEvaluationContext) => !isAdmin(ctx);
}

// ============================================================================
// MODERATOR TOOLS (Visible to moderators and admins)
// ============================================================================

interface BanUserTool extends ITool {
  name: 'ban_user';
  description: 'Ban a user from the platform';
  params: { user_id: string; reason: string; duration_days?: number };
  result: { banned: boolean; user_id: string; expires_at?: string };
  // Dynamic hidden: only visible to moderators and admins
  hidden: (ctx?: HiddenEvaluationContext) => !isModerator(ctx);
}

interface DeletePostTool extends ITool {
  name: 'delete_post';
  description: 'Delete a post or comment';
  params: { post_id: string; reason: string };
  result: { deleted: boolean; post_id: string };
  // Dynamic hidden: only visible to moderators and admins
  hidden: (ctx?: HiddenEvaluationContext) => !isModerator(ctx);
}

interface ReviewFlagsTool extends ITool {
  name: 'review_flags';
  description: 'Review flagged content';
  params: { limit?: number };
  result: { flags: Array<{ id: string; content: string; reason: string }> };
  // Dynamic hidden: only visible to moderators and admins
  hidden: (ctx?: HiddenEvaluationContext) => !isModerator(ctx);
}

// ============================================================================
// RESOURCES (Some public, some hidden)
// ============================================================================

interface PublicConfigResource extends IResource {
  uri: 'config://public';
  name: 'Public Configuration';
  description: 'Public server configuration';
  mimeType: 'application/json';
  data: { version: string; features: string[] };
  // No hidden flag = visible to everyone
}

interface AdminConfigResource extends IResource {
  uri: 'config://admin';
  name: 'Admin Configuration';
  description: 'Administrative configuration settings';
  mimeType: 'application/json';
  data: { debug: boolean; flags: string[]; secrets: Record<string, string> };
  // Dynamic hidden: only visible to admins
  hidden: (ctx?: HiddenEvaluationContext) => !isAdmin(ctx);
}

interface AuditLogResource extends IResource {
  uri: 'logs://audit';
  name: 'Audit Log';
  description: 'System audit log';
  mimeType: 'text/plain';
  data: string;
  // Dynamic hidden: only visible to admins
  hidden: (ctx?: HiddenEvaluationContext) => !isAdmin(ctx);
}

// ============================================================================
// PROMPTS
// ============================================================================

interface HelpPrompt extends IPrompt {
  name: 'help';
  description: 'Get help with available commands';
  args: { topic?: string };
  result: string;
  // No hidden flag = visible to everyone
}

interface AdminHelpPrompt extends IPrompt {
  name: 'admin_help';
  description: 'Get help with admin commands';
  args: { command?: string };
  result: string;
  // Dynamic hidden: only visible to admins
  hidden: (ctx?: HiddenEvaluationContext) => !isAdmin(ctx);
}

// ============================================================================
// SKILLS (Auto-generated documentation for hidden capabilities)
// ============================================================================

interface AdminSkill extends ISkill {
  name: 'admin_panel';
  description: 'Administrative operations (requires admin role)';
  components: {
    tools: ['delete_user', 'reset_database', 'configure_server'];
    resources: ['config://admin', 'logs://audit'];
    prompts: ['admin_help'];
  };
  // Admin skills visible to everyone (to discover capabilities)
  // Actual tools are hidden based on role
}

interface ModeratorSkill extends ISkill {
  name: 'moderator_tools';
  description: 'Content moderation tools (requires moderator or admin role)';
  components: {
    tools: ['ban_user', 'delete_post', 'review_flags'];
  };
  // Moderator skills visible to everyone (to discover capabilities)
  // Actual tools are hidden based on role
}

// ============================================================================
// SERVER IMPLEMENTATION
// ============================================================================

export default class AuthGatedServer {
  private users: Map<string, { username: string; role: string }> = new Map([
    ['user1', { username: 'john_admin', role: 'admin' }],
    ['user2', { username: 'jane_mod', role: 'moderator' }],
    ['user3', { username: 'bob_user', role: 'user' }],
  ]);

  private posts: Map<string, { content: string; author: string }> = new Map([
    ['post1', { content: 'Hello world!', author: 'user3' }],
    ['post2', { content: 'Great post!', author: 'user2' }],
  ]);

  private auditLog: string[] = [];

  private logAudit(action: string, user?: string) {
    const timestamp = new Date().toISOString();
    this.auditLog.push(`[${timestamp}] ${user || 'anonymous'}: ${action}`);
  }

  // ========== PUBLIC TOOLS ==========

  search: ToolHelper<SearchTool> = async ({ query, limit = 10 }) => {
    this.logAudit(`search: ${query}`);
    return {
      results: [
        { id: 'post1', title: 'First Post', snippet: 'Hello world!' },
        { id: 'post2', title: 'Second Post', snippet: 'Great post!' },
      ].slice(0, limit),
    };
  };

  get_info: ToolHelper<InfoTool> = async () => {
    return {
      version: server.version,
      uptime: process.uptime(),
      total_users: this.users.size,
    };
  };

  // ========== ADMIN TOOLS ==========

  delete_user: ToolHelper<DeleteUserTool> = async ({ user_id, reason }) => {
    this.logAudit(`delete_user: ${user_id} (reason: ${reason})`, 'admin');

    if (!this.users.has(user_id)) {
      throw new Error(`User ${user_id} not found`);
    }

    this.users.delete(user_id);
    return { deleted: true, user_id };
  };

  reset_database: ToolHelper<ResetDatabaseTool> = async ({ confirm, backup = true }) => {
    if (!confirm) {
      throw new Error('Reset requires explicit confirmation');
    }

    this.logAudit(`reset_database (backup: ${backup})`, 'admin');

    const backup_created = backup;
    if (backup) {
      // Simulate backup
      console.log('Creating backup...');
    }

    // Reset to initial state
    this.users.clear();
    this.posts.clear();
    this.auditLog = [];

    return { reset: true, backup_created };
  };

  configure_server: ToolHelper<ConfigureServerTool> = async ({ key, value }) => {
    this.logAudit(`configure_server: ${key} = ${value}`, 'admin');

    // Simulate configuration update
    const old_value = null;
    return { updated: true, old_value, new_value: value };
  };

  // ========== MODERATOR TOOLS ==========

  ban_user: ToolHelper<BanUserTool> = async ({ user_id, reason, duration_days }) => {
    this.logAudit(`ban_user: ${user_id} (reason: ${reason})`, 'moderator');

    if (!this.users.has(user_id)) {
      throw new Error(`User ${user_id} not found`);
    }

    const expires_at = duration_days
      ? new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    return { banned: true, user_id, expires_at };
  };

  delete_post: ToolHelper<DeletePostTool> = async ({ post_id, reason }) => {
    this.logAudit(`delete_post: ${post_id} (reason: ${reason})`, 'moderator');

    if (!this.posts.has(post_id)) {
      throw new Error(`Post ${post_id} not found`);
    }

    this.posts.delete(post_id);
    return { deleted: true, post_id };
  };

  review_flags: ToolHelper<ReviewFlagsTool> = async ({ limit = 10 }) => {
    this.logAudit('review_flags', 'moderator');

    // Simulate flagged content
    return {
      flags: [
        { id: 'flag1', content: 'Spam post', reason: 'Spam' },
        { id: 'flag2', content: 'Offensive comment', reason: 'Harassment' },
      ].slice(0, limit),
    };
  };

  // ========== RESOURCES ==========

  'config://public': ResourceHelper<PublicConfigResource> = async () => {
    return {
      version: server.version,
      features: ['search', 'info'],
    };
  };

  'config://admin': ResourceHelper<AdminConfigResource> = async () => {
    return {
      debug: true,
      flags: ['feature_a', 'feature_b'],
      secrets: { api_key: 'secret123' },
    };
  };

  'logs://audit': ResourceHelper<AuditLogResource> = async () => {
    return this.auditLog.join('\n');
  };

  // ========== PROMPTS ==========

  help: PromptHelper<HelpPrompt> = async ({ topic }) => {
    if (topic) {
      return `Help for topic: ${topic}\n\nAvailable commands:\n- search: Search public content\n- get_info: Get server information`;
    }
    return `Available commands:\n- search: Search public content\n- get_info: Get server information\n\nUse "help" with a topic for more details.`;
  };

  admin_help: PromptHelper<AdminHelpPrompt> = async ({ command }) => {
    if (command) {
      return `Help for admin command: ${command}\n\nThis command requires admin privileges.`;
    }
    return `Admin commands:\n- delete_user: Delete a user account\n- reset_database: Reset database\n- configure_server: Update configuration\n\nAll commands require admin role.`;
  };
}

export { server };
