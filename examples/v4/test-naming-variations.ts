/**
 * Test Example: Automatic Naming Convention Conversion
 *
 * This example demonstrates the automatic naming variation feature
 * where tools can match methods in different naming conventions.
 *
 * Features:
 * - Tool with snake_case name matching camelCase method (preferred)
 * - Tool with snake_case name matching snake_case method (with warning)
 * - Exact match takes precedence when both naming conventions exist
 */

import type { ITool, IParam, IServer } from '../../src/index.js';

// ============================================================================
// Server Configuration
// ============================================================================

const server: IServer = {
  name: 'naming-variations-test',
  version: '1.0.0',
  description: 'Test server for naming convention auto-conversion',
};

// ============================================================================
// Parameter Interfaces
// ============================================================================

interface NameParam extends IParam {
  type: 'string';
  description: 'User name';
}

// ============================================================================
// Tool Interfaces
// ============================================================================

/**
 * Test 1: Tool with snake_case name, camelCase method
 * This is the PREFERRED pattern - tool name in snake_case, method in camelCase
 */
interface GetUserTool extends ITool {
  name: 'get_user';  // snake_case tool name
  description: 'Get user information (camelCase method)';
  params: {
    name: NameParam;
  };
  result: { user: string; found: boolean };
}

/**
 * Test 2: Tool with snake_case name, snake_case method
 * This will work but show a warning suggesting camelCase
 */
interface CreateUserTool extends ITool {
  name: 'create_user';  // snake_case tool name
  description: 'Create a new user (snake_case method - will warn)';
  params: {
    name: NameParam;
  };
  result: { created: boolean; userId: string };
}

/**
 * Test 3: Tool with exact match preference
 * When both getTime and get_time methods exist, exact match wins
 */
interface GetTimeTool extends ITool {
  name: 'get_time';
  description: 'Get current time';
  params: {};
  result: { time: string };
}

// ============================================================================
// Server Implementation
// ============================================================================

export default class NamingVariationsServer {
  /**
   * Test 1: camelCase method for snake_case tool
   * Tool name: 'get_user' -> matches method 'getUser' automatically
   * This is the PREFERRED pattern (no warning)
   */
  getUser: GetUserTool = async (params) => {
    console.log(`[getUser] Looking up user: ${params.name}`);
    return {
      user: params.name,
      found: true,
    };
  };

  /**
   * Test 2: snake_case method for snake_case tool
   * Tool name: 'create_user' -> matches method 'create_user'
   * This will work but show a warning suggesting 'createUser'
   */
  create_user: CreateUserTool = async (params) => {
    console.log(`[create_user] Creating user: ${params.name}`);
    return {
      created: true,
      userId: `user_${Date.now()}`,
    };
  };

  /**
   * Test 3: Both naming conventions exist - exact match preferred
   * Tool name: 'get_time' -> will match 'get_time' (exact match) over 'getTime'
   */
  get_time: GetTimeTool = async (params) => {
    console.log('[get_time] Exact match method called');
    return {
      time: `EXACT: ${new Date().toISOString()}`,
    };
  };

  /**
   * Alternative camelCase version exists but won't be called
   * because exact match takes precedence
   */
  getTime = async () => {
    console.log('[getTime] This should NOT be called due to exact match preference');
    return {
      time: `CAMEL: ${new Date().toISOString()}`,
    };
  };
}
