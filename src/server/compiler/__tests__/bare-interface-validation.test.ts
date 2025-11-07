/**
 * Tests for Bare Interface Validation Error Messages
 *
 * Tests that validation errors properly show both bare interface
 * and ToolHelper wrapper patterns in error messages.
 */

import { describe, it, expect } from '@jest/globals';
import { validateImplementations } from '../validation-compiler.js';
import type { ParseResult } from '../types.js';

describe('Bare Interface Validation - Error Messages', () => {
  describe('Test 7: Tool Validation Error Messages', () => {
    it('should show both bare interface and helper wrapper patterns for missing tool implementation', () => {
      const result: ParseResult = {
        tools: [
          {
            interfaceName: 'GreetTool',
            name: 'greet',
            description: 'Greet the user',
            methodName: 'greet',
            paramsType: '{}',
            resultType: 'string',
          },
        ],
        prompts: [],
        resources: [],
        samplings: [],
        elicitations: [],
        roots: [],
        subscriptions: [],
        completions: [],
        uis: [],
        routers: [],
        implementations: [], // No implementations
      };

      validateImplementations(result);

      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors).toHaveLength(1);

      const error = result.validationErrors![0];

      // Error should mention the interface name
      expect(error).toContain('GreetTool');
      expect(error).toContain('defined but not implemented');

      // Error should show BOTH patterns
      expect(error).toContain('Bare interface:');
      expect(error).toContain('const greet: GreetTool =');

      expect(error).toContain('Helper wrapper:');
      expect(error).toContain('const greet: ToolHelper<GreetTool> =');
    });

    it('should show correct method name suggestion in error', () => {
      const result: ParseResult = {
        tools: [
          {
            interfaceName: 'GetWeatherTool',
            methodName: 'getWeather',
            description: 'Get weather',
            paramsType: '{}',
            resultType: 'string',
          },
        ],
        prompts: [],
        resources: [],
        samplings: [],
        elicitations: [],
        roots: [],
        subscriptions: [],
        completions: [],
        uis: [],
        routers: [],
        implementations: [],
      };

      validateImplementations(result);

      const error = result.validationErrors![0];

      // Should use methodName (camelCase) in suggestions
      expect(error).toContain('const getWeather:');
    });
  });

  describe('Test 8: Prompt Validation Error Messages', () => {
    it('should show both patterns for missing prompt implementation', () => {
      const result: ParseResult = {
        tools: [],
        prompts: [
          {
            interfaceName: 'WelcomePrompt',
            name: 'welcome',
            description: 'Welcome message',
            methodName: 'welcome',
            argsType: '{}',
          },
        ],
        resources: [],
        samplings: [],
        elicitations: [],
        roots: [],
        subscriptions: [],
        completions: [],
        uis: [],
        routers: [],
        implementations: [],
      };

      validateImplementations(result);

      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors).toHaveLength(1);

      const error = result.validationErrors![0];

      expect(error).toContain('WelcomePrompt');
      expect(error).toContain('defined but not implemented');

      // Both patterns should be shown
      expect(error).toContain('Bare interface:');
      expect(error).toContain('const welcome: WelcomePrompt =');

      expect(error).toContain('Helper wrapper:');
      expect(error).toContain('const welcome: PromptHelper<WelcomePrompt> =');
    });
  });

  describe('Test 9: Resource Validation Error Messages', () => {
    it('should show both patterns for missing dynamic resource implementation', () => {
      const result: ParseResult = {
        tools: [],
        prompts: [],
        resources: [
          {
            interfaceName: 'UsersResource',
            uri: 'users://list',
            name: 'users',
            description: 'User list',
            methodName: 'users',
            mimeType: 'application/json',
            dynamic: true,
            dataType: 'any',
          },
        ],
        samplings: [],
        elicitations: [],
        roots: [],
        subscriptions: [],
        completions: [],
        uis: [],
        routers: [],
        implementations: [],
      };

      validateImplementations(result);

      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors).toHaveLength(1);

      const error = result.validationErrors![0];

      expect(error).toContain('UsersResource');
      expect(error).toContain('defined but not implemented');

      // Both patterns should be shown
      expect(error).toContain('Bare interface:');
      expect(error).toContain('const users: UsersResource =');

      expect(error).toContain('Helper wrapper:');
      expect(error).toContain('const users: ResourceHelper<UsersResource> =');
    });

    it('should NOT validate static resources (no implementation required)', () => {
      const result: ParseResult = {
        tools: [],
        prompts: [],
        resources: [
          {
            interfaceName: 'StaticResource',
            uri: 'static://data',
            name: 'static',
            description: 'Static data',
            methodName: 'static',
            mimeType: 'application/json',
            dynamic: false, // Static resource
            dataType: 'any',
            data: { value: 'static' },
          },
        ],
        samplings: [],
        elicitations: [],
        roots: [],
        subscriptions: [],
        completions: [],
        uis: [],
        routers: [],
        implementations: [],
      };

      validateImplementations(result);

      // No validation errors for static resources
      expect(result.validationErrors).toBeUndefined();
    });
  });

  describe('Test 10: Implementation Without Interface', () => {
    it('should error when bare interface implementation references unknown tool', () => {
      const result: ParseResult = {
        tools: [],
        prompts: [],
        resources: [],
        samplings: [],
        elicitations: [],
        roots: [],
        subscriptions: [],
        completions: [],
        uis: [],
        routers: [],
        implementations: [
          {
            name: 'greet',
            helperType: 'ToolHelper',
            interfaceName: 'UnknownTool',
            kind: 'const',
            isBareInterface: true,
          },
        ],
      };

      validateImplementations(result);

      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors).toHaveLength(1);

      const error = result.validationErrors![0];

      expect(error).toContain('greet');
      expect(error).toContain('references unknown tool interface');
      expect(error).toContain('UnknownTool');
      expect(error).toContain('interface UnknownTool extends ITool');
    });

    it('should error when bare interface implementation references unknown prompt', () => {
      const result: ParseResult = {
        tools: [],
        prompts: [],
        resources: [],
        samplings: [],
        elicitations: [],
        roots: [],
        subscriptions: [],
        completions: [],
        uis: [],
        routers: [],
        implementations: [
          {
            name: 'welcome',
            helperType: 'PromptHelper',
            interfaceName: 'UnknownPrompt',
            kind: 'const',
            isBareInterface: true,
          },
        ],
      };

      validateImplementations(result);

      expect(result.validationErrors).toBeDefined();
      const error = result.validationErrors![0];

      expect(error).toContain('welcome');
      expect(error).toContain('references unknown prompt interface');
      expect(error).toContain('UnknownPrompt');
      expect(error).toContain('interface UnknownPrompt extends IPrompt');
    });

    it('should error when bare interface implementation references unknown resource', () => {
      const result: ParseResult = {
        tools: [],
        prompts: [],
        resources: [],
        samplings: [],
        elicitations: [],
        roots: [],
        subscriptions: [],
        completions: [],
        uis: [],
        routers: [],
        implementations: [
          {
            name: 'users',
            helperType: 'ResourceHelper',
            interfaceName: 'UnknownResource',
            kind: 'const',
            isBareInterface: true,
          },
        ],
      };

      validateImplementations(result);

      expect(result.validationErrors).toBeDefined();
      const error = result.validationErrors![0];

      expect(error).toContain('users');
      expect(error).toContain('references unknown resource interface');
      expect(error).toContain('UnknownResource');
      expect(error).toContain('interface UnknownResource extends IResource');
    });
  });

  describe('Test 11: Valid Implementations - No Errors', () => {
    it('should pass validation when bare interface tool is properly implemented', () => {
      const result: ParseResult = {
        tools: [
          {
            interfaceName: 'GreetTool',
            methodName: 'greet',
            description: 'Greet',
            paramsType: '{}',
            resultType: 'string',
          },
        ],
        prompts: [],
        resources: [],
        samplings: [],
        elicitations: [],
        roots: [],
        subscriptions: [],
        completions: [],
        uis: [],
        routers: [],
        implementations: [
          {
            name: 'greet',
            helperType: 'ToolHelper',
            interfaceName: 'GreetTool',
            kind: 'const',
            isBareInterface: true,
          },
        ],
      };

      validateImplementations(result);

      expect(result.validationErrors).toBeUndefined();
    });

    it('should pass validation when ToolHelper pattern is properly implemented', () => {
      const result: ParseResult = {
        tools: [
          {
            interfaceName: 'GreetTool',
            methodName: 'greet',
            description: 'Greet',
            paramsType: '{}',
            resultType: 'string',
          },
        ],
        prompts: [],
        resources: [],
        samplings: [],
        elicitations: [],
        roots: [],
        subscriptions: [],
        completions: [],
        uis: [],
        routers: [],
        implementations: [
          {
            name: 'greet',
            helperType: 'ToolHelper',
            interfaceName: 'GreetTool',
            kind: 'const',
            // No isBareInterface flag (using ToolHelper wrapper)
          },
        ],
      };

      validateImplementations(result);

      expect(result.validationErrors).toBeUndefined();
    });

    it('should pass validation with mixed bare interface and ToolHelper patterns', () => {
      const result: ParseResult = {
        tools: [
          {
            interfaceName: 'Tool1Tool',
            methodName: 'tool1',
            description: 'Tool 1',
            paramsType: '{}',
            resultType: 'string',
          },
          {
            interfaceName: 'Tool2Tool',
            methodName: 'tool2',
            description: 'Tool 2',
            paramsType: '{}',
            resultType: 'string',
          },
        ],
        prompts: [],
        resources: [],
        samplings: [],
        elicitations: [],
        roots: [],
        subscriptions: [],
        completions: [],
        uis: [],
        routers: [],
        implementations: [
          {
            name: 'tool1',
            helperType: 'ToolHelper',
            interfaceName: 'Tool1Tool',
            kind: 'const',
            isBareInterface: true, // Bare interface
          },
          {
            name: 'tool2',
            helperType: 'ToolHelper',
            interfaceName: 'Tool2Tool',
            kind: 'const',
            // ToolHelper wrapper
          },
        ],
      };

      validateImplementations(result);

      expect(result.validationErrors).toBeUndefined();
    });
  });

  describe('Test 12: Class Instantiation Validation', () => {
    it('should error when class has implementations but is not instantiated', () => {
      const result: ParseResult = {
        tools: [
          {
            interfaceName: 'GreetTool',
            methodName: 'greet',
            description: 'Greet',
            paramsType: '{}',
            resultType: 'string',
          },
        ],
        prompts: [],
        resources: [],
        samplings: [],
        elicitations: [],
        roots: [],
        subscriptions: [],
        completions: [],
        uis: [],
        routers: [],
        implementations: [
          {
            name: 'greet',
            helperType: 'ToolHelper',
            interfaceName: 'GreetTool',
            kind: 'class-property',
            className: 'MyServer',
            isBareInterface: true,
          },
        ],
        instances: [], // No instance of MyServer
      };

      validateImplementations(result);

      expect(result.validationErrors).toBeDefined();
      const error = result.validationErrors!.find(e => e.includes('MyServer'));

      expect(error).toBeDefined();
      expect(error).toContain('MyServer');
      expect(error).toContain('has tool/prompt/resource implementations but is not instantiated');
      expect(error).toContain('const myServer = new MyServer()');
    });

    it('should pass validation when class is properly instantiated', () => {
      const result: ParseResult = {
        tools: [
          {
            interfaceName: 'GreetTool',
            methodName: 'greet',
            description: 'Greet',
            paramsType: '{}',
            resultType: 'string',
          },
        ],
        prompts: [],
        resources: [],
        samplings: [],
        elicitations: [],
        roots: [],
        subscriptions: [],
        completions: [],
        uis: [],
        routers: [],
        implementations: [
          {
            name: 'greet',
            helperType: 'ToolHelper',
            interfaceName: 'GreetTool',
            kind: 'class-property',
            className: 'MyServer',
            isBareInterface: true,
          },
        ],
        instances: [
          {
            instanceName: 'myServer',
            className: 'MyServer',
          },
        ],
      };

      validateImplementations(result);

      expect(result.validationErrors).toBeUndefined();
    });
  });

  describe('Test 13: Multiple Errors', () => {
    it('should report all validation errors at once', () => {
      const result: ParseResult = {
        tools: [
          {
            interfaceName: 'Tool1Tool',
            methodName: 'tool1',
            description: 'Tool 1',
            paramsType: '{}',
            resultType: 'string',
          },
          {
            interfaceName: 'Tool2Tool',
            methodName: 'tool2',
            description: 'Tool 2',
            paramsType: '{}',
            resultType: 'string',
          },
        ],
        prompts: [
          {
            interfaceName: 'PromptPrompt',
            name: 'prompt',
            methodName: 'prompt',
            description: 'Prompt',
            argsType: '{}',
          },
        ],
        resources: [],
        samplings: [],
        elicitations: [],
        roots: [],
        subscriptions: [],
        completions: [],
        uis: [],
        routers: [],
        implementations: [],
      };

      validateImplementations(result);

      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors).toHaveLength(3);

      expect(result.validationErrors![0]).toContain('Tool1Tool');
      expect(result.validationErrors![1]).toContain('Tool2Tool');
      expect(result.validationErrors![2]).toContain('PromptPrompt');
    });
  });
});
