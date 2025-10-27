/**
 * Access Control System
 *
 * Implements permission-based authorization with support for:
 * - Permission strings (e.g., "tools:execute", "tools:greet")
 * - Wildcard permissions (e.g., "tools:*", "*:*")
 * - Permission inheritance/hierarchy
 * - Session-based permission storage
 */

import { SecurityContext, PermissionConfig } from './types.js';

/**
 * Permission checker class for evaluating permissions
 */
export class PermissionChecker {
  private inheritanceRules: Map<string, string[]>;
  private anonymousPermissions: Set<string>;
  private authenticatedPermissions: Set<string>;

  constructor(config?: PermissionConfig) {
    this.inheritanceRules = new Map();
    this.anonymousPermissions = new Set(config?.anonymous || []);
    this.authenticatedPermissions = new Set(config?.authenticated || []);

    // Build inheritance rules
    if (config?.inheritance) {
      for (const [parent, children] of Object.entries(config.inheritance)) {
        this.inheritanceRules.set(parent, children);
      }
    }
  }

  /**
   * Check if a permission matches a required permission
   * Supports wildcards: "tools:*" matches "tools:execute"
   */
  private matchesPermission(required: string, granted: string): boolean {
    // Exact match
    if (required === granted) {
      return true;
    }

    // Wildcard match: "*:*" grants everything
    if (granted === '*:*' || granted === '*') {
      return true;
    }

    // Parse permission strings
    const requiredParts = required.split(':');
    const grantedParts = granted.split(':');

    // Check each part for wildcard or exact match
    for (let i = 0; i < Math.max(requiredParts.length, grantedParts.length); i++) {
      const reqPart = requiredParts[i] || '';
      const grantPart = grantedParts[i] || '';

      if (grantPart === '*') {
        // Wildcard matches everything at this level and beyond
        return true;
      }

      if (reqPart !== grantPart) {
        return false;
      }
    }

    return true;
  }

  /**
   * Expand a permission to include all inherited permissions
   */
  private expandPermission(permission: string): string[] {
    const expanded = [permission];
    const children = this.inheritanceRules.get(permission);

    if (children) {
      for (const child of children) {
        expanded.push(...this.expandPermission(child));
      }
    }

    return expanded;
  }

  /**
   * Check if a context has a specific permission
   */
  hasPermission(context: SecurityContext, requiredPermission: string): boolean {
    // Get all permissions (including inherited and default)
    const allPermissions = this.getAllPermissions(context);

    // Check if any granted permission matches the required permission
    for (const granted of allPermissions) {
      if (this.matchesPermission(requiredPermission, granted)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a context has all of the specified permissions
   */
  hasAllPermissions(context: SecurityContext, requiredPermissions: string[]): boolean {
    return requiredPermissions.every(perm => this.hasPermission(context, perm));
  }

  /**
   * Check if a context has any of the specified permissions
   */
  hasAnyPermission(context: SecurityContext, requiredPermissions: string[]): boolean {
    return requiredPermissions.some(perm => this.hasPermission(context, perm));
  }

  /**
   * Get all permissions for a context (including defaults and inherited)
   */
  getAllPermissions(context: SecurityContext): string[] {
    const permissions = new Set<string>();

    // Add default permissions based on authentication status
    if (!context.authenticated) {
      this.anonymousPermissions.forEach(p => permissions.add(p));
    } else {
      this.authenticatedPermissions.forEach(p => permissions.add(p));
    }

    // Add context-specific permissions
    if (context.permissions) {
      context.permissions.forEach(p => permissions.add(p));
    }

    // Expand all permissions to include inherited ones
    const allPermissions = new Set<string>();
    for (const permission of permissions) {
      this.expandPermission(permission).forEach(p => allPermissions.add(p));
    }

    return Array.from(allPermissions);
  }

  /**
   * Get required permission for a tool execution
   */
  getToolPermission(toolName: string): string {
    return `tools:${toolName}`;
  }

  /**
   * Get required permission for a prompt
   */
  getPromptPermission(promptName: string): string {
    return `prompts:${promptName}`;
  }

  /**
   * Get required permission for a resource
   */
  getResourcePermission(resourceUri: string): string {
    // Extract resource name from URI
    const parts = resourceUri.split('/');
    const resourceName = parts[parts.length - 1];
    return `resources:${resourceName}`;
  }
}

/**
 * Session-based permission storage
 */
export class SessionPermissionStore {
  private sessions: Map<string, SecurityContext>;
  private readonly sessionTimeout: number;

  constructor(sessionTimeout: number = 3600000) { // Default 1 hour
    this.sessions = new Map();
    this.sessionTimeout = sessionTimeout;

    // Clean up expired sessions periodically
    setInterval(() => this.cleanupExpiredSessions(), 60000); // Every minute
  }

  /**
   * Store security context for a session
   */
  setContext(sessionId: string, context: SecurityContext): void {
    this.sessions.set(sessionId, context);
  }

  /**
   * Get security context for a session
   */
  getContext(sessionId: string): SecurityContext | undefined {
    const context = this.sessions.get(sessionId);

    if (!context) {
      return undefined;
    }

    // Check if session has expired
    if (Date.now() - context.createdAt > this.sessionTimeout) {
      this.sessions.delete(sessionId);
      return undefined;
    }

    return context;
  }

  /**
   * Remove a session's context
   */
  removeContext(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, context] of this.sessions.entries()) {
      if (now - context.createdAt > this.sessionTimeout) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Get number of active sessions
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }
}

/**
 * Create an anonymous security context
 */
export function createAnonymousContext(): SecurityContext {
  return {
    permissions: [],
    authenticated: false,
    createdAt: Date.now(),
  };
}

/**
 * Create an authenticated security context
 */
export function createAuthenticatedContext(
  apiKeyName: string,
  permissions: string[],
  sessionId?: string,
  ipAddress?: string,
  userAgent?: string
): SecurityContext {
  return {
    sessionId,
    apiKey: {
      key: '', // Don't store the actual key
      name: apiKeyName,
      permissions,
    },
    permissions,
    authenticated: true,
    ipAddress,
    userAgent,
    createdAt: Date.now(),
  };
}