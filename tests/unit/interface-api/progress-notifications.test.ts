/**
 * Progress Notifications with Message Field Test
 *
 * Tests progress notification functionality with message field support:
 * - reportProgress() API with message parameter
 * - Message field transmission to clients
 * - Backward compatibility (without message)
 * - Edge cases (long messages, special characters, unicode)
 * - Notification serialization and transmission
 * - Integration with BuildMCPServer
 *
 * Target: Comprehensive coverage of progress notification message feature
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BuildMCPServer } from '../../../src/server/builder-server.js';
import { z } from 'zod';

// Type for progress notification structure
interface ProgressNotification {
  method: string;
  params: {
    progressToken: string | number;
    progress: number;
    total?: number;
    message?: string;
  };
}

describe('Progress Notifications with Message Field', () => {
  let server: BuildMCPServer;
  let mockNotification: jest.Mock<(notification: ProgressNotification) => void>;

  beforeEach(() => {
    // Create a new server instance for each test
    server = new BuildMCPServer({
      name: 'progress-test-server',
      version: '1.0.0',
      description: 'Test server for progress notifications',
    });

    // Mock the server's notification mechanism
    mockNotification = jest.fn();

    // Access private server property and mock notification
    (server as any).server = {
      notification: mockNotification,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Message Field Support', () => {
    it('should include message in progress notification when provided', async () => {
      const progressToken = 'test-token-123';
      const progress = 50;
      const total = 100;
      const message = 'Processing items...';

      // Add a tool that reports progress with message
      server.addTool({
        name: 'process_items',
        description: 'Process items with progress',
        parameters: z.object({ count: z.number() }),
        execute: async (args, context) => {
          if (context?.reportProgress) {
            await context.reportProgress(progress, total, message);
          }
          return 'done';
        },
      });

      // Call sendProgressNotification directly
      (server as any).sendProgressNotification(progressToken, progress, total, message);

      // Verify notification was called
      expect(mockNotification).toHaveBeenCalledTimes(1);

      // Verify the notification structure
      const call = mockNotification.mock.calls[0][0] as ProgressNotification;
      expect(call).toEqual({
        method: 'notifications/progress',
        params: {
          progressToken,
          progress,
          total,
          message,
        },
      });

      // Specifically verify message field is present and has correct value
      expect(call.params.message).toBe(message);
    });

    it('should work without message for backward compatibility', async () => {
      const progressToken = 'test-token-456';
      const progress = 75;
      const total = 100;

      // Call without message parameter
      (server as any).sendProgressNotification(progressToken, progress, total);

      expect(mockNotification).toHaveBeenCalledTimes(1);

      const call = mockNotification.mock.calls[0][0] as ProgressNotification;
      expect(call).toEqual({
        method: 'notifications/progress',
        params: {
          progressToken,
          progress,
          total,
          message: undefined,
        },
      });

      // Message should be undefined, not missing
      expect(call.params).toHaveProperty('message');
      expect(call.params.message).toBeUndefined();
    });

    it('should handle empty string message differently from undefined', async () => {
      const progressToken = 'test-token-789';
      const progress = 10;
      const total = 100;

      // Test with empty string
      (server as any).sendProgressNotification(progressToken, progress, total, '');

      expect(mockNotification).toHaveBeenCalledTimes(1);

      const call = mockNotification.mock.calls[0][0] as ProgressNotification;
      expect(call.params.message).toBe('');
      expect(call.params.message).not.toBeUndefined();

      // Empty string is different from undefined
      expect(typeof call.params.message).toBe('string');
    });

    it('should handle null message', async () => {
      const progressToken = 'test-token-null';
      const progress = 25;
      const total = 100;

      // TypeScript allows undefined, but test runtime behavior with null
      (server as any).sendProgressNotification(progressToken, progress, total, null);

      expect(mockNotification).toHaveBeenCalledTimes(1);

      const call = mockNotification.mock.calls[0][0] as ProgressNotification;
      expect(call.params.message).toBeNull();
    });
  });

  describe('Message Transmission', () => {
    it('should transmit message to client without stripping', async () => {
      const progressToken = 'transmission-test';
      const progress = 33;
      const total = 100;
      const message = 'Step 1 of 3: Downloading files';

      (server as any).sendProgressNotification(progressToken, progress, total, message);

      // Verify message survives transmission
      const call = mockNotification.mock.calls[0][0] as ProgressNotification;
      expect(call.params.message).toBe(message);

      // Verify message is in params object
      expect(Object.keys(call.params)).toContain('message');

      // Verify message value is exactly as provided
      expect(call.params.message).toStrictEqual(message);
    });

    it('should not strip message during serialization', async () => {
      const progressToken = 'serialization-test';
      const progress = 66;
      const total = 100;
      const message = 'Almost there!';

      (server as any).sendProgressNotification(progressToken, progress, total, message);

      const notification = mockNotification.mock.calls[0][0] as ProgressNotification;

      // Serialize and deserialize to test round-trip
      const serialized = JSON.stringify(notification);
      const deserialized = JSON.parse(serialized) as ProgressNotification;

      expect(deserialized.params.message).toBe(message);
      expect(deserialized.params.message).not.toBeUndefined();
    });

    it('should preserve message in notification params object', async () => {
      const progressToken = 'params-test';
      const progress = 90;
      const total = 100;
      const message = 'Finalizing...';

      (server as any).sendProgressNotification(progressToken, progress, total, message);

      const call = mockNotification.mock.calls[0][0] as ProgressNotification;

      // Verify params is an object
      expect(typeof call.params).toBe('object');
      expect(call.params).not.toBeNull();

      // Verify all expected fields are present
      expect(call.params).toHaveProperty('progressToken');
      expect(call.params).toHaveProperty('progress');
      expect(call.params).toHaveProperty('total');
      expect(call.params).toHaveProperty('message');

      // Verify message value
      expect(call.params.message).toBe(message);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long messages (1000+ characters)', async () => {
      const progressToken = 'long-message-test';
      const progress = 50;
      const total = 100;

      // Create a message with 1500 characters
      const longMessage = 'A'.repeat(1500);

      (server as any).sendProgressNotification(progressToken, progress, total, longMessage);

      expect(mockNotification).toHaveBeenCalledTimes(1);

      const call = mockNotification.mock.calls[0][0] as ProgressNotification;
      expect(call.params.message).toBe(longMessage);
      expect(call.params.message.length).toBe(1500);
    });

    it('should handle messages with newlines', async () => {
      const progressToken = 'newline-test';
      const progress = 40;
      const total = 100;
      const message = 'Processing:\nStep 1: Download\nStep 2: Extract\nStep 3: Install';

      (server as any).sendProgressNotification(progressToken, progress, total, message);

      const call = mockNotification.mock.calls[0][0] as ProgressNotification;
      expect(call.params.message).toBe(message);
      expect(call.params.message).toContain('\n');
    });

    it('should handle messages with quotes', async () => {
      const progressToken = 'quote-test';
      const progress = 60;
      const total = 100;
      const message = 'Processing "important" file with \'special\' characters';

      (server as any).sendProgressNotification(progressToken, progress, total, message);

      const call = mockNotification.mock.calls[0][0] as ProgressNotification;
      expect(call.params.message).toBe(message);
      expect(call.params.message).toContain('"');
      expect(call.params.message).toContain("'");
    });

    it('should handle messages with tabs', async () => {
      const progressToken = 'tab-test';
      const progress = 70;
      const total = 100;
      const message = 'Column1\tColumn2\tColumn3';

      (server as any).sendProgressNotification(progressToken, progress, total, message);

      const call = mockNotification.mock.calls[0][0] as ProgressNotification;
      expect(call.params.message).toBe(message);
      expect(call.params.message).toContain('\t');
    });

    it('should handle unicode messages with emoji', async () => {
      const progressToken = 'emoji-test';
      const progress = 80;
      const total = 100;
      const message = 'Processing files... 🚀 Almost done! 💯';

      (server as any).sendProgressNotification(progressToken, progress, total, message);

      const call = mockNotification.mock.calls[0][0] as ProgressNotification;
      expect(call.params.message).toBe(message);
      expect(call.params.message).toContain('🚀');
      expect(call.params.message).toContain('💯');
    });

    it('should handle multi-byte unicode characters', async () => {
      const progressToken = 'unicode-test';
      const progress = 85;
      const total = 100;
      const message = '处理中... 日本語 한글 العربية';

      (server as any).sendProgressNotification(progressToken, progress, total, message);

      const call = mockNotification.mock.calls[0][0] as ProgressNotification;
      expect(call.params.message).toBe(message);
    });

    it('should handle messages with backslashes', async () => {
      const progressToken = 'backslash-test';
      const progress = 95;
      const total = 100;
      const message = 'Processing C:\\Users\\test\\file.txt';

      (server as any).sendProgressNotification(progressToken, progress, total, message);

      const call = mockNotification.mock.calls[0][0] as ProgressNotification;
      expect(call.params.message).toBe(message);
      expect(call.params.message).toContain('\\');
    });

    it('should handle messages with JSON-like content', async () => {
      const progressToken = 'json-test';
      const progress = 88;
      const total = 100;
      const message = '{"status": "processing", "items": [1, 2, 3]}';

      (server as any).sendProgressNotification(progressToken, progress, total, message);

      const call = mockNotification.mock.calls[0][0] as ProgressNotification;
      expect(call.params.message).toBe(message);

      // Should still be a string, not parsed
      expect(typeof call.params.message).toBe('string');
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility when message omitted', async () => {
      const progressToken = 'compat-test-1';
      const progress = 30;
      const total = 100;

      // Old-style call without message
      (server as any).sendProgressNotification(progressToken, progress, total);

      expect(mockNotification).toHaveBeenCalledTimes(1);

      const call = mockNotification.mock.calls[0][0] as ProgressNotification;
      expect(call.method).toBe('notifications/progress');
      expect(call.params.progressToken).toBe(progressToken);
      expect(call.params.progress).toBe(progress);
      expect(call.params.total).toBe(total);
    });

    it('should handle progress without total or message', async () => {
      const progressToken = 'compat-test-2';
      const progress = 42;

      (server as any).sendProgressNotification(progressToken, progress);

      expect(mockNotification).toHaveBeenCalledTimes(1);

      const call = mockNotification.mock.calls[0][0] as ProgressNotification;
      expect(call.params.progress).toBe(progress);
      expect(call.params.total).toBeUndefined();
      expect(call.params.message).toBeUndefined();
    });

    it('should not break existing code patterns', async () => {
      // Test multiple calls in sequence (common pattern)
      const progressToken = 'sequence-test';

      (server as any).sendProgressNotification(progressToken, 10, 100);
      (server as any).sendProgressNotification(progressToken, 50, 100, 'Halfway');
      (server as any).sendProgressNotification(progressToken, 100, 100);

      expect(mockNotification).toHaveBeenCalledTimes(3);

      // First call: no message
      expect((mockNotification.mock.calls[0][0] as ProgressNotification).params.message).toBeUndefined();

      // Second call: with message
      expect((mockNotification.mock.calls[1][0] as ProgressNotification).params.message).toBe('Halfway');

      // Third call: no message
      expect((mockNotification.mock.calls[2][0] as ProgressNotification).params.message).toBeUndefined();
    });
  });

  describe('Integration with Context', () => {
    it('should handle error when server not initialized', () => {
      const progressToken = 'error-test';

      // Create server without initializing internal server
      const uninitializedServer = new BuildMCPServer({
        name: 'uninitialized',
        version: '1.0.0',
      });

      // Should not throw, but should handle gracefully
      expect(() => {
        (uninitializedServer as any).sendProgressNotification(progressToken, 50, 100, 'test');
      }).not.toThrow();

      // Notification should not have been called
      expect(mockNotification).not.toHaveBeenCalled();
    });
  });

  describe('Notification Method and Structure', () => {
    it('should use correct notification method', async () => {
      const progressToken = 'method-test';

      (server as any).sendProgressNotification(progressToken, 50, 100, 'test');

      const call = mockNotification.mock.calls[0][0] as ProgressNotification;
      expect(call.method).toBe('notifications/progress');
    });

    it('should include all required params fields', async () => {
      const progressToken = 'struct-test';
      const progress = 55;
      const total = 200;
      const message = 'Progress message';

      (server as any).sendProgressNotification(progressToken, progress, total, message);

      const call = mockNotification.mock.calls[0][0] as ProgressNotification;

      // Verify structure
      expect(call).toHaveProperty('method');
      expect(call).toHaveProperty('params');

      // Verify params structure
      const params = call.params;
      expect(params).toHaveProperty('progressToken');
      expect(params).toHaveProperty('progress');
      expect(params).toHaveProperty('total');
      expect(params).toHaveProperty('message');

      // Verify values
      expect(params.progressToken).toBe(progressToken);
      expect(params.progress).toBe(progress);
      expect(params.total).toBe(total);
      expect(params.message).toBe(message);
    });

    it('should handle numeric progress token', async () => {
      const progressToken = 12345;
      const message = 'Numeric token test';

      (server as any).sendProgressNotification(progressToken, 60, 100, message);

      const call = mockNotification.mock.calls[0][0] as ProgressNotification;
      expect(call.params.progressToken).toBe(12345);
      expect(call.params.message).toBe(message);
    });

    it('should handle fractional progress values', async () => {
      const progressToken = 'fractional-test';
      const progress = 33.33;
      const total = 100;
      const message = 'One third complete';

      (server as any).sendProgressNotification(progressToken, progress, total, message);

      const call = mockNotification.mock.calls[0][0] as ProgressNotification;
      expect(call.params.progress).toBe(33.33);
      expect(call.params.message).toBe(message);
    });
  });

  describe('Error Handling', () => {
    it('should handle notification errors gracefully', () => {
      const progressToken = 'error-handling-test';

      // Make notification throw an error
      mockNotification.mockImplementation(() => {
        throw new Error('Notification failed');
      });

      // Should not throw - errors are caught internally
      expect(() => {
        (server as any).sendProgressNotification(progressToken, 50, 100, 'test message');
      }).not.toThrow();
    });

    it('should log error when notification fails', () => {
      const progressToken = 'error-logging-test';
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockNotification.mockImplementation(() => {
        throw new Error('Notification failed');
      });

      (server as any).sendProgressNotification(progressToken, 50, 100, 'test message');

      expect(consoleError).toHaveBeenCalled();
      expect(consoleError.mock.calls[0][0]).toContain('Failed to send progress notification');

      consoleError.mockRestore();
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should support incremental progress with descriptive messages', async () => {
      const progressToken = 'incremental-test';
      const steps = [
        { progress: 0, total: 5, message: 'Starting...' },
        { progress: 1, total: 5, message: 'Step 1: Initializing' },
        { progress: 2, total: 5, message: 'Step 2: Processing data' },
        { progress: 3, total: 5, message: 'Step 3: Validating results' },
        { progress: 4, total: 5, message: 'Step 4: Generating output' },
        { progress: 5, total: 5, message: 'Complete!' },
      ];

      for (const step of steps) {
        (server as any).sendProgressNotification(
          progressToken,
          step.progress,
          step.total,
          step.message
        );
      }

      expect(mockNotification).toHaveBeenCalledTimes(6);

      // Verify each step has its message
      steps.forEach((step, index) => {
        const call = mockNotification.mock.calls[index][0] as ProgressNotification;
        expect(call.params.progress).toBe(step.progress);
        expect(call.params.total).toBe(step.total);
        expect(call.params.message).toBe(step.message);
      });
    });

    it('should support percentage-based progress with messages', async () => {
      const progressToken = 'percentage-test';

      for (let i = 0; i <= 100; i += 25) {
        const message = `${i}% complete`;
        (server as any).sendProgressNotification(progressToken, i, 100, message);
      }

      expect(mockNotification).toHaveBeenCalledTimes(5);

      // Verify messages match percentages
      expect((mockNotification.mock.calls[0][0] as ProgressNotification).params.message).toBe('0% complete');
      expect((mockNotification.mock.calls[1][0] as ProgressNotification).params.message).toBe('25% complete');
      expect((mockNotification.mock.calls[2][0] as ProgressNotification).params.message).toBe('50% complete');
      expect((mockNotification.mock.calls[3][0] as ProgressNotification).params.message).toBe('75% complete');
      expect((mockNotification.mock.calls[4][0] as ProgressNotification).params.message).toBe('100% complete');
    });

    it('should support detailed status messages for long operations', async () => {
      const progressToken = 'detailed-status-test';
      const messages = [
        'Connecting to database...',
        'Fetching 10,000 records...',
        'Processing batch 1 of 10...',
        'Processing batch 5 of 10...',
        'Processing batch 10 of 10...',
        'Saving results...',
        'Operation completed successfully',
      ];

      messages.forEach((message, index) => {
        const progress = Math.floor((index / (messages.length - 1)) * 100);
        (server as any).sendProgressNotification(progressToken, progress, 100, message);
      });

      expect(mockNotification).toHaveBeenCalledTimes(messages.length);

      messages.forEach((expectedMessage, index) => {
        const call = mockNotification.mock.calls[index][0] as ProgressNotification;
        expect(call.params.message).toBe(expectedMessage);
      });
    });
  });
});
