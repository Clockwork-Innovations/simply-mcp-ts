/**
 * Registry Handler Resolver - Looks up pre-registered handler functions
 */

import {
  HandlerResolver,
  HandlerConfig,
  RegistryHandlerConfig,
  ToolHandler,
} from '../core/types.js';
import { HandlerNotFoundError, HandlerConfigError } from '../core/errors.js';

/**
 * Resolver for registry-based handlers
 * Maintains an in-memory registry of pre-registered handler functions
 */
export class RegistryHandlerResolver implements HandlerResolver {
  private registry: Map<string, ToolHandler> = new Map();

  /**
   * Check if this resolver can handle the given configuration
   */
  canResolve(config: HandlerConfig): boolean {
    return config.type === 'registry';
  }

  /**
   * Resolve a registry handler configuration to an executable function
   */
  async resolve(config: HandlerConfig): Promise<ToolHandler> {
    if (!this.canResolve(config)) {
      throw new HandlerConfigError(
        `RegistryHandlerResolver cannot resolve handler of type: ${config.type}`
      );
    }

    const registryConfig = config as RegistryHandlerConfig;
    const handler = this.registry.get(registryConfig.name);

    if (!handler) {
      const availableHandlers = Array.from(this.registry.keys()).join(', ');
      throw new HandlerNotFoundError(
        `Handler '${registryConfig.name}' not found in registry. Available handlers: ${availableHandlers || 'none'}`,
        { name: registryConfig.name, availableHandlers }
      );
    }

    return handler;
  }

  /**
   * Register a handler function in the registry
   * @param name Name to register the handler under
   * @param handler Handler function to register
   */
  register(name: string, handler: ToolHandler): void {
    if (this.registry.has(name)) {
      throw new HandlerConfigError(
        `Handler '${name}' is already registered. Use unregister() first if you want to replace it.`,
        { name }
      );
    }

    this.registry.set(name, handler);
  }

  /**
   * Unregister a handler from the registry
   * @param name Name of the handler to unregister
   * @returns True if handler was found and removed, false otherwise
   */
  unregister(name: string): boolean {
    return this.registry.delete(name);
  }

  /**
   * Check if a handler is registered
   * @param name Name of the handler to check
   * @returns True if handler is registered
   */
  has(name: string): boolean {
    return this.registry.has(name);
  }

  /**
   * Get all registered handler names
   * @returns Array of handler names
   */
  list(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Clear all registered handlers
   */
  clear(): void {
    this.registry.clear();
  }

  /**
   * Get the number of registered handlers
   * @returns Number of handlers in registry
   */
  size(): number {
    return this.registry.size;
  }
}
