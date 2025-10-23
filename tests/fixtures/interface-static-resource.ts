import type { IServer, ITool, IResource } from '../../src/index.js';

const TYPE_CHART = {
  electric: ['water', 'flying'],
  fire: ['grass'],
  grass: ['water'],
} as const;

interface StaticServer extends IServer {
  name: 'static-resource-fixture';
  version: '1.0.0';
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

interface TypeChartResource extends IResource<typeof TYPE_CHART> {
  uri: 'pokemon://type-chart';
  name: 'Type Chart';
  description: 'Pokémon type effectiveness chart';
  mimeType: 'application/json';
  data: typeof TYPE_CHART;
}

export default class StaticResourceFixture {
  ping: PingTool = async (params) => ({
    echoed: params.message,
  });
}
