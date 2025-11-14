/**
 * Integration Tests: Dynamic Hidden Use Cases
 *
 * Tests real-world use cases for dynamic hidden evaluation including:
 * - Auth-gated tools
 * - Permission-based access
 * - Feature flags
 * - Time-based hiding
 * - Environment-based hiding
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { loadInterfaceServer } from '../../src/server/adapter.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Dynamic Hidden Use Cases', () => {
  const testDir = join(tmpdir(), 'test-use-cases-' + Date.now());

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  describe('Auth-gated tools', () => {
    it('should hide tools based on user authentication', async () => {
      const testFile = join(testDir, 'auth-gated.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';
        import type { HiddenEvaluationContext } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query';
        }

        interface PublicTool extends ITool {
          name: 'public_search';
          description: 'Public search';
          params: { query: QueryParam };
          result: { results: string[] };
        }

        interface AuthenticatedTool extends ITool {
          name: 'user_search';
          description: 'Authenticated user search';
          params: { query: QueryParam };
          result: { results: string[] };
          hidden: (ctx?: HiddenEvaluationContext) => {
            const user = ctx?.metadata?.user as { id?: string } | undefined;
            return !user?.id;
          };
        }

        interface AdminTool extends ITool {
          name: 'admin_search';
          description: 'Admin-only search';
          params: { query: QueryParam };
          result: { results: string[] };
          hidden: (ctx?: HiddenEvaluationContext) => {
            const user = ctx?.metadata?.user as { role?: string } | undefined;
            return user?.role !== 'admin';
          };
        }

        interface Server extends IServer {
          tools: {
            publicTool: PublicTool;
            authenticatedTool: AuthenticatedTool;
            adminTool: AdminTool;
          };
        }

        export const publicTool = async (params: any) => ({ results: [] });
        export const authenticatedTool = async (params: any) => ({ results: [] });
        export const adminTool = async (params: any) => ({ results: [] });
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      // Anonymous user
      const anonTools = await server.listTools({});
      expect(anonTools).toHaveLength(1);
      expect(anonTools[0].name).toBe('public_search');

      // Authenticated user
      const userTools = await server.listTools({
        metadata: { user: { id: 'user-123', role: 'user' } }
      });
      expect(userTools).toHaveLength(2);
      expect(userTools.map(t => t.name)).toEqual(
        expect.arrayContaining(['public_search', 'user_search'])
      );

      // Admin user
      const adminTools = await server.listTools({
        metadata: { user: { id: 'admin-123', role: 'admin' } }
      });
      expect(adminTools).toHaveLength(3);
      expect(adminTools.map(t => t.name)).toEqual(
        expect.arrayContaining(['public_search', 'user_search', 'admin_search'])
      );
    });
  });

  describe('Permission-based access', () => {
    it('should hide resources based on async permission checks', async () => {
      const testFile = join(testDir, 'permissions.ts');
      const code = `
        import type { IResource, IServer } from 'simply-mcp';
        import type { HiddenEvaluationContext } from 'simply-mcp';

        // Simulate async permission check
        async function hasPermission(userId: string, permission: string): Promise<boolean> {
          await new Promise(resolve => setTimeout(resolve, 10));
          const permissions: Record<string, string[]> = {
            'user-123': ['read:docs'],
            'admin-456': ['read:docs', 'read:config', 'write:config']
          };
          return permissions[userId]?.includes(permission) ?? false;
        }

        interface PublicDocs extends IResource {
          uri: 'docs://public';
          name: 'Public Docs';
          mimeType: 'text/markdown';
          value: '# Public Documentation';
        }

        interface ConfigDocs extends IResource {
          uri: 'docs://config';
          name: 'Config Docs';
          mimeType: 'text/markdown';
          value: '# Configuration';
          hidden: async (ctx?: HiddenEvaluationContext) => {
            const userId = ctx?.metadata?.userId as string | undefined;
            if (!userId) return true;
            return !(await hasPermission(userId, 'read:config'));
          };
        }

        interface Server extends IServer {
          resources: {
            publicDocs: PublicDocs;
            configDocs: ConfigDocs;
          };
        }

        export const publicDocs = 'public content';
        export const configDocs = 'config content';
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      // Regular user
      const userResources = await server.listResources({
        metadata: { userId: 'user-123' }
      });
      expect(userResources).toHaveLength(1);
      expect(userResources[0].uri).toBe('docs://public');

      // Admin user
      const adminResources = await server.listResources({
        metadata: { userId: 'admin-456' }
      });
      expect(adminResources).toHaveLength(2);
      expect(adminResources.map(r => r.uri)).toEqual(
        expect.arrayContaining(['docs://public', 'docs://config'])
      );
    });
  });

  describe('Feature flags', () => {
    it('should hide tools based on feature flags', async () => {
      const testFile = join(testDir, 'feature-flags.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';
        import type { HiddenEvaluationContext } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query';
        }

        interface StableTool extends ITool {
          name: 'stable_feature';
          description: 'Stable feature';
          params: { query: QueryParam };
          result: string;
        }

        interface BetaTool extends ITool {
          name: 'beta_feature';
          description: 'Beta feature';
          params: { query: QueryParam };
          result: string;
          hidden: (ctx?: HiddenEvaluationContext) => {
            const features = ctx?.metadata?.features as string[] | undefined;
            return !features?.includes('beta_features');
          };
        }

        interface ExperimentalTool extends ITool {
          name: 'experimental_feature';
          description: 'Experimental feature';
          params: { query: QueryParam };
          result: string;
          hidden: (ctx?: HiddenEvaluationContext) => {
            const features = ctx?.metadata?.features as string[] | undefined;
            return !features?.includes('experimental');
          };
        }

        interface Server extends IServer {
          tools: {
            stableTool: StableTool;
            betaTool: BetaTool;
            experimentalTool: ExperimentalTool;
          };
        }

        export const stableTool = async (params: any) => 'stable';
        export const betaTool = async (params: any) => 'beta';
        export const experimentalTool = async (params: any) => 'experimental';
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      // No feature flags
      const defaultTools = await server.listTools({});
      expect(defaultTools).toHaveLength(1);
      expect(defaultTools[0].name).toBe('stable_feature');

      // Beta enabled
      const betaTools = await server.listTools({
        metadata: { features: ['beta_features'] }
      });
      expect(betaTools).toHaveLength(2);
      expect(betaTools.map(t => t.name)).toEqual(
        expect.arrayContaining(['stable_feature', 'beta_feature'])
      );

      // All features enabled
      const allTools = await server.listTools({
        metadata: { features: ['beta_features', 'experimental'] }
      });
      expect(allTools).toHaveLength(3);
    });
  });

  describe('Time-based hiding', () => {
    it('should hide features based on time conditions', async () => {
      const testFile = join(testDir, 'time-based.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';
        import type { HiddenEvaluationContext } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query';
        }

        interface CurrentTool extends ITool {
          name: 'current_feature';
          description: 'Current feature';
          params: { query: QueryParam };
          result: string;
        }

        interface UpcomingTool extends ITool {
          name: 'upcoming_feature';
          description: 'Feature releasing soon';
          params: { query: QueryParam };
          result: string;
          hidden: () => {
            // Release date: Jan 1, 2030
            const releaseDate = new Date('2030-01-01').getTime();
            return Date.now() < releaseDate;
          };
        }

        interface ExpiredTool extends ITool {
          name: 'expired_feature';
          description: 'Deprecated feature';
          params: { query: QueryParam };
          result: string;
          hidden: () => {
            // Expired: Jan 1, 2020
            const expiryDate = new Date('2020-01-01').getTime();
            return Date.now() > expiryDate;
          };
        }

        interface Server extends IServer {
          tools: {
            currentTool: CurrentTool;
            upcomingTool: UpcomingTool;
            expiredTool: ExpiredTool;
          };
        }

        export const currentTool = async (params: any) => 'current';
        export const upcomingTool = async (params: any) => 'upcoming';
        export const expiredTool = async (params: any) => 'expired';
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      const tools = await server.listTools({});

      // Only current_feature should be visible
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('current_feature');
    });
  });

  describe('Environment-based hiding', () => {
    it('should hide debug resources in production', async () => {
      const testFile = join(testDir, 'environment.ts');
      const code = `
        import type { IResource, IServer } from 'simply-mcp';
        import type { HiddenEvaluationContext } from 'simply-mcp';

        interface PublicAPI extends IResource {
          uri: 'api://endpoints';
          name: 'API Endpoints';
          mimeType: 'application/json';
          value: { endpoints: ['/search', '/get'] };
        }

        interface DebugLogs extends IResource {
          uri: 'debug://logs';
          name: 'Debug Logs';
          mimeType: 'text/plain';
          value: 'Debug output...';
          hidden: (ctx?: HiddenEvaluationContext) => {
            return ctx?.server?.isProduction === true;
          };
        }

        interface InternalMetrics extends IResource {
          uri: 'metrics://internal';
          name: 'Internal Metrics';
          mimeType: 'application/json';
          value: { cpu: 45, memory: 78 };
          hidden: (ctx?: HiddenEvaluationContext) => {
            const env = ctx?.metadata?.environment as string | undefined;
            return env === 'production';
          };
        }

        interface Server extends IServer {
          resources: {
            publicAPI: PublicAPI;
            debugLogs: DebugLogs;
            internalMetrics: InternalMetrics;
          };
        }

        export const publicAPI = { endpoints: [] };
        export const debugLogs = 'logs';
        export const internalMetrics = { cpu: 0, memory: 0 };
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      // Production environment
      const prodResources = await server.listResources({
        server: { isProduction: true },
        metadata: { environment: 'production' }
      });
      expect(prodResources).toHaveLength(1);
      expect(prodResources[0].uri).toBe('api://endpoints');

      // Development environment
      const devResources = await server.listResources({
        server: { isProduction: false },
        metadata: { environment: 'development' }
      });
      expect(devResources).toHaveLength(3);
    });
  });

  describe('Compound conditions', () => {
    it('should handle complex multi-condition predicates', async () => {
      const testFile = join(testDir, 'compound.ts');
      const code = `
        import type { ITool, IServer, IParam } from 'simply-mcp';
        import type { HiddenEvaluationContext } from 'simply-mcp';

        interface QueryParam extends IParam {
          type: 'string';
          description: 'Query';
        }

        interface PowerUserTool extends ITool {
          name: 'power_tool';
          description: 'Advanced tool for power users';
          params: { query: QueryParam };
          result: string;
          hidden: (ctx?: HiddenEvaluationContext) => {
            const user = ctx?.metadata?.user as {
              role?: string;
              experience?: number;
            } | undefined;
            const features = ctx?.metadata?.features as string[] | undefined;

            // Show to admins OR (experienced users with beta access)
            const isAdmin = user?.role === 'admin';
            const isPowerUser = (user?.experience ?? 0) > 100;
            const hasBetaAccess = features?.includes('beta') ?? false;

            return !isAdmin && !(isPowerUser && hasBetaAccess);
          };
        }

        interface Server extends IServer {
          tools: {
            powerUserTool: PowerUserTool;
          };
        }

        export const powerUserTool = async (params: any) => 'power result';
      `;

      writeFileSync(testFile, code);
      const server = await loadInterfaceServer(testFile);

      // Admin sees it
      const adminTools = await server.listTools({
        metadata: { user: { role: 'admin', experience: 0 } }
      });
      expect(adminTools).toHaveLength(1);

      // Experienced user with beta sees it
      const powerUserTools = await server.listTools({
        metadata: {
          user: { role: 'user', experience: 150 },
          features: ['beta']
        }
      });
      expect(powerUserTools).toHaveLength(1);

      // Experienced user without beta doesn't see it
      const noBetaTools = await server.listTools({
        metadata: {
          user: { role: 'user', experience: 150 },
          features: []
        }
      });
      expect(noBetaTools).toHaveLength(0);

      // New user with beta doesn't see it
      const newUserTools = await server.listTools({
        metadata: {
          user: { role: 'user', experience: 50 },
          features: ['beta']
        }
      });
      expect(newUserTools).toHaveLength(0);
    });
  });
});
