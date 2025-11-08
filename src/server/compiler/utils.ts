/**
 * Parser Utility Functions
 *
 * String manipulation and naming convention utilities used throughout the parser.
 */

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase to snake_case
 * Examples: 'getWeather' -> 'get_weather', 'createUser' -> 'create_user'
 */
export function camelToSnake(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, ''); // Remove leading underscore
}

/**
 * Normalize tool name to snake_case (accepts both camelCase and snake_case)
 * If the name already contains underscores, assume it's snake_case and return as-is.
 * Otherwise, convert from camelCase to snake_case.
 *
 * Examples:
 * - 'getWeather' -> 'get_weather' (camelCase conversion)
 * - 'get_weather' -> 'get_weather' (already snake_case)
 * - 'greet' -> 'greet' (single word, unchanged)
 */
export function normalizeToolName(name: string): string {
  // If already snake_case (contains underscores), return as-is
  if (name.includes('_')) {
    return name;
  }
  // Otherwise convert camelCase to snake_case
  return camelToSnake(name);
}

/**
 * Convert string to kebab-case
 * Used for server names to enforce naming convention
 *
 * Examples:
 * - 'My Server' -> 'my-server' (spaces to hyphens)
 * - 'SimpleAPI' -> 'simple-api' (camelCase conversion)
 * - 'my_server' -> 'my-server' (underscores to hyphens)
 * - 'my-server' -> 'my-server' (already kebab-case)
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')  // camelCase → kebab-case
    .replace(/[\s_]+/g, '-')               // spaces/underscores → hyphens
    .replace(/[^a-z0-9-]/gi, '-')          // non-alphanumeric → hyphens
    .replace(/-+/g, '-')                   // multiple hyphens → single
    .replace(/^-+|-+$/g, '')               // trim leading/trailing hyphens
    .toLowerCase();
}

/**
 * Get all naming variations of a given name
 * Supports snake_case, camelCase, PascalCase, and kebab-case
 * Used to find method implementations that may use different naming conventions
 *
 * Examples:
 * - 'get_weather' -> ['get_weather', 'getWeather', 'GetWeather', 'get-weather']
 * - 'getWeather' -> ['getWeather', 'get_weather', 'GetWeather', 'get-weather']
 *
 * @param name - Original name in any casing convention
 * @returns Array of unique naming variations
 */
export function getNamingVariations(name: string): string[] {
  const variations: string[] = [];

  // Original name
  variations.push(name);

  // snake_case (if not already)
  if (!name.includes('_')) {
    const snakeCase = name
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/-/g, '_');
    if (snakeCase !== name) {
      variations.push(snakeCase);
    }
  }

  // camelCase
  const camelCase = name
    .replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^[A-Z]/, match => match.toLowerCase());
  if (camelCase !== name) {
    variations.push(camelCase);
  }

  // PascalCase
  const pascalCase = name
    .replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^[a-z]/, match => match.toUpperCase());
  if (pascalCase !== name && pascalCase !== camelCase) {
    variations.push(pascalCase);
  }

  // kebab-case
  const kebabCase = name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
  if (kebabCase !== name) {
    variations.push(kebabCase);
  }

  // Remove duplicates
  return [...new Set(variations)];
}
