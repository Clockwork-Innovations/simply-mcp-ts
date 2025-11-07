/**
 * OAuth Interface Types Tests
 *
 * Tests for OAuth 2.1 authentication interface types, parsing, and adapter conversion.
 */

import { describe, it, expect } from '@jest/globals';
import type { IOAuth2Auth, IOAuthClient, IServer } from '../../../src/server/interface-types.js';

describe('OAuth Interface Types', () => {
  describe('Type Inference and Compilation', () => {
    it('should allow basic OAuth interface definition', () => {
      interface TestAuth extends IOAuth2Auth {
        type: 'oauth2';
        issuerUrl: 'http://localhost:3000';
        clients: [
          {
            clientId: 'test-client';
            clientSecret: 'test-secret';
            redirectUris: ['http://localhost:3000/callback'];
            scopes: ['read', 'write'];
          }
        ];
      }

      const server: IServer = {
  name: 'test-oauth-server',
  version: '1.0.0',
  description: 'Test OAuth server',
        transport: 'http',
        auth: {} as TestAuth
      }

      // Type inference test (if this compiles, the test passes)
      const serverImpl = {
        name: 'test-oauth-server',
        description: 'Test OAuth server',
        transport: 'http',
        auth: {
          type: 'oauth2',
          issuerUrl: 'http://localhost:3000',
          clients: [
            {
              clientId: 'test-client',
              clientSecret: 'test-secret',
              redirectUris: ['http://localhost:3000/callback'],
              scopes: ['read', 'write'],
            }
          ],
        },
      };

      expect(serverImpl.auth.type).toBe('oauth2');
      expect(serverImpl.auth.issuerUrl).toBe('http://localhost:3000');
      expect(serverImpl.auth.clients).toHaveLength(1);
      expect(serverImpl.auth.clients[0].clientId).toBe('test-client');
    });

    it('should support multiple OAuth clients', () => {
      interface MultiClientAuth extends IOAuth2Auth {
        type: 'oauth2';
        issuerUrl: 'https://auth.example.com';
        clients: [
          {
            clientId: 'admin-client';
            clientSecret: 'admin-secret';
            redirectUris: ['https://admin.example.com/callback'];
            scopes: ['admin', 'read', 'write'];
            name: 'Admin Dashboard';
          },
          {
            clientId: 'developer-client';
            clientSecret: 'dev-secret';
            redirectUris: ['http://localhost:3000/callback'];
            scopes: ['read', 'write'];
            name: 'Developer Tools';
          },
          {
            clientId: 'readonly-client';
            clientSecret: 'readonly-secret';
            redirectUris: ['https://viewer.example.com/callback'];
            scopes: ['read'];
            name: 'Read-Only Viewer';
          }
        ];
      }

      const auth: MultiClientAuth = {
        type: 'oauth2',
        issuerUrl: 'https://auth.example.com',
        clients: [
          {
            clientId: 'admin-client',
            clientSecret: 'admin-secret',
            redirectUris: ['https://admin.example.com/callback'],
            scopes: ['admin', 'read', 'write'],
            name: 'Admin Dashboard',
          },
          {
            clientId: 'developer-client',
            clientSecret: 'dev-secret',
            redirectUris: ['http://localhost:3000/callback'],
            scopes: ['read', 'write'],
            name: 'Developer Tools',
          },
          {
            clientId: 'readonly-client',
            clientSecret: 'readonly-secret',
            redirectUris: ['https://viewer.example.com/callback'],
            scopes: ['read'],
            name: 'Read-Only Viewer',
          }
        ],
      };

      expect(auth.clients).toHaveLength(3);
      expect(auth.clients[0].name).toBe('Admin Dashboard');
      expect(auth.clients[0].scopes).toContain('admin');
      expect(auth.clients[1].name).toBe('Developer Tools');
      expect(auth.clients[2].scopes).toEqual(['read']);
    });

    it('should support custom token expirations', () => {
      interface CustomExpirationsAuth extends IOAuth2Auth {
        type: 'oauth2';
        issuerUrl: 'http://localhost:3000';
        clients: [
          {
            clientId: 'test-client';
            clientSecret: 'test-secret';
            redirectUris: ['http://localhost:3000/callback'];
            scopes: ['read'];
          }
        ];
        tokenExpiration: 7200;
        refreshTokenExpiration: 604800;
        codeExpiration: 300;
      }

      const auth: CustomExpirationsAuth = {
        type: 'oauth2',
        issuerUrl: 'http://localhost:3000',
        clients: [
          {
            clientId: 'test-client',
            clientSecret: 'test-secret',
            redirectUris: ['http://localhost:3000/callback'],
            scopes: ['read'],
          }
        ],
        tokenExpiration: 7200,        // 2 hours
        refreshTokenExpiration: 604800, // 7 days
        codeExpiration: 300,           // 5 minutes
      };

      expect(auth.tokenExpiration).toBe(7200);
      expect(auth.refreshTokenExpiration).toBe(604800);
      expect(auth.codeExpiration).toBe(300);
    });

    it('should support optional client names', () => {
      interface ClientWithNameAuth extends IOAuth2Auth {
        type: 'oauth2';
        issuerUrl: 'http://localhost:3000';
        clients: [
          {
            clientId: 'named-client';
            clientSecret: 'secret';
            redirectUris: ['http://localhost:3000/callback'];
            scopes: ['read'];
            name: 'My Application';
          }
        ];
      }

      const authWithName: ClientWithNameAuth = {
        type: 'oauth2',
        issuerUrl: 'http://localhost:3000',
        clients: [
          {
            clientId: 'named-client',
            clientSecret: 'secret',
            redirectUris: ['http://localhost:3000/callback'],
            scopes: ['read'],
            name: 'My Application',
          }
        ],
      };

      expect(authWithName.clients[0].name).toBe('My Application');

      // Client without name should also work
      interface ClientWithoutNameAuth extends IOAuth2Auth {
        type: 'oauth2';
        issuerUrl: 'http://localhost:3000';
        clients: [
          {
            clientId: 'unnamed-client';
            clientSecret: 'secret';
            redirectUris: ['http://localhost:3000/callback'];
            scopes: ['read'];
          }
        ];
      }

      const authWithoutName: ClientWithoutNameAuth = {
        type: 'oauth2',
        issuerUrl: 'http://localhost:3000',
        clients: [
          {
            clientId: 'unnamed-client',
            clientSecret: 'secret',
            redirectUris: ['http://localhost:3000/callback'],
            scopes: ['read'],
          }
        ],
      };

      // Since name is optional, we check via type assertion
      const client = authWithoutName.clients[0] as { clientId: string; clientSecret: string; redirectUris: string[]; scopes: string[]; name?: string };
      expect(client.name).toBeUndefined();
    });

    it('should support multiple redirect URIs per client', () => {
      interface MultiRedirectAuth extends IOAuth2Auth {
        type: 'oauth2';
        issuerUrl: 'http://localhost:3000';
        clients: [
          {
            clientId: 'multi-env-client';
            clientSecret: 'secret';
            redirectUris: [
              'http://localhost:3000/callback',
              'https://staging.example.com/oauth/callback',
              'https://app.example.com/oauth/callback'
            ];
            scopes: ['read', 'write'];
          }
        ];
      }

      const auth: MultiRedirectAuth = {
        type: 'oauth2',
        issuerUrl: 'http://localhost:3000',
        clients: [
          {
            clientId: 'multi-env-client',
            clientSecret: 'secret',
            redirectUris: [
              'http://localhost:3000/callback',
              'https://staging.example.com/oauth/callback',
              'https://app.example.com/oauth/callback'
            ],
            scopes: ['read', 'write'],
          }
        ],
      };

      expect(auth.clients[0].redirectUris).toHaveLength(3);
      expect(auth.clients[0].redirectUris).toContain('http://localhost:3000/callback');
      expect(auth.clients[0].redirectUris).toContain('https://staging.example.com/oauth/callback');
    });

    it('should support granular scopes', () => {
      interface GranularScopesAuth extends IOAuth2Auth {
        type: 'oauth2';
        issuerUrl: 'http://localhost:3000';
        clients: [
          {
            clientId: 'granular-client';
            clientSecret: 'secret';
            redirectUris: ['http://localhost:3000/callback'];
            scopes: [
              'read',
              'write',
              'tools:execute',
              'resources:read',
              'resources:write',
              'admin:users',
              'admin:config'
            ];
          }
        ];
      }

      const auth: GranularScopesAuth = {
        type: 'oauth2',
        issuerUrl: 'http://localhost:3000',
        clients: [
          {
            clientId: 'granular-client',
            clientSecret: 'secret',
            redirectUris: ['http://localhost:3000/callback'],
            scopes: [
              'read',
              'write',
              'tools:execute',
              'resources:read',
              'resources:write',
              'admin:users',
              'admin:config'
            ],
          }
        ],
      };

      expect(auth.clients[0].scopes).toHaveLength(7);
      expect(auth.clients[0].scopes).toContain('tools:execute');
      expect(auth.clients[0].scopes).toContain('admin:users');
    });

    it('should work with both production and development issuer URLs', () => {
      // Production URL
      interface ProdAuth extends IOAuth2Auth {
        type: 'oauth2';
        issuerUrl: 'https://auth.example.com';
        clients: [
          {
            clientId: 'prod-client';
            clientSecret: 'secret';
            redirectUris: ['https://app.example.com/callback'];
            scopes: ['read'];
          }
        ];
      }

      const prodAuth: ProdAuth = {
        type: 'oauth2',
        issuerUrl: 'https://auth.example.com',
        clients: [
          {
            clientId: 'prod-client',
            clientSecret: 'secret',
            redirectUris: ['https://app.example.com/callback'],
            scopes: ['read'],
          }
        ],
      };

      expect(prodAuth.issuerUrl).toBe('https://auth.example.com');

      // Development URL
      interface DevAuth extends IOAuth2Auth {
        type: 'oauth2';
        issuerUrl: 'http://localhost:3000';
        clients: [
          {
            clientId: 'dev-client';
            clientSecret: 'secret';
            redirectUris: ['http://localhost:3000/callback'];
            scopes: ['read'];
          }
        ];
      }

      const devAuth: DevAuth = {
        type: 'oauth2',
        issuerUrl: 'http://localhost:3000',
        clients: [
          {
            clientId: 'dev-client',
            clientSecret: 'secret',
            redirectUris: ['http://localhost:3000/callback'],
            scopes: ['read'],
          }
        ],
      };

      expect(devAuth.issuerUrl).toBe('http://localhost:3000');
    });
  });

  describe('IOAuthClient Interface', () => {
    it('should define a valid OAuth client', () => {
      const client: IOAuthClient = {
        clientId: 'test-client',
        clientSecret: 'test-secret',
        redirectUris: ['http://localhost:3000/callback'],
        scopes: ['read', 'write'],
        name: 'Test Application',
      };

      expect(client.clientId).toBe('test-client');
      expect(client.clientSecret).toBe('test-secret');
      expect(client.redirectUris).toEqual(['http://localhost:3000/callback']);
      expect(client.scopes).toEqual(['read', 'write']);
      expect(client.name).toBe('Test Application');
    });

    it('should allow client without name', () => {
      const client: IOAuthClient = {
        clientId: 'test-client',
        clientSecret: 'test-secret',
        redirectUris: ['http://localhost:3000/callback'],
        scopes: ['read'],
      };

      expect(client.name).toBeUndefined();
    });
  });
});
