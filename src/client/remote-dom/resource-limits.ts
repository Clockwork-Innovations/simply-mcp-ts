/**
 * Resource Limits for Remote DOM
 *
 * Enforces resource limits to prevent DoS attacks and resource exhaustion.
 *
 * Security Targets:
 * - Prevent excessive script sizes (default: 1MB)
 * - Prevent long-running scripts (default: 5 seconds)
 * - Prevent excessive DOM nodes (default: 10,000)
 * - Monitor memory usage
 *
 * IMPORTANT - Configurable Limits:
 * All limits are fully configurable via ResourceLimitsConfig. The defaults
 * are conservative but can be increased for advanced use cases:
 *
 * - maxScriptSize: Increase for applications with large libraries
 * - maxExecutionTime: Increase for compute-intensive visualizations
 * - maxDOMNodes: Increase for data-heavy dashboards or tables
 * - maxEventListeners: Increase for complex interactive applications
 *
 * Before raising limits, consider performance impact and security implications.
 *
 * @module client/remote-dom/resource-limits
 */

/**
 * Resource Limits Configuration
 */
export interface ResourceLimitsConfig {
  /**
   * Maximum script size in bytes
   * @default 1048576 (1 MB)
   */
  maxScriptSize?: number;

  /**
   * Maximum execution time in milliseconds
   * @default 5000 (5 seconds)
   */
  maxExecutionTime?: number;

  /**
   * Maximum number of DOM nodes
   * @default 10000
   */
  maxDOMNodes?: number;

  /**
   * Maximum number of event listeners
   * @default 1000
   */
  maxEventListeners?: number;

  /**
   * Memory warning threshold in MB
   * @default 50
   */
  memoryWarningThreshold?: number;

  /**
   * Enable resource limit logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Resource Limit Error
 *
 * Thrown when a resource limit is exceeded.
 */
export class ResourceLimitError extends Error {
  constructor(
    public limitType: string,
    public currentValue: number,
    public maxValue: number,
    message?: string
  ) {
    super(message || `Resource limit exceeded: ${limitType} (${currentValue} > ${maxValue})`);
    this.name = 'ResourceLimitError';
  }
}

/**
 * Resource Limits Enforcer
 *
 * Monitors and enforces resource limits for Remote DOM execution.
 */
export class ResourceLimits {
  private config: Required<ResourceLimitsConfig>;
  private startTime: number = 0;
  private domNodeCount: number = 0;
  private eventListenerCount: number = 0;
  private executionTimer: NodeJS.Timeout | number | null = null;

  constructor(config: ResourceLimitsConfig = {}) {
    this.config = {
      maxScriptSize: config.maxScriptSize ?? 1024 * 1024, // 1 MB
      maxExecutionTime: config.maxExecutionTime ?? 5000, // 5 seconds
      maxDOMNodes: config.maxDOMNodes ?? 10000,
      maxEventListeners: config.maxEventListeners ?? 1000,
      memoryWarningThreshold: config.memoryWarningThreshold ?? 50, // MB
      debug: config.debug ?? false,
    };
  }

  /**
   * Validate script size
   *
   * Throws ResourceLimitError if script exceeds maximum size.
   *
   * @param script - Script content
   * @throws ResourceLimitError if script too large
   */
  validateScriptSize(script: string): void {
    const scriptSize = new Blob([script]).size;

    if (scriptSize > this.config.maxScriptSize) {
      throw new ResourceLimitError(
        'scriptSize',
        scriptSize,
        this.config.maxScriptSize,
        `Script size (${this.formatBytes(scriptSize)}) exceeds maximum allowed (${this.formatBytes(this.config.maxScriptSize)}). ` +
        `This limit prevents DoS attacks from oversized scripts. ` +
        `If your application needs larger scripts, increase 'maxScriptSize' in ResourceLimitsConfig. ` +
        `Consider code splitting or lazy loading to reduce script size.`
      );
    }

    if (this.config.debug) {
      console.log(
        `[ResourceLimits] Script size: ${this.formatBytes(scriptSize)} / ${this.formatBytes(this.config.maxScriptSize)}`
      );
    }
  }

  /**
   * Start execution timer
   *
   * Monitors execution time and terminates if limit exceeded.
   *
   * @param onTimeout - Callback when execution time limit exceeded
   */
  startExecutionTimer(onTimeout: () => void): void {
    this.startTime = Date.now();

    if (this.executionTimer) {
      clearTimeout(this.executionTimer as any);
    }

    this.executionTimer = setTimeout(() => {
      const executionTime = Date.now() - this.startTime;
      console.error(
        `[ResourceLimits] Script execution timeout: ${executionTime}ms exceeded limit of ${this.config.maxExecutionTime}ms. ` +
        `This prevents long-running scripts from blocking the UI. ` +
        `If your application needs more time (e.g., data processing), increase 'maxExecutionTime' in ResourceLimitsConfig.`
      );
      onTimeout();
    }, this.config.maxExecutionTime) as any;

    if (this.config.debug) {
      console.log(`[ResourceLimits] Execution timer started (limit: ${this.config.maxExecutionTime}ms)`);
    }
  }

  /**
   * Stop execution timer
   *
   * Clears execution timeout timer.
   */
  stopExecutionTimer(): void {
    if (this.executionTimer) {
      clearTimeout(this.executionTimer as any);
      this.executionTimer = null;

      const executionTime = Date.now() - this.startTime;
      if (this.config.debug) {
        console.log(`[ResourceLimits] Execution completed in ${executionTime}ms`);
      }
    }
  }

