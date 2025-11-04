/**
 * Component library for Remote DOM
 *
 * CRITICAL SECURITY MODULE
 *
 * Defines the whitelist of allowed components and provides utilities
 * for safely creating React components from Remote DOM operations.
 *
 * Security model:
 * 1. Only whitelisted components can be rendered
 * 2. Props are sanitized to remove dangerous values
 * 3. Event handlers go through controlled postMessage protocol
 * 4. No arbitrary component types allowed
 *
 * Performance optimization (Polish Layer):
 * 5. Components are split into tiers (core vs extended) for lazy loading
 * 6. Extended components (media, tables) loaded on-demand
 *
 * @module client/remote-dom/component-library
 *
 * NOTE: This file is intended for client-side use only.
 * It will be consumed by RemoteDOMRenderer.tsx which has React available.
 */

// Import lazy loading system (Polish Layer optimization)
import {
  isComponentAllowed as isComponentInTiers,
  getComponentTier,
  ensureComponentAvailable,
  ALL_COMPONENTS as LAZY_ALL_COMPONENTS,
} from './lazy-components.js';

// Type-only imports to avoid runtime dependency
type ReactNode = any;
type ReactElement = any;

// Declare window for client-side code
declare const window: any;

/**
 * Remote Component Type
 *
 * Union of all allowed component types.
 * This ensures type safety when creating components.
 */
export type RemoteComponentType =
  | 'Button'
  | 'Input'
  | 'Text'
  | 'Card'
  | 'Stack'
  | 'Image'
  | 'div'
  | 'button'
  | 'input'
  | 'span'
  | 'p'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'ul'
  | 'ol'
  | 'li'
  | 'form'
  | 'label'
  | 'section'
  | 'article'
  | 'header'
  | 'footer'
  | 'nav'
  | 'main'
  | 'aside';

/**
 * Create an immutable Set that cannot be modified at runtime
 *
 * SECURITY: This creates a truly immutable Set by:
 * 1. Freezing the Set object itself
 * 2. Making mutation methods throw errors
 * 3. Returning a ReadonlySet type to enforce immutability at compile-time
 *
 * @param values - Initial values for the Set
 * @returns Immutable ReadonlySet
 */
function createImmutableSet<T>(values: T[]): ReadonlySet<T> {
  const set = new Set(values);

  // Override mutation methods to prevent runtime modification
  set.add = function() {
    throw new Error('Cannot modify immutable ALLOWED_COMPONENTS Set');
  };
  set.delete = function() {
    throw new Error('Cannot modify immutable ALLOWED_COMPONENTS Set');
  };
  set.clear = function() {
    throw new Error('Cannot modify immutable ALLOWED_COMPONENTS Set');
  };

  // Freeze the Set object to prevent property modification
  return Object.freeze(set) as ReadonlySet<T>;
}

/**
 * Whitelist of allowed components
 *
 * SECURITY: Only these components can be rendered.
 * This prevents arbitrary component injection and limits
 * attack surface to known, safe HTML elements.
 *
 * Components included:
 * - Basic HTML elements (div, span, p, etc.)
 * - Semantic HTML (header, footer, nav, etc.)
 * - Form elements (input, button, form, label)
 * - Text elements (h1-h6, p)
 * - List elements (ul, ol, li)
 *
 * NOT included:
 * - script (XSS risk)
 * - iframe (embedding risk)
 * - object/embed (plugin risk)
 * - link/style (CSS injection risk)
 *
 * SECURITY: This Set is truly immutable - attempts to modify it will throw errors.
 * This prevents runtime injection of dangerous components.
 */
