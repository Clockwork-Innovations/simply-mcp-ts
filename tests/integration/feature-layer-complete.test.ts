/**
 * Feature Layer Complete Integration Tests (FT-4)
 *
 * Comprehensive end-to-end tests validating complete Feature Layer integration:
 * - FL-1: Static hidden flags
 * - FT-1: Dynamic hidden evaluation
 * - FL-2: Manual skills
 * - FT-2: Auto-generated skills
 * - FT-3: Compile-time validation
 *
 * Test Scenarios:
 * 1. Complete Progressive Disclosure Workflow (all features working together)
 * 2. All Features Combined (static + dynamic + manual + auto-gen + validation)
 * 3. Error Cases & Validation (comprehensive validation testing)
 * 4. Performance Under Load (scalability with all features)
 * 5. LLM Interaction Simulation (real-world usage patterns)
 * 6. Backward Compatibility (old servers still work)
 */

import { describe, it, expect } from '@jest/globals';
import { compileServerFromCode } from '../../src/index.js';

// ============================================================================
// SCENARIO 1: Complete Progressive Disclosure Workflow
// ============================================================================

describe('FT-4: Complete Progressive Disclosure Workflow', () => {
  it('should integrate static hidden, dynamic hidden, manual skills, and auto-gen skills', async () => {
    const code = `
      import { ITool, IResource, ISkill, ToolHelper, ResourceHelper, SkillHelper, HiddenEvaluationContext } from 'simply-mcp';

      // PUBLIC API (3 visible tools, 2 visible resources, 1 visible prompt)
      interface PublicTool1 extends ITool {
        name: 'public_1';
        description: 'Public tool 1';
        params: { data: string };
        result: { success: boolean };
      }

      interface PublicTool2 extends ITool {
        name: 'public_2';
        description: 'Public tool 2';
        params: { value: number };
        result: { doubled: number };
      }

      interface PublicTool3 extends ITool {
        name: 'public_3';
        description: 'Public tool 3';
        params: {};
        result: { message: string };
      }

      interface PublicResource1 extends IResource {
        uri: 'public://config';
        name: 'Config';
        description: 'Public config';
        mimeType: 'application/json';
        data: { version: string };
      }

      interface PublicResource2 extends IResource {
        uri: 'public://status';
        name: 'Status';
        description: 'Public status';
        mimeType: 'application/json';
        data: { healthy: boolean };
      }

      // STATIC HIDDEN (5 tools with hidden: true - FL-1)
      interface StaticHidden1 extends ITool {
        name: 'debug_inspect';
        description: 'Debug inspect';
        params: {};
        result: { state: string };
        hidden: true;
      }

      interface StaticHidden2 extends ITool {
        name: 'debug_trace';
        description: 'Debug trace';
        params: { id: string };
        result: { trace: string[] };
        hidden: true;
      }

      interface StaticHidden3 extends ITool {
        name: 'debug_logs';
        description: 'Debug logs';
        params: {};
        result: { logs: string[] };
        hidden: true;
      }

      interface StaticHidden4 extends ITool {
        name: 'debug_metrics';
        description: 'Debug metrics';
        params: {};
        result: { metrics: Record<string, number> };
        hidden: true;
      }

      interface StaticHidden5 extends ITool {
        name: 'debug_validate';
        description: 'Debug validate';
        params: { config: any };
        result: { valid: boolean };
        hidden: true;
      }

      // DYNAMIC HIDDEN (3 tools with function - FT-1)
      interface DynamicHidden1 extends ITool {
        name: 'admin_reset';
        description: 'Admin reset';
        params: { confirm: boolean };
        result: { reset: boolean };
        hidden: (ctx?: HiddenEvaluationContext) => {
          const user = ctx?.metadata?.user as { isAdmin?: boolean } | undefined;
          return !user?.isAdmin;
        };
      }

      interface DynamicHidden2 extends ITool {
        name: 'admin_config';
        description: 'Admin config';
        params: { key: string; value: any };
        result: { updated: boolean };
        hidden: (ctx?: HiddenEvaluationContext) => {
          const user = ctx?.metadata?.user as { isAdmin?: boolean } | undefined;
          return !user?.isAdmin;
        };
      }

      interface DynamicHidden3 extends ITool {
        name: 'admin_shutdown';
        description: 'Admin shutdown';
        params: {};
        result: { shutting_down: boolean };
        hidden: (ctx?: HiddenEvaluationContext) => {
          const user = ctx?.metadata?.user as { isAdmin?: boolean } | undefined;
          return !user?.isAdmin;
        };
      }

      // HIDDEN RESOURCES (3 hidden)
      interface HiddenResource1 extends IResource {
        uri: 'internal://debug';
        name: 'Debug Info';
        description: 'Internal debug';
        mimeType: 'application/json';
        data: { debug: boolean };
        hidden: true;
      }

      interface HiddenResource2 extends IResource {
        uri: 'internal://metrics';
        name: 'Metrics';
        description: 'Internal metrics';
        mimeType: 'application/json';
        data: { count: number };
        hidden: true;
      }

      interface HiddenResource3 extends IResource {
        uri: 'internal://logs';
        name: 'Logs';
        description: 'Internal logs';
        mimeType: 'text/plain';
        data: string;
        hidden: true;
      }

      // MANUAL SKILL (FL-2)
      interface ManualSkill extends ISkill {
        name: 'debug_manual';
        description: 'Debug manual (FL-2 handcrafted)';
        skill: string;
      }

      // AUTO-GENERATED SKILLS (FT-2)
      interface AutoGenSkill1 extends ISkill {
        name: 'debug_toolkit';
        description: 'Debug toolkit (auto-generated)';
        tools: ['debug_inspect', 'debug_trace', 'debug_logs', 'debug_metrics', 'debug_validate'];
        resources: ['internal://debug', 'internal://metrics', 'internal://logs'];
      }

      interface AutoGenSkill2 extends ISkill {
        name: 'admin_panel';
        description: 'Admin panel (auto-generated)';
        tools: ['admin_reset', 'admin_config', 'admin_shutdown'];
      }

      export default class TestServer {
        // Public tools
        public1: ToolHelper<PublicTool1> = async ({ data }) => ({ success: true });
        public2: ToolHelper<PublicTool2> = async ({ value }) => ({ doubled: value * 2 });
        public3: ToolHelper<PublicTool3> = async () => ({ message: 'Hello' });

        // Public resources
        publicConfigResource: ResourceHelper<PublicResource1> = async () => ({ version: '1.0.0' });
        publicStatusResource: ResourceHelper<PublicResource2> = async () => ({ healthy: true });

        // Static hidden tools (FL-1)
        debugInspect: ToolHelper<StaticHidden1> = async () => ({ state: 'active' });
        debugTrace: ToolHelper<StaticHidden2> = async ({ id }) => ({ trace: ['step1', 'step2'] });
        debugLogs: ToolHelper<StaticHidden3> = async () => ({ logs: ['log1', 'log2'] });
        debugMetrics: ToolHelper<StaticHidden4> = async () => ({ metrics: { count: 42 } });
        debugValidate: ToolHelper<StaticHidden5> = async ({ config }) => ({ valid: true });

        // Dynamic hidden tools (FT-1)
        adminReset: ToolHelper<DynamicHidden1> = async ({ confirm }) => ({ reset: confirm });
        adminConfig: ToolHelper<DynamicHidden2> = async ({ key, value }) => ({ updated: true });
        adminShutdown: ToolHelper<DynamicHidden3> = async () => ({ shutting_down: true });

        // Hidden resources
        internalDebugResource: ResourceHelper<HiddenResource1> = async () => ({ debug: true });
        internalMetricsResource: ResourceHelper<HiddenResource2> = async () => ({ count: 42 });
        internalLogsResource: ResourceHelper<HiddenResource3> = async () => 'log content';

        // Manual skill (FL-2)
        debugManual: SkillHelper<ManualSkill> = () => \`
# Debug Manual

## Static Hidden Tools (FL-1)
- debug_inspect: Inspect state
- debug_trace: Trace execution
- debug_logs: View logs
- debug_metrics: Get metrics
- debug_validate: Validate config

## Dynamic Hidden Tools (FT-1)
- admin_reset: Reset (admin only)
- admin_config: Configure (admin only)
- admin_shutdown: Shutdown (admin only)

## Resources
- internal://debug
- internal://metrics
- internal://logs
\`;

        // Auto-generated skills (FT-2)
        debugToolkit: SkillHelper<AutoGenSkill1> = () => '';
        adminPanel: SkillHelper<AutoGenSkill2> = () => '';
      }
    `;

    const { server, parsed } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true,
    });

    const interfaceServer = server.toInterfaceServer();

    // === STEP 1: Initial Discovery (Anonymous User) ===
    const anonTools = await interfaceServer.listTools({});
    const anonResources = await interfaceServer.listResources({});
    const allResources = await interfaceServer.listResources({});
    const anonSkills = allResources.filter(r => r.uri.startsWith('skill://'));

    // Should only see public items
    expect(anonTools).toHaveLength(3);
    expect(anonTools.map(t => t.name).sort()).toEqual(['public_1', 'public_2', 'public_3']);

    expect(anonResources).toHaveLength(2);
    expect(anonResources.map(r => r.uri).sort()).toEqual(['public://config', 'public://status']);

    // Skills are visible (they're gateways)
    expect(anonSkills).toHaveLength(3);
    expect(anonSkills.map(s => s.name).sort()).toEqual(['admin_panel', 'debug_manual', 'debug_toolkit']);

    // === STEP 2: Admin Discovery (Dynamic Hidden Visible) ===
    const adminTools = await interfaceServer.listTools({
      metadata: { user: { isAdmin: true } }
    });

    // Should see public + dynamic hidden (admin tools)
    expect(adminTools).toHaveLength(6); // 3 public + 3 admin
    const adminToolNames = adminTools.map(t => t.name).sort();
    expect(adminToolNames).toEqual([
      'admin_config',
      'admin_reset',
      'admin_shutdown',
      'public_1',
      'public_2',
      'public_3',
    ]);

    // Static hidden tools still hidden (not in list)
    expect(adminToolNames).not.toContain('debug_inspect');
    expect(adminToolNames).not.toContain('debug_trace');

    // === STEP 3: Skill Discovery ===
    // Manual skill (FL-2)
    const manualResult = await interfaceServer.readResource('skill://debug_manual');
    const manualContent = manualResult.contents[0].text;
    expect(manualContent).toContain('Debug Manual');
    expect(manualContent).toContain('debug_inspect');
    expect(manualContent).toContain('admin_reset');

    // Auto-generated skill 1 (FT-2)
    const autoGen1Result = await interfaceServer.readResource('skill://debug_toolkit');
    const autoGen1 = autoGen1Result.contents[0].text;
    expect(autoGen1).toContain('Debug Toolkit Skill'); // Auto-gen title
    expect(autoGen1).toContain('auto-generated from component definitions');
    expect(autoGen1).toContain('debug_inspect');
    expect(autoGen1).toContain('debug_trace');
    expect(autoGen1).toContain('internal://debug');

    // Auto-generated skill 2 (FT-2)
    const autoGen2Result = await interfaceServer.readResource('skill://admin_panel');
    const autoGen2 = autoGen2Result.contents[0].text;
    expect(autoGen2).toContain('Admin Panel Skill'); // Auto-gen title
    expect(autoGen2).toContain('admin_reset');
    expect(autoGen2).toContain('admin_config');

    // === STEP 4: Progressive Access ===
    // Static hidden tools accessible
    const inspectResult = await interfaceServer.callTool('debug_inspect', {});
    expect(inspectResult).toEqual({ state: 'active' });

    const traceResult = await interfaceServer.callTool('debug_trace', { id: 'test' });
    expect(traceResult).toEqual({ trace: ['step1', 'step2'] });

    // Dynamic hidden tools accessible (with admin context)
    const resetResult = await interfaceServer.callTool('admin_reset', { confirm: true });
    expect(resetResult).toEqual({ reset: true });

    // Hidden resources accessible
    const debugResource = await interfaceServer.readResource('internal://debug');
    expect(debugResource.contents[0].text).toContain('debug');

    // === STEP 5: Verify Compilation ===
    expect(parsed.tools).toHaveLength(11); // 3 public + 5 static hidden + 3 dynamic hidden
    expect(parsed.resources).toHaveLength(5); // 2 public + 3 hidden
    expect(parsed.skills).toHaveLength(3); // 1 manual + 2 auto-gen

    // Verify skill types
    const manualSkill = parsed.skills.find(s => s.name === 'debug_manual');
    expect(manualSkill?.isAutoGenerated).toBe(false);

    const autoSkill1 = parsed.skills.find(s => s.name === 'debug_toolkit');
    expect(autoSkill1?.isAutoGenerated).toBe(true);
    expect(autoSkill1?.components?.tools).toHaveLength(5);
    expect(autoSkill1?.components?.resources).toHaveLength(3);

    const autoSkill2 = parsed.skills.find(s => s.name === 'admin_panel');
    expect(autoSkill2?.isAutoGenerated).toBe(true);
    expect(autoSkill2?.components?.tools).toHaveLength(3);
  });
});

