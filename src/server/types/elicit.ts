/**
 * Elicitation types for user input
 */

/**
 * Base Elicitation interface
 *
 * Elicitations are server-initiated requests for user input from the client.
 * This is NOT a declarative interface - it is only used for type definitions.
 * To request user input, use the context.elicitInput() method in tool handlers.
 *
 * The elicitation protocol allows servers to request structured input from users
 * through the MCP client, such as text fields, confirmations, or form data.
 *
 * @template TArgs - Input field schema type
 * @template TResult - Expected result type from user input
 *
 * @example Simple Text Input
 * ```typescript
 * // In a tool handler:
 * const result = await context.elicitInput(
 *   'Please enter your API key',
 *   {
 *     apiKey: {
 *       type: 'string',
 *       title: 'API Key',
 *       description: 'Your OpenAI API key',
 *       minLength: 10
 *     }
 *   }
 * );
 *
 * if (result.action === 'accept') {
 *   const apiKey = result.content.apiKey;
 *   // Use the API key
 * }
 * ```
 *
 * @example Form-like Input
 * ```typescript
 * const result = await context.elicitInput(
 *   'Configure database connection',
 *   {
 *     host: {
 *       type: 'string',
 *       title: 'Database Host',
 *       description: 'Hostname or IP address',
 *       default: 'localhost'
 *     },
 *     port: {
 *       type: 'integer',
 *       title: 'Port',
 *       description: 'Database port number',
 *       default: 5432,
 *       min: 1,
 *       max: 65535
 *     },
 *     useSSL: {
 *       type: 'boolean',
 *       title: 'Use SSL',
 *       description: 'Enable SSL connection',
 *       default: true
 *     }
 *   }
 * );
 *
 * if (result.action === 'accept') {
 *   const { host, port, useSSL } = result.content;
 *   // Configure database
 * }
 * ```
 *
 * @example Email Input with Validation
 * ```typescript
 * const result = await context.elicitInput(
 *   'Please provide your email address',
 *   {
 *     email: {
 *       type: 'string',
 *       title: 'Email',
 *       description: 'Your email address for notifications',
 *       format: 'email'
 *     }
 *   }
 * );
 * ```
 */
export interface IElicit<TArgs = any, TResult = any> {
  /**
   * The prompt message to show the user
   * This explains what input is being requested and why
   */
  prompt: string;

  /**
   * Input field schema defining what data to collect
   * Uses JSON Schema format with field definitions
   *
   * Each field can be:
   * - string: Text input with optional format validation (email, uri, date, etc.)
   * - number/integer: Numeric input with optional min/max constraints
   * - boolean: Checkbox or toggle input
   */
  args: TArgs;

  /**
   * Expected result structure (for type checking)
   * This is the shape of the data returned when action is 'accept'
   */
  result: TResult;
}