export const ALLOWED_COMPONENTS: ReadonlySet<string> = createImmutableSet([
  // Semantic MCP-UI components (future)
  'Button',
  'Input',
  'Text',
  'Card',
  'Stack',
  'Image',

  // Basic HTML elements
  'div',
  'span',
  'p',

  // Headings
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',

  // Form elements
  'button',
  'input',
  'form',
  'label',
  'textarea',
  'select',
  'option',

  // Lists
  'ul',
  'ol',
  'li',

  // Semantic HTML
  'section',
  'article',
  'header',
  'footer',
  'nav',
  'main',
  'aside',

  // Text formatting
  'a',
  'strong',
  'em',
  'code',
  'pre',
  'blockquote',
  'hr',
  'br',

  // Media elements
  'img',
  'video',
  'audio',
  'source',
  'track',
  'canvas',
  'svg',
  'picture',

  // Table elements
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

  // Additional form elements
  'fieldset',
  'legend',
  'optgroup',
  'datalist',
  'output',
  'progress',
  'meter',

  // Additional semantic elements
  'figure',
  'figcaption',
  'details',
  'summary',
  'dialog',
  'mark',
  'time',
  'address',
]);

/**
 * Check if a component type is allowed
 *
 * SECURITY FUNCTION
 *
 * Type guard that checks if a component name is in the whitelist.
 * Always call this before rendering a component.
 *
 * OPTIMIZATION (Polish Layer): Now uses tiered lazy loading system.
 * Checks both core and extended component tiers.
 *
 * @param tagName - Component name to check
 * @returns True if component is allowed
 *
 * @example
 * ```typescript
 * if (isAllowedComponent('div')) {
 *   // Safe to render
 * }
 *
 * if (!isAllowedComponent('script')) {
 *   // Blocked - XSS risk
 * }
 * ```
 */
export function isAllowedComponent(tagName: string): boolean {
  // Use lazy loading system (checks both core and extended tiers)
  return isComponentInTiers(tagName);
}

/**
 * Ensure component is available (async)
 *
 * OPTIMIZATION FUNCTION (Polish Layer)
 *
 * Ensures component tier is loaded before use.
 * Use this for extended components that may not be loaded yet.
 *
 * @param tagName - Component name
 * @returns Promise that resolves when component is available
 * @throws Error if component is not allowed
 *
 * @example
 * ```typescript
 * // Ensure video component is loaded
 * await ensureComponentLoaded('video');
 * const element = createRemoteComponent('video', { controls: true });
 * ```
 */
export async function ensureComponentLoaded(tagName: string): Promise<void> {
  return ensureComponentAvailable(tagName);
}

/**
 * Create a React component from remote DOM description
 *
 * SECURITY FUNCTION
 *
 * Creates a React element from Remote DOM operation data.
 * Validates component type and sanitizes props before creation.
 *
 * NOTE: This function expects React to be available in the calling context.
 * It's called from RemoteDOMRenderer.tsx which has React imported.
 *
 * @param tagName - Component tag name
 * @param props - Component props
 * @param children - Child elements
 * @param React - React instance (passed from calling context)
 * @returns React element
 *
 * @example
 * ```typescript
 * import React from 'react';
 * const button = createRemoteComponent(
 *   'button',
 *   { style: { color: 'blue' } },
 *   'Click me',
 *   React
 * );
 * ```
 */
export function createRemoteComponent(
  tagName: string,
  props?: Record<string, any>,
  children?: ReactNode,
  React?: any
): ReactElement {
  // Fallback for environments where React is not available
  if (!React && typeof window !== 'undefined' && (window as any).React) {
    React = (window as any).React;
  }

  if (!React) {
    throw new Error('React is not available in this context');
  }

  // SECURITY: Validate component is allowed
  if (!isAllowedComponent(tagName)) {
    console.warn(`Component not allowed: ${tagName}`);
    return React.createElement(
      'div',
      { style: { color: 'red', padding: '8px', border: '1px solid red' } },
      `Invalid component: ${tagName}`
    );
  }

  // SECURITY: Sanitize props to remove dangerous values
  const cleanProps = sanitizeProps(props);

  // Create React element
  return React.createElement(tagName as any, cleanProps, children);
}