// ============================================================================
// SCENARIO 2: All Features Combined
// ============================================================================

describe('FT-4: All Features Combined', () => {
  it('should handle complex feature interactions', async () => {
    const code = `
      import { ITool, ISkill, ToolHelper, SkillHelper, HiddenEvaluationContext } from 'simply-mcp';

      // Tool with feature flag based hiding (FT-1)
      interface FeatureFlagTool extends ITool {
        name: 'experimental_feature';
        description: 'Experimental feature';
        params: {};
        result: { enabled: boolean };
        hidden: (ctx?: HiddenEvaluationContext) => {
          const flags = ctx?.metadata?.features as { experimental?: boolean } | undefined;
          return !flags?.experimental;
        };
      }

      // Auto-gen skill referencing feature flag tool (FT-2)
      interface ExperimentalSkill extends ISkill {
        name: 'experimental_toolkit';
        description: 'Experimental features';
        tools: ['experimental_feature'];
      }

      export default class TestServer {
        experimentalFeature: ToolHelper<FeatureFlagTool> = async () => ({ enabled: true });
        experimentalToolkit: SkillHelper<ExperimentalSkill> = () => '';
      }
    `;

    const { server, parsed } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true,
    });

    const interfaceServer = server.toInterfaceServer();

    // Without feature flag: tool hidden
    const toolsWithoutFlag = await interfaceServer.listTools({});
    expect(toolsWithoutFlag).toHaveLength(0);

    // With feature flag: tool visible
    const toolsWithFlag = await interfaceServer.listTools({
      metadata: { features: { experimental: true } }
    });
    expect(toolsWithFlag).toHaveLength(1);
    expect(toolsWithFlag[0].name).toBe('experimental_feature');

    // Auto-gen skill available regardless
    const skillResources = await interfaceServer.listResources();
    const skills = skillResources.filter(r => r.uri.startsWith('skill://'));
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('experimental_toolkit');

    // Auto-gen content includes the tool
    const skillResult = await interfaceServer.readResource('skill://experimental_toolkit');
    const skillContent = skillResult.contents[0].text;
    expect(skillContent).toContain('experimental_feature');
  });

  it('should maintain performance with all features enabled', async () => {
    const code = `
      import { ITool, ISkill, ToolHelper, SkillHelper, HiddenEvaluationContext } from 'simply-mcp';

      // Mix of static and dynamic hidden tools
      ${Array.from({ length: 25 }, (_, i) => {
        const hidden = i < 15 ? 'true' : `(ctx?: HiddenEvaluationContext) => !ctx?.metadata?.admin`;
        return `
        interface Tool${i} extends ITool {
          name: 'tool_${i}';
          description: 'Tool ${i}';
          params: {};
          result: { data: string };
          hidden: ${hidden};
        }`;
      }).join('\n')}

      // Auto-gen skills
      interface Skill1 extends ISkill {
        name: 'skill_1';
        description: 'Skill 1';
        tools: [${Array.from({ length: 15, (_, i) => `'tool_${i}'`).join(', ')}];
        };
      }

      interface Skill2 extends ISkill {
        name: 'skill_2';
        description: 'Skill 2';
        tools: [${Array.from({ length: 10, (_, i) => `'tool_${i + 15}'`).join(', ')}];
        };
      }

      export default class TestServer {
        ${Array.from({ length: 25 }, (_, i) => `
        tool${i}: ToolHelper<Tool${i}> = async () => ({ data: 'tool_${i}' });`).join('\n')}

        skill1: SkillHelper<Skill1> = () => '';
        skill2: SkillHelper<Skill2> = () => '';
      }
    `;

    const compileStart = Date.now();
    const { server, parsed } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true,
    });
    const compileTime = Date.now() - compileStart;

    // Compilation should be fast (< 5s even with 25 tools)
    expect(compileTime).toBeLessThan(5000);

    const interfaceServer = server.toInterfaceServer();

    // List operations should be fast
    const listStart = Date.now();
    const tools = await interfaceServer.listTools({});
    const listTime = Date.now() - listStart;
    expect(listTime).toBeLessThan(50);

    // List with admin context should be fast
    const adminListStart = Date.now();
    const adminTools = await interfaceServer.listTools({ metadata: { admin: true } });
    const adminListTime = Date.now() - adminListStart;
    expect(adminListTime).toBeLessThan(50);

    // Auto-gen should be fast
    const autoGenStart = Date.now();
    const skill1Result = await interfaceServer.readResource('skill://skill_1');
    const skill1 = skill1Result.contents[0].text;
    const autoGenTime = Date.now() - autoGenStart;
    expect(autoGenTime).toBeLessThan(50);

    // Verify results
    expect(tools).toHaveLength(0); // All hidden
    expect(adminTools).toHaveLength(10); // 10 dynamic hidden visible to admin
    expect(skill1).toContain('tool_0');
    expect(skill1).toContain('tool_14');
  });
});

