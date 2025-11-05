/**
 * Roots types for client working directories
 */

/**
 * Base Roots interface
 *
 * Roots allow servers to request the client's working directories/context scopes.
 * This helps servers understand the client's file system context for file-based operations.
 *
 * **Implementation Patterns:**
 * - **Recommended:** Use RootsHelper<T> type for automatic type safety
 * - **Alternative:** Assign function directly (types must match interface signature)
 *
 * **Note:** The roots protocol is a server-to-client request capability.
 * Use context.listRoots() within tool handlers to fetch the client's roots.
 *
 * @example Pattern 1: With RootsHelper (Recommended)
 * ```typescript
 * import type { IRoots, RootsHelper } from 'simply-mcp';
 *
 * interface ProjectRoots extends IRoots {
 *   name: 'project_roots';
 *   description: 'Get project root directories';
 * }
 *
 * // Using RootsHelper for type safety
 * const projectRoots: RootsHelper<ProjectRoots> = () => {
 *   return [
 *     { uri: 'file:///home/user/project', name: 'My Project' },
 *     { uri: 'file:///home/user/workspace', name: 'Workspace' }
 *   ];
 * };
 * ```
 *
 * @example Pattern 2: Direct Function Assignment
 * ```typescript
 * interface ProjectRoots extends IRoots {
 *   name: 'project_roots';
 *   description: 'Get project root directories';
 * }
 *
 * // Direct assignment (also works)
 * const projectRoots: ProjectRoots = () => {
 *   return [
 *     { uri: 'file:///home/user/project', name: 'My Project' }
 *   ];
 * };
 * ```
 *
 * @example Async Roots Discovery
 * ```typescript
 * interface WorkspaceRoots extends IRoots {
 *   name: 'workspace_roots';
 *   description: 'Dynamically discover workspace roots';
 * }
 *
 * const workspaceRoots: RootsHelper<WorkspaceRoots> = async () => {
 *   const roots = await discoverWorkspaceRoots();
 *   return roots.map(r => ({
 *     uri: `file://${r.path}`,
 *     name: r.name
 *   }));
 * };
 * ```
 *
 * @example Using Roots in Tools
 * ```typescript
 * interface FindFileTool extends ITool {
 *   name: 'find_file';
 *   description: 'Find a file in project roots';
 *   params: { filename: { type: 'string'; description: 'File to find' } };
 *   result: { path?: string; found: boolean };
 * }
 *
 * const findFile: ToolHelper<FindFileTool> = async (params, context) => {
 *   // Use context.listRoots() to access client's roots
 *   const roots = await context?.listRoots?.() || [];
 *
 *   if (roots.length === 0) {
 *     return { found: false };
 *   }
 *
 *   const rootPath = roots[0].uri.replace('file://', '');
 *   return {
 *     path: `${rootPath}/${params.filename}`,
 *     found: true
 *   };
 * };
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
