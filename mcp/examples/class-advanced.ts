/**
 * Advanced Class-Based MCP Server
 *
 * Demonstrates enhanced features:
 * - Optional parameters with ? operator
 * - Default parameter values
 * - JSDoc @example and @throws tags
 * - Complex parameter types
 *
 * Usage:
 *   # Auto-detect and run
 *   simplymcp run mcp/examples/class-advanced.ts
 *
 *   # Development with auto-restart
 *   simplymcp run mcp/examples/class-advanced.ts --watch --http --port 3400
 *
 *   # Debug with Chrome DevTools
 *   simplymcp run mcp/examples/class-advanced.ts --inspect --http --port 3400
 *
 *   # Or explicit decorator command
 *   simplymcp-class mcp/examples/class-advanced.ts --http --port 3400
 */

import { MCPServer, tool } from 'simply-mcp';

/**
 * Advanced Calculator Service
 * Demonstrates all enhanced decorator features
 */
@MCPServer({ name: 'advanced-calculator', version: '2.0.0' })
export default class AdvancedCalculator {
  /**
   * Calculate the area of different shapes
   *
   * @param shape - Type of shape ('circle', 'rectangle', 'triangle')
   * @param dimension1 - First dimension (radius for circle, width for rectangle, base for triangle)
   * @param dimension2 - Second dimension (optional: height for rectangle/triangle)
   * @returns Calculated area with unit
   *
   * @example
   * // Calculate circle area
   * calculateArea('circle', 5)
   *
   * @example
   * // Calculate rectangle area
   * calculateArea('rectangle', 10, 5)
   *
   * @throws {Error} Invalid shape type
   * @throws {Error} Missing required dimension
   */
  @tool('Calculate area of different geometric shapes')
  calculateArea(shape: string, dimension1: number, dimension2?: number): string {
    switch (shape.toLowerCase()) {
      case 'circle':
        const area = Math.PI * dimension1 * dimension1;
        return `Circle area: ${area.toFixed(2)} sq units`;

      case 'rectangle':
        if (!dimension2) throw new Error('Rectangle requires both width and height');
        return `Rectangle area: ${dimension1 * dimension2} sq units`;

      case 'triangle':
        if (!dimension2) throw new Error('Triangle requires both base and height');
        return `Triangle area: ${(dimension1 * dimension2) / 2} sq units`;

      default:
        throw new Error(`Unknown shape: ${shape}`);
    }
  }

  /**
   * Format a number with custom options
   *
   * @param value - Number to format
   * @param decimals - Number of decimal places (default: 2)
   * @param prefix - Optional prefix (e.g., '$', '€')
   * @param suffix - Optional suffix (e.g., 'USD', 'kg')
   * @returns Formatted number string
   *
   * @example
   * formatNumber(1234.567, 2, '$')
   * // Returns: "$1234.57"
   *
   * @example
   * formatNumber(42.123, 1, undefined, 'kg')
   * // Returns: "42.1kg"
   */
  @tool()
  formatNumber(value: number, decimals: number = 2, prefix?: string, suffix?: string): string {
    const formatted = value.toFixed(decimals);
    return `${prefix || ''}${formatted}${suffix || ''}`;
  }

  /**
   * Generate a range of numbers with optional step
   *
   * @param start - Starting number
   * @param end - Ending number
   * @param step - Step size (default: 1)
   * @returns Array of numbers in the range
   *
   * @example
   * range(1, 10)
   * // Returns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
   *
   * @example
   * range(0, 20, 5)
   * // Returns: [0, 5, 10, 15, 20]
   *
   * @throws {Error} Step must be positive
   * @throws {Error} Start must be less than end
   */
  @tool('Generate a numeric range')
  range(start: number, end: number, step: number = 1): object {
    if (step <= 0) throw new Error('Step must be positive');
    if (start > end) throw new Error('Start must be less than or equal to end');

    const result: number[] = [];
    for (let i = start; i <= end; i += step) {
      result.push(i);
    }

    return {
      start,
      end,
      step,
      count: result.length,
      values: result,
    };
  }

  /**
   * Process a list with filtering and transformation
   *
   * @param items - Array of items to process
   * @param minValue - Minimum value to include (optional)
   * @param maxValue - Maximum value to include (optional)
   * @param transform - Transform operation ('double', 'square', 'sqrt')
   * @returns Processed array
   *
   * @example
   * processArray([1, 2, 3, 4, 5], 2, 4, 'double')
   * // Returns: [4, 6, 8]
   */
  @tool()
  processArray(
    items: number[],
    minValue?: number,
    maxValue?: number,
    transform: string = 'double'
  ): object {
    let filtered = [...items];

    // Apply filters
    if (minValue !== undefined) {
      filtered = filtered.filter(x => x >= minValue);
    }
    if (maxValue !== undefined) {
      filtered = filtered.filter(x => x <= maxValue);
    }

    // Apply transformation
    let transformed: number[];
    switch (transform) {
      case 'double':
        transformed = filtered.map(x => x * 2);
        break;
      case 'square':
        transformed = filtered.map(x => x * x);
        break;
      case 'sqrt':
        transformed = filtered.map(x => Math.sqrt(x));
        break;
      default:
        transformed = filtered;
    }

    return {
      original: items,
      filtered,
      transformed,
      operation: transform,
    };
  }

  /**
   * Create a greeting with customization options
   *
   * @param name - Person's name
   * @param formal - Use formal greeting (default: false)
   * @param language - Language code ('en', 'es', 'fr')
   * @param includeTime - Include time-based greeting (default: false)
   * @returns Customized greeting
   *
   * @example
   * greet('Alice', false, 'en', true)
   * // Returns: "Good morning, Alice!"
   */
  @tool()
  greet(
    name: string,
    formal: boolean = false,
    language: string = 'en',
    includeTime: boolean = false
  ): string {
    const greetings: Record<string, { formal: string; informal: string }> = {
      en: { formal: 'Good day', informal: 'Hello' },
      es: { formal: 'Buen día', informal: 'Hola' },
      fr: { formal: 'Bonjour', informal: 'Salut' },
    };

    const lang = greetings[language] || greetings.en;
    const greeting = formal ? lang.formal : lang.informal;

    if (includeTime) {
      const hour = new Date().getHours();
      const timeGreeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      return `Good ${timeGreeting}, ${name}!`;
    }

    return `${greeting}, ${name}!`;
  }
}
