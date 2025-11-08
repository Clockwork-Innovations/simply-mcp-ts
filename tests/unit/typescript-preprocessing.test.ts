/**
 * Unit tests for TypeScript preprocessing
 * Tests the preprocessing of TypeScript source code to handle edge cases
 */

import { describe, it, expect } from '@jest/globals';

/**
 * Preprocess TypeScript source code to handle edge cases
 * Strips 'as const' from type positions in interfaces (invalid syntax but commonly attempted)
 */
function preprocessTypeScript(sourceCode: string): string {
  // Strip 'as const' from type positions within interfaces/types
  // Pattern: matches type definitions like "prop: Type as const;" or "prop: [...] as const;"
  // This is invalid TypeScript syntax but users may write it accidentally
  return sourceCode.replace(
    /(\s+\w+\s*:\s*(?:readonly\s+)?(?:\[[\w\s,.\[\]]+\]|[\w.<>|&()\s]+))\s+as\s+const\s*;/g,
    '$1;'
  );
}

describe('TypeScript Preprocessing', () => {
  describe('preprocessTypeScript', () => {
    it('should strip as const from enum type in interface', () => {
      const input = `
interface TestTool extends ITool {
  name: 'test';
  arguments: {
    status: Status as const;
  };
}`;

      const expected = `
interface TestTool extends ITool {
  name: 'test';
  arguments: {
    status: Status;
  };
}`;

      expect(preprocessTypeScript(input)).toBe(expected);
    });

    it('should strip as const from array type in interface', () => {
      const input = `
interface TestTool extends ITool {
  values: readonly [Type.A, Type.B] as const;
}`;

      const expected = `
interface TestTool extends ITool {
  values: readonly [Type.A, Type.B];
}`;

      expect(preprocessTypeScript(input)).toBe(expected);
    });

    it('should strip as const from complex array type', () => {
      const input = `
interface TestInterface {
  data: readonly [Status.ACTIVE, Status.INACTIVE, Status.PENDING] as const;
}`;

      const expected = `
interface TestInterface {
  data: readonly [Status.ACTIVE, Status.INACTIVE, Status.PENDING];
}`;

      expect(preprocessTypeScript(input)).toBe(expected);
    });

    it('should NOT strip as const from valid const declarations', () => {
      const input = `const values = [1, 2, 3] as const;`;
      expect(preprocessTypeScript(input)).toBe(input);
    });

    it('should NOT strip as const from object literals', () => {
      const input = `const config = { key: 'value' } as const;`;
      expect(preprocessTypeScript(input)).toBe(input);
    });

    it('should NOT strip as const from function return values', () => {
      const input = `
function getValues() {
  return [1, 2, 3] as const;
}`;
      expect(preprocessTypeScript(input)).toBe(input);
    });

    it('should handle multiple as const in interface properties', () => {
      const input = `
interface TestInterface {
  status1: Status as const;
  status2: AnotherStatus as const;
  values: readonly [Type.A] as const;
}`;

      const expected = `
interface TestInterface {
  status1: Status;
  status2: AnotherStatus;
  values: readonly [Type.A];
}`;

      expect(preprocessTypeScript(input)).toBe(expected);
    });

    it('should preserve valid TypeScript syntax', () => {
      const input = `
interface TestInterface {
  name: string;
  age: number;
  status: Status;
  values: readonly [Type.A, Type.B];
}

const data = { key: 'value' } as const;
const array = [1, 2, 3] as const;
`;

      expect(preprocessTypeScript(input)).toBe(input);
    });

    it('should handle union types with as const', () => {
      const input = `
interface TestInterface {
  value: string | number as const;
}`;

      const expected = `
interface TestInterface {
  value: string | number;
}`;

      expect(preprocessTypeScript(input)).toBe(expected);
    });

    it('should handle generic types with as const', () => {
      const input = `
interface TestInterface {
  data: Array<Status> as const;
}`;

      const expected = `
interface TestInterface {
  data: Array<Status>;
}`;

      expect(preprocessTypeScript(input)).toBe(expected);
    });
  });
});