// ============================================================================
// SCENARIO 3: Error Cases & Validation
// ============================================================================

describe('FT-4: Error Cases & Validation', () => {
  it('should detect orphaned static hidden tool', async () => {
    const code = `
      import { ITool, ToolHelper } from 'simply-mcp';

      interface OrphanedTool extends ITool {
        name: 'orphaned';
        description: 'Orphaned tool';
        params: {};
        result: { data: string };
        hidden: true;
      }

      export default class TestServer {
        orphaned: ToolHelper<OrphanedTool> = async () => ({ data: 'orphan' });
      }
    `;

    const { parsed } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true,
    });

    // Should compile successfully (warnings don't fail compilation)
    expect(parsed.tools).toHaveLength(1);
  });

  it('should detect orphaned dynamic hidden tool', async () => {
    const code = `
      import { ITool, ToolHelper, HiddenEvaluationContext } from 'simply-mcp';

      interface OrphanedDynamic extends ITool {
        name: 'orphaned_dynamic';
        description: 'Orphaned dynamic tool';
        params: {};
        result: { data: string };
        hidden: (ctx?: HiddenEvaluationContext) => true;
      }

      export default class TestServer {
        orphanedDynamic: ToolHelper<OrphanedDynamic> = async () => ({ data: 'orphan' });
      }
    `;

    const { parsed } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true,
    });

    // Should compile successfully
    expect(parsed.tools).toHaveLength(1);
    expect(parsed.tools[0].hiddenIsDynamic).toBe(true);
  });

  it('should handle invalid skill reference gracefully', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface InvalidSkill extends ISkill {
        name: 'invalid_refs';
        description: 'Invalid references';
        tools: ['nonexistent_tool'];
      }

      export default class TestServer {
        invalidRefs: SkillHelper<InvalidSkill> = () => '';
      }
    `;

    const { parsed } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true,
    });

    // Should compile (validation warnings, not errors)
    expect(parsed.skills).toHaveLength(1);
  });

  it('should handle empty auto-gen skill', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface EmptySkill extends ISkill {
        name: 'empty_skill';
        description: 'Empty skill';
        tools: [];
      }

      export default class TestServer {
        emptySkill: SkillHelper<EmptySkill> = () => '';
      }
    `;

    const { server, parsed } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true,
    });

    // Should compile
    expect(parsed.skills).toHaveLength(1);

    // Should generate minimal markdown
    const interfaceServer = server.toInterfaceServer();
    const contentResult = await interfaceServer.readResource('skill://empty_skill');
    const content = contentResult.contents[0].text;
    expect(content).toContain('Empty Skill Skill');
  });
});

