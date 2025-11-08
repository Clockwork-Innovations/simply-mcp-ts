/**
 * URI Template Resources with Type-Safe Parameters (v4.1+)
 *
 * This example demonstrates the NEW pattern for URI template resources where
 * parameters are passed as the first argument to the handler function, matching
 * the tool pattern for consistency.
 *
 * Features:
 * - Type-safe parameter access
 * - Clean API without nested optional chaining
 * - Consistent with tool pattern
 * - Full IntelliSense support
 *
 * Run this example:
 *   npx simply-mcp run examples/uri-template-resources-typed.ts
 */

import type { IServer, IResource, IParam } from 'simply-mcp';

const server: IServer = {
  name: 'uri-template-typed-example',
  version: '1.0.0',
  description: 'URI template resources with type-safe parameters'
};

// ============ Define Reusable Param Interfaces (Recommended Pattern) ============

interface PokemonNameParam extends IParam {
  type: 'string';
  description: 'Pokemon name';
  required: true;
}

interface ApiVersionParam extends IParam {
  type: 'string';
  description: 'API version';
  required: true;
}

interface EndpointNameParam extends IParam {
  type: 'string';
  description: 'Endpoint name';
  required: true;
}

interface UserIdParam extends IParam {
  type: 'string';
  description: 'User ID';
  required: true;
}

// ============ Example 1: Simple Resource with Single Parameter ============

interface PokemonResource extends IResource {
  uri: 'pokemon://{name}';
  name: 'Pokemon Info';
  description: 'Get information about a specific Pokemon';
  mimeType: 'application/json';
  params: {
    name: PokemonNameParam;  // ✅ Clean and reusable!
  };
  returns: {
    name: string;
    level: number;
    type: string;
    description: string;
  };
}

// ============ Example 2: Resource with Multiple Parameters ============

interface ApiEndpointResource extends IResource {
  uri: 'api://v{version}/{endpoint}';
  name: 'API Endpoint';
  description: 'Access versioned API endpoints';
  mimeType: 'application/json';
  params: {
    version: ApiVersionParam;   // ✅ Clean, typed, documented!
    endpoint: EndpointNameParam; // ✅ Reusable across resources
  };
  returns: {
    version: string;
    endpoint: string;
    status: string;
    message: string;
  };
}

// ============ Example 3: Resource with Parameters AND Context ============

interface UserDataResource extends IResource {
  uri: 'users://{userId}';
  name: 'User Data';
  description: 'Get user data by ID';
  mimeType: 'application/json';
  params: {
    userId: UserIdParam;  // ✅ Reuse the param definition from above
  };
  returns: {
    id: string;
    name: string;
    timestamp: string;
  };
}

// ============ Example 4: Resource Without Parameters (Backward Compatible) ============

interface ServerInfoResource extends IResource {
  uri: 'info://server';
  name: 'Server Info';
  description: 'Get server information';
  mimeType: 'application/json';
  returns: {
    name: string;
    uptime: number;
    features: string[];
  };
}

// ============ Example 5: Static Resource ============

interface ConfigResource extends IResource {
  uri: 'config://app';
  name: 'App Configuration';
  description: 'Application configuration';
  mimeType: 'application/json';
  value: {
    apiUrl: string;
    timeout: number;
    retries: number;
  };
}

// ============ Server Implementation ============

export default class UriTemplateTypedServer {
  // Example 1: NEW PATTERN - params as first argument!
  'pokemon://{name}': PokemonResource = async (params) => {
    // ✅ Clean, typed access to params - no optional chaining needed!
    return {
      name: params.name,
      level: 50,
      type: 'Unknown',
      description: `This is ${params.name}`
    };
  };

  // Example 2: Multiple params - all type-safe
  'api://v{version}/{endpoint}': ApiEndpointResource = async (params) => {
    // ✅ Both params are fully typed
    return {
      version: params.version,
      endpoint: params.endpoint,
      status: 'ok',
      message: `Accessing ${params.endpoint} on version ${params.version}`
    };
  };

  // Example 3: Params first, context second (like tools!)
  'users://{userId}': UserDataResource = async (params, context) => {
    // ✅ Access params directly AND use context for logging, etc.
    context?.logger?.info(`Getting user: ${params.userId}`);

    return {
      id: params.userId,
      name: 'John Doe',
      timestamp: new Date().toISOString()
    };
  };

  // Example 4: No params - just context (backward compatible)
  'info://server': ServerInfoResource = async (context) => {
    // ✅ Can still use context only for resources without params
    return {
      name: server.name,
      uptime: process.uptime(),
      features: ['uri-templates', 'type-safety', 'clean-api']
    };
  };

  // Example 5: Static resource - no implementation needed!
  // Just the interface definition is enough
}

// ============ Pattern Comparison ============

/*
OLD PATTERN (still works but deprecated):

'pokemon://{name}': PokemonResource = async (context) => {
  // ❌ Janky: nested optional chaining
  const name = context?.metadata?.params?.name || 'unknown';
  return { name, type: 'Unknown' };
};


NEW PATTERN (v4.1+):

'pokemon://{name}': PokemonResource = async (params) => {
  // ✅ Clean: direct access, fully typed
  return { name: params.name, type: 'Unknown' };
};


NEW PATTERN with Context:

'pokemon://{name}': PokemonResource = async (params, context) => {
  // ✅ Clean: params first, context second (matches tool pattern)
  context?.logger?.info(`Getting: ${params.name}`);
  return { name: params.name, type: 'Unknown' };
};
*/
