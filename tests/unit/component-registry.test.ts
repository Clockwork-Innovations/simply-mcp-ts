/**
 * Component Registry Unit Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ComponentRegistry } from '../../src/features/ui/component-registry.js';

describe('ComponentRegistry', () => {
  let registry: ComponentRegistry;

  beforeEach(() => {
    registry = new ComponentRegistry();
  });

  it('should register component', () => {
    registry.register({
      uri: 'ui://components/Button',
      name: 'Button',
      file: './Button.tsx',
      version: '1.0.0',
    });

    expect(registry.has('ui://components/Button')).toBe(true);
  });

  it('should get registered component', () => {
    const metadata = {
      uri: 'ui://components/Card',
      name: 'Card',
      file: './Card.tsx',
      version: '1.0.0',
    };

    registry.register(metadata);
    const result = registry.get('ui://components/Card');

    expect(result).toEqual(metadata);
  });

  it('should list all components', () => {
    registry.register({
      uri: 'ui://components/Button',
      name: 'Button',
      file: './Button.tsx',
      version: '1.0.0',
    });

    registry.register({
      uri: 'ui://components/Card',
      name: 'Card',
      file: './Card.tsx',
      version: '1.0.0',
    });

    const list = registry.list();
    expect(list).toHaveLength(2);
  });

  it('should unregister component', () => {
    registry.register({
      uri: 'ui://components/Button',
      name: 'Button',
      file: './Button.tsx',
      version: '1.0.0',
    });

    const removed = registry.unregister('ui://components/Button');
    expect(removed).toBe(true);
    expect(registry.has('ui://components/Button')).toBe(false);
  });

  it('should clear all components', () => {
    registry.register({
      uri: 'ui://components/Button',
      name: 'Button',
      file: './Button.tsx',
      version: '1.0.0',
    });

    registry.clear();
    expect(registry.size).toBe(0);
  });
});
