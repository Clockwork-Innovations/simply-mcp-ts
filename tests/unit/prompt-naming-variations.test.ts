/**
 * Tests for prompt naming variation support (Issue #1)
 * Verifies that prompts now support both snake_case and camelCase method names
 * just like tools do
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { ParsedPrompt } from '../../src/server/parser.js';
import { registerPrompt } from '../../src/handlers/prompt-handler.js';

// Mock BuildMCPServer
const mockServer = {
  addPrompt: jest.fn(),
} as any;

describe('Prompt Naming Variations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console warnings in tests
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('should match snake_case prompt name to camelCase method (preferred)', () => {
    const serverInstance = {
      analyzeData: jest.fn(() => ({ result: 'analyzed' })),
    };

    const prompt: ParsedPrompt = {
      interfaceName: 'AnalyzePrompt',
      name: 'analyze_data',
      methodName: 'analyzeData',
      description: 'Analyze data',
      argsMetadata: {
        data: { description: 'Data to analyze', required: true },
      },
      argsType: 'AnalyzeArgs',
    };

    // Should NOT throw error
    expect(() => {
      registerPrompt(mockServer, serverInstance, prompt);
    }).not.toThrow();

    // Verify prompt was registered
    expect(mockServer.addPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'analyze_data',
        description: 'Analyze data',
      })
    );
  });

  it('should match snake_case prompt name to snake_case method (no warning)', () => {
    const serverInstance = {
      analyze_data: jest.fn(() => ({ result: 'analyzed' })),
    };

    const prompt: ParsedPrompt = {
      interfaceName: 'AnalyzePrompt',
      name: 'analyze_data',
      methodName: 'analyzeData',
      description: 'Analyze data',
      argsMetadata: {},
      argsType: 'AnalyzeArgs',
    };

    // Should NOT throw error (should find analyze_data as variation of analyzeData)
    expect(() => {
      registerPrompt(mockServer, serverInstance, prompt);
    }).not.toThrow();

    // No warnings - both naming conventions are equally valid
    expect(console.warn).not.toHaveBeenCalled();

    // Verify prompt was registered
    expect(mockServer.addPrompt).toHaveBeenCalled();
  });

  it('should try multiple naming variations automatically', () => {
    const serverInstance = {
      get_user_data: jest.fn(() => ({ user: 'data' })),
    };

    const prompt: ParsedPrompt = {
      interfaceName: 'GetUserDataPrompt',
      name: 'get_user_data',
      methodName: 'getUserData',
      description: 'Get user data',
      argsMetadata: {},
      argsType: 'GetUserDataArgs',
    };

    // Should match getUserData -> get_user_data variation
    expect(() => {
      registerPrompt(mockServer, serverInstance, prompt);
    }).not.toThrow();

    expect(mockServer.addPrompt).toHaveBeenCalled();
  });

  it('should show enhanced error with all variations tried', () => {
    const serverInstance = {
      someOtherMethod: jest.fn(),
    };

    const prompt: ParsedPrompt = {
      interfaceName: 'AnalyzePrompt',
      name: 'analyze_data',
      methodName: 'analyzeData',
      description: 'Analyze data',
      argsMetadata: {},
      argsType: 'AnalyzeArgs',
    };

    expect(() => {
      registerPrompt(mockServer, serverInstance, prompt);
    }).toThrow(/Tried these naming variations automatically/);
  });

  it('should detect ambiguous naming when both variations exist', () => {
    const exactMethod = jest.fn(() => ({ from: 'exact' }));
    const variationMethod = jest.fn(() => ({ from: 'variation' }));

    const serverInstance = {
      analyzeData: exactMethod,
      analyze_data: variationMethod,
    };

    const prompt: ParsedPrompt = {
      interfaceName: 'AnalyzePrompt',
      name: 'analyze_data',
      methodName: 'analyzeData',
      description: 'Analyze data',
      argsMetadata: {},
      argsType: 'AnalyzeArgs',
    };

    // Should throw error - ambiguous naming (both analyzeData and analyze_data exist)
    expect(() => {
      registerPrompt(mockServer, serverInstance, prompt);
    }).toThrow(/ambiguous method names/);
    expect(() => {
      registerPrompt(mockServer, serverInstance, prompt);
    }).toThrow(/analyzeData/);
    expect(() => {
      registerPrompt(mockServer, serverInstance, prompt);
    }).toThrow(/analyze_data/);
  });

  it('should handle prompts with no args metadata', () => {
    const serverInstance = {
      simplePrompt: jest.fn(() => ({ message: 'hello' })),
    };

    const prompt: ParsedPrompt = {
      interfaceName: 'SimplePrompt',
      name: 'simple_prompt',
      methodName: 'simplePrompt',
      description: 'Simple prompt',
      argsMetadata: undefined,
      argsType: 'void',
    };

    expect(() => {
      registerPrompt(mockServer, serverInstance, prompt);
    }).not.toThrow();

    expect(mockServer.addPrompt).toHaveBeenCalled();
  });

  it('should show available methods in error message', () => {
    const serverInstance = {
      someMethod: jest.fn(),
      anotherMethod: jest.fn(),
      thirdMethod: jest.fn(),
    };

    const prompt: ParsedPrompt = {
      interfaceName: 'MissingPrompt',
      name: 'missing_prompt',
      methodName: 'missingPrompt',
      description: 'Missing prompt',
      argsMetadata: {},
      argsType: 'MissingArgs',
    };

    expect(() => {
      registerPrompt(mockServer, serverInstance, prompt);
    }).toThrow(/Available methods on your class/);
  });

  it('should work with PascalCase variations', () => {
    const serverInstance = {
      AnalyzeData: jest.fn(() => ({ result: 'analyzed' })),
    };

    const prompt: ParsedPrompt = {
      interfaceName: 'AnalyzePrompt',
      name: 'analyze_data',
      methodName: 'analyzeData',
      description: 'Analyze data',
      argsMetadata: {},
      argsType: 'AnalyzeArgs',
    };

    expect(() => {
      registerPrompt(mockServer, serverInstance, prompt);
    }).not.toThrow();

    expect(mockServer.addPrompt).toHaveBeenCalled();
  });
});
