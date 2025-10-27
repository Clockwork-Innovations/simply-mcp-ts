/**
 * Authentication and Security Feature
 *
 * Provides comprehensive authentication and security capabilities including:
 * - API key authentication
 * - Permission-based authorization
 * - Rate limiting (fixed and sliding window)
 * - Audit logging
 * - Session management
 *
 * @module features/auth
 */

// Re-export adapter utilities
export * from './adapter.js';

// Re-export all security features
export * from './security/index.js';
