/**
 * Remote DOM Protocol Validation Tests
 *
 * Tests the validateOperation function that provides security validation
 * for Remote DOM operations sent from Web Worker to host.
 *
 * This is critical security code that must:
 * 1. Reject malformed messages
 * 2. Only allow whitelisted operation types
 * 3. Validate operation structure
 * 4. Prevent injection attacks
 *
 * Coverage:
 * - Message structure validation
 * - Operation type whitelisting
 * - Security: malicious payload rejection
 * - Edge cases (null, undefined, invalid types)
 * - Error handling
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateOperation,
  type DOMOperation,
  type CreateElementOp,
  type SetAttributeOp,
  type AppendChildOp,
  type RemoveChildOp,
  type SetTextContentOp,
  type AddEventListenerOp,
  type CallHostOp,
} from '../../../src/client/remote-dom/protocol.js';

describe('Remote DOM Protocol Validation', () => {
  describe('Message Structure Validation', () => {
    it('should accept valid message with correct structure', () => {
      const validOp: CreateElementOp = {
        type: 'createElement',
        id: 'elem-1',
        tagName: 'div',
        props: {},
      };

      expect(validateOperation(validOp)).toBe(true);
    });

    it('should reject null messages', () => {
      expect(validateOperation(null)).toBe(false);
    });

    it('should reject undefined messages', () => {
      expect(validateOperation(undefined)).toBe(false);
    });

    it('should reject non-object messages (string)', () => {
      expect(validateOperation('createElement')).toBe(false);
    });

    it('should reject non-object messages (number)', () => {
      expect(validateOperation(42)).toBe(false);
    });

    it('should reject non-object messages (array)', () => {
      expect(validateOperation([])).toBe(false);
    });

    it('should reject messages without type field', () => {
      const noType = {
        id: 'elem-1',
        tagName: 'div',
      };

      expect(validateOperation(noType)).toBe(false);
    });

    it('should reject messages with non-string type', () => {
      const numericType = {
        type: 123,
        id: 'elem-1',
      };

      expect(validateOperation(numericType)).toBe(false);
    });

    it('should accept messages with extra fields (forward compatibility)', () => {
      const extraFields = {
        type: 'createElement',
        id: 'elem-1',
        tagName: 'div',
        props: {},
        futureField: 'ignored',
        anotherField: 123,
      };

      expect(validateOperation(extraFields)).toBe(true);
    });
  });

  describe('Operation Type Whitelisting', () => {
    it('should accept createElement operation', () => {
      const op: CreateElementOp = {
        type: 'createElement',
        id: 'elem-1',
        tagName: 'div',
      };

      expect(validateOperation(op)).toBe(true);
    });

    it('should accept setAttribute operation', () => {
      const op: SetAttributeOp = {
        type: 'setAttribute',
        elementId: 'elem-1',
        name: 'className',
        value: 'button',
      };

      expect(validateOperation(op)).toBe(true);
    });

    it('should accept appendChild operation', () => {
      const op: AppendChildOp = {
        type: 'appendChild',
        parentId: 'parent-1',
        childId: 'child-1',
      };

      expect(validateOperation(op)).toBe(true);
    });

    it('should accept removeChild operation', () => {
      const op: RemoveChildOp = {
        type: 'removeChild',
        parentId: 'parent-1',
        childId: 'child-1',
      };

      expect(validateOperation(op)).toBe(true);
    });

    it('should accept setTextContent operation', () => {
      const op: SetTextContentOp = {
        type: 'setTextContent',
        elementId: 'elem-1',
        text: 'Hello World',
      };

      expect(validateOperation(op)).toBe(true);
    });

    it('should accept addEventListener operation', () => {
      const op: AddEventListenerOp = {
        type: 'addEventListener',
        elementId: 'elem-1',
        event: 'click',
        handlerId: 'handler-1',
      };

      expect(validateOperation(op)).toBe(true);
    });

    it('should accept callHost operation', () => {
      const op: CallHostOp = {
        type: 'callHost',
        action: 'tool',
        payload: { tool: 'test', args: {} },
      };

      expect(validateOperation(op)).toBe(true);
    });

    it('should reject non-whitelisted operation types', () => {
      const maliciousOp = {
        type: 'executeScript',
        script: 'alert("XSS")',
      };

      expect(validateOperation(maliciousOp)).toBe(false);
    });

    it('should reject operation with typo in type', () => {
      const typoOp = {
        type: 'createelement', // lowercase
        id: 'elem-1',
        tagName: 'div',
      };

      expect(validateOperation(typoOp)).toBe(false);
    });

    it('should reject empty string type', () => {
      const emptyType = {
        type: '',
        id: 'elem-1',
      };

      expect(validateOperation(emptyType)).toBe(false);
    });
  });

  describe('Security: Malicious Operation Detection', () => {
    it('should reject operation attempting to execute arbitrary code', () => {
      const malicious = {
        type: 'eval',
        code: 'window.location = "https://evil.com"',
      };

      expect(validateOperation(malicious)).toBe(false);
    });

    it('should reject operation attempting DOM manipulation outside protocol', () => {
      const malicious = {
        type: 'dangerouslySetInnerHTML',
        html: '<script>alert("XSS")</script>',
      };

      expect(validateOperation(malicious)).toBe(false);
    });

    it('should reject operation attempting to access __proto__', () => {
      const protoPoison = {
        type: '__proto__',
        value: 'polluted',
      };

      expect(validateOperation(protoPoison)).toBe(false);
    });

    it('should reject operation attempting to access constructor', () => {
      const constructorAttack = {
        type: 'constructor',
        value: 'malicious',
      };

      expect(validateOperation(constructorAttack)).toBe(false);
    });

    it('should accept createElement with potentially dangerous but valid props', () => {
      // Props validation happens at a different layer
      // Protocol validation only checks operation type
      const op: CreateElementOp = {
        type: 'createElement',
        id: 'elem-1',
        tagName: 'script',
        props: {
          src: 'https://evil.com/malicious.js',
        },
      };

      // This passes protocol validation (type is whitelisted)
      // Component library validation should reject 'script' tagName
      expect(validateOperation(op)).toBe(true);
    });

    it('should accept callHost with malicious payload structure', () => {
      // Payload validation happens at a different layer
      // Protocol validation only checks operation type and action whitelist
      const op: CallHostOp = {
        type: 'callHost',
        action: 'tool',
        payload: {
          __proto__: { polluted: true },
          tool: 'test',
        },
      };

      // This passes protocol validation
      // Host receiver should sanitize payload
      expect(validateOperation(op)).toBe(true);
    });
  });

  describe('Operation Type-Specific Validation', () => {
    describe('createElement operations', () => {
      it('should validate createElement with all fields', () => {
        const op: CreateElementOp = {
          type: 'createElement',
          id: 'elem-123',
          tagName: 'button',
          props: {
            className: 'primary',
            disabled: false,
            onClick: 'handler-1',
          },
        };

        expect(validateOperation(op)).toBe(true);
      });

      it('should validate createElement without optional props', () => {
        const op: CreateElementOp = {
          type: 'createElement',
          id: 'elem-123',
          tagName: 'div',
        };

        expect(validateOperation(op)).toBe(true);
      });

      it('should validate createElement with empty props', () => {
        const op: CreateElementOp = {
          type: 'createElement',
          id: 'elem-123',
          tagName: 'div',
          props: {},
        };

        expect(validateOperation(op)).toBe(true);
      });
    });

    describe('setAttribute operations', () => {
      it('should validate setAttribute with string value', () => {
        const op: SetAttributeOp = {
          type: 'setAttribute',
          elementId: 'elem-1',
          name: 'className',
          value: 'primary-button',
        };

        expect(validateOperation(op)).toBe(true);
      });

      it('should validate setAttribute with boolean value', () => {
        const op: SetAttributeOp = {
          type: 'setAttribute',
          elementId: 'elem-1',
          name: 'disabled',
          value: true,
        };

        expect(validateOperation(op)).toBe(true);
      });

      it('should validate setAttribute with null value', () => {
        const op: SetAttributeOp = {
          type: 'setAttribute',
          elementId: 'elem-1',
          name: 'value',
          value: null,
        };

        expect(validateOperation(op)).toBe(true);
      });

      it('should validate setAttribute with object value', () => {
        const op: SetAttributeOp = {
          type: 'setAttribute',
          elementId: 'elem-1',
          name: 'style',
          value: { color: 'red', fontSize: '16px' },
        };

        expect(validateOperation(op)).toBe(true);
      });
    });

    describe('appendChild/removeChild operations', () => {
      it('should validate appendChild with valid IDs', () => {
        const op: AppendChildOp = {
          type: 'appendChild',
          parentId: 'parent-123',
          childId: 'child-456',
        };

        expect(validateOperation(op)).toBe(true);
      });

      it('should validate removeChild with valid IDs', () => {
        const op: RemoveChildOp = {
          type: 'removeChild',
          parentId: 'parent-123',
          childId: 'child-456',
        };

        expect(validateOperation(op)).toBe(true);
      });
    });

    describe('setTextContent operations', () => {
      it('should validate setTextContent with normal text', () => {
        const op: SetTextContentOp = {
          type: 'setTextContent',
          elementId: 'elem-1',
          text: 'Hello, World!',
        };

        expect(validateOperation(op)).toBe(true);
      });

      it('should validate setTextContent with empty string', () => {
        const op: SetTextContentOp = {
          type: 'setTextContent',
          elementId: 'elem-1',
          text: '',
        };

        expect(validateOperation(op)).toBe(true);
      });

      it('should validate setTextContent with special characters', () => {
        const op: SetTextContentOp = {
          type: 'setTextContent',
          elementId: 'elem-1',
          text: '<script>alert("XSS")</script>',
        };

        // Protocol accepts any string - React will safely render it as text
        expect(validateOperation(op)).toBe(true);
      });
    });

    describe('addEventListener operations', () => {
      it('should validate addEventListener with standard event', () => {
        const op: AddEventListenerOp = {
          type: 'addEventListener',
          elementId: 'elem-1',
          event: 'click',
          handlerId: 'handler-click-1',
        };

        expect(validateOperation(op)).toBe(true);
      });

      it('should validate addEventListener with custom event', () => {
        const op: AddEventListenerOp = {
          type: 'addEventListener',
          elementId: 'elem-1',
          event: 'customEvent',
          handlerId: 'handler-custom-1',
        };

        expect(validateOperation(op)).toBe(true);
      });
    });

    describe('callHost operations', () => {
      it('should validate callHost with tool action', () => {
        const op: CallHostOp = {
          type: 'callHost',
          action: 'tool',
          payload: {
            name: 'readFile',
            arguments: { path: '/data.json' },
          },
        };

        expect(validateOperation(op)).toBe(true);
      });

      it('should validate callHost with link action', () => {
        const op: CallHostOp = {
          type: 'callHost',
          action: 'link',
          payload: {
            url: 'https://example.com',
          },
        };

        expect(validateOperation(op)).toBe(true);
      });

      it('should validate callHost with notify action', () => {
        const op: CallHostOp = {
          type: 'callHost',
          action: 'notify',
          payload: {
            message: 'Operation completed',
            level: 'info',
          },
        };

        expect(validateOperation(op)).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should reject empty object', () => {
      expect(validateOperation({})).toBe(false);
    });

    it('should reject object with only type field but invalid type', () => {
      expect(validateOperation({ type: 'invalid' })).toBe(false);
    });

    it('should handle operations with circular references (postMessage will serialize)', () => {
      // In practice, postMessage will fail on circular refs
      // But validateOperation should handle gracefully
      const circular: any = {
        type: 'createElement',
        id: 'elem-1',
        tagName: 'div',
      };
      circular.self = circular;

      // Should not throw, should validate the type
      expect(() => validateOperation(circular)).not.toThrow();
      expect(validateOperation(circular)).toBe(true);
    });

    it('should handle very long type strings', () => {
      const longType = {
        type: 'a'.repeat(10000),
        id: 'elem-1',
      };

      expect(validateOperation(longType)).toBe(false);
    });

    it('should handle operations with undefined fields', () => {
      const withUndefined: any = {
        type: 'createElement',
        id: 'elem-1',
        tagName: 'div',
        props: undefined,
      };

      expect(validateOperation(withUndefined)).toBe(true);
    });

    it('should handle operations with null fields', () => {
      const withNull: any = {
        type: 'setAttribute',
        elementId: 'elem-1',
        name: 'value',
        value: null,
      };

      expect(validateOperation(withNull)).toBe(true);
    });

    it('should handle operations with Symbol type (edge case)', () => {
      const withSymbol = {
        type: Symbol('createElement') as any,
        id: 'elem-1',
      };

      expect(validateOperation(withSymbol)).toBe(false);
    });
  });

  describe('Type Guard Behavior', () => {
    it('should narrow type when validation passes', () => {
      const op: any = {
        type: 'createElement',
        id: 'elem-1',
        tagName: 'div',
      };

      if (validateOperation(op)) {
        // TypeScript should narrow op to DOMOperation
        const domOp: DOMOperation = op;
        expect(domOp.type).toBe('createElement');
      }
    });

    it('should work as type guard in filter operations', () => {
      const operations: any[] = [
        { type: 'createElement', id: 'elem-1', tagName: 'div' },
        { type: 'invalid', id: 'elem-2' },
        { type: 'appendChild', parentId: 'p1', childId: 'c1' },
        null,
        undefined,
        { type: 'setTextContent', elementId: 'elem-1', text: 'Hi' },
      ];

      const validOps = operations.filter(validateOperation);

      expect(validOps).toHaveLength(3);
      expect(validOps[0].type).toBe('createElement');
      expect(validOps[1].type).toBe('appendChild');
      expect(validOps[2].type).toBe('setTextContent');
    });
  });

  describe('Real-World Scenarios', () => {
    it('should validate a sequence of operations for building a button', () => {
      const operations: DOMOperation[] = [
        {
          type: 'createElement',
          id: 'button-1',
          tagName: 'button',
          props: { className: 'primary' },
        },
        {
          type: 'setTextContent',
          elementId: 'button-1',
          text: 'Click me',
        },
        {
          type: 'addEventListener',
          elementId: 'button-1',
          event: 'click',
          handlerId: 'handler-1',
        },
        {
          type: 'appendChild',
          parentId: 'root',
          childId: 'button-1',
        },
      ];

      operations.forEach(op => {
        expect(validateOperation(op)).toBe(true);
      });
    });

    it('should validate complex UI construction', () => {
      const operations: DOMOperation[] = [
        {
          type: 'createElement',
          id: 'container',
          tagName: 'div',
          props: { className: 'container' },
        },
        {
          type: 'createElement',
          id: 'header',
          tagName: 'h1',
        },
        {
          type: 'setTextContent',
          elementId: 'header',
          text: 'Dashboard',
        },
        {
          type: 'appendChild',
          parentId: 'container',
          childId: 'header',
        },
        {
          type: 'createElement',
          id: 'input',
          tagName: 'input',
          props: { type: 'text', placeholder: 'Enter name' },
        },
        {
          type: 'appendChild',
          parentId: 'container',
          childId: 'input',
        },
        {
          type: 'addEventListener',
          elementId: 'input',
          event: 'change',
          handlerId: 'input-change',
        },
        {
          type: 'appendChild',
          parentId: 'root',
          childId: 'container',
        },
      ];

      operations.forEach(op => {
        expect(validateOperation(op)).toBe(true);
      });
    });

    it('should reject operation sequence containing one invalid operation', () => {
      const operations: any[] = [
        {
          type: 'createElement',
          id: 'div-1',
          tagName: 'div',
        },
        {
          type: 'executeScript', // INVALID
          script: 'alert(1)',
        },
        {
          type: 'appendChild',
          parentId: 'root',
          childId: 'div-1',
        },
      ];

      const results = operations.map(validateOperation);
      expect(results).toEqual([true, false, true]);
    });

    it('should validate callHost operations for MCP interactions', () => {
      const toolCallOp: CallHostOp = {
        type: 'callHost',
        action: 'tool',
        payload: {
          name: 'database_query',
          arguments: {
            query: 'SELECT * FROM users WHERE id = ?',
            params: [123],
          },
        },
      };

      const notifyOp: CallHostOp = {
        type: 'callHost',
        action: 'notify',
        payload: {
          level: 'info',
          message: 'Query executed successfully',
        },
      };

      const linkOp: CallHostOp = {
        type: 'callHost',
        action: 'link',
        payload: {
          url: '/dashboard',
          target: '_self',
        },
      };

      expect(validateOperation(toolCallOp)).toBe(true);
      expect(validateOperation(notifyOp)).toBe(true);
      expect(validateOperation(linkOp)).toBe(true);
    });
  });
});
