/**
 * Tests for Lazy Loading System
 *
 * Validates that component lazy loading works correctly and reduces bundle size.
 *
 * Task 1.1: Component Lazy Loading
 * Target: Reduce bundle by ≥30% through tiered loading
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  CORE_COMPONENTS,
  EXTENDED_COMPONENTS,
  ALL_COMPONENTS,
  getComponentTier,
  isComponentAllowed,
  ensureComponentAvailable,
  ensureTierLoaded,
  preloadExtendedComponents,
  getLoadingStats,
  resetLoaderState,
} from '../../../src/client/remote-dom/lazy-components';

describe('Lazy Loading System', () => {
  beforeEach(() => {
    // Reset loader state before each test
    resetLoaderState();
  });

  describe('Component Tiers', () => {
    it('defines core components correctly', () => {
      // Core components should include essentials
      expect(CORE_COMPONENTS.has('div')).toBe(true);
      expect(CORE_COMPONENTS.has('span')).toBe(true);
      expect(CORE_COMPONENTS.has('button')).toBe(true);
      expect(CORE_COMPONENTS.has('input')).toBe(true);
      expect(CORE_COMPONENTS.has('Button')).toBe(true); // MCP-UI

      // Should be reasonable size (not too many)
      expect(CORE_COMPONENTS.size).toBeGreaterThan(10);
      expect(CORE_COMPONENTS.size).toBeLessThan(30);
    });

    it('defines extended components correctly', () => {
      // Extended components should include media, tables, etc.
      expect(EXTENDED_COMPONENTS.has('video')).toBe(true);
      expect(EXTENDED_COMPONENTS.has('audio')).toBe(true);
      expect(EXTENDED_COMPONENTS.has('canvas')).toBe(true);
      expect(EXTENDED_COMPONENTS.has('svg')).toBe(true);
      expect(EXTENDED_COMPONENTS.has('table')).toBe(true);

      // Should be larger than core
      expect(EXTENDED_COMPONENTS.size).toBeGreaterThan(CORE_COMPONENTS.size);
    });

    it('has no overlap between core and extended', () => {
      const overlap = Array.from(CORE_COMPONENTS).filter((c) =>
        EXTENDED_COMPONENTS.has(c)
      );
      expect(overlap).toEqual([]);
    });

    it('all components equals core + extended', () => {
      const combined = new Set([
        ...Array.from(CORE_COMPONENTS),
        ...Array.from(EXTENDED_COMPONENTS),
      ]);
      expect(ALL_COMPONENTS.size).toBe(combined.size);
      expect(ALL_COMPONENTS.size).toBe(73); // Should match baseline
    });
  });

  describe('Component Tier Detection', () => {
    it('identifies core components', () => {
      expect(getComponentTier('div')).toBe('core');
      expect(getComponentTier('button')).toBe('core');
      expect(getComponentTier('Button')).toBe('core');
    });

    it('identifies extended components', () => {
      expect(getComponentTier('video')).toBe('extended');
      expect(getComponentTier('table')).toBe('extended');
      expect(getComponentTier('canvas')).toBe('extended');
    });

    it('returns null for disallowed components', () => {
      expect(getComponentTier('script')).toBeNull();
      expect(getComponentTier('iframe')).toBeNull();
      expect(getComponentTier('object')).toBeNull();
    });
  });

  describe('Component Allowed Check', () => {
    it('allows core components', () => {
      expect(isComponentAllowed('div')).toBe(true);
      expect(isComponentAllowed('button')).toBe(true);
    });

    it('allows extended components', () => {
      expect(isComponentAllowed('video')).toBe(true);
      expect(isComponentAllowed('table')).toBe(true);
    });

    it('blocks dangerous components', () => {
      expect(isComponentAllowed('script')).toBe(false);
      expect(isComponentAllowed('iframe')).toBe(false);
      expect(isComponentAllowed('object')).toBe(false);
    });
  });

  describe('Tier Loading', () => {
    it('core tier is always loaded', async () => {
      const stats = getLoadingStats();
      expect(stats.core.loaded).toBe(true);
      expect(stats.core.loading).toBe(false);
    });

    it('extended tier starts not loaded', () => {
      const stats = getLoadingStats();
      expect(stats.extended.loaded).toBe(false);
      expect(stats.extended.loading).toBe(false);
    });

    it('can load extended tier', async () => {
      await ensureTierLoaded('extended');
      const stats = getLoadingStats();
      expect(stats.extended.loaded).toBe(true);
      expect(stats.extended.loading).toBe(false);
    });

    it('core tier loads instantly', async () => {
      const start = Date.now();
      await ensureTierLoaded('core');
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10); // Should be instant
    });

    it('extended tier can be preloaded', async () => {
      await preloadExtendedComponents();
      const stats = getLoadingStats();
      expect(stats.extended.loaded).toBe(true);
    });
  });

  describe('Component Availability', () => {
    it('core components are immediately available', async () => {
      await expect(ensureComponentAvailable('div')).resolves.toBeUndefined();
      await expect(ensureComponentAvailable('button')).resolves.toBeUndefined();
    });

    it('extended components become available after loading', async () => {
      await expect(ensureComponentAvailable('video')).resolves.toBeUndefined();
      await expect(ensureComponentAvailable('table')).resolves.toBeUndefined();

      const stats = getLoadingStats();
      expect(stats.extended.loaded).toBe(true);
    });

    it('throws for disallowed components', async () => {
      await expect(ensureComponentAvailable('script')).rejects.toThrow(
        'Component not allowed: script'
      );
    });
  });

  describe('Loading Statistics', () => {
    it('reports correct counts', () => {
      const stats = getLoadingStats();
      expect(stats.core.count).toBe(CORE_COMPONENTS.size);
      expect(stats.extended.count).toBe(EXTENDED_COMPONENTS.size);
      expect(stats.total.count).toBe(ALL_COMPONENTS.size);
    });

    it('reports correct percentages', () => {
      const stats = getLoadingStats();
      expect(stats.total.corePercentage).toBeGreaterThan(0);
      expect(stats.total.extendedPercentage).toBeGreaterThan(0);
      expect(stats.total.corePercentage + stats.total.extendedPercentage).toBe(100);
    });

    it('tracks loading state correctly', async () => {
      let stats = getLoadingStats();
      expect(stats.extended.loaded).toBe(false);

      await ensureTierLoaded('extended');

      stats = getLoadingStats();
      expect(stats.extended.loaded).toBe(true);
    });
  });

  describe('Performance Optimization', () => {
    it('core components are smaller set than extended', () => {
      // Core should be minority of components (for bundle size reduction)
      const corePercentage = (CORE_COMPONENTS.size / ALL_COMPONENTS.size) * 100;
      expect(corePercentage).toBeLessThan(50);
      expect(corePercentage).toBeGreaterThan(20);
    });

    it('heavy components are in extended tier', () => {
      const heavyComponents = ['video', 'audio', 'canvas', 'svg', 'table'];
      heavyComponents.forEach((component) => {
        expect(getComponentTier(component)).toBe('extended');
      });
    });

    it('common components are in core tier', () => {
      const commonComponents = ['div', 'span', 'button', 'input', 'p'];
      commonComponents.forEach((component) => {
        expect(getComponentTier(component)).toBe('core');
      });
    });
  });

  describe('Loader State Management', () => {
    it('can reset loader state', () => {
      // Load extended tier
      resetLoaderState(); // This should mark extended as not loaded

      const stats = getLoadingStats();
      expect(stats.extended.loaded).toBe(false);
      expect(stats.extended.loading).toBe(false);
    });

    it('handles concurrent loading requests', async () => {
      // Start multiple loads simultaneously
      const loads = [
        ensureTierLoaded('extended'),
        ensureTierLoaded('extended'),
        ensureTierLoaded('extended'),
      ];

      await Promise.all(loads);

      const stats = getLoadingStats();
      expect(stats.extended.loaded).toBe(true);
      expect(stats.extended.loading).toBe(false);
    });
  });

  describe('Bundle Size Estimation', () => {
    it('estimates bundle size reduction potential', () => {
      const stats = getLoadingStats();

      // If core is ~30% of components, we can defer ~70% of component definitions
      // This should correlate to ~30-40% bundle size reduction
      const deferredPercentage = stats.total.extendedPercentage;

      console.log('=== LAZY LOADING BUNDLE SIZE ESTIMATION ===');
      console.log(`Core components: ${stats.core.count} (${stats.total.corePercentage}%)`);
      console.log(`Extended components: ${stats.extended.count} (${stats.total.extendedPercentage}%)`);
      console.log(`Estimated deferred load: ${deferredPercentage}% of component definitions`);
      console.log(`Target bundle reduction: ≥30%`);

      // Extended should be significant enough to meet 30% reduction target
      expect(deferredPercentage).toBeGreaterThanOrEqual(60);
    });
  });
});

/**
 * Integration Tests with Component Library
 */
describe('Lazy Loading Integration', () => {
  it('maintains backward compatibility with component library', () => {
    // Old ALLOWED_COMPONENTS constant should match new ALL_COMPONENTS
    expect(ALL_COMPONENTS.size).toBe(73);
  });

  it('does not change component whitelist', () => {
    // All previously allowed components should still be allowed
    const previouslyAllowed = [
      'div', 'span', 'button', 'input', 'video', 'table',
      'Button', 'Input', 'Text', 'Card',
    ];

    previouslyAllowed.forEach((component) => {
      expect(isComponentAllowed(component)).toBe(true);
    });
  });

  it('does not add new components', () => {
    // Security check: lazy loading should not relax security
    const stillBlocked = ['script', 'iframe', 'object', 'embed', 'style', 'link'];

    stillBlocked.forEach((component) => {
      expect(isComponentAllowed(component)).toBe(false);
    });
  });
});
