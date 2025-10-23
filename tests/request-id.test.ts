/**
 * Unit tests for Request ID generation
 *
 * Tests UUID v4 generation, uniqueness, format, and performance
 */

import { describe, it, expect } from '@jest/globals';
import { generateRequestId } from '../src/core/index.js';

describe('Request ID Generation', () => {
  describe('generateRequestId', () => {
    it('generates a valid UUID v4 string', () => {
      const requestId = generateRequestId();

      expect(typeof requestId).toBe('string');
      expect(requestId.length).toBe(36); // UUID format: 8-4-4-4-12
    });

    it('matches UUID v4 format pattern', () => {
      const requestId = generateRequestId();
      const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(requestId).toMatch(uuidV4Pattern);
    });

    it('generates unique IDs', () => {
      const ids = new Set<string>();
      const count = 100;

      for (let i = 0; i < count; i++) {
        ids.add(generateRequestId());
      }

      expect(ids.size).toBe(count); // All 100 IDs should be unique
    });

    it('generates different IDs on consecutive calls', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      const id3 = generateRequestId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('generates IDs quickly (performance test)', () => {
      const start = Date.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        generateRequestId();
      }

      const duration = Date.now() - start;

      // 1000 IDs should be generated in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    it('includes version indicator (4) in correct position', () => {
      const requestId = generateRequestId();
      const parts = requestId.split('-');

      // UUID v4 has '4' at the start of the 3rd group
      expect(parts[2][0]).toBe('4');
    });

    it('includes variant indicator in correct position', () => {
      const requestId = generateRequestId();
      const parts = requestId.split('-');

      // UUID v4 variant bits are 10xx in binary, which means
      // the first character of the 4th group should be 8, 9, a, or b
      const variantChar = parts[3][0].toLowerCase();
      expect(['8', '9', 'a', 'b']).toContain(variantChar);
    });

    it('generates valid IDs under high concurrency (stress test)', () => {
      const ids = new Set<string>();
      const promises: Promise<void>[] = [];
      const count = 100;

      for (let i = 0; i < count; i++) {
        promises.push(
          Promise.resolve().then(() => {
            ids.add(generateRequestId());
          })
        );
      }

      return Promise.all(promises).then(() => {
        expect(ids.size).toBe(count);
      });
    });

    it('maintains format consistency across multiple generations', () => {
      const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      for (let i = 0; i < 50; i++) {
        const requestId = generateRequestId();
        expect(requestId).toMatch(uuidV4Pattern);
      }
    });
  });

  describe('UUID Format Validation', () => {
    it('contains exactly 4 hyphens', () => {
      const requestId = generateRequestId();
      const hyphens = (requestId.match(/-/g) || []).length;

      expect(hyphens).toBe(4);
    });

    it('has correct segment lengths', () => {
      const requestId = generateRequestId();
      const segments = requestId.split('-');

      expect(segments).toHaveLength(5);
      expect(segments[0]).toHaveLength(8);
      expect(segments[1]).toHaveLength(4);
      expect(segments[2]).toHaveLength(4);
      expect(segments[3]).toHaveLength(4);
      expect(segments[4]).toHaveLength(12);
    });

    it('uses only valid hexadecimal characters', () => {
      const requestId = generateRequestId();
      const withoutHyphens = requestId.replace(/-/g, '');
      const hexPattern = /^[0-9a-f]+$/i;

      expect(withoutHyphens).toMatch(hexPattern);
    });
  });

  describe('Collision Probability', () => {
    it('generates unique IDs in large batches', () => {
      const ids = new Set<string>();
      const largeCount = 10000;

      for (let i = 0; i < largeCount; i++) {
        ids.add(generateRequestId());
      }

      // With UUID v4, collision probability is astronomically low
      // All 10,000 IDs should be unique
      expect(ids.size).toBe(largeCount);
    });
  });
});
