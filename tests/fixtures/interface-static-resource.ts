import type { IServer, ITool, IResource } from '../../src/index.js';

const TYPE_CHART = {
  electric: ['water', 'flying'],
  fire: ['grass'],
  grass: ['water'],
} as const;

interface StaticServer extends IServer {
  name: 'static-resource-fixture';
  description: 'Test server with static resources';
  // version: '1.0.0';  // Optional (defaults to '1.0.0')
}

interface PingTool extends ITool {
  name: 'ping';
  description: 'Simple ping tool';
  params: {
    message: string;
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

export default class StaticResourceFixture implements StaticServer {
  // Server metadata from interface
  name = 'static-resource-fixture' as const;
  description = 'Test server with static resources' as const;

  ping = async (params: { message: string }) => ({
    echoed: params.message,
  });

  'pokemon://type-chart' = TYPE_CHART;
}
