/**
 * Skill definition types
 */

import type { IResource } from './resource.js';
import type { HiddenValue } from '../../types/hidden.js';
import type { ISamplingOptions } from './sampling.js';


/**
 * Base Skill interface - extends IResource to expose skills as MCP resources
 *
 * Skills achieve Anthropic Skills parity using MCP primitives:
 * - **Name + Description**: Identity and trigger phrase (WHEN to use)
 * - **Skill Content**: Full documentation (HOW to use) - like SKILL.md
 * - **Component Arrays**: Auto-generate docs for tools/resources/prompts
 * - **Sampling**: Model selection via intelligence priority (haiku/sonnet/opus)
 *
 * **MCP-Native:** Skills are resources exposed via `skill://name` URIs
 *
 * @example Manual Skill with Opus Intelligence
 * ```typescript
 * interface ComplexAnalysis extends ISkill {
 *   name: 'complex_analysis';
 *   description: 'Analyze complex datasets with advanced reasoning';
 *   skill: `
 * # Complex Analysis Skill
 *
 * ## Purpose
 * Deep analysis of complex data patterns requiring advanced reasoning.
 *
 * ## Usage
 * Use this skill when you need to analyze intricate relationships in data.
 *   `;
 *   sampling: {
 *     intelligencePriority: 8,  // Opus (7-9)
 *     temperature: 0.3
 *   };
 * }
 * ```
 *
 * @example Auto-Generated Skill with Haiku Speed
 * ```typescript
 * interface QuickSearch extends ISkill {
 *   name: 'quick_search';
 *   description: 'Fast keyword search and filtering';
 *   tools: ['search', 'filter'];
 *   resources: ['data://index'];
 *   sampling: {
 *     intelligencePriority: 2,  // Haiku (0-3)
 *     speedPriority: 1.0,
 *     maxTokens: 500
 *   };
 * }
 * ```
 */
export interface ISkill extends IResource<string> {
  /**
   * Skill name in snake_case (e.g., 'weather_analysis')
   * Required - identifies the skill in protocol requests
   */
  name: string;

  /**
   * Human-readable description (1-2 sentences)
   * This is the "trigger phrase" - describes WHEN to use this skill
   *
   * @example 'Analyze weather patterns and forecast data'
   * @example 'Debug TypeScript compilation errors'
   */
  description: string;

  /**
   * Skill content (full documentation like Anthropic's SKILL.md)
   * Mutually exclusive with auto-generation (tools/resources/prompts)
   *
   * **Use when:**
   * - You want complete control over skill documentation
   * - Manual includes custom examples, guides, or narrative
   * - Skill explains concepts beyond component listings
   *
   * @example
   * ```typescript
   * skill: `
   * # Weather Analysis Skill
   *
   * ## Purpose
   * Analyze weather patterns and forecast data.
   *
   * ## Available Tools
   * - get_weather: Get current weather conditions
   * - get_forecast: Get 7-day forecast
   *
   * ## Examples
   * \`\`\`typescript
   * await get_weather({ city: "San Francisco" });
   * \`\`\`
   * `
   * ```
   *
   * @since v4.7.0
   */
  skill?: string;

  /**
   * Tool names for auto-generated documentation
   * The compiler will generate skill content describing these tools
   * The AI can then call them via standard tools/call
   *
   * @example ['search', 'analyze', 'visualize']
   * @since v4.7.0
   */
  tools?: string[];

  /**
   * Resource URIs for auto-generated documentation
   * The compiler will generate skill content describing these resources
   * The AI can then read them via standard resources/read
   *
   * @example ['config://api_key', 'data://index']
   * @since v4.7.0
   */
  resources?: string[];

  /**
   * Prompt names for auto-generated documentation
   * The compiler will generate skill content describing these prompts
   * The AI can then use them via standard prompts/get
   *
   * @example ['help', 'examples']
   * @since v4.7.0
   */
  prompts?: string[];

  /**
   * Sampling configuration with intelligence-based model selection
   *
   * **Intelligence Priority (0-9):**
   * - **0-3**: Haiku (fast, cheap, basic tasks)
   * - **4-6**: Sonnet (balanced, most use cases)
   * - **7-9**: Opus (complex reasoning, slow, expensive)
   *
   * @example Haiku for quick tasks
   * ```typescript
   * sampling: { intelligencePriority: 2, maxTokens: 500 }
   * ```
   *
   * @example Opus for complex analysis
   * ```typescript
   * sampling: { intelligencePriority: 8, temperature: 0.3 }
   * ```
   *
   * @since v4.7.0
   */
  sampling?: ISamplingOptions;

  // Note: uri, mimeType, hidden inherited from IResource<string>
  // - uri: Generated as `skill://${name}` by compiler
  // - mimeType: Always 'text/markdown' for skills
  // - hidden: Controls visibility in resources/list
}

/**
 * Helper type for implementing skills with full type inference
 *
 * **Foundation Layer:** Returns markdown string (literal or via function)
 * **Feature Layer (FT-2):**
 * - Manual: Returns markdown string
 * - Auto-gen: Returns empty string (or additional context)
 *
 * @example Manual Skill
 * ```typescript
 * const mySkill: SkillHelper<MySkill> = () => {
 *   return '# My Skill\nContent here...';
 * };
 * ```
 *
 * @example Auto-Generated Skill
 * ```typescript
 * const mySkill: SkillHelper<MySkill> = () => {
 *   return ''; // Empty - content auto-generated from components
 * };
 *
 * // Or provide additional context
 * const mySkill: SkillHelper<MySkill> = () => {
 *   return '## Additional Notes\nThis API requires authentication...';
 * };
 * ```
 */
export type SkillHelper<T extends ISkill> = () => string;
