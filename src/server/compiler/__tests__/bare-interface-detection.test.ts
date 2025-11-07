/**
 * Tests for Bare Interface Detection Feature
 *
 * Comprehensive test suite covering the new bare interface detection feature
 * that allows both ToolHelper<XTool> and bare XTool patterns.
 */

import { describe, it, expect } from '@jest/globals';
import * as ts from 'typescript';
import {
  discoverConstImplementation,
  discoverClassImplementations,
} from '../discovery.js';

/**
 * Helper function to create a TypeScript source file from code
 */
function createSourceFile(code: string): ts.SourceFile {
  return ts.createSourceFile(
    'test.ts',
    code,
    ts.ScriptTarget.Latest,
    true
  );
}

/**
 * Helper to find variable statements in source file
 */
function findVariableStatement(sourceFile: ts.SourceFile): ts.VariableStatement | null {
  let result: ts.VariableStatement | null = null;
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isVariableStatement(node)) {
      result = node;
    }
  });
  return result;
}

/**
 * Helper to find class declaration in source file
 */
function findClassDeclaration(sourceFile: ts.SourceFile): ts.ClassDeclaration | null {
  let result: ts.ClassDeclaration | null = null;
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isClassDeclaration(node)) {
      result = node;
    }
  });
  return result;
}

describe('Bare Interface Detection - Const Implementations', () => {
  describe('Test 1: Bare Interface Tool Detection', () => {
    it('should detect bare interface tool pattern: const greet: GreetTool = async () => {}', () => {
      const code = `const greet: GreetTool = async (params) => { return "Hello"; };`;
      const sourceFile = createSourceFile(code);
      const varStatement = findVariableStatement(sourceFile);

      expect(varStatement).not.toBeNull();
      const result = discoverConstImplementation(varStatement!, sourceFile);

      expect(result).toBeDefined();
      expect(result?.name).toBe('greet');
      expect(result?.interfaceName).toBe('GreetTool');
      expect(result?.helperType).toBe('ToolHelper');
      expect(result?.kind).toBe('const');
      expect(result?.isBareInterface).toBe(true);
    });

    it('should detect bare interface prompt pattern: const welcome: WelcomePrompt = async () => {}', () => {
      const code = `const welcome: WelcomePrompt = async (args) => { return { messages: [] }; };`;
      const sourceFile = createSourceFile(code);
      const varStatement = findVariableStatement(sourceFile);

      const result = discoverConstImplementation(varStatement!, sourceFile);

      expect(result).toBeDefined();
      expect(result?.name).toBe('welcome');
      expect(result?.interfaceName).toBe('WelcomePrompt');
      expect(result?.helperType).toBe('PromptHelper');
      expect(result?.kind).toBe('const');
      expect(result?.isBareInterface).toBe(true);
    });

    it('should detect bare interface resource pattern: const users: UsersResource = async () => {}', () => {
      const code = `const users: UsersResource = async () => { return { contents: [] }; };`;
      const sourceFile = createSourceFile(code);
      const varStatement = findVariableStatement(sourceFile);

      const result = discoverConstImplementation(varStatement!, sourceFile);

      expect(result).toBeDefined();
      expect(result?.name).toBe('users');
      expect(result?.interfaceName).toBe('UsersResource');
      expect(result?.helperType).toBe('ResourceHelper');
      expect(result?.kind).toBe('const');
      expect(result?.isBareInterface).toBe(true);
    });

    it('should infer correct helperType from interface suffix', () => {
      const testCases = [
        { code: 'const a: ATool = async () => {};', expectedHelper: 'ToolHelper' },
        { code: 'const b: BPrompt = async () => {};', expectedHelper: 'PromptHelper' },
        { code: 'const c: CResource = async () => {};', expectedHelper: 'ResourceHelper' },
      ];

      testCases.forEach(({ code, expectedHelper }) => {
        const sourceFile = createSourceFile(code);
        const varStatement = findVariableStatement(sourceFile);
        const result = discoverConstImplementation(varStatement!, sourceFile);

        expect(result?.helperType).toBe(expectedHelper);
        expect(result?.isBareInterface).toBe(true);
      });
    });
  });

  describe('Test 2: Backward Compatibility - ToolHelper Pattern', () => {
    it('should still detect ToolHelper<GreetTool> pattern without isBareInterface flag', () => {
      const code = `const greet: ToolHelper<GreetTool> = async (params) => { return "Hello"; };`;
      const sourceFile = createSourceFile(code);
      const varStatement = findVariableStatement(sourceFile);

      const result = discoverConstImplementation(varStatement!, sourceFile);

      expect(result).toBeDefined();
      expect(result?.name).toBe('greet');
      expect(result?.interfaceName).toBe('GreetTool');
      expect(result?.helperType).toBe('ToolHelper');
      expect(result?.kind).toBe('const');
      expect(result?.isBareInterface).toBeUndefined();
    });

    it('should still detect PromptHelper<WelcomePrompt> pattern', () => {
      const code = `const welcome: PromptHelper<WelcomePrompt> = async (args) => { return { messages: [] }; };`;
      const sourceFile = createSourceFile(code);
      const varStatement = findVariableStatement(sourceFile);

      const result = discoverConstImplementation(varStatement!, sourceFile);

      expect(result).toBeDefined();
      expect(result?.name).toBe('welcome');
      expect(result?.interfaceName).toBe('WelcomePrompt');
      expect(result?.helperType).toBe('PromptHelper');
      expect(result?.isBareInterface).toBeUndefined();
    });

    it('should still detect ResourceHelper<UsersResource> pattern', () => {
      const code = `const users: ResourceHelper<UsersResource> = async () => { return { contents: [] }; };`;
      const sourceFile = createSourceFile(code);
      const varStatement = findVariableStatement(sourceFile);

      const result = discoverConstImplementation(varStatement!, sourceFile);

      expect(result).toBeDefined();
      expect(result?.name).toBe('users');
      expect(result?.interfaceName).toBe('UsersResource');
      expect(result?.helperType).toBe('ResourceHelper');
      expect(result?.isBareInterface).toBeUndefined();
    });

    it('should prioritize ToolHelper pattern over bare interface when both could match', () => {
      // This tests that ToolHelper<X> is checked BEFORE bare interface pattern
      const code = `const add: ToolHelper<AddTool> = async (params) => { return 42; };`;
      const sourceFile = createSourceFile(code);
      const varStatement = findVariableStatement(sourceFile);

      const result = discoverConstImplementation(varStatement!, sourceFile);

      expect(result?.helperType).toBe('ToolHelper');
      expect(result?.isBareInterface).toBeUndefined(); // Not bare, it's using helper
    });
  });

  describe('Test 3: Edge Cases - Non-Standard Interface Names', () => {
    it('should NOT detect interface without Tool/Prompt/Resource suffix', () => {
      const code = `const greet: Greet = async () => {};`;
      const sourceFile = createSourceFile(code);
      const varStatement = findVariableStatement(sourceFile);

      const result = discoverConstImplementation(varStatement!, sourceFile);

      expect(result).toBeNull();
    });

    it('should NOT detect plain type reference without correct suffix', () => {
      const code = `const handler: MyHandler = async () => {};`;
      const sourceFile = createSourceFile(code);
      const varStatement = findVariableStatement(sourceFile);

      const result = discoverConstImplementation(varStatement!, sourceFile);

      expect(result).toBeNull();
    });

    it('should NOT detect when no type annotation is present', () => {
      const code = `const greet = async () => {};`;
      const sourceFile = createSourceFile(code);
      const varStatement = findVariableStatement(sourceFile);

      const result = discoverConstImplementation(varStatement!, sourceFile);

      expect(result).toBeNull();
    });

    it('should handle complex interface names with correct suffix', () => {
      const code = `const complexCalculator: ComplexCalculatorTool = async () => {};`;
      const sourceFile = createSourceFile(code);
      const varStatement = findVariableStatement(sourceFile);

      const result = discoverConstImplementation(varStatement!, sourceFile);

      expect(result).toBeDefined();
      expect(result?.name).toBe('complexCalculator');
      expect(result?.interfaceName).toBe('ComplexCalculatorTool');
      expect(result?.isBareInterface).toBe(true);
    });
  });
});

