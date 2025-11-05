/**
 * Completion types for autocomplete suggestions
 */

/**
 * Completion interface for providing autocomplete suggestions.
 *
 * The interface defines metadata (name, description, ref) while the implementation
 * can be just the completion function itself, following the ITool pattern.
 *
 * **Implementation Patterns:**
 * - **Recommended:** Use CompletionHelper<T> type for automatic type inference
 * - **Alternative:** Assign function directly (types inferred from interface)
 *
 * @example Pattern 1: With CompletionHelper (Recommended)
 * ```typescript
 * import type { ICompletion, CompletionHelper } from 'simply-mcp';
 *
 * interface CityCompletion extends ICompletion<string[]> {
 *   name: 'city_autocomplete';
 *   description: 'Autocomplete city names';
 *   ref: { type: 'argument'; name: 'city' };
 * }
 *
 * // Using CompletionHelper for automatic type inference
 * const cityAutocomplete: CompletionHelper<CityCompletion> = async (value) => {
 *   //                                                                ^^^^^ type is string (inferred!)
 *   const cities = ['New York', 'Los Angeles', 'London'];
 *   return cities.filter(c => c.toLowerCase().startsWith(value.toLowerCase()));
 * };
 * ```
 *
 * @example Pattern 2: Direct Function Assignment
 * ```typescript
 * interface CityCompletion extends ICompletion<string[]> {
 *   name: 'city_autocomplete';
 *   description: 'Autocomplete city names';
 *   ref: { type: 'argument'; name: 'city' };
 * }
 *
 * // Direct assignment (also works)
 * const cityAutocomplete: CityCompletion = async (value: string) => {
 *   const cities = ['New York', 'Los Angeles', 'London'];
 *   return cities.filter(c => c.toLowerCase().startsWith(value.toLowerCase()));
 * };
 * ```
 *
 * @example With Context Parameter
 * ```typescript
 * interface SmartCompletion extends ICompletion<string[]> {
 *   name: 'smart_suggestions';
 *   description: 'Context-aware completion';
 *   ref: { type: 'argument'; name: 'query' };
 * }
 *
 * const smartSuggestions: CompletionHelper<SmartCompletion> = async (value, context) => {
 *   // Use context for smarter suggestions
 *   const history = context?.history || [];
 *   return generateSuggestions(value, history);
 * };
 * ```
 */
export interface ICompletion<TSuggestions = any> {
  /**
   * Name identifier for this completion handler
   */
  name: string;

  /**
   * Description of what this completion provides
   */
  description: string;

  /**
   * Reference to what is being completed
   * - { type: 'argument', name: 'argName' } - For prompt arguments
   * - { type: 'resource', name: 'resourceUri' } - For resource URIs
   */
  ref: { type: 'argument' | 'resource'; name: string };

  /**
   * Completion function that generates suggestions
   * @param value - Current partial value being typed
   * @param context - Optional context (argument name, other argument values, etc.)
   * @returns Array of completion suggestions
   *
   * Note: When implementing ICompletion, you can assign just this function
   * directly to the property, and the framework will extract metadata from
   * the interface definition.
   */
  (value: string, context?: any): TSuggestions | Promise<TSuggestions>;
}
