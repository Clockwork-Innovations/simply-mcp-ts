/**
 * Audit Logging System
 *
 * Provides comprehensive audit trail for security events:
 * - Tool executions
 * - Permission checks
 * - Rate limit violations
 * - Authentication attempts
 * - Structured JSON format
 * - File and console logging
 */

import { appendFileSync, existsSync, mkdirSync, statSync, renameSync } from 'fs';
import { dirname, join } from 'path';
import { AuditConfig, AuditLogEntry, AuditEventType, SecurityContext } from './types.js';

/**
 * Audit logger implementation
 */
export class AuditLogger {
  private config: AuditConfig;
  private logBuffer: AuditLogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly maxBufferSize = 100;

  constructor(config: AuditConfig) {
    this.config = config;

    // Ensure log directory exists
    if (this.config.enabled) {
      this.ensureLogDirectory();

      // Start periodic flush
      this.flushInterval = setInterval(() => this.flush(), 5000); // Flush every 5 seconds
    }
  }

  /**
   * Log an audit event
   */
  log(
    eventType: AuditEventType,
    result: 'success' | 'failure' | 'warning',
    context?: SecurityContext,
    details?: {
      toolName?: string;
      resource?: string;
      permissions?: string[];
      error?: string;
      ipAddress?: string;
      userAgent?: string;
      [key: string]: any;
    }
  ): void {
    if (!this.config.enabled) {
      return;
    }

    // Filter events if specific events are configured
    if (this.config.events && this.config.events.length > 0) {
      if (!this.config.events.includes(eventType)) {
        return;
      }
    }

    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      result,
      sessionId: context?.sessionId,
      apiKeyName: context?.apiKey?.name,
      ipAddress: details?.ipAddress || context?.ipAddress,
      userAgent: details?.userAgent || context?.userAgent,
      toolName: details?.toolName,
      resource: details?.resource,
      permissions: details?.permissions,
      details: this.sanitizeDetails(details),
    };

    // Add to buffer
    this.logBuffer.push(entry);

    // Log to console if configured
    if (this.config.logToConsole) {
      this.logToConsole(entry);
    }

