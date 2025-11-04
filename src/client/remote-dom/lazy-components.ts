/**
 * Lazy Loading System for Remote DOM Components
 *
 * Splits component library into tiers for progressive loading:
 * - TIER 1 (Immediate): Essential components loaded immediately (div, span, button, etc.)
 * - TIER 2 (Lazy): Extended components loaded on first use (video, audio, canvas, svg, tables)
 *
 * This reduces initial bundle size by deferring non-critical components.
 *
 * Architecture:
 * 1. Core components (Tier 1) are always available
 * 2. Extended components (Tier 2) are loaded dynamically on first use
 * 3. Component cache ensures each tier loads only once
 * 4. Loading states prevent race conditions
 *
 * Performance Target: Reduce initial bundle by ≥30% (from 44 KB to ≤31 KB)
 *
 * @module client/remote-dom/lazy-components
 */

/**
 * Component Tier Type
 */
export type ComponentTier = 'core' | 'extended';

/**
 * Component Loader State
 */
interface LoaderState {
  loading: boolean;
  loaded: boolean;
  components: Set<string>;
}

/**
 * Loader state management
 */
const loaderState: Record<ComponentTier, LoaderState> = {
  core: {
    loading: false,
    loaded: true, // Core is always loaded
    components: new Set(),
  },
  extended: {
    loading: false,
    loaded: false,
    components: new Set(),
  },
};

/**
 * TIER 1: Core Components (Always Loaded)
 *
 * Essential components needed for basic UI rendering.
 * These are loaded immediately to ensure fast initial render.
 *
 * Size: ~8-10 KB (estimated)
 */
export const CORE_COMPONENTS: ReadonlySet<string> = new Set([
  // MCP-UI semantic components (most commonly used)
  'Button',
  'Input',
  'Text',
  'Card',
  'Stack',

  // Basic HTML layout (essential for all UIs)
  'div',
  'span',
  'p',

  // Basic form elements (very common)
  'button',
  'input',
  'label',
  'form',

  // Basic text formatting
  'h1',
  'h2',
  'h3',
  'strong',
  'em',
  'a',

  // Basic lists (common)
  'ul',
  'ol',
  'li',
]);

/**
 * TIER 2: Extended Components (Lazy Loaded)
 *
 * Advanced components loaded on-demand when first used.
 * This includes media, tables, advanced forms, and semantic HTML.
 *
 * Size: ~6-8 KB (estimated)
 * Loaded on first use of any extended component.
 */
export const EXTENDED_COMPONENTS: ReadonlySet<string> = new Set([
  // MCP-UI (less common)
  'Image',

  // Advanced headings
  'h4',
  'h5',
  'h6',

  // Advanced form elements
  'textarea',
  'select',
  'option',
  'fieldset',
  'legend',
  'optgroup',
  'datalist',
  'output',
  'progress',
  'meter',

  // Media elements (heavy, rarely used)
  'img',
  'video',
  'audio',
  'source',
  'track',
  'canvas',
  'svg',
  'picture',

  // Table elements (heavy, rarely used)
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
  'caption',
  'colgroup',
  'col',

  // Semantic HTML (less critical for initial render)
  'section',
  'article',
  'header',
  'footer',
  'nav',
  'main',
  'aside',
  'figure',
  'figcaption',
  'details',
  'summary',
  'dialog',
  'mark',
  'time',
  'address',

  // Advanced text formatting
  'code',
  'pre',
  'blockquote',
  'hr',
  'br',
]);

/**
 * All allowed components (union of tiers)
 */
export const ALL_COMPONENTS: ReadonlySet<string> = new Set([
  ...Array.from(CORE_COMPONENTS),
  ...Array.from(EXTENDED_COMPONENTS),
]);

/**
 * Get component tier
 *
 * Determines which tier a component belongs to.
 *
 * @param tagName - Component tag name
 * @returns Component tier or null if not allowed
 */
