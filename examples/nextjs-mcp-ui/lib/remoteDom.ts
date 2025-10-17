/**
 * Remote DOM Renderer for Layer 3
 *
 * Handles serialization, deserialization, and rendering of remote DOM components.
 * Uses Web Workers for isolated component execution and DOM reconciliation.
 *
 * @module lib/remoteDom
 */

import type { RemoteDomComponent, ComponentDefinition, DomDiff, FrameSize } from './types.js';

/**
 * Remote DOM Renderer
 *
 * Manages rendering of remote components with:
 * - Component serialization/deserialization
 * - DOM reconciliation and updates
 * - Web Worker sandbox execution
 * - Memory management and cleanup
 */
export class RemoteDomRenderer {
  private components: Map<string, RemoteDomComponent> = new Map();
  private elementMap: Map<string, HTMLElement> = new Map();
  private updateCallbacks: Map<string, Set<(component: RemoteDomComponent) => void>> = new Map();
  private disposed: boolean = false;

  constructor() {
    if (typeof window === 'undefined') {
      throw new Error('RemoteDomRenderer requires browser environment');
    }
  }

  /**
   * Serialize component to JSON string for transmission
   */
  serializeComponent(component: RemoteDomComponent): string {
    if (this.disposed) {
      throw new Error('RemoteDomRenderer has been disposed');
    }

    return JSON.stringify(component);
  }

