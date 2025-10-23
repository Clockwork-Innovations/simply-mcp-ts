import type { IServer, ITool, IResource } from 'simply-mcp';

interface StrictServer extends IServer {
  name: 'strict-interface-fixture';
  version: '1.0.0';
}

interface GetPokemonTool extends ITool {
  name: 'get_pokemon';
  description: 'Retrieve a Pokémon by name';
  params: {
    name: string;
  };
  result: {
    name: string;
    types: string[];
  };
}

const POKEMON_DATA: Record<string, { name: string; types: string[] }> = {
  pikachu: {
    name: 'Pikachu',
    types: ['electric'],
  },
};

type PokemonName = keyof typeof POKEMON_DATA;

interface PokemonListResource extends IResource<typeof POKEMON_DATA> {
  uri: 'pokemon://list';
  name: 'Pokémon List';
  description: 'Static list of Pokémon data';
  mimeType: 'application/json';
  data: typeof POKEMON_DATA;
}

export default class StrictFixtureServer {
  getPokemon = async (params: GetPokemonTool['params']): Promise<GetPokemonTool['result']> => {
    const key = params.name.toLowerCase() as PokemonName;
    const match = POKEMON_DATA[key];
    if (!match) {
      throw new Error(`Unknown Pokémon: ${params.name}`);
    }
    return match;
  };

  'pokemon://list' = (): PokemonListResource['data'] => POKEMON_DATA;
}