    // Flush if buffer is full
    if (this.logBuffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * Log authentication success
   */
  logAuthenticationSuccess(
    apiKeyName: string,
    sessionId?: string,
    ipAddress?: string,
    userAgent?: string
  ): void {
    this.log(
      'authentication.success',
      'success',
      undefined,
      {
        apiKeyName,
        sessionId,
        ipAddress,
        userAgent,
      }
    );
  }

  /**
   * Log authentication failure
   */
  logAuthenticationFailure(
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): void {
    this.log(
      'authentication.failure',
      'failure',
      undefined,
      {
        error: reason,
        ipAddress,
        userAgent,
      }
    );
  }

  /**
   * Log missing authentication
   */
  logAuthenticationMissing(
    ipAddress?: string,
    userAgent?: string
  ): void {
    this.log(
      'authentication.missing',
      'failure',
      undefined,
      {
        error: 'No authentication provided',
        ipAddress,
        userAgent,
      }
    );
  }

  /**
   * Log permission check
   */
  logPermissionCheck(
    granted: boolean,
    context: SecurityContext,
    permissions: string[],
    resource?: string
  ): void {
    this.log(
      granted ? 'authorization.granted' : 'authorization.denied',
      granted ? 'success' : 'failure',
      context,
      {
        permissions,
        resource,
      }
    );
  }

  /**
   * Log tool execution
   */
  logToolExecution(
    toolName: string,
    context: SecurityContext,
    success: boolean,
    error?: string,
    duration?: number
  ): void {
    this.log(
      success ? 'tool.executed' : 'tool.failed',
      success ? 'success' : 'failure',
      context,
      {
        toolName,
        error,
        duration,
      }
    );
  }

  /**
   * Log rate limit violation
   */
  logRateLimitExceeded(
    context: SecurityContext,
    toolName?: string,
    currentRequests?: number,
    maxRequests?: number
  ): void {
    this.log(
      'ratelimit.exceeded',
      'warning',
      context,
      {
        toolName,
        currentRequests,
        maxRequests,
      }
    );
  }

  /**
   * Log rate limit warning (approaching limit)
   */
  logRateLimitWarning(
    context: SecurityContext,
    toolName?: string,
    currentRequests?: number,
    maxRequests?: number
  ): void {
    this.log(
      'ratelimit.warning',
      'warning',
      context,
      {
        toolName,
        currentRequests,
        maxRequests,
      }
    );
  }

  /**
   * Log session creation
   */
  logSessionCreated(sessionId: string, context: SecurityContext): void {
    this.log(
      'session.created',
      'success',
      context,
      {
        sessionId,
      }
    );
  }

  /**
   * Log session termination
   */
  logSessionTerminated(sessionId: string, reason?: string): void {
    this.log(
      'session.terminated',
      'success',
      undefined,
      {
        sessionId,
        reason,
      }
    );
  }

  /**
   * Log security violation
   */
  logSecurityViolation(
    reason: string,
    context?: SecurityContext,
    details?: any
  ): void {
    this.log(
      'security.violation',
      'failure',
      context,
      {
        error: reason,
        ...details,
      }
    );
  }

  /**
   * Flush buffered logs to file
   */
  flush(): void {
    if (this.logBuffer.length === 0) {
      return;
    }

    try {
      // Check if rotation is needed
      this.rotateIfNeeded();

      // Write all buffered entries
      const logLines = this.logBuffer.map(entry => JSON.stringify(entry)).join('\n') + '\n';
      appendFileSync(this.config.logFile, logLines, 'utf-8');

      // Clear buffer
      this.logBuffer = [];
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    const logDir = dirname(this.config.logFile);
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Rotate log file if it exceeds max size
   */
  private rotateIfNeeded(): void {
    if (!this.config.maxFileSize) {
      return;
    }

    try {
      if (!existsSync(this.config.logFile)) {
        return;
      }

      const stats = statSync(this.config.logFile);
      if (stats.size >= this.config.maxFileSize) {
        this.rotateLogs();
      }
    } catch (error) {
      console.error('Failed to check log file size:', error);
    }
  }

  /**
   * Rotate log files
   */
  private rotateLogs(): void {
    const maxFiles = this.config.maxFiles || 5;
    const logDir = dirname(this.config.logFile);
    const logName = this.config.logFile.split('/').pop() || 'audit.log';

    // Rotate existing files
    for (let i = maxFiles - 1; i >= 1; i--) {
      const oldPath = join(logDir, `${logName}.${i}`);
      const newPath = join(logDir, `${logName}.${i + 1}`);

      if (existsSync(oldPath)) {
        if (i === maxFiles - 1) {
          // Delete oldest file
          try {
            const fs = require('fs');
            fs.unlinkSync(oldPath);
          } catch (error) {
            console.error(`Failed to delete old log file: ${oldPath}`, error);
          }
        } else {
          try {
            renameSync(oldPath, newPath);
          } catch (error) {
            console.error(`Failed to rotate log file: ${oldPath} -> ${newPath}`, error);
          }
        }
      }
    }

    // Rotate current log file
    try {
      const rotatedPath = join(logDir, `${logName}.1`);
      renameSync(this.config.logFile, rotatedPath);
    } catch (error) {
      console.error('Failed to rotate current log file:', error);
    }
  }

  /**
   * Log entry to console
   */
  private logToConsole(entry: AuditLogEntry): void {
    const level = entry.result === 'failure' ? 'error' : entry.result === 'warning' ? 'warn' : 'info';
    const message = `[AUDIT] ${entry.eventType} - ${entry.result}`;
    const details = {
      timestamp: entry.timestamp,
      sessionId: entry.sessionId,
      apiKeyName: entry.apiKeyName,
      toolName: entry.toolName,
      resource: entry.resource,
    };

    console[level](message, details);
  }

  /**
   * Sanitize details to remove sensitive data if configured
   */
  private sanitizeDetails(details?: any): any {
    if (!details) {
      return undefined;
    }

    if (this.config.includeSensitiveData) {
      return details;
    }

    // Create a copy without sensitive fields
    const sanitized = { ...details };
    const sensitiveFields = ['password', 'apiKey', 'token', 'secret', 'key'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        delete sanitized[field];
      }
    }

    return sanitized;
  }

  /**
   * Close the audit logger and flush remaining logs
   */
  close(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    this.flush();
  }

  /**
   * Get audit log statistics
   */
  getStatistics(): {
    bufferedEntries: number;
    logFile: string;
    enabled: boolean;
  } {
    return {
      bufferedEntries: this.logBuffer.length,
      logFile: this.config.logFile,
      enabled: this.config.enabled,
    };
  }
}