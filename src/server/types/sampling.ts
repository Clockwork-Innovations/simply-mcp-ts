/**
 * Sampling types for LLM completions
 */

/**
 * Base Sampling interface
 *
 * Sampling allows servers to request LLM completions from the client.
 * Use the `context.sample()` method in tool handlers to invoke the client's LLM.
 *
 * @template TMessages - Messages type
 * @template TOptions - Options type
 *
 * @example Simple Text Request
 * ```typescript
 * const result = await context.sample([
 *   {
 *     role: 'user',
 *     content: { type: 'text', text: 'What is TypeScript?' }
 *   }
 * ]);
 * ```
 *
 * @example Multi-turn Conversation
 * ```typescript
 * const result = await context.sample([
 *   {
 *     role: 'user',
 *     content: { type: 'text', text: 'What is MCP?' }
 *   },
 *   {
 *     role: 'assistant',
 *     content: { type: 'text', text: 'MCP is Model Context Protocol...' }
 *   },
 *   {
 *     role: 'user',
 *     content: { type: 'text', text: 'Can you explain it simply?' }
 *   }
 * ], { maxTokens: 200, temperature: 0.5 });
 * ```
 *
 * @example With Sampling Options
 * ```typescript
 * const result = await context.sample(
 *   [{ role: 'user', content: { type: 'text', text: 'Hello' } }],
 *   {
 *     maxTokens: 1000,
 *     temperature: 0.7,
 *     topP: 0.9,
 *     stopSequences: ['\n\n']
 *   }
 * );
 * ```
 */
export interface ISampling<TMessages = any, TOptions = any> {
  /**
   * Array of messages for the LLM conversation
   * Each message has a role ('user' or 'assistant') and content
   */
  messages: TMessages;

  /**
   * Optional sampling parameters to control LLM generation
   */
  options?: TOptions;
}

/**
 * Sampling message structure
 * Used in LLM completion requests via context.sample()
 */
export interface ISamplingMessage {
  /**
   * Message role - who is speaking
   */
  role: 'user' | 'assistant';

  /**
   * Message content - what is being said
   */
  content: {
    /**
     * Content type - typically 'text'
     */
    type: string;

    /**
     * Text content of the message
     */
    text?: string;

    /**
     * Base64-encoded data (for images, audio, etc.)
     */
    data?: string;

    /**
     * MIME type of the data
     */
    mimeType?: string;

    /**
     * Additional fields
     */
    [key: string]: unknown;
  };
}

/**
 * Sampling options for controlling LLM generation
 */
export interface ISamplingOptions {
  /**
   * Intelligence priority for model selection (0-9 scale)
   *
   * Maps to Anthropic model tiers:
   * - **0-3**: Haiku (fast, cheap, basic tasks)
   * - **4-6**: Sonnet (balanced, most use cases)
   * - **7-9**: Opus (complex reasoning, slow, expensive)
   *
   * @example Quick task with Haiku
   * ```typescript
   * { intelligencePriority: 2, maxTokens: 500 }
   * ```
   *
   * @example Balanced task with Sonnet
   * ```typescript
   * { intelligencePriority: 5, temperature: 0.7 }
   * ```
   *
   * @example Complex analysis with Opus
   * ```typescript
   * { intelligencePriority: 8, temperature: 0.3, maxTokens: 4000 }
   * ```
   *
   * @since v4.7.0
   */
  intelligencePriority?: number;

  /**
   * Speed priority for model selection (0.0-1.0 scale)
   * Higher values prefer faster models (lower latency)
   *
   * @example Prefer fast response
   * ```typescript
   * { speedPriority: 0.9, intelligencePriority: 3 }
   * ```
   *
   * @since v4.7.0
   */
  speedPriority?: number;

  /**
   * Cost priority for model selection (0.0-1.0 scale)
   * Higher values prefer cheaper models (lower cost per token)
   *
   * @example Prefer cost efficiency
   * ```typescript
   * { costPriority: 1.0, intelligencePriority: 2 }
   * ```
   *
   * @since v4.7.0
   */
  costPriority?: number;

  /**
   * Maximum number of tokens to generate
   */
  maxTokens?: number;

  /**
   * Temperature for sampling (0.0 = deterministic, 1.0 = creative)
   * Higher values make output more random
   */
  temperature?: number;

  /**
   * Top-p nucleus sampling threshold
   * Only consider tokens with cumulative probability up to this value
   */
  topP?: number;

  /**
   * Top-k sampling - only consider top k tokens
   */
  topK?: number;

  /**
   * Stop sequences - generation stops when any sequence is encountered
   */
  stopSequences?: string[];

  /**
   * Additional metadata for the sampling request
   */
  metadata?: Record<string, unknown>;

  /**
   * Additional options
   */
  [key: string]: unknown;
}
