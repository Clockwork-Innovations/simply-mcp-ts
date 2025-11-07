/**
 * URI Template Matcher
 *
 * Matches URIs against templates with parameter placeholders and extracts parameter values.
 *
 * Template Syntax:
 * - {param} - single parameter placeholder
 * - Multiple parameters supported: api://{version}/{endpoint}
 *
 * Matching Priority:
 * 1. Exact matches (highest priority)
 * 2. Template matches (parameterized URIs)
 *
 * @example
 * ```typescript
 * const resources = new Map([
 *   ['pokemon://pikachu', { uri: 'pokemon://pikachu', ... }], // exact
 *   ['pokemon://{name}', { uri: 'pokemon://{name}', ... }],   // template
 * ]);
 *
 * // Exact match takes precedence
 * matchResourceUri('pokemon://pikachu', resources);
 * // => { resource: ..., params: {} }
 *
 * // Template match with parameter extraction
 * matchResourceUri('pokemon://charizard', resources);
 * // => { resource: ..., params: { name: 'charizard' } }
 * ```
 */

import type { ResourceDefinition } from './builder-types.js';

/**
 * Result of matching a URI against resource templates
 */
export interface MatchResult {
  /** The matched resource definition */
  resource: ResourceDefinition;
  /** Extracted parameters from the URI template */
  params: Record<string, string>;
}

/**
 * Match a request URI against registered resources, supporting both exact and template matches.
 *
 * @param requestUri - The URI to match (e.g., "pokemon://pikachu")
 * @param resources - Map of registered resources
 * @returns Match result with resource and extracted params, or null if no match
 */
export function matchResourceUri(
  requestUri: string,
  resources: Map<string, ResourceDefinition>
): MatchResult | null {
  // Priority 1: Try exact match first
  const exactMatch = resources.get(requestUri);
  if (exactMatch) {
    return {
      resource: exactMatch,
      params: {},
    };
  }

  // Priority 2: Try template matches
  for (const [templateUri, resource] of resources) {
    // Skip if this is not a template (no parameters)
    if (!templateUri.includes('{')) {
      continue;
    }

    const match = matchTemplate(requestUri, templateUri);
    if (match !== null) {
      return {
        resource,
        params: match,
      };
    }
  }

  // No match found
  return null;
}

/**
 * Match a URI against a template and extract parameter values.
 *
 * @param uri - The actual URI (e.g., "pokemon://pikachu")
 * @param template - The template URI (e.g., "pokemon://{name}")
 * @returns Extracted parameters or null if no match
 */
function matchTemplate(uri: string, template: string): Record<string, string> | null {
  // Split both URI and template into segments
  // Handle both :// and / as delimiters
  const uriSegments = splitUri(uri);
  const templateSegments = splitUri(template);

  // Must have same number of segments to match
  if (uriSegments.length !== templateSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};

  // Match each segment
  for (let i = 0; i < templateSegments.length; i++) {
    const templateSegment = templateSegments[i];
    const uriSegment = uriSegments[i];

    // Check if this is a parameter placeholder
    const paramMatch = /^\{([a-zA-Z0-9_]+)\}$/.exec(templateSegment);

    if (paramMatch) {
      // This is a parameter - extract the value
      const paramName = paramMatch[1];
      params[paramName] = uriSegment;
    } else {
      // This is a literal segment - must match exactly
      if (templateSegment !== uriSegment) {
        return null;
      }
    }
  }

  return params;
}

/**
 * Split a URI into segments for matching.
 * Handles :// and / as delimiters.
 *
 * @param uri - URI to split
 * @returns Array of segments
 *
 * @example
 * splitUri("pokemon://pikachu") => ["pokemon:", "pikachu"]
 * splitUri("api://v1/users") => ["api:", "v1", "users"]
 */
function splitUri(uri: string): string[] {
  // First split by :// to separate scheme from the rest
  const parts = uri.split('://');

  if (parts.length === 1) {
    // No :// found, just split by /
    return uri.split('/').filter(s => s.length > 0);
  }

  // We have a scheme (e.g., "pokemon")
  const scheme = parts[0] + ':'; // Keep the colon with the scheme
  const rest = parts[1];

  // Split the rest by /
  const pathSegments = rest.split('/').filter(s => s.length > 0);

  return [scheme, ...pathSegments];
}