describe('Bare Interface Detection - Class Property Implementations', () => {
  describe('Test 4: Bare Interface Class Property Detection', () => {
    it('should detect bare interface tool in class property', () => {
      const code = `
        class Server {
          greet: GreetTool = async (params) => {
            return "Hello";
          };
        }
      `;
      const sourceFile = createSourceFile(code);
      const classDecl = findClassDeclaration(sourceFile);

      expect(classDecl).not.toBeNull();
      const results = discoverClassImplementations(classDecl!, sourceFile);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('greet');
      expect(results[0].interfaceName).toBe('GreetTool');
      expect(results[0].helperType).toBe('ToolHelper');
      expect(results[0].kind).toBe('class-property');
      expect(results[0].className).toBe('Server');
      expect(results[0].isBareInterface).toBe(true);
    });

    it('should detect multiple bare interface properties in a class', () => {
      const code = `
        class Server {
          greet: GreetTool = async (params) => { return "Hello"; };
          welcome: WelcomePrompt = async (args) => { return { messages: [] }; };
          users: UsersResource = async () => { return { contents: [] }; };
        }
      `;
      const sourceFile = createSourceFile(code);
      const classDecl = findClassDeclaration(sourceFile);

      const results = discoverClassImplementations(classDecl!, sourceFile);

      expect(results).toHaveLength(3);

      const greet = results.find(r => r.name === 'greet');
      expect(greet?.interfaceName).toBe('GreetTool');
      expect(greet?.helperType).toBe('ToolHelper');
      expect(greet?.isBareInterface).toBe(true);

      const welcome = results.find(r => r.name === 'welcome');
      expect(welcome?.interfaceName).toBe('WelcomePrompt');
      expect(welcome?.helperType).toBe('PromptHelper');
      expect(welcome?.isBareInterface).toBe(true);

      const users = results.find(r => r.name === 'users');
      expect(users?.interfaceName).toBe('UsersResource');
      expect(users?.helperType).toBe('ResourceHelper');
      expect(users?.isBareInterface).toBe(true);
    });

    it('should detect mix of bare interface and ToolHelper patterns in class', () => {
      const code = `
        class MixedServer {
          greet: GreetTool = async (params) => { return "Hello"; };
          calculate: ToolHelper<CalculateTool> = async (params) => { return 42; };
          welcome: WelcomePrompt = async (args) => { return { messages: [] }; };
        }
      `;
      const sourceFile = createSourceFile(code);
      const classDecl = findClassDeclaration(sourceFile);

      const results = discoverClassImplementations(classDecl!, sourceFile);

      expect(results).toHaveLength(3);

      const greet = results.find(r => r.name === 'greet');
      expect(greet?.isBareInterface).toBe(true);

      const calculate = results.find(r => r.name === 'calculate');
      expect(calculate?.isBareInterface).toBeUndefined();

      const welcome = results.find(r => r.name === 'welcome');
      expect(welcome?.isBareInterface).toBe(true);
    });
  });

  describe('Test 5: Class Property Backward Compatibility', () => {
    it('should detect ToolHelper<X> class properties without isBareInterface flag', () => {
      const code = `
        class Server {
          greet: ToolHelper<GreetTool> = async (params) => {
            return "Hello";
          };
        }
      `;
      const sourceFile = createSourceFile(code);
      const classDecl = findClassDeclaration(sourceFile);

      const results = discoverClassImplementations(classDecl!, sourceFile);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('greet');
      expect(results[0].interfaceName).toBe('GreetTool');
      expect(results[0].helperType).toBe('ToolHelper');
      expect(results[0].isBareInterface).toBeUndefined();
    });

    it('should handle class with only ToolHelper patterns (no bare interfaces)', () => {
      const code = `
        class LegacyServer {
          tool1: ToolHelper<Tool1Tool> = async () => {};
          tool2: ToolHelper<Tool2Tool> = async () => {};
        }
      `;
      const sourceFile = createSourceFile(code);
      const classDecl = findClassDeclaration(sourceFile);

      const results = discoverClassImplementations(classDecl!, sourceFile);

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.isBareInterface).toBeUndefined();
        expect(result.helperType).toBe('ToolHelper');
      });
    });
  });

  describe('Test 6: Class Edge Cases', () => {
    it('should return empty array for class with no implementations', () => {
      const code = `
        class EmptyServer {
          name: string = "test";
          port: number = 3000;
        }
      `;
      const sourceFile = createSourceFile(code);
      const classDecl = findClassDeclaration(sourceFile);

      const results = discoverClassImplementations(classDecl!, sourceFile);

      expect(results).toHaveLength(0);
    });

    it('should ignore properties without type annotations', () => {
      const code = `
        class Server {
          greet = async () => {};
          calculate: CalculateTool = async () => {};
        }
      `;
      const sourceFile = createSourceFile(code);
      const classDecl = findClassDeclaration(sourceFile);

      const results = discoverClassImplementations(classDecl!, sourceFile);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('calculate');
    });

    it('should return empty array for class without name', () => {
      const code = `
        class {
          greet: GreetTool = async () => {};
        }
      `;
      const sourceFile = createSourceFile(code);
      const classDecl = findClassDeclaration(sourceFile);

      const results = discoverClassImplementations(classDecl!, sourceFile);

      expect(results).toHaveLength(0);
    });
  });
});

