/**
 * Prebuilt Themes - Light and Dark Mode
 *
 * Production-ready theme definitions using CSS custom properties.
 * Auto-registered with theme manager.
 */

import type { Theme } from '../../features/ui/theme-manager.js';
import { themeManager } from '../../features/ui/theme-manager.js';

/**
 * Light Theme
 *
 * Clean, professional light mode theme with high contrast.
 * Suitable for most MCP-UI applications.
 *
 * @example
 * ```typescript
 * import { LIGHT_THEME } from 'simply-mcp';
 *
 * interface MyUI extends IUI {
 *   uri: 'ui://dashboard';
 *   theme: 'light'; // or LIGHT_THEME
 * }
 * ```
 */
export const LIGHT_THEME: Theme = {
  name: 'light',
  variables: {
    '--bg-primary': '#ffffff',
    '--bg-secondary': '#f5f5f5',
    '--bg-tertiary': '#e8e8e8',
    '--text-primary': '#000000',
    '--text-secondary': '#666666',
    '--text-tertiary': '#999999',
    '--border-color': '#dddddd',
    '--border-color-light': '#eeeeee',
    '--primary-color': '#007bff',
    '--primary-hover': '#0056b3',
    '--error-color': '#dc3545',
    '--error-hover': '#c82333',
    '--success-color': '#28a745',
    '--success-hover': '#218838',
    '--warning-color': '#ffc107',
    '--warning-hover': '#e0a800',
    '--info-color': '#17a2b8',
    '--info-hover': '#138496',
  },
};

/**
 * Dark Theme
 *
 * Modern dark mode theme with reduced eye strain.
 * Optimized for low-light environments.
 *
 * @example
 * ```typescript
 * import { DARK_THEME } from 'simply-mcp';
 *
 * interface MyUI extends IUI {
 *   uri: 'ui://dashboard';
 *   theme: 'dark'; // or DARK_THEME
 * }
 * ```
 */
export const DARK_THEME: Theme = {
  name: 'dark',
  variables: {
    '--bg-primary': '#1a1a1a',
    '--bg-secondary': '#2d2d2d',
    '--bg-tertiary': '#3a3a3a',
    '--text-primary': '#ffffff',
    '--text-secondary': '#aaaaaa',
    '--text-tertiary': '#888888',
    '--border-color': '#444444',
    '--border-color-light': '#333333',
    '--primary-color': '#0d6efd',
    '--primary-hover': '#0a58ca',
    '--error-color': '#dc3545',
    '--error-hover': '#bb2d3b',
    '--success-color': '#198754',
    '--success-hover': '#157347',
    '--warning-color': '#ffc107',
    '--warning-hover': '#ffca2c',
    '--info-color': '#0dcaf0',
    '--info-hover': '#31d2f2',
  },
};

// Auto-register prebuilt themes
themeManager.register(LIGHT_THEME);
themeManager.register(DARK_THEME);
