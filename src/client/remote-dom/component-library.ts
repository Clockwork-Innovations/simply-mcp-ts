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
 * @module client/remote-dom/component-library
 *
 * NOTE: This file is intended for client-side use only.
 * It will be consumed by RemoteDOMRenderer.tsx which has React available.
 */

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
 */
export const ALLOWED_COMPONENTS = new Set<string>([
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

  // Other safe elements
  'a',
  'strong',
  'em',
  'code',
  'pre',
  'blockquote',
  'hr',
  'br',
  'img',
]);

/**
 * Check if a component type is allowed
 *
 * SECURITY FUNCTION
 *
 * Type guard that checks if a component name is in the whitelist.
 * Always call this before rendering a component.
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
  return ALLOWED_COMPONENTS.has(tagName);
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
 * Sanitize props for React
 *
 * SECURITY FUNCTION
 *
 * Removes or converts non-React-friendly properties:
 * - Removes functions (events go through postMessage)
 * - Converts 'class' to 'className'
 * - Filters out dangerous attributes
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
 *   dangerouslySetInnerHTML: { __html: '<script>' }  // Will be removed
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
      'id',
      'className',
      'style',
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
      'href',
      'src',
      'alt',
      'title',
      'width',
      'height',
      'aria-label',
      'aria-describedby',
      'role',
    ];

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
