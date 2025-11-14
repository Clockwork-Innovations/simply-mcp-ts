/**
 * Foundation Layer Complete Integration Tests
 *
 * Comprehensive end-to-end tests validating FL-1 (hidden flags) + FL-2 (skills)
 * integration for progressive disclosure functionality and token reduction goals.
 *
 * Test Scenarios:
 * 1. Complete Progressive Disclosure Workflow
 * 2. Token Reduction Measurement (>50% target)
 * 3. Backward Compatibility
 * 4. Mixed Visibility Patterns
 * 5. Error Handling
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { loadInterfaceServer } from '../../src/server/adapter.js';
import { compileServerFromCode } from '../../src/index.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), 'test-foundation-layer-' + Date.now());

// ============================================================================
// SCENARIO 1: Complete Progressive Disclosure Workflow
// ============================================================================

describe('FL-1 + FL-2 Integration: Complete Progressive Disclosure Workflow', () => {
  it('should perform complete progressive disclosure workflow', async () => {
    const code = `
      import { ITool, IResource, IPrompt, ISkill, ToolHelper, ResourceHelper, PromptHelper, SkillHelper } from 'simply-mcp';

      // PUBLIC API (Visible)
      interface PublicTool1 extends ITool {
        name: 'public_op_1';
        description: 'Public operation 1';
        params: { data: string };
        result: { success: boolean };
      }

      interface PublicTool2 extends ITool {
        name: 'public_op_2';
        description: 'Public operation 2';
        params: { value: number };
        result: { doubled: number };
      }

      interface PublicTool3 extends ITool {
        name: 'public_op_3';
        description: 'Public operation 3';
        params: { text: string };
        result: { uppercase: string };
      }

      interface PublicResource1 extends IResource {
        uri: 'public://config';
        name: 'Public Config';
        description: 'Public configuration';
        mimeType: 'application/json';
        data: { version: string };
      }

      interface PublicResource2 extends IResource {
        uri: 'public://status';
        name: 'Public Status';
        description: 'Public status';
        mimeType: 'application/json';
        data: { healthy: boolean };
      }

      interface PublicPrompt extends IPrompt {
        name: 'help';
        description: 'Get help';
        args: { topic?: string };
        result: string;
      }

      interface GatewaySkill1 extends ISkill {
        name: 'debug_manual';
        description: 'Debug toolkit manual';
        skill: string;
      }

      interface GatewaySkill2 extends ISkill {
        name: 'admin_manual';
        description: 'Admin operations manual';
        skill: string;
      }

      interface GatewaySkill3 extends ISkill {
        name: 'api_reference';
        description: 'Complete API reference';
        skill: string;
      }

      // HIDDEN API (Discovered via Skills)
      interface HiddenTool1 extends ITool {
        name: 'debug_inspect';
        description: 'Inspect internal state';
        params: {};
        result: { state: string };
        hidden: true;
      }

      interface HiddenTool2 extends ITool {
        name: 'debug_trace';
        description: 'Trace execution';
        params: { id: string };
        result: { trace: string[] };
        hidden: true;
      }

      interface HiddenTool3 extends ITool {
        name: 'debug_logs';
        description: 'Get debug logs';
        params: {};
        result: { logs: string[] };
        hidden: true;
      }

      interface HiddenTool4 extends ITool {
        name: 'admin_reset';
        description: 'Reset system';
        params: { confirm: boolean };
        result: { reset: boolean };
        hidden: true;
      }

      interface HiddenTool5 extends ITool {
        name: 'admin_config';
        description: 'Update config';
        params: { key: string; value: any };
        result: { updated: boolean };
        hidden: true;
      }

      interface HiddenTool6 extends ITool {
        name: 'internal_op_1';
        description: 'Internal operation 1';
        params: {};
        result: { data: string };
        hidden: true;
      }

      interface HiddenTool7 extends ITool {
        name: 'internal_op_2';
        description: 'Internal operation 2';
        params: {};
        result: { data: string };
        hidden: true;
      }

      interface HiddenTool8 extends ITool {
        name: 'internal_op_3';
        description: 'Internal operation 3';
        params: {};
        result: { data: string };
        hidden: true;
      }

      interface HiddenTool9 extends ITool {
        name: 'internal_op_4';
        description: 'Internal operation 4';
        params: {};
        result: { data: string };
        hidden: true;
      }

      interface HiddenTool10 extends ITool {
        name: 'internal_op_5';
        description: 'Internal operation 5';
        params: {};
        result: { data: string };
        hidden: true;
      }

      interface HiddenResource1 extends IResource {
        uri: 'internal://debug';
        name: 'Debug Info';
        description: 'Internal debug information';
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

      interface HiddenResource4 extends IResource {
        uri: 'internal://state';
        name: 'State';
        description: 'Internal state';
        mimeType: 'application/json';
        data: { state: string };
        hidden: true;
      }

      interface HiddenResource5 extends IResource {
        uri: 'internal://config';
        name: 'Internal Config';
        description: 'Internal configuration';
        mimeType: 'application/json';
        data: { internal: boolean };
        hidden: true;
      }

      interface HiddenPrompt1 extends IPrompt {
        name: 'debug_session';
        description: 'Start debug session';
        args: { issue: string };
        result: string;
        hidden: true;
      }

      interface HiddenPrompt2 extends IPrompt {
        name: 'admin_task';
        description: 'Execute admin task';
        args: { task: string };
        result: string;
        hidden: true;
      }

      export default class TestServer {
        // Public tools
        publicOp1: ToolHelper<PublicTool1> = async ({ data }) => ({ success: true });
        publicOp2: ToolHelper<PublicTool2> = async ({ value }) => ({ doubled: value * 2 });
        publicOp3: ToolHelper<PublicTool3> = async ({ text }) => ({ uppercase: text.toUpperCase() });

        // Public resources
        publicConfigResource: ResourceHelper<PublicResource1> = async () => ({ version: '1.0.0' });
        publicStatusResource: ResourceHelper<PublicResource2> = async () => ({ healthy: true });

        // Public prompt
        help: PromptHelper<PublicPrompt> = async ({ topic }) => 'Help content';

        // Gateway skills
        debugManual: SkillHelper<GatewaySkill1> = () => \`
# Debug Toolkit

## Hidden Debug Tools
- debug_inspect: Inspect internal state
- debug_trace: Trace execution
- debug_logs: Get debug logs

## Hidden Debug Resources
- internal://debug: Debug information
- internal://metrics: Performance metrics
- internal://logs: Server logs

## Hidden Debug Prompt
- debug_session: Start debug session
\`;

        adminManual: SkillHelper<GatewaySkill2> = () => \`
# Admin Operations

## Hidden Admin Tools
- admin_reset: Reset system
- admin_config: Update configuration

## Hidden Admin Resources
- internal://state: System state
- internal://config: Internal configuration

## Hidden Admin Prompt
- admin_task: Execute administrative task
\`;

        apiReference: SkillHelper<GatewaySkill3> = () => \`
# Complete API Reference

## Public API
- Tools: public_op_1, public_op_2, public_op_3
- Resources: public://config, public://status
- Prompts: help

## Internal API
- Tools: internal_op_1, internal_op_2, internal_op_3, internal_op_4, internal_op_5
- Resources: (see debug and admin manuals)
- Prompts: (see debug and admin manuals)
\`;

        // Hidden tools
        debugInspect: ToolHelper<HiddenTool1> = async () => ({ state: 'running' });
        debugTrace: ToolHelper<HiddenTool2> = async ({ id }) => ({ trace: ['step1', 'step2'] });
        debugLogs: ToolHelper<HiddenTool3> = async () => ({ logs: ['log1', 'log2'] });
        adminReset: ToolHelper<HiddenTool4> = async ({ confirm }) => ({ reset: confirm });
        adminConfig: ToolHelper<HiddenTool5> = async ({ key, value }) => ({ updated: true });
        internalOp1: ToolHelper<HiddenTool6> = async () => ({ data: 'op1' });
        internalOp2: ToolHelper<HiddenTool7> = async () => ({ data: 'op2' });
        internalOp3: ToolHelper<HiddenTool8> = async () => ({ data: 'op3' });
        internalOp4: ToolHelper<HiddenTool9> = async () => ({ data: 'op4' });
        internalOp5: ToolHelper<HiddenTool10> = async () => ({ data: 'op5' });

        // Hidden resources
        internalDebugResource: ResourceHelper<HiddenResource1> = async () => ({ debug: true });
        internalMetricsResource: ResourceHelper<HiddenResource2> = async () => ({ count: 42 });
        internalLogsResource: ResourceHelper<HiddenResource3> = async () => 'log content';
        internalStateResource: ResourceHelper<HiddenResource4> = async () => ({ state: 'active' });
        internalConfigResource: ResourceHelper<HiddenResource5> = async () => ({ internal: true });

        // Hidden prompts
        debugSession: PromptHelper<HiddenPrompt1> = async ({ issue }) => 'Debug session';
        adminTask: PromptHelper<HiddenPrompt2> = async ({ task }) => 'Admin task';
      }
    `;

    const { server, parsed } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true,
    });

    const interfaceServer = server.toInterfaceServer();

    // STEP 1: Initial Discovery - Only visible items returned
    const visibleTools = interfaceServer.listTools();
    const visibleResources = interfaceServer.listResources();
    const visiblePrompts = interfaceServer.listPrompts();
    const allResourcesList = interfaceServer.listResources();
    const visibleSkills = allResourcesList.filter(r => r.uri.startsWith('skill://'));

    expect(visibleTools).toHaveLength(3);
    expect(visibleResources).toHaveLength(2);
    expect(visiblePrompts).toHaveLength(1);
    expect(visibleSkills).toHaveLength(3);

    const visibleToolNames = visibleTools.map(t => t.name).sort();
    expect(visibleToolNames).toEqual(['public_op_1', 'public_op_2', 'public_op_3']);

    const visibleResourceUris = visibleResources.map(r => r.uri).sort();
    expect(visibleResourceUris).toEqual(['public://config', 'public://status']);

    expect(visiblePrompts[0].name).toBe('help');

    const visibleSkillNames = visibleSkills.map(s => s.name).sort();
    expect(visibleSkillNames).toEqual(['admin_manual', 'api_reference', 'debug_manual']);

    // STEP 2: Skill Discovery - Get skill manuals
    const debugManualResult = await interfaceServer.readResource('skill://debug_manual');
    const debugManual = debugManualResult.contents[0].text;
    expect(debugManual).toContain('Debug Toolkit');
    expect(debugManual).toContain('debug_inspect');
    expect(debugManual).toContain('internal://debug');

    const adminManualResult = await interfaceServer.readResource('skill://admin_manual');
    const adminManual = adminManualResult.contents[0].text;
    expect(adminManual).toContain('Admin Operations');
    expect(adminManual).toContain('admin_reset');
    expect(adminManual).toContain('internal://state');

    const apiReferenceResult = await interfaceServer.readResource('skill://api_reference');
    const apiReference = apiReferenceResult.contents[0].text;
    expect(apiReference).toContain('Complete API Reference');
    expect(apiReference).toContain('internal_op_1');

    // STEP 3: Progressive Access - Hidden items accessible directly
    // Hidden tools
    const inspectResult = await interfaceServer.callTool('debug_inspect', {});
    expect(inspectResult).toEqual({ state: 'running' });

    const traceResult = await interfaceServer.callTool('debug_trace', { id: 'test' });
    expect(traceResult).toEqual({ trace: ['step1', 'step2'] });

    const resetResult = await interfaceServer.callTool('admin_reset', { confirm: true });
    expect(resetResult).toEqual({ reset: true });

    const op1Result = await interfaceServer.callTool('internal_op_1', {});
    expect(op1Result).toEqual({ data: 'op1' });

    // Hidden resources
    const debugResource = await interfaceServer.readResource('internal://debug');
    expect(debugResource.contents[0].text).toContain('debug');

    const metricsResource = await interfaceServer.readResource('internal://metrics');
    expect(metricsResource.contents[0].text).toContain('count');

    const stateResource = await interfaceServer.readResource('internal://state');
    expect(stateResource.contents[0].text).toContain('state');

    // Hidden prompts
    const debugPrompt = await interfaceServer.getPrompt('debug_session', { issue: 'test' });
    expect(debugPrompt.description).toBe('Start debug session');
    expect(debugPrompt.messages[0].content.text).toBe('Debug session');

    const adminPrompt = await interfaceServer.getPrompt('admin_task', { task: 'test' });
    expect(adminPrompt.description).toBe('Execute admin task');
    expect(adminPrompt.messages[0].content.text).toBe('Admin task');

    // STEP 4: Verify all items compiled
    expect(parsed.tools).toHaveLength(13); // 3 public + 10 hidden
    expect(parsed.resources).toHaveLength(7); // 2 public + 5 hidden
    expect(parsed.prompts).toHaveLength(3); // 1 public + 2 hidden
    expect(parsed.skills).toHaveLength(3); // 3 gateway skills
  });
});

// ============================================================================
// SCENARIO 2: Token Reduction Measurement
// ============================================================================

describe('FL-1 + FL-2 Integration: Token Reduction Measurement', () => {
  // Simple token estimator: ~4 chars = 1 token
  const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

  it('should achieve >50% token reduction on initial discovery', async () => {
    // BASELINE: Flat server with 20 visible tools (no progressive disclosure)
    const flatServerCode = `
      import { ITool, ToolHelper } from 'simply-mcp';

      ${Array.from({ length: 20 }, (_, i) => `
      interface Tool${i + 1} extends ITool {
        name: 'tool_${i + 1}';
        description: 'This is tool number ${i + 1} with a detailed description explaining what it does and when to use it';
        params: { param1: string; param2: number; param3: boolean };
        result: { result1: string; result2: number; result3: boolean };
      }
      `).join('\n')}

      export default class FlatServer {
        ${Array.from({ length: 20 }, (_, i) => `
        tool${i + 1}: ToolHelper<Tool${i + 1}> = async (params) => ({ result1: 'data', result2: 42, result3: true });
        `).join('\n')}
      }
    `;

    const flatServer = await compileServerFromCode(flatServerCode, {
      name: 'flat',
      version: '1.0.0',
      silent: true,
    });

    const flatInterface = flatServer.server.toInterfaceServer();
    const flatTools = flatInterface.listTools();

    // Calculate baseline token count
    const flatResponse = JSON.stringify(flatTools, null, 2);
    const baselineTokens = estimateTokens(flatResponse);

    // PROGRESSIVE: Server with 5 visible + 3 skills + 15 hidden tools
    const progressiveServerCode = `
      import { ITool, ISkill, ToolHelper, SkillHelper } from 'simply-mcp';

      // 5 visible tools
      ${Array.from({ length: 5 }, (_, i) => `
      interface PublicTool${i + 1} extends ITool {
        name: 'public_${i + 1}';
        description: 'Public tool ${i + 1} with detailed description';
        params: { param1: string; param2: number; param3: boolean };
        result: { result1: string; result2: number; result3: boolean };
      }
      `).join('\n')}

      // 3 gateway skills
      ${Array.from({ length: 3 }, (_, i) => `
      interface Skill${i + 1} extends ISkill {
        name: 'skill_${i + 1}';
        description: 'Gateway skill ${i + 1} for discovering hidden capabilities';
        skill: string;
      }
      `).join('\n')}

      // 15 hidden tools
      ${Array.from({ length: 15 }, (_, i) => `
      interface HiddenTool${i + 1} extends ITool {
        name: 'hidden_${i + 1}';
        description: 'Hidden tool ${i + 1} with detailed description';
        params: { param1: string; param2: number; param3: boolean };
        result: { result1: string; result2: number; result3: boolean };
        hidden: true;
      }
      `).join('\n')}

      export default class ProgressiveServer {
        ${Array.from({ length: 5 }, (_, i) => `
        public${i + 1}: ToolHelper<PublicTool${i + 1}> = async (params) => ({ result1: 'data', result2: 42, result3: true });
        `).join('\n')}

        ${Array.from({ length: 3 }, (_, i) => `
        skill${i + 1}: SkillHelper<Skill${i + 1}> = () => 'Manual for skill ${i + 1}';
        `).join('\n')}

        ${Array.from({ length: 15 }, (_, i) => `
        hidden${i + 1}: ToolHelper<HiddenTool${i + 1}> = async (params) => ({ result1: 'data', result2: 42, result3: true });
        `).join('\n')}
      }
    `;

    const progressiveServer = await compileServerFromCode(progressiveServerCode, {
      name: 'progressive',
      version: '1.0.0',
      silent: true,
    });

    const progressiveInterface = progressiveServer.server.toInterfaceServer();
    const progressiveTools = progressiveInterface.listTools();
    const progressiveResourcesList = progressiveInterface.listResources();
    const progressiveSkills = progressiveResourcesList.filter(r => r.uri.startsWith('skill://'));

    // Calculate progressive token count (only visible items in initial discovery)
    const progressiveResponse = JSON.stringify(
      { tools: progressiveTools, skills: progressiveSkills },
      null,
      2
    );
    const progressiveTokens = estimateTokens(progressiveResponse);

    // Calculate reduction
    const reduction = ((baselineTokens - progressiveTokens) / baselineTokens) * 100;

    // Log results for validation report
    console.log('\n=== Token Reduction Analysis ===');
    console.log(`Baseline (flat): ${baselineTokens} tokens (${flatResponse.length} chars)`);
    console.log(`Progressive: ${progressiveTokens} tokens (${progressiveResponse.length} chars)`);
    console.log(`Reduction: ${reduction.toFixed(1)}%`);
    console.log('================================\n');

    // Verify reduction goal met
    expect(reduction).toBeGreaterThan(50);

    // Verify both servers have same total capability count
    expect(flatTools).toHaveLength(20);
    expect(progressiveTools.length + 15).toBe(20); // 5 visible + 15 hidden = 20 total
  });
});

// ============================================================================
// SCENARIO 3: Backward Compatibility
// ============================================================================

describe('FL-1 + FL-2 Integration: Backward Compatibility', () => {
  it('should work with servers without skills', async () => {
    const code = `
      import { ITool, IResource, IPrompt, ToolHelper, ResourceHelper, PromptHelper } from 'simply-mcp';

      interface SimpleTool extends ITool {
        name: 'simple_tool';
        description: 'Simple tool';
        params: { data: string };
        result: { success: boolean };
      }

      interface SimpleResource extends IResource {
        uri: 'simple://data';
        name: 'Simple Data';
        description: 'Simple data';
        mimeType: 'application/json';
        data: { value: string };
      }

      interface SimplePrompt extends IPrompt {
        name: 'simple_prompt';
        description: 'Simple prompt';
        args: { input: string };
        result: string;
      }

      export default class NoSkillsServer {
        simpleTool: ToolHelper<SimpleTool> = async ({ data }) => ({ success: true });
        simpleDataResource: ResourceHelper<SimpleResource> = async () => ({ value: 'data' });
        simplePrompt: PromptHelper<SimplePrompt> = async ({ input }) => 'response';
      }
    `;

    const { server, parsed } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true,
    });

    // Should have no skills
    expect(parsed.skills).toHaveLength(0);

    const interfaceServer = server.toInterfaceServer();

    // Should list 0 skills
    const skillResourcesList = interfaceServer.listResources();
    const skills = skillResourcesList.filter(r => r.uri.startsWith('skill://'));
    expect(skills).toHaveLength(0);

    // Other capabilities should work
    const tools = interfaceServer.listTools();
    expect(tools).toHaveLength(1);

    const resources = interfaceServer.listResources();
    expect(resources).toHaveLength(1);

    const prompts = interfaceServer.listPrompts();
    expect(prompts).toHaveLength(1);
  });

  it('should work with servers without hidden flags', async () => {
    const code = `
      import { ITool, ISkill, ToolHelper, SkillHelper } from 'simply-mcp';

      interface Tool1 extends ITool {
        name: 'tool_1';
        description: 'Tool 1';
        params: {};
        result: { data: string };
      }

      interface Tool2 extends ITool {
        name: 'tool_2';
        description: 'Tool 2';
        params: {};
        result: { data: string };
      }

      interface Skill1 extends ISkill {
        name: 'skill_1';
        description: 'Skill 1';
        skill: string;
      }

      export default class NoHiddenServer {
        tool1: ToolHelper<Tool1> = async () => ({ data: 'tool1' });
        tool2: ToolHelper<Tool2> = async () => ({ data: 'tool2' });
        skill1: SkillHelper<Skill1> = () => 'Manual content';
      }
    `;

    const { server, parsed } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true,
    });

    const interfaceServer = server.toInterfaceServer();

    // All items should be visible (no hidden flags)
    const tools = interfaceServer.listTools();
    expect(tools).toHaveLength(2);

    const skillResourcesList2 = interfaceServer.listResources();
    const skills = skillResourcesList2.filter(r => r.uri.startsWith('skill://'));
    expect(skills).toHaveLength(1);

    // All should be accessible
    await expect(interfaceServer.callTool('tool_1', {})).resolves.toEqual({ data: 'tool1' });
    await expect(interfaceServer.callTool('tool_2', {})).resolves.toEqual({ data: 'tool2' });

    const skill1Result = await interfaceServer.readResource('skill://skill_1');
    expect(skill1Result.contents[0].text).toBe('Manual content');
  });
});

// ============================================================================
// SCENARIO 4: Mixed Visibility Patterns
// ============================================================================

describe('FL-1 + FL-2 Integration: Mixed Visibility Patterns', () => {
  it('should handle hidden skill (skill itself is hidden)', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface PublicSkill extends ISkill {
        name: 'public_skill';
        description: 'Public skill';
        skill: string;
        hidden: false;
      }

      interface HiddenSkill extends ISkill {
        name: 'hidden_skill';
        description: 'Hidden skill';
        skill: string;
        hidden: true;
      }

      export default class TestServer {
        publicSkill: SkillHelper<PublicSkill> = () => 'Public manual';
        hiddenSkill: SkillHelper<HiddenSkill> = () => 'Hidden manual';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true,
    });

    const interfaceServer = server.toInterfaceServer();

    // Only public skill visible
    const skillResourcesList3 = interfaceServer.listResources();
    const skills = skillResourcesList3.filter(r => r.uri.startsWith('skill://'));
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('public_skill');

    // Both accessible
    const publicSkillResult = await interfaceServer.readResource('skill://public_skill');
    expect(publicSkillResult.contents[0].text).toBe('Public manual');

    const hiddenSkillResult = await interfaceServer.readResource('skill://hidden_skill');
    expect(hiddenSkillResult.contents[0].text).toBe('Hidden manual');
  });

  it('should handle skill referencing mix of hidden and visible items', async () => {
    const code = `
      import { ITool, ISkill, ToolHelper, SkillHelper } from 'simply-mcp';

      interface VisibleTool extends ITool {
        name: 'visible_tool';
        description: 'Visible tool';
        params: {};
        result: { data: string };
      }

      interface HiddenTool extends ITool {
        name: 'hidden_tool';
        description: 'Hidden tool';
        params: {};
        result: { data: string };
        hidden: true;
      }

      interface MixedSkill extends ISkill {
        name: 'mixed_reference';
        description: 'References both visible and hidden';
        skill: string;
      }

      export default class TestServer {
        visibleTool: ToolHelper<VisibleTool> = async () => ({ data: 'visible' });
        hiddenTool: ToolHelper<HiddenTool> = async () => ({ data: 'hidden' });

        mixedReference: SkillHelper<MixedSkill> = () => \`
# Mixed Reference Manual

## Visible Tools
- visible_tool: You can see this in tools/list

## Hidden Tools
- hidden_tool: Not in tools/list but accessible
\`;
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true,
    });

    const interfaceServer = server.toInterfaceServer();

    // Check visibility
    const tools = interfaceServer.listTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('visible_tool');

    // Get skill manual
    const manualResult = await interfaceServer.readResource('skill://mixed_reference');
    const manual = manualResult.contents[0].text;
    expect(manual).toContain('visible_tool');
    expect(manual).toContain('hidden_tool');

    // Both tools accessible
    await expect(interfaceServer.callTool('visible_tool', {})).resolves.toEqual({
      data: 'visible',
    });
    await expect(interfaceServer.callTool('hidden_tool', {})).resolves.toEqual({ data: 'hidden' });
  });

  it('should handle all items hidden (edge case)', async () => {
    const code = `
      import { ITool, ToolHelper } from 'simply-mcp';

      interface HiddenTool1 extends ITool {
        name: 'hidden_1';
        description: 'Hidden 1';
        params: {};
        result: { data: string };
        hidden: true;
      }

      interface HiddenTool2 extends ITool {
        name: 'hidden_2';
        description: 'Hidden 2';
        params: {};
        result: { data: string };
        hidden: true;
      }

      export default class TestServer {
        hidden1: ToolHelper<HiddenTool1> = async () => ({ data: 'h1' });
        hidden2: ToolHelper<HiddenTool2> = async () => ({ data: 'h2' });
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true,
    });

    const interfaceServer = server.toInterfaceServer();

    // List returns empty
    const tools = interfaceServer.listTools();
    expect(tools).toHaveLength(0);

    // But tools are still accessible
    await expect(interfaceServer.callTool('hidden_1', {})).resolves.toEqual({ data: 'h1' });
    await expect(interfaceServer.callTool('hidden_2', {})).resolves.toEqual({ data: 'h2' });
  });

  it('should handle all items visible (no progressive disclosure)', async () => {
    const code = `
      import { ITool, ToolHelper } from 'simply-mcp';

      interface Tool1 extends ITool {
        name: 'tool_1';
        description: 'Tool 1';
        params: {};
        result: { data: string };
      }

      interface Tool2 extends ITool {
        name: 'tool_2';
        description: 'Tool 2';
        params: {};
        result: { data: string };
      }

      export default class TestServer {
        tool1: ToolHelper<Tool1> = async () => ({ data: 't1' });
        tool2: ToolHelper<Tool2> = async () => ({ data: 't2' });
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true,
    });

    const interfaceServer = server.toInterfaceServer();

    // All visible
    const tools = interfaceServer.listTools();
    expect(tools).toHaveLength(2);

    // All accessible
    await expect(interfaceServer.callTool('tool_1', {})).resolves.toEqual({ data: 't1' });
    await expect(interfaceServer.callTool('tool_2', {})).resolves.toEqual({ data: 't2' });
  });
});

// ============================================================================
// SCENARIO 5: Error Handling
// ============================================================================

describe('FL-1 + FL-2 Integration: Error Handling', () => {
  it('should fail gracefully for unknown hidden tool', async () => {
    const code = `
      import { ITool, ToolHelper } from 'simply-mcp';

      interface KnownTool extends ITool {
        name: 'known_tool';
        description: 'Known tool';
        params: {};
        result: { data: string };
      }

      export default class TestServer {
        knownTool: ToolHelper<KnownTool> = async () => ({ data: 'known' });
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true,
    });

    const interfaceServer = server.toInterfaceServer();

    // Should throw helpful error
    await expect(interfaceServer.callTool('unknown_tool', {})).rejects.toThrow();
  });

  it('should fail gracefully for unknown skill', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface KnownSkill extends ISkill {
        name: 'known_skill';
        description: 'Known skill';
        skill: string;
      }

      export default class TestServer {
        knownSkill: SkillHelper<KnownSkill> = () => 'Manual';
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true,
    });

    const interfaceServer = server.toInterfaceServer();

    // Should throw helpful error
    await expect(interfaceServer.readResource('skill://unknown_skill')).rejects.toThrow();

    // Error should mention available skills
    try {
      await interfaceServer.readResource('skill://unknown_skill');
    } catch (error: any) {
      expect(error.message).toContain('known_skill');
    }
  });

  it('should validate skill return type at runtime', async () => {
    const code = `
      import { ISkill, SkillHelper } from 'simply-mcp';

      interface BadSkill extends ISkill {
        name: 'bad_skill';
        description: 'Bad skill';
        skill: string;
      }

      export default class TestServer {
        badSkill: SkillHelper<BadSkill> = (() => 123) as any;
      }
    `;

    const { server } = await compileServerFromCode(code, {
      name: 'test',
      version: '1.0.0',
      silent: true,
    });

    const interfaceServer = server.toInterfaceServer();

    // Should throw runtime validation error
    await expect(interfaceServer.readResource('skill://bad_skill')).rejects.toThrow('invalid type');
  });
});