describe('Bare Interface Detection - Naming Pattern Validation', () => {
  it('should match pattern: /^(\\w+)(Tool|Prompt|Resource)$/', () => {
    const validPatterns = [
      'GreetTool',
      'WelcomePrompt',
      'UsersResource',
      'A1Tool',
      'Test_Tool',
      'ComplexCalculatorTool',
      'GetWeatherTool',
      'StatsResource',
    ];

    validPatterns.forEach(pattern => {
      const code = `const impl: ${pattern} = async () => {};`;
      const sourceFile = createSourceFile(code);
      const varStatement = findVariableStatement(sourceFile);
      const result = discoverConstImplementation(varStatement!, sourceFile);

      expect(result).toBeDefined();
      expect(result?.interfaceName).toBe(pattern);
      expect(result?.isBareInterface).toBe(true);
    });
  });

  it('should NOT match invalid patterns', () => {
    const invalidPatterns = [
      'Tool',           // Missing prefix
      'Prompt',         // Missing prefix
      'Resource',       // Missing prefix
      'GreetTools',     // Wrong suffix (plural)
      'WelcomePrompts', // Wrong suffix (plural)
      'UsersResources', // Wrong suffix (plural)
      'Greet',          // Missing suffix
      'MyHandler',      // Wrong suffix
    ];

    invalidPatterns.forEach(pattern => {
      const code = `const impl: ${pattern} = async () => {};`;
      const sourceFile = createSourceFile(code);
      const varStatement = findVariableStatement(sourceFile);
      const result = discoverConstImplementation(varStatement!, sourceFile);

      expect(result).toBeNull();
    });
  });
});
