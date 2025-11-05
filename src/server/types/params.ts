/**
 * Enhanced parameter definition with validation constraints
 *
 * IParam provides a single unified interface for all parameter types with a required
 * type discriminant field. This improves LLM accuracy when calling tools by providing
 * richer parameter metadata in the generated JSON Schema.
 *
 * The `type` field acts as a discriminant to determine which validation constraints
 * apply to the parameter. All constraint fields are optional and type-specific
 * (e.g., minLength only applies to strings, min/max only apply to numbers).
 *
 * @example Basic String
 * ```typescript
 * interface NameParam extends IParam {
 *   type: 'string';
 *   description: 'User full name';
 *   minLength: 1;
 *   maxLength: 100;
 * }
 * ```
 *
 * @example Email Format
 * ```typescript
 * interface EmailParam extends IParam {
 *   type: 'string';
 *   description: 'User email address';
 *   format: 'email';
 * }
 * ```
 *
 * @example Pattern Validation
 * ```typescript
 * interface UsernameParam extends IParam {
 *   type: 'string';
 *   description: 'Username (alphanumeric only)';
 *   pattern: '^[a-zA-Z0-9]+$';
 *   minLength: 3;
 *   maxLength: 20;
 * }
 * ```
 *
 * @example Integer Age
 * ```typescript
 * interface AgeParam extends IParam {
 *   type: 'integer';
 *   description: 'User age in years';
 *   min: 0;
 *   max: 150;
 * }
 * ```
 *
 * @example Float Temperature
 * ```typescript
 * interface TemperatureParam extends IParam {
 *   type: 'number';
 *   description: 'Temperature in Celsius';
 *   min: -273.15;
 *   max: 1000;
 * }
 * ```
 *
 * @example Port Number
 * ```typescript
 * interface PortParam extends IParam {
 *   type: 'integer';
 *   description: 'Network port';
 *   min: 1;
 *   max: 65535;
 * }
 * ```
 *
 * @example Boolean
 * ```typescript
 * interface EnabledParam extends IParam {
 *   type: 'boolean';
 *   description: 'Whether the feature is enabled';
 * }
 * ```
 *
 * @example String Array
 * ```typescript
 * interface TagsParam extends IParam {
 *   type: 'array';
 *   description: 'User tags';
 *   items: {
 *     type: 'string';
 *     description: 'A single tag';
 *     minLength: 1;
 *   };
 *   minItems: 0;
 *   maxItems: 10;
 * }
 * ```
 *
 * @example Number Array
 * ```typescript
 * interface ScoresParam extends IParam {
 *   type: 'array';
 *   description: 'Test scores';
 *   items: {
 *     type: 'integer';
 *     description: 'Individual score';
 *     min: 0;
 *     max: 100;
 *   };
 *   minItems: 1;
 * }
 * ```
 *
 * @example Nested Object Array
 * ```typescript
 * interface UsersParam extends IParam {
 *   type: 'array';
 *   description: 'List of users';
 *   items: {
 *     type: 'object';
 *     description: 'User object';
 *     properties: {
 *       name: { type: 'string'; description: 'User name' };
 *       age: { type: 'integer'; description: 'User age'; min: 0 };
 *     };
 *     requiredProperties: ['name'];
 *   };
 * }
 * ```
 *
 * @example User Object
 * ```typescript
 * interface UserParam extends IParam {
 *   type: 'object';
 *   description: 'User information';
 *   properties: {
 *     name: {
 *       type: 'string';
 *       description: 'User name';
 *       minLength: 1;
 *     };
 *     age: {
 *       type: 'integer';
 *       description: 'User age';
 *       min: 0;
 *     };
 *     email: {
 *       type: 'string';
 *       description: 'Email address';
 *       format: 'email';
 *     };
 *   };
 *   requiredProperties: ['name'];
 * }
 * ```
 *
 * @example Nested Objects
 * ```typescript
 * interface AddressParam extends IParam {
 *   type: 'object';
 *   description: 'Mailing address';
 *   properties: {
 *     street: { type: 'string'; description: 'Street address' };
 *     city: { type: 'string'; description: 'City' };
 *     country: { type: 'string'; description: 'Country code'; pattern: '^[A-Z]{2}$' };
 *   };
 *   requiredProperties: ['street', 'city', 'country'];
 * }
 * ```
 *
 * @example Null Parameter
 * ```typescript
 * interface NullParam extends IParam {
 *   type: 'null';
 *   description: 'Explicitly null value';
 * }
 * ```
 */
export interface IParam {
  /**
   * The JSON Schema type discriminant
   *
   * This required field determines which validation constraints apply:
   * - 'string': Use minLength, maxLength, format, pattern, enum
   * - 'number' | 'integer': Use min, max, exclusiveMin, exclusiveMax, multipleOf
   * - 'boolean': No additional constraints
   * - 'array': Use items, minItems, maxItems, uniqueItems
   * - 'object': Use properties, requiredProperties, additionalProperties
   * - 'null': No additional constraints
   */
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';

  /**
   * Human-readable description of this parameter
   * Included in JSON Schema to help LLMs understand parameter purpose
   */
  description: string;

  /**
   * Whether this parameter is required
   * Default: true
   */
  required?: boolean;

  // String constraints (type: 'string')

  /**
   * Minimum length for string values
   */
  minLength?: number;

  /**
   * Maximum length for string values
   */
  maxLength?: number;

  /**
   * String format validation
   */
  format?: 'email' | 'url' | 'uuid' | 'date-time' | 'uri' | 'ipv4' | 'ipv6';

  /**
   * Regex pattern for string validation
   */
  pattern?: string;

  /**
   * Enum values - restrict to specific allowed strings
   */
  enum?: string[];

  // Number constraints (type: 'number' | 'integer')

  /**
   * Minimum value (inclusive)
   */
  min?: number;

  /**
   * Maximum value (inclusive)
   */
  max?: number;

  /**
   * Number must be a multiple of this value
   */
  multipleOf?: number;

  /**
   * Exclusive minimum (value must be greater than this)
   */
  exclusiveMin?: number;

  /**
   * Exclusive maximum (value must be less than this)
   */
  exclusiveMax?: number;

  // Array constraints (type: 'array')

  /**
   * Schema for array items (can be any IParam type)
   */
  items?: IParam;

  /**
   * Minimum number of items in array
   */
  minItems?: number;

  /**
   * Maximum number of items in array
   */
  maxItems?: number;

  /**
   * Whether array items must be unique
   */
  uniqueItems?: boolean;

  // Object constraints (type: 'object')

  /**
   * Object properties (each is an IParam)
   */
  properties?: Record<string, IParam>;

  /**
   * Array of required property names
   */
  requiredProperties?: string[];

  /**
   * Whether additional properties are allowed
   */
  additionalProperties?: boolean;
}
