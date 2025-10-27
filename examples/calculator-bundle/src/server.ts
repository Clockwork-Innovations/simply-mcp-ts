/**
 * Calculator MCP Server - Interface API Bundle Example
 *
 * This is a complete example of a SimpleMCP bundle using the Interface API.
 * It demonstrates basic arithmetic operations with proper error handling.
 *
 * Features:
 * - Add, subtract, multiply, and divide operations
 * - Input validation
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

import type { ITool, IServer } from 'simply-mcp';

// ============================================================================
// Tool Interfaces
// ============================================================================

interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers together';
  params: {
    /** First number */
    a: number;
    /** Second number */
    b: number;
  };
  result: number;
}

interface SubtractTool extends ITool {
  name: 'subtract';
  description: 'Subtract second number from first number';
  params: {
    /** First number (minuend) */
    a: number;
    /** Second number (subtrahend) */
    b: number;
  };
  result: number;
}

interface MultiplyTool extends ITool {
  name: 'multiply';
  description: 'Multiply two numbers';
  params: {
    /** First number */
    a: number;
    /** Second number */
    b: number;
  };
  result: number;
}

interface DivideTool extends ITool {
  name: 'divide';
  description: 'Divide first number by second number';
  params: {
    /** Numerator */
    a: number;
    /** Denominator (cannot be zero) */
    b: number;
  };
  result: number | string;
}

// ============================================================================
// Server Interface
// ============================================================================

interface CalculatorServer extends IServer {
  name: 'calculator-mcp-server';
  version: '1.0.0';
  description: 'Simple calculator with basic arithmetic operations';
}

// ============================================================================
// Server Implementation
// ============================================================================

export default class CalculatorServerImpl implements CalculatorServer {
  /**
   * Add two numbers
   */
  add: AddTool = async ({ a, b }) => {
    return a + b;
  };

  /**
   * Subtract second number from first
   */
  subtract: SubtractTool = async ({ a, b }) => {
    return a - b;
  };

  /**
   * Multiply two numbers
   */
  multiply: MultiplyTool = async ({ a, b }) => {
    return a * b;
  };

  /**
   * Divide first number by second with zero-division check
   */
  divide: DivideTool = async ({ a, b }) => {
    if (b === 0) {
      return 'Error: Division by zero is undefined';
    }
    return a / b;
  };
}