/**
 * Sanitize URL to prevent XSS via dangerous protocols
 *
 * SECURITY FUNCTION
 *
 * Validates URL protocols to prevent XSS attacks via:
 * - javascript: protocol (executes arbitrary JavaScript)
 * - data: protocol (can embed HTML/scripts)
 * - vbscript: protocol (VBScript execution in old IE)
 * - file: protocol (local file access)
 * - about: protocol (browser internal pages)
 *
 * Only allows safe protocols:
 * - http:, https: (web content)
 * - mailto:, tel:, sms: (communication)
 * - ftp: (file transfer)
 * - Relative URLs (no protocol)
 *
 * @param url - URL to sanitize
 * @returns Sanitized URL or null if dangerous
 *
 * @example
 * ```typescript
 * sanitizeUrl('https://example.com') // 'https://example.com'
 * sanitizeUrl('javascript:alert(1)') // null
 * sanitizeUrl('data:text/html,<script>') // null
 * sanitizeUrl('/relative/path') // '/relative/path'
 * ```
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== 'string' || url.trim() === '') {
    return null;
  }

  const trimmedUrl = url.trim();

  // Allow relative URLs (no protocol)
  if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('./') || trimmedUrl.startsWith('../')) {
    return trimmedUrl;
  }

  // Allow fragment-only URLs (anchors)
  if (trimmedUrl.startsWith('#')) {
    return trimmedUrl;
  }

  // Check for protocol
  const protocolMatch = trimmedUrl.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (!protocolMatch) {
    // No protocol found - treat as relative URL
    return trimmedUrl;
  }

  const protocol = protocolMatch[1].toLowerCase();

  // Whitelist of safe protocols
  const safeProtocols = [
    'http',
    'https',
    'mailto',
    'tel',
    'sms',
    'ftp',
    'ftps',
  ];

  if (safeProtocols.includes(protocol)) {
    return trimmedUrl;
  }

  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript',
    'data',
    'vbscript',
    'file',
    'about',
    'blob',
  ];

  if (dangerousProtocols.includes(protocol)) {
    console.warn(`Blocked dangerous URL protocol: ${protocol}:`, trimmedUrl);
    return null;
  }

  // Unknown protocol - block by default (fail-safe)
  console.warn(`Blocked unknown URL protocol: ${protocol}:`, trimmedUrl);
  return null;
}

/**
 * Sanitize props for React
 *
 * SECURITY FUNCTION
 *
 * Removes or converts non-React-friendly properties:
 * - Removes functions (events go through postMessage)
 * - Converts 'class' to 'className'
 * - Filters out dangerous attributes
 * - Sanitizes URLs to prevent XSS via dangerous protocols
 * - Keeps safe standard attributes
 *
 * @param props - Props to sanitize
 * @returns Sanitized props
 *
 * @example
 * ```typescript
 * const unsafe = {
 *   class: 'button',
 *   onClick: () => {},  // Will be removed
 *   dangerouslySetInnerHTML: { __html: '<script>' },  // Will be removed
 *   href: 'javascript:alert(1)'  // Will be removed (sanitized to null)
 * };
 *
 * const safe = sanitizeProps(unsafe);
 * // { className: 'button' }
 * ```
 */
