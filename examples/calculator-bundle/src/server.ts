/**
 * Calculator MCP Server - Interface API Bundle Example
 *
 * This is a complete example of a SimpleMCP bundle using the Interface API.
 * It demonstrates basic arithmetic operations with proper error handling.
 *
 * Features:
 * - Add, subtract, multiply, and divide operations
 * - Input validation using IParam
 * - Error handling (division by zero)
 * - Clean Interface API pattern
 *
 * Usage:
 *   # From bundle directory
 *   npx simply-mcp run .
 *
 *   # HTTP mode
 *   npx simply-mcp run . --http --port 3000
 *
 *   # Dry-run validation
 *   npx simply-mcp run . --dry-run
 */

import type { ITool, IParam, IServer } from 'simply-mcp';

// ============================================================================
// Server Configuration
// ============================================================================

const server: IServer = {
  name: 'calculator-mcp-server',
  version: '1.0.0',
  description: 'Simple calculator with basic arithmetic operations'
};

// ============================================================================
// Parameter Interfaces (using IParam for validation)
// ============================================================================

interface AParam extends IParam {
  type: 'number';
  description: 'First number';
}

interface BParam extends IParam {
  type: 'number';
  description: 'Second number';
}

// ============================================================================
// Tool Interfaces
// ============================================================================

interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers together';
  params: {
    a: AParam;
    b: BParam;
  };
  result: number;
}

interface SubtractTool extends ITool {
  name: 'subtract';
  description: 'Subtract second number from first number';
  params: {
    a: AParam;
    b: BParam;
  };
  result: number;
}

interface MultiplyTool extends ITool {
  name: 'multiply';
  description: 'Multiply two numbers';
  params: {
    a: AParam;
    b: BParam;
  };
  result: number;
}

interface DivideTool extends ITool {
  name: 'divide';
  description: 'Divide first number by second number';
  params: {
    a: AParam;
    b: BParam;
  };
  result: number | string;
}

// ============================================================================
// Server Implementation
// ============================================================================

export default class CalculatorServer {
  /**
   * Add two numbers
   */
  add: AddTool = async (params) => {
    return params.a + params.b;
  };

  /**
   * Subtract second number from first
   */
  subtract: SubtractTool = async (params) => {
    return params.a - params.b;
  };

  /**
   * Multiply two numbers
   */
  multiply: MultiplyTool = async (params) => {
    return params.a * params.b;
  };

  /**
   * Divide first number by second with zero-division check
   */
  divide: DivideTool = async (params) => {
    if (params.b === 0) {
      return 'Error: Division by zero is undefined';
    }
    return params.a / params.b;
  };
}
