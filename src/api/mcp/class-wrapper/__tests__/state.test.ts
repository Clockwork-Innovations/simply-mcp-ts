/**
 * Comprehensive tests for state management
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ClassWrapperStateManager } from '../state.js';
import type { ClassWrapperState } from '../state.js';

describe('State Management', () => {
  let stateManager: ClassWrapperStateManager;

  beforeEach(() => {
    stateManager = new ClassWrapperStateManager();
  });

  describe('ClassWrapperStateManager', () => {
    it('should initialize wizard state', () => {
      const state = stateManager.createState();

      expect(state).toBeDefined();
      expect(state.currentStep).toBe('init');
      expect(state.toolDecorators).toBeInstanceOf(Map);
      expect(state.toolDecorators.size).toBe(0);
      expect(state.createdAt).toBeDefined();
      expect(state.lastUpdated).toBeDefined();
    });

    it('should create state with session ID', () => {
      const sessionId = 'test-session-123';
      const state = stateManager.createState(sessionId);

      expect(state.sessionId).toBe(sessionId);
    });

    it('should update state through workflow', () => {
      const state = stateManager.createState();

      // Initial state
      expect(state.currentStep).toBe('init');

      // Update to file_loaded
      state.currentStep = 'file_loaded';
      state.filePath = '/path/to/file.ts';
      stateManager.updateState(state);

      const retrieved = stateManager.getState();
      expect(retrieved?.currentStep).toBe('file_loaded');
      expect(retrieved?.filePath).toBe('/path/to/file.ts');

      // Update to metadata_confirmed
      state.currentStep = 'metadata_confirmed';
      state.confirmedMetadata = {
        name: 'test-server',
        version: '1.0.0',
      };
      stateManager.updateState(state);

      const retrieved2 = stateManager.getState();
      expect(retrieved2?.currentStep).toBe('metadata_confirmed');
      expect(retrieved2?.confirmedMetadata?.name).toBe('test-server');
    });

    it('should support session isolation (multiple sessions)', () => {
      const session1 = 'session-1';
      const session2 = 'session-2';

      const state1 = stateManager.createState(session1);
      const state2 = stateManager.createState(session2);

      state1.currentStep = 'file_loaded';
      state1.filePath = '/path/to/file1.ts';
      stateManager.updateState(state1, session1);

      state2.currentStep = 'metadata_confirmed';
      state2.filePath = '/path/to/file2.ts';
      stateManager.updateState(state2, session2);

      const retrieved1 = stateManager.getState(session1);
      const retrieved2 = stateManager.getState(session2);

      expect(retrieved1?.currentStep).toBe('file_loaded');
      expect(retrieved1?.filePath).toBe('/path/to/file1.ts');
      expect(retrieved2?.currentStep).toBe('metadata_confirmed');
      expect(retrieved2?.filePath).toBe('/path/to/file2.ts');
    });

    it('should maintain state persistence across tool calls', () => {
      const state = stateManager.createState();

      // Simulate multiple tool calls
      state.currentStep = 'file_loaded';
      stateManager.updateState(state);

      state.currentStep = 'metadata_confirmed';
      stateManager.updateState(state);

      state.currentStep = 'decorating';
      state.toolDecorators.set('method1', 'Description 1');
      stateManager.updateState(state);

      state.toolDecorators.set('method2', 'Description 2');
      stateManager.updateState(state);

      const retrieved = stateManager.getState();
      expect(retrieved?.currentStep).toBe('decorating');
      expect(retrieved?.toolDecorators.size).toBe(2);
      expect(retrieved?.toolDecorators.get('method1')).toBe('Description 1');
      expect(retrieved?.toolDecorators.get('method2')).toBe('Description 2');
    });

    it('should handle invalid state transitions gracefully', () => {
      const state = stateManager.createState();

      // Can jump to any step (no enforcement in state manager itself)
      state.currentStep = 'complete';
      stateManager.updateState(state);

      const retrieved = stateManager.getState();
      expect(retrieved?.currentStep).toBe('complete');

      // Jump back
      state.currentStep = 'init';
      stateManager.updateState(state);

      const retrieved2 = stateManager.getState();
      expect(retrieved2?.currentStep).toBe('init');
    });

    it('should clear state on completion', () => {
      const state = stateManager.createState();

      state.currentStep = 'complete';
      stateManager.updateState(state);

      // Delete state
      stateManager.deleteState();

      const retrieved = stateManager.getState();
      expect(retrieved).toBeUndefined();
    });

    it('should track lastUpdated timestamp', () => {
      const state = stateManager.createState();
      const initialTimestamp = state.lastUpdated;

      // Wait a bit
      setTimeout(() => {}, 10);

      state.currentStep = 'file_loaded';
      stateManager.updateState(state);

      const retrieved = stateManager.getState();
      expect(retrieved?.lastUpdated).toBeGreaterThanOrEqual(initialTimestamp);
    });

    it('should get active sessions', () => {
      const session1 = 'session-1';
      const session2 = 'session-2';
      const session3 = 'session-3';

      stateManager.createState(session1);
      stateManager.createState(session2);
      stateManager.createState(session3);

      const activeSessions = stateManager.getActiveSessions();
      expect(activeSessions).toHaveLength(3);
      expect(activeSessions).toContain(session1);
      expect(activeSessions).toContain(session2);
      expect(activeSessions).toContain(session3);
    });

    it('should handle STDIO (no session) state', () => {
      const state = stateManager.createState(); // No session ID

      state.currentStep = 'file_loaded';
      stateManager.updateState(state);

      const retrieved = stateManager.getState(); // No session ID
      expect(retrieved?.currentStep).toBe('file_loaded');
      expect(retrieved?.sessionId).toBeUndefined();
    });

    it('should delete specific session state', () => {
      const session1 = 'session-1';
      const session2 = 'session-2';

      stateManager.createState(session1);
      stateManager.createState(session2);

      stateManager.deleteState(session1);

      expect(stateManager.getState(session1)).toBeUndefined();
      expect(stateManager.getState(session2)).toBeDefined();
    });

    it('should handle toolDecorators Map correctly', () => {
      const state = stateManager.createState();

      state.toolDecorators.set('method1', 'Description 1');
      state.toolDecorators.set('method2', 'Description 2');
      state.toolDecorators.set('method3', 'Description 3');
      stateManager.updateState(state);

      const retrieved = stateManager.getState();
      expect(retrieved?.toolDecorators.size).toBe(3);
      expect(Array.from(retrieved!.toolDecorators.keys())).toEqual(['method1', 'method2', 'method3']);
    });
  });
});
