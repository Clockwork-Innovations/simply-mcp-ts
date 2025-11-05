/**
 * Roots types for client working directories
 */

/**
 * Base Roots interface
 *
 * Roots allow servers to request the client's working directories/context scopes.
 * This helps servers understand the client's file system context for file-based operations.
 *
 * Note: The roots protocol is a server-to-client request capability.
 * Use context.listRoots() within tool handlers to fetch the client's roots.
 *
 * @example Simple Roots Request
 * ```typescript
 * interface ProjectRoots extends IRoots {
 *   name: 'project_roots';
 *   description: 'Get project root directories';
 * }
 *
 * // Usage in a tool
 * const roots = await context.listRoots();
 * // Returns: [{ uri: 'file:///home/user/project', name: 'My Project' }]
 * ```
 */
export interface IRoots {
  /**
   * Human-readable name for this roots request
   */
  name: string;

  /**
   * Description of what the roots are used for
   */
  description: string;

  /**
   * Callable signature for dynamic roots
   */
  (): Array<{ uri: string; name?: string }> | Promise<Array<{ uri: string; name?: string }>>;
}
