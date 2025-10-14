/**
 * Basic tests for wizard tools
 *
 * Tests the wizard flow, validation, and code generation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WizardStateManager } from '../state.js';
import {
  validateServerName,
  validateVersion,
  validateToolName,
  validateParameters
} from '../validators.js';
import { generateZodSchema, generateServerCode } from '../generators.js';

describe('WizardStateManager', () => {
  let manager: WizardStateManager;

  beforeEach(() => {
    manager = new WizardStateManager();
  });

  it('should create a new wizard state', () => {
    const state = manager.createState();
    expect(state.currentStep).toBe('init');
    expect(state.completedTools).toEqual([]);
    expect(state.serverConfig).toEqual({});
  });

  it('should store and retrieve state', () => {
    const state = manager.createState();
    state.serverConfig.name = 'test-server';
    manager.updateState(state);

    const retrieved = manager.getState();
    expect(retrieved?.serverConfig.name).toBe('test-server');
  });

  it('should support session-based state (HTTP mode)', () => {
    const state1 = manager.createState('session-1');
    const state2 = manager.createState('session-2');

    state1.serverConfig.name = 'server-1';
    state2.serverConfig.name = 'server-2';
    manager.updateState(state1, 'session-1');
    manager.updateState(state2, 'session-2');

    expect(manager.getState('session-1')?.serverConfig.name).toBe('server-1');
    expect(manager.getState('session-2')?.serverConfig.name).toBe('server-2');
  });

  it('should delete state', () => {
    const state = manager.createState();
    manager.deleteState();
    expect(manager.getState()).toBeUndefined();
  });
});

describe('Validators', () => {
  describe('validateServerName', () => {
    it('should accept valid kebab-case names', () => {
      expect(validateServerName('my-server').valid).toBe(true);
      expect(validateServerName('weather-api').valid).toBe(true);
      expect(validateServerName('server123').valid).toBe(true);
    });

    it('should reject invalid names', () => {
      expect(validateServerName('MyServer').valid).toBe(false);
      expect(validateServerName('my_server').valid).toBe(false);
      expect(validateServerName('my server').valid).toBe(false);
      expect(validateServerName('').valid).toBe(false);
    });
  });

  describe('validateVersion', () => {
    it('should accept valid semver versions', () => {
      expect(validateVersion('1.0.0').valid).toBe(true);
      expect(validateVersion('0.1.0').valid).toBe(true);
      expect(validateVersion('10.20.30').valid).toBe(true);
    });

    it('should reject invalid versions', () => {
      expect(validateVersion('1.0').valid).toBe(false);
      expect(validateVersion('v1.0.0').valid).toBe(false);
      expect(validateVersion('1.0.0-beta').valid).toBe(false);
      expect(validateVersion('').valid).toBe(false);
    });
  });

  describe('validateToolName', () => {
    it('should accept valid kebab-case tool names', () => {
      expect(validateToolName('calculate-tip').valid).toBe(true);
      expect(validateToolName('get-weather').valid).toBe(true);
      expect(validateToolName('tool123').valid).toBe(true);
    });

    it('should reject invalid tool names', () => {
      expect(validateToolName('calculateTip').valid).toBe(false);
      expect(validateToolName('calculate_tip').valid).toBe(false);
      expect(validateToolName('Calculate-Tip').valid).toBe(false);
      expect(validateToolName('').valid).toBe(false);
    });
  });

  describe('validateParameters', () => {
    it('should accept valid parameter arrays', () => {
      const params = [
        {
          name: 'bill_amount',
          type: 'number',
          description: 'Total bill amount',
          required: true
        }
      ];
      expect(validateParameters(params).valid).toBe(true);
    });

    it('should reject non-array parameters', () => {
      expect(validateParameters({}).valid).toBe(false);
      expect(validateParameters('not an array').valid).toBe(false);
    });

    it('should reject empty parameter arrays', () => {
      expect(validateParameters([]).valid).toBe(false);
    });

    it('should reject parameters with missing fields', () => {
      const params = [
        {
          name: 'test',
          // missing type, description, required
        }
      ];
      expect(validateParameters(params).valid).toBe(false);
    });

    it('should reject parameters with invalid name format', () => {
      const params = [
        {
          name: 'invalidName', // should be snake_case
          type: 'string',
          description: 'Test',
          required: true
        }
      ];
      expect(validateParameters(params).valid).toBe(false);
    });

    it('should reject parameters with invalid types', () => {
      const params = [
        {
          name: 'test_param',
          type: 'invalid_type',
          description: 'Test',
          required: true
        }
      ];
      expect(validateParameters(params).valid).toBe(false);
    });
  });
});

describe('Code Generators', () => {
  describe('generateZodSchema', () => {
    it('should generate schema for required string parameter', () => {
      const params = [
        {
          name: 'test_param',
          type: 'string',
          description: 'Test parameter',
          required: true
        }
      ];
      const schema = generateZodSchema(params);
      expect(schema).toContain('z.string()');
      expect(schema).toContain('test_param');
      expect(schema).toContain('Test parameter');
    });

    it('should generate schema for optional parameter with default', () => {
      const params = [
        {
          name: 'tip_percentage',
          type: 'number',
          description: 'Tip percentage',
          required: false,
          default: 15
        }
      ];
      const schema = generateZodSchema(params);
      expect(schema).toContain('z.number()');
      expect(schema).toContain('.optional()');
      expect(schema).toContain('.default(15)');
    });

    it('should generate schema for multiple parameters', () => {
      const params = [
        {
          name: 'name',
          type: 'string',
          description: 'User name',
          required: true
        },
        {
          name: 'age',
          type: 'number',
          description: 'User age',
          required: false
        }
      ];
      const schema = generateZodSchema(params);
      expect(schema).toContain('name');
      expect(schema).toContain('age');
      expect(schema).toContain('z.string()');
      expect(schema).toContain('z.number()');
    });
  });

  describe('generateServerCode', () => {
    const serverConfig = {
      name: 'test-server',
      version: '1.0.0',
      description: 'Test server'
    };

    const tools = [
      {
        name: 'test-tool',
        description: 'Test tool',
        parameters: [
          {
            name: 'test_param',
            type: 'string',
            description: 'Test parameter',
            required: true
          }
        ],
        zodSchemaCode: 'z.object({ test_param: z.string() })'
      }
    ];

    it('should generate functional API server code', () => {
      const code = generateServerCode({
        serverConfig,
        tools,
        apiStyle: 'functional'
      });

      expect(code).toContain('import { defineMCP }');
      expect(code).toContain('test-server');
      expect(code).toContain('1.0.0');
      expect(code).toContain('test-tool');
      expect(code).toContain('Test tool');
    });

    it('should generate decorator API server code', () => {
      const code = generateServerCode({
        serverConfig,
        tools,
        apiStyle: 'decorator'
      });

      expect(code).toContain('@MCPServer');
      expect(code).toContain('@Tool');
      expect(code).toContain('test-server');
      expect(code).toContain('class TestServer');
    });

    it('should generate programmatic API server code', () => {
      const code = generateServerCode({
        serverConfig,
        tools,
        apiStyle: 'programmatic'
      });

      expect(code).toContain('BuildMCPServer');
      expect(code).toContain('server.addTool');
      expect(code).toContain('test-server');
      expect(code).toContain('await server.start()');
    });
  });
});

describe('Complete Wizard Flow', () => {
  it('should complete a full wizard session', () => {
    const manager = new WizardStateManager();

    // Step 1: Create wizard state
    const state = manager.createState();
    expect(state.currentStep).toBe('init');

    // Step 2: Set server info
    state.serverConfig = {
      name: 'tip-calculator',
      version: '1.0.0',
      description: 'Calculates tips for restaurant bills'
    };
    state.currentStep = 'server_info';
    manager.updateState(state);

    // Validate server info
    expect(validateServerName('tip-calculator').valid).toBe(true);
    expect(validateVersion('1.0.0').valid).toBe(true);

    // Step 3: Add tool
    state.currentTool = {
      purpose: 'Calculate tip amount and total bill',
      parameters_description: 'bill amount and tip percentage'
    };
    state.currentStep = 'adding_tools';
    manager.updateState(state);

    // Step 4: Confirm tool parameters
    const params = [
      {
        name: 'bill_amount',
        type: 'number',
        description: 'Total bill amount before tip',
        required: true
      },
      {
        name: 'tip_percentage',
        type: 'number',
        description: 'Tip percentage (e.g., 15 for 15%)',
        required: false,
        default: 15
      }
    ];

    expect(validateToolName('calculate-tip').valid).toBe(true);
    expect(validateParameters(params).valid).toBe(true);

    const zodSchema = generateZodSchema(params);
    state.completedTools.push({
      name: 'calculate-tip',
      description: state.currentTool!.purpose,
      parameters: params,
      zodSchemaCode: zodSchema
    });
    state.currentTool = undefined;
    manager.updateState(state);

    expect(state.completedTools.length).toBe(1);

    // Step 5: Finish wizard
    const serverCode = generateServerCode({
      serverConfig: state.serverConfig,
      tools: state.completedTools,
      apiStyle: 'functional'
    });

    expect(serverCode).toContain('tip-calculator');
    expect(serverCode).toContain('calculate-tip');
    expect(serverCode).toContain('bill_amount');
    expect(serverCode).toContain('tip_percentage');

    state.currentStep = 'complete';
    manager.updateState(state);

    expect(state.currentStep).toBe('complete');
  });
});
