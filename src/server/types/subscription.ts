/**
 * Subscription types for resource updates
 */

/**
 * Base Subscription interface
 *
 * Subscriptions allow clients to subscribe to resource updates and receive
 * notifications when subscribed resources change.
 *
 * The subscription pattern works as follows:
 * 1. Client sends resources/subscribe request with a resource URI
 * 2. Server tracks the subscription (stores which URIs are subscribed)
 * 3. When a resource changes, server sends notifications/resources/updated
 * 4. Client can unsubscribe with resources/unsubscribe request
 *
 * For the foundation layer, we support exact URI matching only.
 * Future layers may add pattern matching (e.g., "file://**\/*.ts").
 *
 * @example Static Subscription (no handler needed)
 * ```typescript
 * interface ConfigSubscription extends ISubscription {
 *   uri: 'config://server';
 *   description: 'Server configuration changes';
 * }
 * ```
 *
 * @example Dynamic Subscription with Handler
 * ```typescript
 * interface LogSubscription extends ISubscription {
 *   uri: 'log://events';
 *   description: 'Real-time log events';
 *   handler: () => void;  // Called when subscription is activated
 * }
 *
 * class MyServer implements IServer {
 *   'log://events': LogSubscription = () => {
 *     // Start monitoring logs, emit updates via notifyResourceUpdate
 *   }
 * }
 * ```
 */
export interface ISubscription {
  /**
   * Resource URI pattern to subscribe to
   *
   * Foundation layer supports exact URI matching only.
   * Future: Pattern matching like 'file://**\/*.ts'
   */
  uri: string;

  /**
   * Human-readable description
   */
  description: string;

  /**
   * Optional handler called when subscription activates
   * Use this to start watching/monitoring the resource
   */
  handler?: () => void | Promise<void>;
}
