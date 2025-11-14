/**
 * End-to-End Test for Dynamic Hidden (FT-1)
 *
 * Tests dynamic hidden functionality using the Interface-driven API,
 * which is where dynamic hidden functions are supported.
 *
 * This test creates actual MCP servers and validates:
 * 1. Static boolean hidden (backward compatibility)
 * 2. Sync function hidden
 * 3. Async function hidden
 * 4. Mixed scenarios with performance measurement
 */

import type { IServer, ITool, IResource, IPrompt, ToolHelper, ResourceHelper, PromptHelper } from '../../src/index.js';

// ============================================================================
// Test 1: Static Boolean (Backward Compatibility)
// ============================================================================

interface VisibleTool extends ITool {
  name: 'visible_tool';
  description: 'A visible tool';
  result: string;
}

interface HiddenTool extends ITool {
  name: 'hidden_tool';
  description: 'A hidden tool';
  hidden: true;
  result: string;
}

const visible_tool: ToolHelper<VisibleTool> = async () => 'visible';
const hidden_tool: ToolHelper<HiddenTool> = async () => 'hidden';

const test1_server: IServer = {
  name: 'test-static-hidden',
  version: '1.0.0',
};

export { test1_server, visible_tool, hidden_tool };
