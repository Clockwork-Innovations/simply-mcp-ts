import type { IServer, ITool, IResource, ToolHelper } from '../../src/index.js';

const TYPE_CHART = {
  electric: ['water', 'flying'],
  fire: ['grass'],
  grass: ['water'],
} as const;

const server: IServer = {
  name: 'static-resource-fixture',
  version: '1.0.0',
  description: 'Test server with static resources'
  // version: '1.0.0';  // Optional (defaults to '1.0.0')
}

interface PingTool extends ITool {
  name: 'ping';
  description: 'Simple ping tool';
  params: {
    message: { type: 'string'; description: 'Message to echo back' };
  };
  result: {
    echoed: string;
  };
}

interface TypeChartResource extends IResource {
  uri: 'pokemon://type-chart';
  name: 'Type Chart';
  description: 'Pokémon type effectiveness chart';
  mimeType: 'application/json';
  value: {
    electric: ['water', 'flying'];
    fire: ['grass'];
    grass: ['water'];
  };
}

// Tool implementation
const ping: ToolHelper<PingTool> = async (params) => ({
  echoed: params.message,
});

// Server implementation using v4 const-based pattern
const server: StaticServer = {
  name: 'static-resource-fixture',
  description: 'Test server with static resources',
  ping,
  'pokemon://type-chart': TYPE_CHART
};

export default server;