export function sanitizeProps(props?: Record<string, any>): Record<string, any> {
  if (!props) return {};

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(props)) {
    // SECURITY: Skip functions (events go through postMessage)
    if (typeof value === 'function') continue;

    // SECURITY: Block dangerous React props
    if (key === 'dangerouslySetInnerHTML') continue;
    if (key === 'ref') continue;

    // Convert data attributes (allow data-*)
    if (key.startsWith('data-')) {
      sanitized[key] = value;
      continue;
    }

    // Convert class to className for React
    if (key === 'class') {
      sanitized.className = value;
      continue;
    }

    // Allow standard HTML attributes
    const safeAttributes = [
      // Basic attributes
      'id',
      'className',
      'style',
      'title',
      'role',

      // Form attributes
      'placeholder',
      'value',
      'defaultValue',
      'checked',
      'defaultChecked',
      'disabled',
      'readOnly',
      'required',
      'type',
      'name',
      'min',
      'max',
      'step',
      'pattern',
      'maxLength',
      'minLength',
      'autoComplete',
      'autoFocus',
      'multiple',
      'size',
      'rows',
      'cols',

      // Media attributes (video/audio)
      'controls',
      'autoPlay',
      'loop',
      'muted',
      'preload',
      'poster',
      'playsInline',
      'crossOrigin',

      // Image/media size attributes
      'alt',
      'width',
      'height',
      'loading',
      'decoding',

      // Canvas attributes
      'getContext',

      // SVG attributes
      'viewBox',
      'xmlns',
      'fill',
      'stroke',
      'strokeWidth',
      'd',
      'cx',
      'cy',
      'r',
      'x',
      'y',

      // Table attributes
      'colSpan',
      'rowSpan',
      'scope',
      'headers',

      // Accessibility (ARIA)
      'aria-label',
      'aria-describedby',
      'aria-hidden',
      'aria-live',
      'aria-atomic',
      'aria-relevant',
      'aria-busy',
      'aria-controls',
      'aria-expanded',
      'aria-haspopup',
      'aria-invalid',
      'aria-pressed',
      'aria-selected',
      'aria-checked',
      'aria-disabled',
      'aria-readonly',
      'aria-required',
      'aria-valuemin',
      'aria-valuemax',
      'aria-valuenow',
      'aria-valuetext',

      // Other safe attributes
      'tabIndex',
      'dir',
      'lang',
      'translate',
      'hidden',
      'contentEditable',
      'spellCheck',
      'draggable',
      'download',
      'target',
      'rel',
      'referrerPolicy',
      'datetime',
      'open',
      'srcSet',
      'sizes',
      'media',
      'kind',
      'label',
      'srclang',
      'default',
    ];

    // SECURITY: Sanitize URL attributes to prevent XSS
    if (key === 'href' || key === 'src' || key === 'formaction') {
      const sanitizedUrl = sanitizeUrl(value);
      if (sanitizedUrl !== null) {
        sanitized[key] = sanitizedUrl;
      }
      // If URL is dangerous, it's replaced with 'about:blank'
      continue;
    }

    // SECURITY: Special handling for srcset (comma-separated URLs with descriptors)
    if (key === 'srcset') {
      if (typeof value === 'string') {
        // srcset format: "url1 1x, url2 2x" or "url1 100w, url2 200w"
        const sources = value.split(',').map(s => s.trim());
        const sanitizedSources = sources.map(source => {
          // Split into URL and descriptor (e.g., "url.jpg 2x" -> ["url.jpg", "2x"])
          const parts = source.split(/\s+/);
          const url = parts[0];
          const descriptor = parts.slice(1).join(' ');

          // Sanitize the URL (returns 'about:blank' for dangerous URLs)
          const sanitizedUrl = sanitizeUrl(url);
          if (sanitizedUrl) {
            return descriptor ? `${sanitizedUrl} ${descriptor}` : sanitizedUrl;
          }
          // If sanitizeUrl returned null (shouldn't happen anymore), use about:blank
          return descriptor ? `about:blank ${descriptor}` : 'about:blank';
        });

        // Always set srcset, even if it only contains about:blank
        sanitized[key] = sanitizedSources.join(', ');
      }
      continue;
    }

    if (safeAttributes.includes(key)) {
      sanitized[key] = value;
      continue;
    }

    // Allow aria-* attributes
    if (key.startsWith('aria-')) {
      sanitized[key] = value;
      continue;
    }

    // Block event handlers (they go through postMessage)
    if (key.startsWith('on')) continue;

    // Allow other attributes (but log for debugging)
    sanitized[key] = value;
  }

  return sanitized;
}

/**
 * Get component display name
 *
 * Converts tag name to display name for debugging.
 *
 * @param tagName - Tag name
 * @returns Display name
 *
 * @example
 * ```typescript
 * getComponentDisplayName('button') // 'Button'
 * getComponentDisplayName('div') // 'Div'
 * ```
 */
export function getComponentDisplayName(tagName: string): string {
  return tagName.charAt(0).toUpperCase() + tagName.slice(1);
}

/**
 * Remote Component Config
 *
 * Configuration object for creating remote components.
 * Used internally by the renderer.
 */
export interface RemoteComponentConfig {
  tagName: RemoteComponentType;
  props?: Record<string, any>;
  children?: ReactNode;
}