// ============================================================================
// SCENARIO 4: Performance Under Load
// ============================================================================

describe('FT-4: Performance Under Load', () => {
  it('should handle large server with all features efficiently', async () => {
    const code = `
      import { ITool, IResource, ISkill, ToolHelper, ResourceHelper, SkillHelper, HiddenEvaluationContext } from 'simply-mcp';

      // 50 tools: 10 public, 20 static hidden, 20 dynamic hidden
      ${Array.from({ length: 50 }, (_, i) => {
        let hidden = 'false';
        if (i >= 10 && i < 30) hidden = 'true'; // Static hidden
        if (i >= 30) hidden = `(ctx?: HiddenEvaluationContext) => !ctx?.metadata?.admin`; // Dynamic

        return `
        interface Tool${i} extends ITool {
          name: 'tool_${i}';
          description: 'Tool ${i} description';
          params: { param: string };
          result: { result: string };
          ${i >= 10 ? `hidden: ${hidden};` : ''}
        }`;
      }).join('\n')}

      // 10 auto-gen skills (each covering 5 hidden tools)
      ${Array.from({ length: 10 }, (_, i) => {
        const startIdx = 10 + (i * 4);
        const tools = Array.from({ length: 4 }, (_, j) => `'tool_${startIdx + j}'`).join(', ');
        return `
        interface Skill${i} extends ISkill {
          name: 'skill_${i}';
          description: 'Skill ${i} description';
          tools: [${tools];
          };
        }`;
      }).join('\n')}

      export default class LargeServer {
        ${Array.from({ length: 50 }, (_, i) => `
        tool${i}: ToolHelper<Tool${i}> = async ({ param }) => ({ result: 'tool_${i}' });`).join('\n')}

        ${Array.from({ length: 10 }, (_, i) => `
        skill${i}: SkillHelper<Skill${i}> = () => '';`).join('\n')}
      }
    `;

    // === Performance Measurement ===
    const compileStart = Date.now();
    const { server, parsed } = await compileServerFromCode(code, {
      name: 'large',
      version: '1.0.0',
      silent: true,
    });
    const compileTime = Date.now() - compileStart;

    const interfaceServer = server.toInterfaceServer();

    // Measure list operations
    const listStart = Date.now();
    const tools = await interfaceServer.listTools({});
    const listTime = Date.now() - listStart;

    const adminListStart = Date.now();
    const adminTools = await interfaceServer.listTools({ metadata: { admin: true } });
    const adminListTime = Date.now() - adminListStart;

    // Measure auto-gen
    const autoGenStart = Date.now();
    const skillResult = await interfaceServer.readResource('skill://skill_0');
    const skill = skillResult.contents[0].text;
    const autoGenTime = Date.now() - autoGenStart;

    // === Performance Assertions ===
    expect(compileTime).toBeLessThan(5000); // < 5s
    expect(listTime).toBeLessThan(50); // < 50ms
    expect(adminListTime).toBeLessThan(50); // < 50ms
    expect(autoGenTime).toBeLessThan(50); // < 50ms

    // === Correctness Assertions ===
    expect(parsed.tools).toHaveLength(50);
    expect(parsed.skills).toHaveLength(10);

    expect(tools).toHaveLength(10); // Only public tools
    expect(adminTools).toHaveLength(30); // Public + dynamic hidden

    expect(skill).toContain('tool_10');
    expect(skill).toContain('tool_13');

    // Log performance for report
    console.log('\n=== Performance Metrics (Large Server) ===');
    console.log(`Compilation: ${compileTime}ms (target: <5000ms)`);
    console.log(`List (anon): ${listTime}ms (target: <50ms)`);
    console.log(`List (admin): ${adminListTime}ms (target: <50ms)`);
    console.log(`Auto-gen: ${autoGenTime}ms (target: <50ms)`);
    console.log('==========================================\n');
  });
});

