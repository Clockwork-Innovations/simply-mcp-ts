/**
 * Tests for UI Types Helper Functions
 *
 * Tests for helper functions that extract metadata from UI resources.
 */

import { describe, it, expect } from '@jest/globals';
import {
  getPreferredFrameSize,
  getInitialRenderData,
} from '../ui-types.js';

describe('UI Types Helpers', () => {
  describe('getPreferredFrameSize', () => {
    it('should extract frame size from metadata', () => {
      const meta = {
        'mcpui.dev/ui-preferred-frame-size': {
          width: 800,
          height: 600,
        },
      };

      expect(getPreferredFrameSize(meta)).toEqual({
        width: 800,
        height: 600,
      });
    });

    it('should return null if metadata is undefined', () => {
      expect(getPreferredFrameSize(undefined)).toBeNull();
    });

    it('should return null if metadata is missing frame size', () => {
      const meta = {
        'some-other-key': 'value',
      };

      expect(getPreferredFrameSize(meta)).toBeNull();
    });

    it('should return null if frame size is not an object', () => {
      const meta = {
        'mcpui.dev/ui-preferred-frame-size': 'invalid',
      };

      expect(getPreferredFrameSize(meta)).toBeNull();
    });

    it('should handle partial frame size (width only)', () => {
      const meta = {
        'mcpui.dev/ui-preferred-frame-size': {
          width: 800,
        },
      };

      expect(getPreferredFrameSize(meta)).toEqual({
        width: 800,
      });
    });

    it('should handle partial frame size (height only)', () => {
      const meta = {
        'mcpui.dev/ui-preferred-frame-size': {
          height: 600,
        },
      };

      expect(getPreferredFrameSize(meta)).toEqual({
        height: 600,
      });
    });
  });

  describe('getInitialRenderData', () => {
    it('should extract initial render data from metadata', () => {
      const meta = {
        'mcpui.dev/ui-initial-render-data': {
          userId: '123',
          userName: 'Alice',
          settings: {
            theme: 'dark',
          },
        },
      };

      expect(getInitialRenderData(meta)).toEqual({
        userId: '123',
        userName: 'Alice',
        settings: {
          theme: 'dark',
        },
      });
    });

    it('should return null if metadata is undefined', () => {
      expect(getInitialRenderData(undefined)).toBeNull();
    });

    it('should return null if metadata is missing initial data', () => {
      const meta = {
        'some-other-key': 'value',
      };

      expect(getInitialRenderData(meta)).toBeNull();
    });

    it('should return null if initial data is not an object', () => {
      const meta = {
        'mcpui.dev/ui-initial-render-data': 'invalid',
      };

      expect(getInitialRenderData(meta)).toBeNull();
    });

    it('should handle empty initial data object', () => {
      const meta = {
        'mcpui.dev/ui-initial-render-data': {},
      };

      expect(getInitialRenderData(meta)).toEqual({});
    });

    it('should preserve nested structures', () => {
      const meta = {
        'mcpui.dev/ui-initial-render-data': {
          level1: {
            level2: {
              level3: 'value',
            },
          },
        },
      };

      expect(getInitialRenderData(meta)).toEqual({
        level1: {
          level2: {
            level3: 'value',
          },
        },
      });
    });

    it('should handle arrays in initial data', () => {
      const meta = {
        'mcpui.dev/ui-initial-render-data': {
          items: [1, 2, 3],
          users: ['Alice', 'Bob'],
        },
      };

      expect(getInitialRenderData(meta)).toEqual({
        items: [1, 2, 3],
        users: ['Alice', 'Bob'],
      });
    });
  });
});
