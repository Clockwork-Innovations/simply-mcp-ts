/**
 * Router Integration Tests
 * Tests end-to-end router functionality including registration, namespace calling, and flattenRouters
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { loadInterfaceServer } from '../../src/server/adapter.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEMP_DIR = join(process.cwd(), 'tests', 'integration', 'temp-router-tests');

function setupTempDir() {
  try {
    mkdirSync(TEMP_DIR, { recursive: true });
  } catch (err) {
    // Directory might already exist
  }
}

function cleanupTempDir() {
  try {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  } catch (err) {
    // Ignore cleanup errors
  }
}

function createTestFile(filename: string, content: string): string {
  const filePath = join(TEMP_DIR, filename);
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

describe('Router Integration Tests', () => {
  beforeEach(() => {
    setupTempDir();
  });

  afterEach(() => {
    cleanupTempDir();
  });

  describe('Router Registration', () => {
    it('should register router from interface and expose it as a tool', async () => {
      const content = `// @ts-nocheck
        import type { IServer, ITool, IToolRouter } from '../../src/index.js';

        interface GetDataTool extends ITool {
          name: 'get_data';
          description: 'Get data';
          params: Record<string, never>;
          result: { data: string };
        }

        interface DataRouter extends IToolRouter {
          name: 'data_router';
          description: 'Data management tools';
          tools: [GetDataTool];
        }

        const server: IServer = {
  name: 'test-server',
  version: '1.0.0',
  description: 'Test server'
        }

        export default class TestService {
          getData: GetDataTool = async () => ({ data: 'test' });
          dataRouter!: DataRouter;
        }
      `;

      const filePath = createTestFile('router-registration.ts', content);
      const server = await loadInterfaceServer({ filePath, verbose: false });

      // Router should be available as a tool
      const tools = await server.listTools();
      const routerTool = tools.find(t => t.name === 'data_router');

      expect(routerTool).toBeDefined();
      expect(routerTool?.description).toBe('Data management tools');
    });

    it('should register multiple routers', async () => {
      const content = `// @ts-nocheck
        import type { IServer, ITool, IToolRouter } from '../../src/index.js';

        interface Tool1 extends ITool {
          name: 'tool1';
          description: 'Tool 1';
          params: Record<string, never>;
          result: { value: number };
        }

        interface Tool2 extends ITool {
          name: 'tool2';
          description: 'Tool 2';
          params: Record<string, never>;
          result: { value: number };
        }

        interface Router1 extends IToolRouter {
          name: 'router1';
          description: 'Router 1';
          tools: [Tool1];
        }

        interface Router2 extends IToolRouter {
          name: 'router2';
          description: 'Router 2';
          tools: [Tool2];
        }

        const server: IServer = {
  name: 'multi-router-server',
  version: '1.0.0',
  description: 'Multi router server'
        }

        export default class TestService {
          tool1: Tool1 = async () => ({ value: 1 });
          tool2: Tool2 = async () => ({ value: 2 });
          router1!: Router1;
          router2!: Router2;
        }
      `;

      const filePath = createTestFile('multi-router.ts', content);
      const server = await loadInterfaceServer({ filePath, verbose: false });

      const tools = await server.listTools();
      const router1 = tools.find(t => t.name === 'router1');
      const router2 = tools.find(t => t.name === 'router2');

      expect(router1).toBeDefined();
      expect(router2).toBeDefined();
    });

    it('should allow same tool in multiple routers', async () => {
      const content = `// @ts-nocheck
        import type { IServer, ITool, IToolRouter } from '../../src/index.js';

        interface SharedTool extends ITool {
          name: 'shared_tool';
          description: 'Shared tool';
          params: Record<string, never>;
          result: { value: string };
        }

        interface AdminRouter extends IToolRouter {
          name: 'admin_router';
          description: 'Admin tools';
          tools: [SharedTool];
        }

        interface UserRouter extends IToolRouter {
          name: 'user_router';
          description: 'User tools';
          tools: [SharedTool];
        }

        const server: IServer = {
  name: 'shared-tool-server',
  version: '1.0.0',
  description: 'Shared tool server'
        }

        export default class TestService {
          sharedTool: SharedTool = async () => ({ value: 'shared' });
          adminRouter!: AdminRouter;
          userRouter!: UserRouter;
        }
      `;

      const filePath = createTestFile('shared-tool.ts', content);
      const server = await loadInterfaceServer({ filePath, verbose: false });

      const tools = await server.listTools();
      const adminRouter = tools.find(t => t.name === 'admin_router');
      const userRouter = tools.find(t => t.name === 'user_router');

      expect(adminRouter).toBeDefined();
      expect(userRouter).toBeDefined();
    });
  });

  describe('flattenRouters Configuration', () => {
    it('should hide router-assigned tools when flattenRouters=false', async () => {
      const content = `// @ts-nocheck
        import type { IServer, ITool, IToolRouter } from '../../src/index.js';

        interface AssignedTool extends ITool {
          name: 'assigned_tool';
          description: 'Assigned tool';
          params: Record<string, never>;
          result: { value: string };
        }

        interface UnassignedTool extends ITool {
          name: 'unassigned_tool';
          description: 'Unassigned tool';
          params: Record<string, never>;
          result: { value: string };
        }

        interface TestRouter extends IToolRouter {
          name: 'test_router';
          description: 'Test router';
          tools: [AssignedTool];
        }

        const server: IServer = {
          name: 'flatten-false-server',
          version: '1.0.0',
          description: 'Flatten false server',
          flattenRouters: false
        };

        export default class TestService {
          assignedTool: AssignedTool = async () => ({ value: 'assigned' });
          unassignedTool: UnassignedTool = async () => ({ value: 'unassigned' });
          testRouter!: TestRouter;
        }
      `;

      const filePath = createTestFile('flatten-false.ts', content);
      const server = await loadInterfaceServer({ filePath, verbose: false });

      const tools = await server.listTools();
      const toolNames = tools.map(t => t.name);

      // Should include router and unassigned tool
      expect(toolNames).toContain('test_router');
      expect(toolNames).toContain('unassigned_tool');

      // Should NOT include assigned tool
      expect(toolNames).not.toContain('assigned_tool');
    });

    it('should show all tools when flattenRouters=true', async () => {
      const content = `// @ts-nocheck
        import type { IServer, ITool, IToolRouter } from '../../src/index.js';

        interface AssignedTool extends ITool {
          name: 'assigned_tool';
          description: 'Assigned tool';
          params: Record<string, never>;
          result: { value: string };
        }

        interface TestRouter extends IToolRouter {
          name: 'test_router';
          description: 'Test router';
          tools: [AssignedTool];
        }

        const server: IServer = {
          name: 'flatten-true-server',
          version: '1.0.0',
          description: 'Flatten true server',
          flattenRouters: true
        };

        export default class TestService {
          assignedTool: AssignedTool = async () => ({ value: 'assigned' });
          testRouter!: TestRouter;
        }
      `;

      const filePath = createTestFile('flatten-true.ts', content);
      const server = await loadInterfaceServer({ filePath, verbose: false });

      const tools = await server.listTools();
      const toolNames = tools.map(t => t.name);

      // Should include both router and assigned tool
      expect(toolNames).toContain('test_router');
      expect(toolNames).toContain('assigned_tool');
    });
  });

  describe('Router Tool Calls', () => {
    it('should list tools when calling a router', async () => {
      const content = `// @ts-nocheck
        import type { IServer, ITool, IToolRouter } from '../../src/index.js';

        interface Tool1 extends ITool {
          name: 'tool1';
          description: 'Tool 1';
          params: Record<string, never>;
          result: { value: number };
        }

        interface Tool2 extends ITool {
          name: 'tool2';
          description: 'Tool 2';
          params: Record<string, never>;
          result: { value: number };
        }

        interface TestRouter extends IToolRouter {
          name: 'test_router';
          description: 'Test router with multiple tools';
          tools: [Tool1, Tool2];
        }

        const server: IServer = {
  name: 'router-call-server',
  version: '1.0.0',
  description: 'Router call server'
        }

        export default class TestService {
          tool1: Tool1 = async () => ({ value: 1 });
          tool2: Tool2 = async () => ({ value: 2 });
          testRouter!: TestRouter;
        }
      `;

      const filePath = createTestFile('router-call.ts', content);
      const server = await loadInterfaceServer({ filePath, verbose: false });

      // Call the router directly
      const result = await server.executeTool('test_router', {});

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);

      // Result should contain tool information
      const textContent = result.content.find((c: any) => c.type === 'text');
      expect(textContent).toBeDefined();
      if (textContent && textContent.type === 'text') {
        expect(textContent.text).toContain('tool1');
        expect(textContent.text).toContain('tool2');
      }
    });
  });

  describe('Router Dual Syntax Support', () => {
    it('should support both interface references and string literals in tools array', async () => {
      const content = `// @ts-nocheck
        import type { IServer, ITool, IToolRouter } from '../../src/index.js';

        interface InterfaceTool extends ITool {
          name: 'interface_tool';
          description: 'Tool referenced by interface';
          params: Record<string, never>;
          result: { value: string };
        }

        interface StringTool extends ITool {
          name: 'string_tool';
          description: 'Tool referenced by string';
          params: Record<string, never>;
          result: { value: string };
        }

        interface MixedRouter extends IToolRouter {
          name: 'mixed_router';
          description: 'Router with mixed syntax';
          tools: [InterfaceTool, 'string_tool'];
        }

        const server: IServer = {
  name: 'dual-syntax-server',
  version: '1.0.0',
  description: 'Dual syntax server'
        }

        export default class TestService {
          interfaceTool: InterfaceTool = async () => ({ value: 'from-interface' });
          stringTool: StringTool = async () => ({ value: 'from-string' });
          mixedRouter!: MixedRouter;
        }
      `;

      const filePath = createTestFile('dual-syntax.ts', content);
      const server = await loadInterfaceServer({ filePath, verbose: false });

      // Call the router to see both tools are resolved
      const result = await server.executeTool('mixed_router', {});

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      const textContent = result.content.find((c: any) => c.type === 'text');
      expect(textContent).toBeDefined();
      if (textContent && textContent.type === 'text') {
        // Both tools should be listed by their actual tool names
        expect(textContent.text).toContain('interface_tool');
        expect(textContent.text).toContain('string_tool');
      }
    });

    it('should prefer tool names when resolving interface references', async () => {
      const content = `// @ts-nocheck
        import type { IServer, ITool, IToolRouter } from '../../src/index.js';

        interface MyTool extends ITool {
          name: 'my_actual_tool';
          description: 'Tool with different interface and tool names';
          params: Record<string, never>;
          result: { value: string };
        }

        interface TestRouter extends IToolRouter {
          name: 'test_router';
          description: 'Test router';
          tools: [MyTool];
        }

        const server: IServer = {
  name: 'name-preference-server',
  version: '1.0.0',
  description: 'Name preference server'
        }

        export default class TestService {
          myActualTool: MyTool = async () => ({ value: 'resolved' });
          testRouter!: TestRouter;
        }
      `;

      const filePath = createTestFile('name-preference.ts', content);
      const server = await loadInterfaceServer({ filePath, verbose: false });

      // Call the router
      const result = await server.executeTool('test_router', {});

      expect(result).toBeDefined();
      const textContent = result.content.find((c: any) => c.type === 'text');
      expect(textContent).toBeDefined();
      if (textContent && textContent.type === 'text') {
        // Should show the actual tool name, not the interface name
        expect(textContent.text).toContain('my_actual_tool');
        expect(textContent.text).not.toContain('MyTool');
      }
    });
  });
});
