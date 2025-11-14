import type { HiddenValue, HiddenEvaluationContext } from '../types/hidden.js';
import { isHiddenFunction, isHiddenBoolean } from '../types/hidden.js';

/**
 * Configuration for hidden evaluation
 */
export interface HiddenEvaluationOptions {
  /**
   * Timeout for async hidden predicates (milliseconds)
   * @default 1000 (1 second)
   */
  timeout?: number;

  /**
   * Default value if evaluation fails/times out
   * - 'visible': Show item on error (fail-open)
   * - 'hidden': Hide item on error (fail-closed, more secure)
   * @default 'visible'
   */
  errorDefault?: 'visible' | 'hidden';

  /**
   * Logger for warnings/errors
   */
  logger?: {
    warn: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
  };
}

/**
 * Default configuration
 */
const DEFAULT_OPTIONS: Required<HiddenEvaluationOptions> = {
  timeout: 1000,
  errorDefault: 'visible',
  logger: {
    warn: (msg, meta) => console.warn(msg, meta),
    error: (msg, meta) => console.error(msg, meta),
  },
};

/**
 * Evaluate a single hidden value
 *
 * Handles three cases:
 * 1. undefined → false (visible by default)
 * 2. boolean → return as-is
 * 3. function → execute and return result
 *
 * @param hidden The hidden value to evaluate
 * @param context Context for evaluation
 * @param options Evaluation options
 * @param itemId Item identifier for logging/errors
 * @returns Whether item should be hidden
 */
export async function evaluateHidden(
  hidden: HiddenValue | undefined,
  context?: HiddenEvaluationContext,
  options?: HiddenEvaluationOptions,
  itemId?: string
): Promise<boolean> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Case 1: undefined → visible (default)
  if (hidden === undefined) {
    return false;
  }

  // Case 2: Static boolean → return as-is
  if (isHiddenBoolean(hidden)) {
    return hidden;
  }

  // Case 3: Dynamic function → evaluate with timeout and error handling
  if (isHiddenFunction(hidden)) {
    const startTime = Date.now();

    try {
      // Wrap in Promise.race for timeout
      const result = await Promise.race([
        Promise.resolve(hidden(context)),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Hidden evaluation timeout')), opts.timeout)
        ),
      ]);

      const duration = Date.now() - startTime;

      // Validate result type
      if (typeof result !== 'boolean') {
        opts.logger.error(
          `Hidden predicate returned non-boolean value: ${typeof result}`,
          { itemId, result }
        );
        return opts.errorDefault === 'hidden';
      }

      // Warn if evaluation is slow (>100ms)
      if (duration > 100) {
        opts.logger.warn(
          `Slow hidden predicate evaluation: ${duration}ms`,
          { itemId, duration }
        );
      }

      return result;
    } catch (error) {
      // Log error and return safe default
      opts.logger.error(
        `Hidden predicate evaluation failed: ${error}`,
        { itemId, error }
      );
      return opts.errorDefault === 'hidden';
    }
  }

  // Should never reach here (TypeScript guards above)
  opts.logger.warn(`Unexpected hidden value type: ${typeof hidden}`, { itemId, hidden });
  return opts.errorDefault === 'hidden';
}
