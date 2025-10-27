/**
 * Component Registry - Reusable UI component storage
 *
 * Provides a singleton registry for sharing components across UIs.
 * Components are registered by URI and can be imported by other UIs.
 */

/**
 * Component metadata
 */
export interface ComponentMetadata {
  /** Component URI (e.g., 'ui://components/Button') */
  uri: string;
  /** Display name */
  name: string;
  /** Component file path */
  file: string;
  /** Component version */
  version: string;
  /** NPM dependencies */
  dependencies?: string[];
  /** Description */
  description?: string;
}

/**
 * Component Registry
 *
 * Singleton registry for storing and retrieving reusable components.
 */
export class ComponentRegistry {
  private components = new Map<string, ComponentMetadata>();

  /**
   * Register a component
   */
  register(metadata: ComponentMetadata): void {
    if (this.components.has(metadata.uri)) {
      throw new Error(
        `Component already registered: ${metadata.uri}\n` +
        `Use a different URI or unregister the existing component first.`
      );
    }

    this.components.set(metadata.uri, metadata);
  }

  /**
   * Get component by URI
   */
  get(uri: string): ComponentMetadata | undefined {
    return this.components.get(uri);
  }

  /**
   * Check if component exists
   */
  has(uri: string): boolean {
    return this.components.has(uri);
  }

  /**
   * List all registered components
   */
  list(): ComponentMetadata[] {
    return Array.from(this.components.values());
  }

  /**
   * Unregister a component
   */
  unregister(uri: string): boolean {
    return this.components.delete(uri);
  }

  /**
   * Clear all components
   */
  clear(): void {
    this.components.clear();
  }

  /**
   * Get registry size
   */
  get size(): number {
    return this.components.size;
  }
}

/**
 * Singleton component registry instance
 */
export const registry = new ComponentRegistry();
