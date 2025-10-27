/**
 * Theme Manager Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ThemeManager, LIGHT_THEME, DARK_THEME } from '../../src/index.js';

describe('ThemeManager', () => {
  let manager: ThemeManager;

  beforeEach(() => {
    manager = new ThemeManager();
  });

  it('should register a theme', () => {
    manager.register({ name: 'test', variables: { '--color': '#000' } });
    expect(manager.has('test')).toBe(true);
  });

  it('should retrieve registered theme', () => {
    const theme = { name: 'test', variables: { '--color': '#000' } };
    manager.register(theme);
    expect(manager.get('test')).toEqual(theme);
  });

  it('should throw on duplicate registration', () => {
    manager.register({ name: 'test', variables: {} });
    expect(() => manager.register({ name: 'test', variables: {} })).toThrow();
  });

  it('should generate CSS for theme', () => {
    const css = manager.generateCSS({
      name: 'test',
      variables: { '--bg': '#fff', '--text': '#000' },
    });
    expect(css).toContain(':root {');
    expect(css).toContain('--bg: #fff;');
    expect(css).toContain('--text: #000;');
  });

  it('should return empty string for theme with no variables', () => {
    expect(manager.generateCSS({ name: 'empty', variables: {} })).toBe('');
  });

  it('should list theme names', () => {
    manager.register({ name: 'theme1', variables: {} });
    manager.register({ name: 'theme2', variables: {} });
    expect(manager.getThemeNames()).toEqual(['theme1', 'theme2']);
  });
});

describe('Prebuilt Themes', () => {
  it('should export LIGHT_THEME', () => {
    expect(LIGHT_THEME.name).toBe('light');
    expect(LIGHT_THEME.variables['--bg-primary']).toBe('#ffffff');
  });

  it('should export DARK_THEME', () => {
    expect(DARK_THEME.name).toBe('dark');
    expect(DARK_THEME.variables['--bg-primary']).toBe('#1a1a1a');
  });
});