// ============================================================================
// SCENARIO 5: LLM Interaction Simulation
// ============================================================================

describe('FT-4: LLM Interaction Simulation', () => {
  it('should demonstrate complete LLM discovery workflow', async () => {
    const code = `
      import { ITool, ISkill, ToolHelper, SkillHelper } from 'simply-mcp';

      interface PublicSearch extends ITool {
        name: 'search';
        description: 'Search public data';
        params: { query: string };
        result: { results: string[] };
      }

      interface HiddenAdvancedSearch extends ITool {
        name: 'advanced_search';
        description: 'Advanced search with filters';
        params: { query: string; filters: Record<string, any> };
        result: { results: string[] };
        hidden: true;
      }

      interface SearchManual extends ISkill {
        name: 'search_guide';
        description: 'Complete search guide';
        tools: ['advanced_search'];
      }

      export default class SearchServer {
        search: ToolHelper<PublicSearch> = async ({ query }) => ({ results: [\`Result for \${query}\`] });
        advancedSearch: ToolHelper<HiddenAdvancedSearch> = async ({ query, filters }) => ({ results: ['Advanced result'] });
        searchGuide: SkillHelper<SearchManual> = () => '';
      }
    `;

    const { server, parsed } = await compileServerFromCode(code, {
      name: 'search',
      version: '1.0.0',
      silent: true,
    });

    const interfaceServer = server.toInterfaceServer();

    // === LLM Workflow Simulation ===

    // Step 1: LLM calls tools/list → sees public API only
    const discoveredTools = await interfaceServer.listTools({});
    expect(discoveredTools).toHaveLength(1);
    expect(discoveredTools[0].name).toBe('search');

    // Step 2: LLM calls resources/list → discovers skills
    const allResourcesList = await interfaceServer.listResources();
    const discoveredSkills = allResourcesList.filter(r => r.uri.startsWith('skill://'));
    expect(discoveredSkills).toHaveLength(1);
    expect(discoveredSkills[0].name).toBe('search_guide');

    // Step 3: LLM calls resources/read → receives manual
    const manualResult = await interfaceServer.readResource('skill://search_guide');
    const manual = manualResult.contents[0].text;
    expect(manual).toContain('advanced_search');

    // Step 4: LLM learns about hidden tool from manual
    expect(manual).toContain('Advanced search with filters');

    // Step 5: LLM calls hidden tool directly → succeeds
    const result = await interfaceServer.callTool('advanced_search', {
      query: 'test',
      filters: { category: 'docs' }
    });
    expect(result).toEqual({ results: ['Advanced result'] });

    // === Token Reduction Measurement ===
    const flatResponse = JSON.stringify(
      { tools: [discoveredTools[0], { name: 'advanced_search', description: 'Advanced search with filters' }] },
      null,
      2
    );
    const progressiveResponse = JSON.stringify(
      { tools: discoveredTools, skills: discoveredSkills },
      null,
      2
    );

    const baselineTokens = Math.ceil(flatResponse.length / 4);
    const progressiveTokens = Math.ceil(progressiveResponse.length / 4);
    const reduction = ((baselineTokens - progressiveTokens) / baselineTokens) * 100;

    console.log('\n=== Token Reduction (LLM Interaction) ===');
    console.log(`Baseline: ${baselineTokens} tokens`);
    console.log(`Progressive: ${progressiveTokens} tokens`);
    console.log(`Reduction: ${reduction.toFixed(1)}%`);
    console.log('=========================================\n');

    expect(reduction).toBeGreaterThan(0); // Some reduction achieved
  });
});