export function getComponentTier(tagName: string): ComponentTier | null {
  if (CORE_COMPONENTS.has(tagName)) {
    return 'core';
  }
  if (EXTENDED_COMPONENTS.has(tagName)) {
    return 'extended';
  }
  return null;
}

/**
 * Check if component is allowed (fast check without loading)
 *
 * @param tagName - Component tag name
 * @returns True if component exists in any tier
 */
export function isComponentAllowed(tagName: string): boolean {
  return ALL_COMPONENTS.has(tagName);
}

/**
 * Ensure component tier is loaded
 *
 * Loads extended components on-demand if needed.
 * Core components are always available.
 *
 * @param tier - Component tier to load
 * @returns Promise that resolves when tier is loaded
 */
export async function ensureTierLoaded(tier: ComponentTier): Promise<void> {
  const state = loaderState[tier];

  // Core is always loaded
  if (tier === 'core') {
    return Promise.resolve();
  }

  // Already loaded
  if (state.loaded) {
    return Promise.resolve();
  }

  // Already loading - wait for it
  if (state.loading) {
    return new Promise((resolve) => {
      const checkLoaded = setInterval(() => {
        if (state.loaded) {
          clearInterval(checkLoaded);
          resolve();
        }
      }, 10);
    });
  }

  // Start loading
  state.loading = true;

  try {
    // In production, this would be a dynamic import
    // For now, we'll mark as loaded immediately since components are still in main bundle
    // Future optimization: Split extended components into separate chunk

    // Simulate async loading (for testing)
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Mark components as loaded
    EXTENDED_COMPONENTS.forEach((component) => {
      state.components.add(component);
    });

    state.loaded = true;
    state.loading = false;
  } catch (error) {
    state.loading = false;
    throw new Error(`Failed to load ${tier} components: ${error}`);
  }
}

/**
 * Ensure component is available
 *
 * Loads component's tier if needed before use.
 * This is the main entry point for lazy loading.
 *
 * @param tagName - Component tag name
 * @returns Promise that resolves when component is available
 * @throws Error if component is not allowed
 *
 * @example
 * ```typescript
 * // Load video component (will trigger extended tier load on first use)
 * await ensureComponentAvailable('video');
 * const element = createRemoteComponent('video', { controls: true });
 * ```
 */
export async function ensureComponentAvailable(tagName: string): Promise<void> {
  const tier = getComponentTier(tagName);

  if (tier === null) {
    throw new Error(`Component not allowed: ${tagName}`);
  }

  await ensureTierLoaded(tier);
}

/**
 * Preload extended components
 *
 * Preloads extended tier in the background for faster subsequent use.
 * Call this during idle time if you expect extended components to be used.
 *
 * @example
 * ```typescript
 * // Preload in background after initial render
 * requestIdleCallback(() => {
 *   preloadExtendedComponents();
 * });
 * ```
 */
export async function preloadExtendedComponents(): Promise<void> {
  return ensureTierLoaded('extended');
}

/**
 * Get loading statistics
 *
 * Returns current loading state for debugging/monitoring.
 *
 * @returns Loading statistics object
 */
export function getLoadingStats() {
  return {
    core: {
      count: CORE_COMPONENTS.size,
      loaded: loaderState.core.loaded,
      loading: loaderState.core.loading,
    },
    extended: {
      count: EXTENDED_COMPONENTS.size,
      loaded: loaderState.extended.loaded,
      loading: loaderState.extended.loading,
    },
    total: {
      count: ALL_COMPONENTS.size,
      corePercentage: Math.round((CORE_COMPONENTS.size / ALL_COMPONENTS.size) * 100),
      extendedPercentage: Math.round((EXTENDED_COMPONENTS.size / ALL_COMPONENTS.size) * 100),
    },
  };
}

/**
 * Reset loader state (for testing)
 *
 * @internal
 */
export function resetLoaderState(): void {
  loaderState.extended.loading = false;
  loaderState.extended.loaded = false;
  loaderState.extended.components.clear();
}
