/**
 * Test: Multiple Implementation Patterns
 * 
 * Validates that we can mix:
 * - Standalone function tools
 * - Class 1 with tool methods
 * - Class 2 with tool methods
 */

import type { ITool, IParam, IServer } from './src/index.js';

// Server config
const server: IServer = {
  name: 'mixed-implementation-test',
  version: '1.0.0',
  description: 'Testing mixed tool implementations'
};

// =============================================================================
// TOOL 1: Standalone Function
// =============================================================================

interface InputParam extends IParam {
  type: 'string';
  description: 'Text to echo';
}

interface EchoTool extends ITool {
  name: 'echo';
  description: 'Echo text back';
  params: { text: InputParam };
  result: { echoed: string };
}

// Standalone function implementation
const echo: EchoTool = async (params) => {
  return { echoed: params.text };
};

// =============================================================================
// TOOL 2: From MathService Class
// =============================================================================

interface AParam extends IParam {
  type: 'number';
  description: 'First number';
}

interface BParam extends IParam {
  type: 'number';
  description: 'Second number';
}

interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers';
  params: { a: AParam; b: BParam };
  result: number;
}

class MathService {
  private history: string[] = [];

  add: AddTool = async (params) => {
    const result = params.a + params.b;
    this.history.push(`${params.a} + ${params.b} = ${result}`);
    return result;
  };

  getHistory() {
    return this.history;
  }
}

// =============================================================================
// TOOL 3: From StringService Class
// =============================================================================

interface TextParam extends IParam {
  type: 'string';
  description: 'Text to process';
}

interface UppercaseTool extends ITool {
  name: 'uppercase';
  description: 'Convert text to uppercase';
  params: { text: TextParam };
  result: string;
}

class StringService {
  private cache = new Map<string, string>();

  uppercase: UppercaseTool = async (params) => {
    if (this.cache.has(params.text)) {
      return this.cache.get(params.text)!;
    }
    const result = params.text.toUpperCase();
    this.cache.set(params.text, result);
    return result;
  };
}

// =============================================================================
// SERVER IMPLEMENTATION: Combining All Three
// =============================================================================

const mathService = new MathService();
const stringService = new StringService();

export default {
  // Tool 1: Standalone function
  echo,
  
  // Tool 2: Method from MathService instance
  add: mathService.add.bind(mathService),
  
  // Tool 3: Method from StringService instance
  uppercase: stringService.uppercase.bind(stringService),
};

// Alternative: Export as class
export class MixedServer {
  private mathService = new MathService();
  private stringService = new StringService();

  // Tool 1: Inline method
  echo: EchoTool = async (params) => {
    return { echoed: params.text };
  };

  // Tool 2: Delegate to class
  add: AddTool = async (params) => {
    return this.mathService.add(params);
  };

  // Tool 3: Delegate to class
  uppercase: UppercaseTool = async (params) => {
    return this.stringService.uppercase(params);
  };
}
