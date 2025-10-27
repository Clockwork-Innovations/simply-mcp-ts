/**
 * Logger implementation for handler execution
 */

import { Logger } from '../types/handler.js';

/**
 * Log level type for MCP logging notifications
 */
export type LogLevel = 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';

/**
 * Callback function for sending log notifications to MCP client
 */
export type LogNotificationCallback = (level: LogLevel, message: string, data?: unknown) => void;

/**
 * Console-based logger implementation with optional MCP notification support
 */
export class ConsoleLogger implements Logger {
  private prefix: string;
  private notificationCallback?: LogNotificationCallback;
  private silent: boolean;

  constructor(prefix = '[Handler]', notificationCallback?: LogNotificationCallback, silent = false) {
    this.prefix = prefix;
    this.notificationCallback = notificationCallback;
    this.silent = silent;
  }

  debug(message: string, ...args: unknown[]): void {
    if (!this.silent) {
      console.error(`${this.prefix} [DEBUG]`, message, ...args);
    }
    this.sendNotification('debug', message, args);
  }

  info(message: string, ...args: unknown[]): void {
    if (!this.silent) {
      console.error(`${this.prefix} [INFO]`, message, ...args);
    }
    this.sendNotification('info', message, args);
  }

  warn(message: string, ...args: unknown[]): void {
    if (!this.silent) {
      console.warn(`${this.prefix} [WARN]`, message, ...args);
    }
    this.sendNotification('warning', message, args);
  }

  error(message: string, ...args: unknown[]): void {
    if (!this.silent) {
      console.error(`${this.prefix} [ERROR]`, message, ...args);
    }
    this.sendNotification('error', message, args);
  }

  notice(message: string, ...args: unknown[]): void {
    if (!this.silent) {
      console.error(`${this.prefix} [NOTICE]`, message, ...args);
    }
    this.sendNotification('notice', message, args);
  }

  critical(message: string, ...args: unknown[]): void {
    if (!this.silent) {
      console.error(`${this.prefix} [CRITICAL]`, message, ...args);
    }
    this.sendNotification('critical', message, args);
  }

  alert(message: string, ...args: unknown[]): void {
    if (!this.silent) {
      console.error(`${this.prefix} [ALERT]`, message, ...args);
    }
    this.sendNotification('alert', message, args);
  }

  emergency(message: string, ...args: unknown[]): void {
    if (!this.silent) {
      console.error(`${this.prefix} [EMERGENCY]`, message, ...args);
    }
    this.sendNotification('emergency', message, args);
  }

  private sendNotification(level: LogLevel, message: string, args?: unknown[]): void {
    if (this.notificationCallback) {
      const data = args && args.length > 0 ? args : undefined;
      this.notificationCallback(level, message, data);
    }
  }
}

/**
 * Create a default logger instance
 */
export function createDefaultLogger(prefix?: string, notificationCallback?: LogNotificationCallback, silent?: boolean): Logger {
  return new ConsoleLogger(prefix, notificationCallback, silent);
}
