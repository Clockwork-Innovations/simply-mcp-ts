/**
 * Test suite for auth-adapter.ts
 *
 * Validates conversion from ParsedAuth to SecurityConfig
 */

import { describe, test, expect } from '@jest/globals';
import { authConfigFromParsed } from '../../src/index.js';
import type { ParsedAuth } from '../../src/server/parser.js';

describe('authConfigFromParsed', () => {
  test('returns undefined when no auth is provided', () => {
    const result = authConfigFromParsed(undefined);
    expect(result).toBeUndefined();
  });

  test('converts basic API key auth to SecurityConfig', () => {
    const parsedAuth: ParsedAuth = {
      type: 'apiKey',
      interfaceName: 'MyAuth',
      keys: [
        { name: 'admin', key: 'sk-admin-123', permissions: ['*'] }
      ]
    };

    const result = authConfigFromParsed(parsedAuth);

    expect(result).toBeDefined();
    expect(result?.enabled).toBe(true);
    expect(result?.authentication.enabled).toBe(true);
    expect(result?.authentication.apiKeys).toHaveLength(1);
    expect(result?.authentication.apiKeys[0]).toEqual({
      key: 'sk-admin-123',
      name: 'admin',
      permissions: ['*'],
      enabled: true,
    });
  });

  test('uses default header name when not specified', () => {
    const parsedAuth: ParsedAuth = {
      type: 'apiKey',
      interfaceName: 'MyAuth',
      keys: [
        { name: 'admin', key: 'sk-admin-123', permissions: ['*'] }
      ]
    };

    const result = authConfigFromParsed(parsedAuth);

    expect(result?.authentication.headerName).toBe('x-api-key');
  });

  test('uses custom header name when specified', () => {
    const parsedAuth: ParsedAuth = {
      type: 'apiKey',
      interfaceName: 'MyAuth',
      headerName: 'x-custom-auth',
      keys: [
        { name: 'admin', key: 'sk-admin-123', permissions: ['*'] }
      ]
    };

    const result = authConfigFromParsed(parsedAuth);

    expect(result?.authentication.headerName).toBe('x-custom-auth');
  });

  test('disables anonymous access by default', () => {
    const parsedAuth: ParsedAuth = {
      type: 'apiKey',
      interfaceName: 'MyAuth',
      keys: [
        { name: 'admin', key: 'sk-admin-123', permissions: ['*'] }
      ]
    };

    const result = authConfigFromParsed(parsedAuth);

    expect(result?.authentication.allowAnonymous).toBe(false);
    expect(result?.permissions?.anonymous).toEqual([]);
  });

  test('enables anonymous access when specified', () => {
    const parsedAuth: ParsedAuth = {
      type: 'apiKey',
      interfaceName: 'MyAuth',
      allowAnonymous: true,
      keys: [
        { name: 'admin', key: 'sk-admin-123', permissions: ['*'] }
      ]
    };

    const result = authConfigFromParsed(parsedAuth);

    expect(result?.authentication.allowAnonymous).toBe(true);
    expect(result?.permissions?.anonymous).toEqual(['read:*']);
  });

  test('handles multiple API keys with different permissions', () => {
    const parsedAuth: ParsedAuth = {
      type: 'apiKey',
      interfaceName: 'MyAuth',
      keys: [
        { name: 'admin', key: 'sk-admin-123', permissions: ['*'] },
        { name: 'readonly', key: 'sk-read-456', permissions: ['read:*'] },
        { name: 'weather', key: 'sk-weather-789', permissions: ['tool:get_weather'] }
      ]
    };

    const result = authConfigFromParsed(parsedAuth);

    expect(result?.authentication.apiKeys).toHaveLength(3);
    expect(result?.authentication.apiKeys[0]).toEqual({
      key: 'sk-admin-123',
      name: 'admin',
      permissions: ['*'],
      enabled: true,
    });
    expect(result?.authentication.apiKeys[1]).toEqual({
      key: 'sk-read-456',
      name: 'readonly',
      permissions: ['read:*'],
      enabled: true,
    });
    expect(result?.authentication.apiKeys[2]).toEqual({
      key: 'sk-weather-789',
      name: 'weather',
      permissions: ['tool:get_weather'],
      enabled: true,
    });
  });

  test('sets default rate limiting configuration', () => {
    const parsedAuth: ParsedAuth = {
      type: 'apiKey',
      interfaceName: 'MyAuth',
      keys: [
        { name: 'admin', key: 'sk-admin-123', permissions: ['*'] }
      ]
    };

    const result = authConfigFromParsed(parsedAuth);

    expect(result?.rateLimit).toEqual({
      enabled: true,
      strategy: 'sliding-window',
      window: 60000, // 1 minute
      maxRequests: 100,
    });
  });

  test('sets default audit logging configuration', () => {
    const parsedAuth: ParsedAuth = {
      type: 'apiKey',
      interfaceName: 'MyAuth',
      keys: [
        { name: 'admin', key: 'sk-admin-123', permissions: ['*'] }
      ]
    };

    const result = authConfigFromParsed(parsedAuth);

    expect(result?.audit).toEqual({
      enabled: true,
      logFile: './logs/audit.log',
      logToConsole: false,
    });
  });

  test('sets default permissions for authenticated users', () => {
    const parsedAuth: ParsedAuth = {
      type: 'apiKey',
      interfaceName: 'MyAuth',
      keys: [
        { name: 'admin', key: 'sk-admin-123', permissions: ['*'] }
      ]
    };

    const result = authConfigFromParsed(parsedAuth);

    expect(result?.permissions?.authenticated).toEqual(['*']);
  });

  test('throws error for oauth2 auth type missing issuerUrl', () => {
    const parsedAuth: ParsedAuth = {
      type: 'oauth2',
      interfaceName: 'OAuth2Auth',
    };

    expect(() => authConfigFromParsed(parsedAuth)).toThrow(
      "OAuth2 auth requires issuerUrl"
    );
  });

  test('throws error for oauth2 auth type missing clients', () => {
    const parsedAuth: ParsedAuth = {
      type: 'oauth2',
      interfaceName: 'OAuth2Auth',
      issuerUrl: 'http://localhost:3000',
    };

    expect(() => authConfigFromParsed(parsedAuth)).toThrow(
      "OAuth2 auth requires at least one client"
    );
  });

  test('creates OAuth2 SecurityConfig when properly configured', () => {
    const parsedAuth: ParsedAuth = {
      type: 'oauth2',
      interfaceName: 'OAuth2Auth',
      issuerUrl: 'http://localhost:3000',
      clients: [
        {
          clientId: 'test-client',
          clientSecret: 'test-secret',
          redirectUris: ['http://localhost:3000/callback'],
          scopes: ['read', 'write'],
        },
      ],
    };

    const result = authConfigFromParsed(parsedAuth);

    expect(result).toBeDefined();
    expect(result?.enabled).toBe(true);
    expect(result?.authentication.enabled).toBe(true);
    expect(result?.authentication.type).toBe('oauth2');
    expect(result?.authentication.issuerUrl).toBe('http://localhost:3000');
    expect(result?.authentication.oauthProvider).toBeDefined();
    expect(result?.permissions?.authenticated).toEqual(['*']);
    expect(result?.permissions?.anonymous).toEqual([]);
  });

  test('throws error for unimplemented database auth type', () => {
    const parsedAuth: ParsedAuth = {
      type: 'database',
      interfaceName: 'DatabaseAuth',
    };

    expect(() => authConfigFromParsed(parsedAuth)).toThrow(
      "Auth type 'database' not yet implemented."
    );
  });

  test('throws error for unimplemented custom auth type', () => {
    const parsedAuth: ParsedAuth = {
      type: 'custom',
      interfaceName: 'CustomAuth',
    };

    expect(() => authConfigFromParsed(parsedAuth)).toThrow(
      "Auth type 'custom' not yet implemented."
    );
  });

  test('throws error for unknown auth type', () => {
    const parsedAuth: any = {
      type: 'unknown',
      interfaceName: 'UnknownAuth',
    };

    expect(() => authConfigFromParsed(parsedAuth)).toThrow(
      "Unknown auth type: unknown"
    );
  });

  test('handles empty keys array gracefully', () => {
    const parsedAuth: ParsedAuth = {
      type: 'apiKey',
      interfaceName: 'MyAuth',
      keys: []
    };

    const result = authConfigFromParsed(parsedAuth);

    expect(result?.authentication.apiKeys).toEqual([]);
  });

  test('handles undefined keys array gracefully', () => {
    const parsedAuth: ParsedAuth = {
      type: 'apiKey',
      interfaceName: 'MyAuth',
    };

    const result = authConfigFromParsed(parsedAuth);

    expect(result?.authentication.apiKeys).toEqual([]);
  });
});
