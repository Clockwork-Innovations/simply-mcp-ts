/**
 * Operation Batcher for Remote DOM
 *
 * Batches multiple DOM operations into single render cycles to maintain ≥60 FPS.
 *
 * Performance Target: Reduce render cycles by ≥50% without introducing visual latency
 *
 * Architecture:
 * 1. Operations are queued as they arrive
 * 2. A 16ms (60 FPS) timer batches operations
 * 3. Batched operations are flushed together
 * 4. Immediate flush available for critical operations
 *
 * This prevents render thrashing when worker sends many rapid updates.
 *
 * @module client/remote-dom/operation-batcher
 */

/**
 * DOM Operation Type
 */
export type DOMOperation = {
  type: 'create' | 'setAttribute' | 'append' | 'remove' | 'setText' | 'addEventListener' | 'callHost';
  data: any;
  timestamp: number;
};

/**
 * Batch Flush Callback
 */
export type FlushCallback = (operations: DOMOperation[]) => void;

/**
 * Batcher Configuration
 */
export interface BatcherConfig {
  /**
   * Batch window in milliseconds
   * @default 16 (60 FPS)
   */
  batchWindow?: number;

  /**
   * Maximum batch size (auto-flush when reached)
   * @default 100
   */
  maxBatchSize?: number;

  /**
   * Enable performance logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Operation Batcher
 *
 * Queues and batches DOM operations for efficient rendering.
 */
export class OperationBatcher {
  private queue: DOMOperation[] = [];
  private flushTimeout: NodeJS.Timeout | number | null = null;
  private flushCallback: FlushCallback;
  private config: Required<BatcherConfig>;
  private stats = {
    totalOperations: 0,
    totalBatches: 0,
    totalFlushes: 0,
    largestBatch: 0,
    averageBatchSize: 0,
  };

  constructor(flushCallback: FlushCallback, config: BatcherConfig = {}) {
    this.flushCallback = flushCallback;
    this.config = {
      batchWindow: config.batchWindow ?? 16, // 60 FPS = 16.67ms per frame
      maxBatchSize: config.maxBatchSize ?? 100,
      debug: config.debug ?? false,
    };
  }

  /**
   * Add operation to batch queue
   *
   * Operations are queued and will be flushed within the batch window
   * or when max batch size is reached.
   *
   * @param operation - DOM operation to batch
   */
  add(operation: DOMOperation): void {
    // Add to queue
    this.queue.push(operation);
    this.stats.totalOperations++;

    // Auto-flush if batch size limit reached
    if (this.queue.length >= this.config.maxBatchSize) {
      if (this.config.debug) {
        console.log(`[OperationBatcher] Auto-flush: max batch size (${this.config.maxBatchSize}) reached`);
      }
      this.flush();
      return;
    }

    // Schedule flush if not already scheduled
    if (this.flushTimeout === null) {
      this.scheduleFlush();
    }
  }

  /**
   * Schedule a flush after batch window
   *
   * @private
   */
  private scheduleFlush(): void {
    this.flushTimeout = setTimeout(() => {
      this.flush();
    }, this.config.batchWindow) as any;
  }

  /**
   * Flush all queued operations immediately
   *
   * Processes all queued operations in a single batch.
   */
  flush(): void {
    // Clear scheduled flush
    if (this.flushTimeout !== null) {
      clearTimeout(this.flushTimeout as any);
      this.flushTimeout = null;
    }

    // Nothing to flush
    if (this.queue.length === 0) {
      return;
    }

    // Get queued operations
    const operations = this.queue;
    this.queue = [];

    // Update stats
    this.stats.totalBatches++;
    this.stats.totalFlushes++;
    this.stats.largestBatch = Math.max(this.stats.largestBatch, operations.length);
    this.stats.averageBatchSize =
      (this.stats.averageBatchSize * (this.stats.totalBatches - 1) + operations.length) /
      this.stats.totalBatches;

    if (this.config.debug) {
      console.log(`[OperationBatcher] Flushing ${operations.length} operations`);
    }

    // Execute flush callback with batched operations
    this.flushCallback(operations);
  }

  /**
   * Add operation and flush immediately
   *
   * Bypasses batching for critical operations that need immediate processing.
   *
   * @param operation - DOM operation to execute immediately
   */
  flushImmediate(operation: DOMOperation): void {
    this.add(operation);
    this.flush();
  }

  /**
   * Clear all queued operations without flushing
   *
   * Use this to discard pending operations (e.g., on error or reset).
   */
  clear(): void {
    if (this.flushTimeout !== null) {
      clearTimeout(this.flushTimeout as any);
      this.flushTimeout = null;
    }
    this.queue = [];

    if (this.config.debug) {
      console.log('[OperationBatcher] Queue cleared');
    }
  }

  /**
   * Get current queue size
   *
   * @returns Number of operations in queue
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get batching statistics
   *
   * @returns Batching performance statistics
   */
  getStats() {
    const reductionPercent =
      this.stats.totalOperations > 0
        ? Math.round((1 - this.stats.totalFlushes / this.stats.totalOperations) * 100)
        : 0;

    return {
      ...this.stats,
      reductionPercent, // How much we reduced render cycles
      currentQueueSize: this.queue.length,
      config: this.config,
    };
  }

  /**
   * Reset statistics
   *
   * Clears all collected statistics. Useful for testing.
   */
  resetStats(): void {
    this.stats = {
      totalOperations: 0,
      totalBatches: 0,
      totalFlushes: 0,
      largestBatch: 0,
      averageBatchSize: 0,
    };
  }

  /**
   * Destroy batcher
   *
   * Flushes pending operations and cleans up timers.
   */
  destroy(): void {
    this.flush(); // Flush any pending operations
    this.clear(); // Clear queue
  }
}

/**
 * Create operation batcher helper
 *
 * Convenience function for creating an operation batcher.
 *
 * @param flushCallback - Callback to execute batched operations
 * @param config - Batcher configuration
 * @returns OperationBatcher instance
 *
 * @example
 * ```typescript
 * const batcher = createBatcher((operations) => {
 *   operations.forEach(op => processOperation(op));
 * }, { batchWindow: 16, debug: true });
 *
 * // Queue operations
 * batcher.add({ type: 'create', data: {...}, timestamp: Date.now() });
 * batcher.add({ type: 'setAttribute', data: {...}, timestamp: Date.now() });
 *
 * // Operations will be batched and flushed within 16ms
 * ```
 */
export function createBatcher(flushCallback: FlushCallback, config?: BatcherConfig): OperationBatcher {
  return new OperationBatcher(flushCallback, config);
}
