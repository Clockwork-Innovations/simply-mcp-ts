/**
 * Remote DOM Context
 *
 * React Context system for Remote DOM component composition.
 * Provides access to the Worker Manager and utilities for component implementation.
 *
 * This module enables React components to:
 * 1. Access the Remote DOM Worker Manager
 * 2. Generate unique node IDs
 * 3. Send operations to the worker
 * 4. Register event handlers
 *
 * @module client/remote-dom/RemoteDOMContext
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { RemoteDOMWorkerManager } from './RemoteDOMWorkerManager.js';
import type { RemoteDOMOperation } from './types.js';

/**
 * Remote DOM Context Value
 *
 * Value provided by the RemoteDOMContext.
 */
export interface RemoteDOMContextValue {
  /**
   * Worker Manager instance
   */
  manager: RemoteDOMWorkerManager;

  /**
   * Send an operation to the worker
   */
  sendOperation: (operation: RemoteDOMOperation) => Promise<any>;

  /**
   * Register an event handler
   */
  registerEventHandler: (nodeId: string, eventType: string, handler: Function) => string;

  /**
   * Unregister an event handler
   */
  unregisterEventHandler: (handlerId: string) => void;

  /**
   * Event handler registry
   */
  eventHandlers: Map<string, Function>;
}

/**
 * Remote DOM Context
 *
 * Context for sharing Remote DOM Manager across component tree.
 */
const RemoteDOMContext = createContext<RemoteDOMContextValue | null>(null);

/**
 * Remote DOM Provider Props
 */
export interface RemoteDOMProviderProps {
  /**
   * Worker Manager instance
   */
  manager: RemoteDOMWorkerManager;

  /**
   * Child components
   */
  children: React.ReactNode;
}

/**
 * Remote DOM Provider
 *
 * Wraps component tree to provide Remote DOM functionality.
 *
 * @example
 * ```tsx
 * const manager = new RemoteDOMWorkerManager();
 * await manager.init();
 *
 * <RemoteDOMProvider manager={manager}>
 *   <Button onClick={() => console.log('clicked')}>
 *     Click Me
 *   </Button>
 * </RemoteDOMProvider>
 * ```
 */
export const RemoteDOMProvider: React.FC<RemoteDOMProviderProps> = ({ manager, children }) => {
  // Event handler registry (handlerId -> handler function)
  const [eventHandlers] = useState(() => new Map<string, Function>());

  /**
   * Send operation to worker
   */
  const sendOperation = useCallback(
    async (operation: RemoteDOMOperation) => {
      return manager.sendOperation(operation);
    },
    [manager]
  );

  /**
   * Register event handler
   *
   * Returns a handler ID that can be used to unregister the handler.
   */
  const registerEventHandler = useCallback(
    (nodeId: string, eventType: string, handler: Function): string => {
      const handlerId = `${nodeId}-${eventType}-${Date.now()}-${Math.random()}`;
      eventHandlers.set(handlerId, handler);
      return handlerId;
    },
    [eventHandlers]
  );

  /**
   * Unregister event handler
   */
  const unregisterEventHandler = useCallback(
    (handlerId: string): void => {
      eventHandlers.delete(handlerId);
    },
    [eventHandlers]
  );

  const value: RemoteDOMContextValue = {
    manager,
    sendOperation,
    registerEventHandler,
    unregisterEventHandler,
    eventHandlers,
  };

  return <RemoteDOMContext.Provider value={value}>{children}</RemoteDOMContext.Provider>;
};

/**
 * Use Remote DOM Manager
 *
 * Hook to access the Remote DOM Manager from context.
 *
 * @throws Error if used outside RemoteDOMProvider
 *
 * @example
 * ```tsx
 * const CustomComponent = () => {
 *   const manager = useRemoteDOMManager();
 *
 *   useEffect(() => {
 *     manager.sendOperation({
 *       type: 'createElement',
 *       tagName: 'div',
 *       nodeId: 'custom-div'
 *     });
 *   }, [manager]);
 *
 *   return null;
 * };
 * ```
 */
export function useRemoteDOMManager(): RemoteDOMWorkerManager {
  const context = useContext(RemoteDOMContext);
  if (!context) {
    throw new Error('useRemoteDOMManager must be used within RemoteDOMProvider');
  }
  return context.manager;
}

/**
 * Use Remote DOM Context
 *
 * Hook to access the full Remote DOM context value.
 *
 * @throws Error if used outside RemoteDOMProvider
 *
 * @example
 * ```tsx
 * const CustomComponent = () => {
 *   const { sendOperation, registerEventHandler } = useRemoteDOMContext();
 *
 *   const handleClick = useCallback(() => {
 *     console.log('Element clicked');
 *   }, []);
 *
 *   useEffect(() => {
 *     const nodeId = 'my-element';
 *     sendOperation({
 *       type: 'createElement',
 *       tagName: 'button',
 *       nodeId
 *     });
 *
 *     const handlerId = registerEventHandler(nodeId, 'click', handleClick);
 *
 *     return () => {
 *       unregisterEventHandler(handlerId);
 *     };
 *   }, [sendOperation, registerEventHandler, handleClick]);
 *
 *   return null;
 * };
 * ```
 */
export function useRemoteDOMContext(): RemoteDOMContextValue {
  const context = useContext(RemoteDOMContext);
  if (!context) {
    throw new Error('useRemoteDOMContext must be used within RemoteDOMProvider');
  }
  return context;
}

/**
 * Node ID Counter
 *
 * Global counter for generating unique node IDs.
 */
let nodeIdCounter = 0;

/**
 * Use Remote DOM Node ID
 *
 * Hook to generate a unique node ID for a component.
 * The ID remains stable across re-renders.
 *
 * @returns Unique node ID
 *
 * @example
 * ```tsx
 * const Button = ({ children, onClick }) => {
 *   const nodeId = useRemoteDOMNodeId();
 *   const { sendOperation, registerEventHandler } = useRemoteDOMContext();
 *
 *   useEffect(() => {
 *     // Create element
 *     sendOperation({
 *       type: 'createElement',
 *       tagName: 'button',
 *       nodeId
 *     });
 *
 *     // Register event handler
 *     if (onClick) {
 *       const handlerId = registerEventHandler(nodeId, 'click', onClick);
 *       return () => unregisterEventHandler(handlerId);
 *     }
 *   }, [nodeId, sendOperation, onClick]);
 *
 *   return null;
 * };
 * ```
 */
export function useRemoteDOMNodeId(): string {
  const [nodeId] = useState(() => `node-${++nodeIdCounter}`);
  return nodeId;
}

/**
 * Reset Node ID Counter
 *
 * Utility function to reset the node ID counter.
 * Useful for testing to ensure consistent IDs.
 *
 * WARNING: Only use this in tests, never in production code.
 *
 * @example
 * ```typescript
 * // In test setup
 * beforeEach(() => {
 *   resetNodeIdCounter();
 * });
 * ```
 */
export function resetNodeIdCounter(): void {
  nodeIdCounter = 0;
}
