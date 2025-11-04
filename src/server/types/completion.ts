/**
 * Completion types for autocomplete suggestions
 */

/**
 * Completion interface for providing autocomplete suggestions.
 *
 * The interface defines metadata (name, description, ref) while the implementation
 * can be just the completion function itself, following the ITool pattern.
 *
 * @example Function-Based Pattern (Recommended)
 * ```typescript
 * interface CityCompletion extends ICompletion<string[]> {
 *   name: 'city_autocomplete';
 *   description: 'Autocomplete city names';
 *   ref: { type: 'argument'; name: 'city' };
 * }
 *
 * export default class MyServer implements IServer {
 *   // Implementation is just the handler function
 *   cityAutocomplete: CityCompletion = async (value: string) => {
 *     const cities = ['New York', 'Los Angeles', 'London'];
 *     return cities.filter(c => c.toLowerCase().startsWith(value.toLowerCase()));
 *   };
 * }
 * ```
 *
 * @example Object Literal Pattern (Also Supported)
 * ```typescript
 * cityAutocomplete: CityCompletion = {
 *   name: 'city_autocomplete',
 *   description: 'Autocomplete city names',
 *   ref: { type: 'argument', name: 'city' },
 *   complete: async (value: string) => { ... }
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
