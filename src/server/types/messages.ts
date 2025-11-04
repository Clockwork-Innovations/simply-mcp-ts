/**
 * Message types for prompts
 */

// Import MCP SDK types for prompt messages
import type { PromptMessage } from '@modelcontextprotocol/sdk/types.js';

/**
 * Re-export MCP PromptMessage type for user convenience
 *
 * Import this type when creating advanced prompts with multi-message conversations.
 *
 * @example
 * ```typescript
 * import type { IPrompt, PromptMessage } from 'simply-mcp';
 *
 * interface TutorialPrompt extends IPrompt {
 *   name: 'tutorial';
 *   args: { topic: { description: 'Topic to teach' } };
 * }
 *
 * tutorial: TutorialPrompt = (args): PromptMessage[] => {
 *   return [
 *     { role: 'user', content: { type: 'text', text: `Teach me ${args.topic}` } },
 *     { role: 'assistant', content: { type: 'text', text: 'Here is an example...' } }
 *   ];
 * };
 * ```
 */
export type { PromptMessage };

/**
 * Simplified message format for easier prompt authoring
 *
 * Instead of writing full PromptMessage objects, use:
 * - { user: 'text' } for user messages
 * - { assistant: 'text' } for assistant messages
 *
 * The framework automatically converts these to the full PromptMessage format.
 *
 * @example
 * ```typescript
 * tutorial: TutorialPrompt = (args) => [
 *   { user: `Teach me about ${args.topic}` },
 *   { assistant: 'Here is an example...' },
 *   { user: 'Show me more!' }
 * ];
 * ```
 *
 * Future extensions may include: { image: url }, { audio: data }, etc.
 */
export type SimpleMessage =
  | { user: string }
  | { assistant: string };
