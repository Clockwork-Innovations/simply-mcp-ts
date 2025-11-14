
import type { IServer, ITool, IParam } from '../../../src/index.js';

const server: IServer = {
  name: 'const-oauth-server',
  version: '1.0.0',
  description: 'Const server with OAuth2',
  auth: {
    type: 'oauth2',
    issuerUrl: 'https://oauth.example.com',
    clients: [
      {
        clientId: 'app-client',
        clientSecret: 'client-secret-xyz',
        redirectUris: ['https://app.example.com/auth/callback', 'https://app.example.com/oauth'],
        scopes: ['profile', 'email', 'api'],
        name: 'Main Application'
      }
    ],
    tokenExpiration: 7200,
    refreshTokenExpiration: 604800,
    codeExpiration: 300
  }
};

interface DataParam extends IParam {
  type: 'string';
  description: 'Data';
}

interface SaveTool extends ITool {
  name: 'save';
  description: 'Save data';
  params: { data: DataParam };
  result: string;
}

const save: SaveTool = async ({ data }) => `Saved: ${data}`;
