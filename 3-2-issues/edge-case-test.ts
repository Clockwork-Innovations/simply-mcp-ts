/**
 * Edge Case Test: Verify warnings still appear for truly unimplemented dynamic resources
 * This file is used to test that the fix doesn't create false negatives
 */

import type { ITool, IPrompt, IResource, IServer } from 'simply-mcp';

// ============================================================================
// EDGE CASE 1: Dynamic Resource WITH Implementation (Should NOT warn)
// ============================================================================

interface ImplementedDynamicResource extends IResource {
  uri: 'test://dynamic/implemented';
  name: 'Implemented Dynamic Resource';
  description: 'A dynamic resource that has implementation';
  mimeType: 'application/json';
  data: { value: string };
  dynamic: true;
}

// ============================================================================
// EDGE CASE 2: Dynamic Resource WITHOUT Implementation (SHOULD warn)
// ============================================================================

interface UnimplementedDynamicResource extends IResource {
  uri: 'test://dynamic/unimplemented';
  name: 'Unimplemented Dynamic Resource';
  description: 'A dynamic resource that lacks implementation';
  mimeType: 'application/json';
  data: { value: string };
  dynamic: true;
}

// ============================================================================
// EDGE CASE 3: Static Resource (Should NOT warn - static resources don't need implementation)
// ============================================================================

interface StaticResource extends IResource {
  uri: 'test://static/resource';
  name: 'Static Resource';
  description: 'A static resource';
  mimeType: 'text/plain';
  data: 'This is static content';
}

// ============================================================================
// EDGE CASE 4: Tool (for baseline)
// ============================================================================

interface TestTool extends ITool {
  name: 'test_tool';
  description: 'A simple test tool';
  params: { input: string };
  result: { output: string };
}

// ============================================================================
// SERVER IMPLEMENTATION
// ============================================================================

interface EdgeCaseServer extends IServer {
  name: 'edge-case-test';
  version: '1.0.0';
  description: 'Test server for edge case validation';
}

export default class EdgeCaseTestServer implements EdgeCaseServer {
  // Tool implementation
  testTool: TestTool = async (params) => {
    return { output: `Processed: ${params.input}` };
  };

  // EDGE CASE 1: Dynamic resource WITH implementation
  // This should NOT produce a warning because implementation exists
  ['test://dynamic/implemented'] = async () => {
    return { value: 'This is implemented!' };
  };

  // EDGE CASE 2: Dynamic resource WITHOUT implementation
  // Intentionally NOT implementing 'test://dynamic/unimplemented'
  // This SHOULD produce a warning

  // EDGE CASE 3: Static resource doesn't need implementation
  // Static resources are handled by the framework
}