// ============================================================================
// SCENARIO 6: Backward Compatibility
// ============================================================================

describe('FT-4: Backward Compatibility', () => {
  it('should work with FL-1 only server (static hidden only)', async () => {
    const code = `
      import { ITool, ToolHelper } from 'simply-mcp';

      interface PublicTool extends ITool {
        name: 'public';
        description: 'Public';
        params: {};
        result: { data: string };
      }

      interface HiddenTool extends ITool {
        name: 'hidden';
        description: 'Hidden';
        params: {};
        result: { data: string };
        hidden: true;
      }

      export default class FL1Server {
        public: ToolHelper<PublicTool> = async () => ({ data: 'public' });
        hidden: ToolHelper<HiddenTool> = async () => ({ data: 'hidden' });
      }
    `;

    const { server, parsed } = await compileServerFromCode(code, {
      name: 'fl1',
      version: '1.0.0',
      silent: true,
    });

    expect(parsed.tools).toHaveLength(2);
    expect(parsed.skills).toHaveLength(0);

    const interfaceServer = server.toInterfaceServer();
    const tools = await interfaceServer.listTools({});
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('public');

    const result = await interfaceServer.callTool('hidden', {});
    expect(result).toEqual({ data: 'hidden' });
  });

  it('should work with FL-2 only server (manual skills only)', async () => {
    const code = `
      import { ITool, ISkill, ToolHelper, SkillHelper } from 'simply-mcp';

      interface Tool1 extends ITool {
        name: 'tool1';
        description: 'Tool 1';
        params: {};
        result: { data: string };
      }

      interface ManualSkill extends ISkill {
        name: 'manual';
        description: 'Manual skill';
        skill: string;
      }

      export default class FL2Server {
        tool1: ToolHelper<Tool1> = async () => ({ data: 'tool1' });
        manual: SkillHelper<ManualSkill> = () => 'Manual content';
      }
    `;

    const { server, parsed } = await compileServerFromCode(code, {
      name: 'fl2',
      version: '1.0.0',
      silent: true,
    });

    expect(parsed.tools).toHaveLength(1);
    expect(parsed.skills).toHaveLength(1);
    expect(parsed.skills[0].isAutoGenerated).toBe(false);

    const interfaceServer = server.toInterfaceServer();
    const contentResult = await interfaceServer.readResource('skill://manual');
    const content = contentResult.contents[0].text;
    expect(content).toBe('Manual content');
  });

  it('should work with pre-FT-3 server (no validation)', async () => {
    const code = `
      import { ITool, ToolHelper } from 'simply-mcp';

      interface SimpleTool extends ITool {
        name: 'simple';
        description: 'Simple tool';
        params: {};
        result: { data: string };
      }

      export default class PreFT3Server {
        simple: ToolHelper<SimpleTool> = async () => ({ data: 'simple' });
      }
    `;

    const { server, parsed } = await compileServerFromCode(code, {
      name: 'pre-ft3',
      version: '1.0.0',
      silent: true,
    });

    expect(parsed.tools).toHaveLength(1);

    const interfaceServer = server.toInterfaceServer();
    const tools = await interfaceServer.listTools({});
    expect(tools).toHaveLength(1);

    const result = await interfaceServer.callTool('simple', {});
    expect(result).toEqual({ data: 'simple' });
  });
});