  /**
   * Register DOM node creation
   *
   * Increments DOM node count and validates against limit.
   *
   * @throws ResourceLimitError if too many DOM nodes
   */
  registerDOMNode(): void {
    this.domNodeCount++;

    if (this.domNodeCount > this.config.maxDOMNodes) {
      throw new ResourceLimitError(
        'domNodes',
        this.domNodeCount,
        this.config.maxDOMNodes,
        `DOM node limit exceeded (${this.domNodeCount} > ${this.config.maxDOMNodes}). ` +
        `This limit prevents memory exhaustion from excessive DOM trees. ` +
        `If your application requires more nodes (e.g., large data tables), increase 'maxDOMNodes' in ResourceLimitsConfig. ` +
        `Consider virtualization for large lists or tables.`
      );
    }

    if (this.config.debug && this.domNodeCount % 100 === 0) {
      console.log(`[ResourceLimits] DOM nodes: ${this.domNodeCount} / ${this.config.maxDOMNodes}`);
    }
  }

  /**
   * Unregister DOM node deletion
   *
   * Decrements DOM node count.
   */
  unregisterDOMNode(): void {
    if (this.domNodeCount > 0) {
      this.domNodeCount--;
    }
  }

  /**
   * Register event listener
   *
   * Increments event listener count and validates against limit.
   *
   * @throws ResourceLimitError if too many event listeners
   */
  registerEventListener(): void {
    this.eventListenerCount++;

    if (this.eventListenerCount > this.config.maxEventListeners) {
      throw new ResourceLimitError(
        'eventListeners',
        this.eventListenerCount,
        this.config.maxEventListeners,
        `Event listener limit exceeded (${this.eventListenerCount} > ${this.config.maxEventListeners}). ` +
        `This limit prevents memory leaks from excessive event handlers. ` +
        `If your application needs more listeners (e.g., complex interactive UI), increase 'maxEventListeners' in ResourceLimitsConfig. ` +
        `Consider event delegation or cleanup strategies.`
      );
    }

    if (this.config.debug && this.eventListenerCount % 100 === 0) {
      console.log(
        `[ResourceLimits] Event listeners: ${this.eventListenerCount} / ${this.config.maxEventListeners}`
      );
    }
  }

  /**
   * Unregister event listener
   *
   * Decrements event listener count.
   */
  unregisterEventListener(): void {
    if (this.eventListenerCount > 0) {
      this.eventListenerCount--;
    }
  }

  /**
   * Check memory usage
   *
   * Monitors memory usage and warns if threshold exceeded.
   * Note: Only available in browsers that support performance.memory (Chrome).
   *
   * @returns Current memory usage in MB, or null if unavailable
   */
  checkMemoryUsage(): number | null {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;

      if (usedMB > this.config.memoryWarningThreshold) {
        console.warn(
          `[ResourceLimits] Memory usage high: ${usedMB.toFixed(2)} MB (threshold: ${this.config.memoryWarningThreshold} MB)`
        );
      }

      if (this.config.debug) {
        console.log(
          `[ResourceLimits] Memory: ${usedMB.toFixed(2)} MB / ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
        );
      }

      return usedMB;
    }

    return null;
  }

  /**
   * Get current resource usage
   *
   * Returns current counts and percentages of resource usage.
   *
   * @returns Resource usage statistics
   */
  getUsage() {
    const executionTime = this.executionTimer ? Date.now() - this.startTime : 0;

    return {
      domNodes: {
        count: this.domNodeCount,
        limit: this.config.maxDOMNodes,
        percentage: Math.round((this.domNodeCount / this.config.maxDOMNodes) * 100),
      },
      eventListeners: {
        count: this.eventListenerCount,
        limit: this.config.maxEventListeners,
        percentage: Math.round((this.eventListenerCount / this.config.maxEventListeners) * 100),
      },
      executionTime: {
        ms: executionTime,
        limit: this.config.maxExecutionTime,
        percentage: Math.round((executionTime / this.config.maxExecutionTime) * 100),
      },
      memory: {
        mb: this.checkMemoryUsage(),
        threshold: this.config.memoryWarningThreshold,
      },
    };
  }

  /**
   * Reset all counters
   *
   * Clears all resource usage counters. Use when restarting execution.
   */
  reset(): void {
    this.stopExecutionTimer();
    this.domNodeCount = 0;
    this.eventListenerCount = 0;
    this.startTime = 0;

    if (this.config.debug) {
      console.log('[ResourceLimits] Counters reset');
    }
  }

  /**
   * Get configuration
   *
   * @returns Current resource limits configuration
   */
  getConfig(): Readonly<Required<ResourceLimitsConfig>> {
    return this.config;
  }

  /**
   * Format bytes to human-readable string
   *
   * @private
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

/**
 * Create resource limits helper
 *
 * Convenience function for creating resource limits enforcer.
 *
 * @param config - Resource limits configuration
 * @returns ResourceLimits instance
 *
 * @example
 * ```typescript
 * const limits = createResourceLimits({
 *   maxScriptSize: 512 * 1024, // 512 KB
 *   maxExecutionTime: 3000, // 3 seconds
 *   maxDOMNodes: 5000,
 *   debug: true
 * });
 *
 * // Validate script
 * limits.validateScriptSize(script);
 *
 * // Start execution timer
 * limits.startExecutionTimer(() => {
 *   worker.terminate();
 *   console.error('Execution timeout');
 * });
 *
 * // Register DOM nodes
 * limits.registerDOMNode();
 * ```
 */
export function createResourceLimits(config?: ResourceLimitsConfig): ResourceLimits {
  return new ResourceLimits(config);
}
