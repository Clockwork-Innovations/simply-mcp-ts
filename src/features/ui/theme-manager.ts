/**
 * Theme Manager - CSS Variables System for MCP-UI
 *
 * Manages theme registration and CSS generation using CSS custom properties.
 * Zero-weight when themes are not used.
 */

/**
 * Theme definition
 */
export interface Theme {
  /** Theme name identifier */
  name: string;
  /** CSS custom property variables */
  variables: Record<string, string>;
}

/**
 * Theme Manager
 *
 * Singleton that manages theme registration and CSS generation.
 * Themes use CSS variables for consistent styling across UIs.
 *
 * @example
 * ```typescript
 * import { themeManager } from 'simply-mcp';
 *
 * themeManager.register({
 *   name: 'custom',
 *   variables: {
 *     '--bg-primary': '#f0f0f0',
 *     '--text-primary': '#333333',
 *   }
 * });
 * ```
 */
export class ThemeManager {
  private themes: Map<string, Theme> = new Map();

  /**
   * Register a theme
   *
   * @param theme - Theme definition with name and variables
   * @throws Error if theme with same name already exists
   */
  register(theme: Theme): void {
    if (this.themes.has(theme.name)) {
      throw new Error(`Theme "${theme.name}" is already registered`);
    }

    this.themes.set(theme.name, theme);
  }

  /**
   * Get a theme by name
   *
   * @param name - Theme name
   * @returns Theme definition or undefined if not found
   */
  get(name: string): Theme | undefined {
    return this.themes.get(name);
  }

  /**
   * Check if a theme is registered
   *
   * @param name - Theme name
   * @returns True if theme exists
   */
  has(name: string): boolean {
    return this.themes.has(name);
  }

  /**
   * Get all registered theme names
   *
   * @returns Array of theme names
   */
  getThemeNames(): string[] {
    return Array.from(this.themes.keys());
  }

  /**
   * Generate CSS for a theme
   *
   * Converts theme variables to CSS custom properties in :root selector.
   *
   * @param theme - Theme definition
   * @returns CSS string with custom properties
   *
   * @example
   * ```typescript
   * const css = themeManager.generateCSS({
   *   name: 'dark',
   *   variables: { '--bg-primary': '#1a1a1a' }
   * });
   * // Returns: ":root { --bg-primary: #1a1a1a; }"
   * ```
   */
  generateCSS(theme: Theme): string {
    const entries = Object.entries(theme.variables);

    if (entries.length === 0) {
      return '';
    }

    const declarations = entries
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n');

    return `:root {\n${declarations}\n}`;
  }

  /**
   * Clear all registered themes
   * Useful for testing
   */
  clear(): void {
    this.themes.clear();
  }
}

/**
 * Global theme manager instance
 *
 * @example
 * ```typescript
 * import { themeManager, LIGHT_THEME } from 'simply-mcp';
 *
 * themeManager.register(LIGHT_THEME);
 * const theme = themeManager.get('light');
 * ```
 */
export const themeManager = new ThemeManager();