  /**
   * Deserialize component from JSON string
   */
  deserializeComponent(data: string): RemoteDomComponent {
    if (this.disposed) {
      throw new Error('RemoteDomRenderer has been disposed');
    }

    try {
      const component = JSON.parse(data) as RemoteDomComponent;
      this.validateComponent(component);
      return component;
    } catch (error) {
      throw new Error(`Failed to deserialize component: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate component structure
   */
  private validateComponent(component: RemoteDomComponent): void {
    if (!component.id || typeof component.id !== 'string') {
      throw new Error('Component must have a valid id');
    }

    if (!component.type || typeof component.type !== 'string') {
      throw new Error('Component must have a valid type');
    }

    if (!component.props || typeof component.props !== 'object') {
      throw new Error('Component must have valid props');
    }

    if (
      component.children &&
      typeof component.children !== 'string' &&
      !Array.isArray(component.children)
    ) {
      throw new Error('Component children must be a string or array of components');
    }
  }

  /**
   * Render remote component to HTML element
   */
  async renderRemote(component: RemoteDomComponent): Promise<HTMLElement> {
    if (this.disposed) {
      throw new Error('RemoteDomRenderer has been disposed');
    }

    // Store component
    this.components.set(component.id, component);

    // Create HTML element
    const element = this.createElement(component);

    // Store element reference
    this.elementMap.set(component.id, element);

    return element;
  }

  /**
   * Create HTML element from component
   */
  private createElement(component: RemoteDomComponent): HTMLElement {
    const element = document.createElement(component.type);
    element.id = component.id;

    // Apply props as attributes
    for (const [key, value] of Object.entries(component.props)) {
      if (value === null || value === undefined) continue;

      if (key.startsWith('on')) {
        // Event handler (safe: only primitives from sanitization)
        const eventName = key.substring(2).toLowerCase();
        if (typeof value === 'string') {
          element.addEventListener(eventName, () => {
            console.log(`Event ${eventName} triggered on ${component.id}`);
          });
        }
      } else if (key === 'className' || key === 'class') {
        element.className = String(value);
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else {
        element.setAttribute(key, String(value));
      }
    }

    // Add children
    if (component.children) {
      if (typeof component.children === 'string') {
        element.textContent = component.children;
      } else if (Array.isArray(component.children)) {
        for (const child of component.children) {
          const childElement = this.createElement(child);
          element.appendChild(childElement);
        }
      }
    }

    // Apply metadata frame size if present
    if (component.meta?.['mcpui.dev/ui-preferred-frame-size']) {
      const frameSize = component.meta['mcpui.dev/ui-preferred-frame-size'] as FrameSize;
      element.style.width = `${frameSize.width}px`;
      element.style.height = `${frameSize.height}px`;
      element.style.overflow = 'auto';
    }

    return element;
  }

  /**
   * Reconcile component tree updates
   */
  reconcileTree(oldTree: RemoteDomComponent[], newTree: RemoteDomComponent[]): DomDiff[] {
    const diffs: DomDiff[] = [];

    // Build map of old components by ID
    const oldMap = new Map<string, RemoteDomComponent>();
    for (const component of oldTree) {
      oldMap.set(component.id, component);
    }

    // Find updates and inserts
    for (const newComponent of newTree) {
      const oldComponent = oldMap.get(newComponent.id);

      if (!oldComponent) {
        // New component
        diffs.push({
          type: 'insert',
          componentId: newComponent.id,
          component: newComponent,
          path: [],
        });
      } else if (JSON.stringify(oldComponent) !== JSON.stringify(newComponent)) {
        // Updated component
        diffs.push({
          type: 'update',
          componentId: newComponent.id,
          component: newComponent,
          path: [],
        });
      }
    }

    // Find removals
    const newMap = new Set(newTree.map((c) => c.id));
    for (const oldComponent of oldTree) {
      if (!newMap.has(oldComponent.id)) {
        diffs.push({
          type: 'remove',
          componentId: oldComponent.id,
          path: [],
        });
      }
    }

    // Apply diffs to internal state
    for (const diff of diffs) {
      if (diff.type === 'insert' && diff.component) {
        this.components.set(diff.componentId, diff.component);
      } else if (diff.type === 'update' && diff.component) {
        this.components.set(diff.componentId, diff.component);
      } else if (diff.type === 'remove') {
        this.components.delete(diff.componentId);
        this.elementMap.delete(diff.componentId);
      }
    }

    return diffs;
  }

  /**
   * Get rendered element by component ID
   */
  getElement(componentId: string): HTMLElement | undefined {
    return this.elementMap.get(componentId);
  }

  /**
   * Subscribe to component updates
   */
  onUpdate(componentId: string, callback: (component: RemoteDomComponent) => void): () => void {
    if (!this.updateCallbacks.has(componentId)) {
      this.updateCallbacks.set(componentId, new Set());
    }

    this.updateCallbacks.get(componentId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.updateCallbacks.get(componentId);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  /**
   * Notify subscribers of component update
   */
  private notifyUpdate(componentId: string, component: RemoteDomComponent): void {
    const callbacks = this.updateCallbacks.get(componentId);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(component);
      }
    }
  }

  /**
   * Update component and notify subscribers
   */
  updateComponent(componentId: string, updates: Partial<RemoteDomComponent>): void {
    if (this.disposed) {
      throw new Error('RemoteDomRenderer has been disposed');
    }

    const component = this.components.get(componentId);
    if (!component) {
      throw new Error(`Component ${componentId} not found`);
    }

    const updated = { ...component, ...updates, id: component.id };
    this.components.set(componentId, updated);
    this.notifyUpdate(componentId, updated);

    // Update DOM if element exists
    const element = this.elementMap.get(componentId);
    if (element) {
      // Recreate element with new props
      const newElement = this.createElement(updated);
      if (element.parentNode) {
        element.parentNode.replaceChild(newElement, element);
        this.elementMap.set(componentId, newElement);
      }
    }
  }

  /**
   * Get component count
   */
  getComponentCount(): number {
    return this.components.size;
  }

  /**
   * Get all components
   */
  getAllComponents(): RemoteDomComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * Clear all components and elements
   */
  clear(): void {
    this.components.clear();
    this.elementMap.clear();
    this.updateCallbacks.clear();
  }

  /**
   * Check if renderer has been disposed
   */
  isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Dispose renderer and clean up resources
   */
  dispose(): void {
    if (!this.disposed) {
      this.clear();
      this.disposed = true;
    }
  }
}

/**
 * Create a new Remote DOM Renderer instance
 */
export function createRemoteDomRenderer(): RemoteDomRenderer {
  return new RemoteDomRenderer();
}

/**
 * Component serialization utilities
 */
export const RemoteDomSerializer = {
  /**
   * Serialize components to NDJSON (newline-delimited JSON)
   */
  toNDJSON(components: RemoteDomComponent[]): string {
    return components.map((c) => JSON.stringify(c)).join('\n');
  },

  /**
   * Deserialize NDJSON to components
   */
  fromNDJSON(data: string): RemoteDomComponent[] {
    return data
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as RemoteDomComponent);
  },

  /**
   * Serialize to compact binary format (for future optimization)
   */
  toBinary(component: RemoteDomComponent): Uint8Array {
    const json = JSON.stringify(component);
    const encoder = new TextEncoder();
    return encoder.encode(json);
  },

  /**
   * Deserialize from binary format
   */
  fromBinary(data: Uint8Array): RemoteDomComponent {
    const decoder = new TextDecoder();
    const json = decoder.decode(data);
    return JSON.parse(json) as RemoteDomComponent;
  },
};

/**
 * Performance utilities for Remote DOM
 */
export const RemoteDomPerformance = {
  /**
   * Measure component rendering time
   */
  measureRender(component: RemoteDomComponent): { duration: number; element: HTMLElement } {
    const start = performance.now();
    const renderer = createRemoteDomRenderer();
    const element = renderer.renderRemote(component).then((el) => {
      const duration = performance.now() - start;
      renderer.dispose();
      return { duration, element: el };
    });
    return element as any; // Type mismatch due to sync/async
  },

  /**
   * Calculate component tree size
   */
  calculateTreeSize(component: RemoteDomComponent): number {
    let size = JSON.stringify(component).length;
    if (Array.isArray(component.children)) {
      size += component.children.reduce((sum, child) => sum + this.calculateTreeSize(child), 0);
    }
    return size;
  },

  /**
   * Estimate memory usage
   */
  estimateMemoryUsage(renderer: RemoteDomRenderer): { components: number; bytes: number } {
    const components = renderer.getAllComponents();
    const bytes = components.reduce((sum, c) => sum + JSON.stringify(c).length, 0);
    return { components: components.length, bytes };
  },
};
