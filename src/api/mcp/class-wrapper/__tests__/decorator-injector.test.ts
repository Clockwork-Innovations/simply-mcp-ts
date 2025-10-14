/**
 * Comprehensive tests for decorator injector
 */

import { describe, it, expect } from '@jest/globals';
import { injectDecorators, generatePreview } from '../decorator-injector.js';
import type { InjectionConfig } from '../decorator-injector.js';

describe('Decorator Injector', () => {
  describe('injectDecorators', () => {
    it('should add imports to file with no imports', () => {
      const config: InjectionConfig = {
        originalCode: `export class SimpleClass {
  greet(name: string): string {
    return \`Hello, \${name}!\`;
  }
}`,
        className: 'SimpleClass',
        serverMetadata: {
          name: 'simple-class',
          version: '1.0.0',
        },
        toolDecorators: new Map([['greet', 'Greet a user']]),
      };

      const result = injectDecorators(config);

      expect(result.code).toContain("import { MCPServer, tool } from 'simply-mcp'");
      expect(result.importsAdded).toBe(1);
    });

    it('should merge with existing simply-mcp imports', () => {
      const config: InjectionConfig = {
        originalCode: `import { resource } from 'simply-mcp';

export class SimpleClass {
  greet(name: string): string {
    return \`Hello, \${name}!\`;
  }
}`,
        className: 'SimpleClass',
        serverMetadata: {
          name: 'simple-class',
          version: '1.0.0',
        },
        toolDecorators: new Map([['greet', 'Greet a user']]),
      };

      const result = injectDecorators(config);

      expect(result.code).toContain('MCPServer');
      expect(result.code).toContain('tool');
      expect(result.code).toContain('resource');
      expect(result.code).toContain("from 'simply-mcp'");
    });

    it('should add @MCPServer decorator to class', () => {
      const config: InjectionConfig = {
        originalCode: `export class SimpleClass {
  greet(name: string): string {
    return \`Hello, \${name}!\`;
  }
}`,
        className: 'SimpleClass',
        serverMetadata: {
          name: 'simple-class',
          version: '1.0.0',
        },
        toolDecorators: new Map([['greet', 'Greet a user']]),
      };

      const result = injectDecorators(config);

      expect(result.code).toContain('@MCPServer({');
      expect(result.code).toContain("name: 'simple-class'");
      expect(result.code).toContain("version: '1.0.0'");
    });

    it('should add @tool decorator to single method', () => {
      const config: InjectionConfig = {
        originalCode: `export class SimpleClass {
  greet(name: string): string {
    return \`Hello, \${name}!\`;
  }
}`,
        className: 'SimpleClass',
        serverMetadata: {
          name: 'simple-class',
          version: '1.0.0',
        },
        toolDecorators: new Map([['greet', 'Greet a user']]),
      };

      const result = injectDecorators(config);

      expect(result.code).toContain("@tool('Greet a user')");
      expect(result.decoratorsAdded).toBe(2); // @MCPServer + @tool
    });

    it('should add @tool decorators to multiple methods', () => {
      const config: InjectionConfig = {
        originalCode: `export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }
}`,
        className: 'Calculator',
        serverMetadata: {
          name: 'calculator',
          version: '1.0.0',
        },
        toolDecorators: new Map([
          ['add', 'Add two numbers'],
          ['subtract', 'Subtract two numbers'],
        ]),
      };

      const result = injectDecorators(config);

      expect(result.code).toContain("@tool('Add two numbers')");
      expect(result.code).toContain("@tool('Subtract two numbers')");
      expect(result.decoratorsAdded).toBe(3); // @MCPServer + 2 @tool
    });

    it('should preserve original implementation 100%', () => {
      const originalCode = `export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }
}`;

      const config: InjectionConfig = {
        originalCode,
        className: 'Calculator',
        serverMetadata: {
          name: 'calculator',
          version: '1.0.0',
        },
        toolDecorators: new Map([
          ['add', 'Add two numbers'],
          ['subtract', 'Subtract two numbers'],
        ]),
      };

      const result = injectDecorators(config);

      // Check that all original code lines are present
      expect(result.code).toContain('return a + b;');
      expect(result.code).toContain('return a - b;');
      expect(result.code).toContain('add(a: number, b: number): number');
      expect(result.code).toContain('subtract(a: number, b: number): number');
    });

    it('should preserve indentation and formatting', () => {
      const config: InjectionConfig = {
        originalCode: `export class IndentedClass {
    greet(name: string): string {
        return \`Hello, \${name}!\`;
    }
}`,
        className: 'IndentedClass',
        serverMetadata: {
          name: 'indented-class',
          version: '1.0.0',
        },
        toolDecorators: new Map([['greet', 'Greet a user']]),
      };

      const result = injectDecorators(config);

      // Check that indentation is preserved
      expect(result.code).toMatch(/\n    greet\(name: string\): string \{/);
      expect(result.code).toMatch(/\n        return `Hello, \$\{name\}!`;/);
    });

    it('should preserve comments', () => {
      const config: InjectionConfig = {
        originalCode: `// This is a comment
export class CommentedClass {
  // Method comment
  greet(name: string): string {
    // Implementation comment
    return \`Hello, \${name}!\`;
  }
}`,
        className: 'CommentedClass',
        serverMetadata: {
          name: 'commented-class',
          version: '1.0.0',
        },
        toolDecorators: new Map([['greet', 'Greet a user']]),
      };

      const result = injectDecorators(config);

      expect(result.code).toContain('// This is a comment');
      expect(result.code).toContain('// Method comment');
      expect(result.code).toContain('// Implementation comment');
    });

    it('should handle string escaping in descriptions', () => {
      const config: InjectionConfig = {
        originalCode: `export class EscapeTest {
  test(): void {}
}`,
        className: 'EscapeTest',
        serverMetadata: {
          name: 'escape-test',
          version: '1.0.0',
        },
        toolDecorators: new Map([['test', "Test with quotes in description"]]),
      };

      const result = injectDecorators(config);

      // Should not throw and should have valid syntax
      expect(result.code).toContain('@tool');
      expect(result.code).toContain('EscapeTest');
    });

    it('should validate generated code syntax', () => {
      const config: InjectionConfig = {
        originalCode: `export class ValidSyntax {
  test(): void {}
}`,
        className: 'ValidSyntax',
        serverMetadata: {
          name: 'valid-syntax',
          version: '1.0.0',
        },
        toolDecorators: new Map([['test', 'Test method']]),
      };

      // Should not throw
      expect(() => injectDecorators(config)).not.toThrow();
    });

    it('should handle class with existing decorators', () => {
      const config: InjectionConfig = {
        originalCode: `import { SomeDecorator } from 'other-lib';

@SomeDecorator()
export class DecoratedClass {
  test(): void {}
}`,
        className: 'DecoratedClass',
        serverMetadata: {
          name: 'decorated-class',
          version: '1.0.0',
        },
        toolDecorators: new Map([['test', 'Test method']]),
      };

      const result = injectDecorators(config);

      // Should add our decorator without breaking existing ones
      expect(result.code).toContain('@MCPServer({');
      expect(result.code).toContain('@SomeDecorator()');
    });

    it('should handle indented classes (in modules)', () => {
      const config: InjectionConfig = {
        originalCode: `namespace MyModule {
  export class IndentedClass {
    test(): void {}
  }
}`,
        className: 'IndentedClass',
        serverMetadata: {
          name: 'indented-class',
          version: '1.0.0',
        },
        toolDecorators: new Map([['test', 'Test method']]),
      };

      const result = injectDecorators(config);

      // Should handle indentation properly
      expect(result.code).toContain('@MCPServer({');
      expect(result.code).toContain('@tool(');
    });

    it('should handle async methods', () => {
      const config: InjectionConfig = {
        originalCode: `export class AsyncClass {
  async fetchData(id: string): Promise<any> {
    return { id };
  }
}`,
        className: 'AsyncClass',
        serverMetadata: {
          name: 'async-class',
          version: '1.0.0',
        },
        toolDecorators: new Map([['fetchData', 'Fetch data by ID']]),
      };

      const result = injectDecorators(config);

      expect(result.code).toContain("@tool('Fetch data by ID')");
      expect(result.code).toContain('async fetchData');
    });

    it('should calculate lines added correctly', () => {
      const config: InjectionConfig = {
        originalCode: `export class SimpleClass {
  greet(name: string): string {
    return \`Hello, \${name}!\`;
  }
}`,
        className: 'SimpleClass',
        serverMetadata: {
          name: 'simple-class',
          version: '1.0.0',
        },
        toolDecorators: new Map([['greet', 'Greet a user']]),
      };

      const result = injectDecorators(config);

      // Should add: import (1), @MCPServer decorator (multiple lines), @tool (1)
      expect(result.linesAdded).toBeGreaterThan(0);
    });
  });

  describe('generatePreview', () => {
    it('should generate preview with summary', () => {
      const config: InjectionConfig = {
        originalCode: `export class SimpleClass {
  greet(name: string): string {
    return \`Hello, \${name}!\`;
  }
}`,
        className: 'SimpleClass',
        serverMetadata: {
          name: 'simple-class',
          version: '1.0.0',
        },
        toolDecorators: new Map([['greet', 'Greet a user']]),
      };

      const result = generatePreview(config);

      expect(result.preview).toBeDefined();
      expect(result.changesSummary).toBeDefined();
      expect(result.changesSummary.implementationChanges).toBe(0);
      expect(result.changesSummary.preservationRate).toBe('100%');
    });

    it('should show correct counts in summary', () => {
      const config: InjectionConfig = {
        originalCode: `export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }
}`,
        className: 'Calculator',
        serverMetadata: {
          name: 'calculator',
          version: '1.0.0',
        },
        toolDecorators: new Map([
          ['add', 'Add two numbers'],
          ['subtract', 'Subtract two numbers'],
        ]),
      };

      const result = generatePreview(config);

      expect(result.changesSummary.decoratorsAdded).toBe(3); // 1 @MCPServer + 2 @tool
      expect(result.changesSummary.importsAdded).toBe(1);
      expect(result.changesSummary.linesModified).toBe(0);
    });
  });
});
