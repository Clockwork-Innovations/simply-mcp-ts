/**
 * Pokedex MCP Server - Complete Interface API Example
 *
 * Demonstrates the complete Interface API with:
 * - Multiple tools with different parameter types
 * - Static and dynamic resources
 * - Static and dynamic prompts
 * - Full type safety and IntelliSense
 */

import type { ITool, IPrompt, IResource, IServer, IParam } from 'simply-mcp';

// ============================================================================
// TYPE DEFINITIONS - Pokemon Data Models
// ============================================================================

interface Pokemon {
  id: number;
  name: string;
  type: string[];
  hp: number;
  attack: number;
  defense: number;
  spAtk: number;
  spDef: number;
  speed: number;
  height: number; // in decimeters
  weight: number; // in hectograms
  description: string;
  evolution?: string;
}

interface TypeEffectiveness {
  type: string;
  strongAgainst: string[];
  weakTo: string[];
  resistantTo: string[];
}

// ============================================================================
// POKEMON DATABASE
// ============================================================================

const pokemonDatabase: Record<number, Pokemon> = {
  1: {
    id: 1,
    name: 'Bulbasaur',
    type: ['Grass', 'Poison'],
    hp: 45,
    attack: 49,
    defense: 49,
    spAtk: 65,
    spDef: 65,
    speed: 45,
    height: 7,
    weight: 69,
    description: 'A small seed grows on its back when it is born. The seed slowly develops.',
    evolution: 'Ivysaur'
  },
  4: {
    id: 4,
    name: 'Charmander',
    type: ['Fire'],
    hp: 39,
    attack: 52,
    defense: 43,
    spAtk: 60,
    spDef: 50,
    speed: 65,
    height: 6,
    weight: 85,
    description: 'Prefers hot places. When it rains, steam is said to spout from the tip of its tail.',
    evolution: 'Charmeleon'
  },
  7: {
    id: 7,
    name: 'Squirtle',
    type: ['Water'],
    hp: 44,
    attack: 48,
    defense: 65,
    spAtk: 50,
    spDef: 64,
    speed: 43,
    height: 5,
    weight: 90,
    description: 'When it retracts its long neck into its shell, it longingly waits for the next rainy day.',
    evolution: 'Wartortle'
  },
  25: {
    id: 25,
    name: 'Pikachu',
    type: ['Electric'],
    hp: 35,
    attack: 55,
    defense: 40,
    spAtk: 50,
    spDef: 50,
    speed: 90,
    height: 4,
    weight: 60,
    description: 'When several of these POKéMON gather, their electricity can build and cause lightning storms.',
    evolution: 'Raichu'
  },
  133: {
    id: 133,
    name: 'Eevee',
    type: ['Normal'],
    hp: 55,
    attack: 55,
    defense: 50,
    spAtk: 45,
    spDef: 65,
    speed: 55,
    height: 3,
    weight: 65,
    description: 'Its ability to alter its body composition means it can fit into any environment.',
    evolution: 'Vaporeon, Jolteon, or Flareon'
  }
};

const typeEffectiveness: Record<string, TypeEffectiveness> = {
  'Fire': {
    type: 'Fire',
    strongAgainst: ['Grass', 'Ice', 'Bug', 'Steel'],
    weakTo: ['Water', 'Ground', 'Rock'],
    resistantTo: ['Grass', 'Ice', 'Bug', 'Steel', 'Fairy']
  },
  'Water': {
    type: 'Water',
    strongAgainst: ['Fire', 'Ground', 'Rock'],
    weakTo: ['Electric', 'Grass'],
    resistantTo: ['Steel', 'Fire', 'Water', 'Ice']
  },
  'Electric': {
    type: 'Electric',
    strongAgainst: ['Water', 'Flying'],
    weakTo: ['Ground'],
    resistantTo: ['Flying', 'Steel', 'Electric']
  },
  'Grass': {
    type: 'Grass',
    strongAgainst: ['Water', 'Ground', 'Rock'],
    weakTo: ['Fire', 'Ice', 'Poison', 'Flying', 'Bug'],
    resistantTo: ['Ground', 'Water', 'Grass', 'Electric']
  }
};

// ============================================================================
// INTERFACE DEFINITIONS - Tools
// ============================================================================

/**
 * Tool: Search for a Pokemon by name
 */
interface SearchPokemonTool extends ITool {
  name: 'search_pokemon';
  description: 'Search for a Pokemon by name and get its basic information';
  params: {
    name: string;
  };
  result: {
    found: boolean;
    pokemon?: Pokemon;
    error?: string;
  };
}

/**
 * Tool: Get Pokemon stats
 */
interface GetPokemonStatsTool extends ITool {
  name: 'get_pokemon_stats';
  description: 'Get detailed stat breakdown for a specific Pokemon';
  params: {
    pokemonId: number;
    includePercentages?: boolean;
  };
  result: {
    pokemon: string;
    stats: {
      hp: number;
      attack: number;
      defense: number;
      spAtk: number;
      spDef: number;
      speed: number;
      total: number;
    };
    percentages?: Record<string, number>;
  };
}

/**
 * Tool: Get type effectiveness
 */
interface GetTypeEffectivenessTool extends ITool {
  name: 'get_type_effectiveness';
  description: 'Get type effectiveness matchups for a specific Pokemon type';
  params: {
    type: string;
  };
  result: {
    type: string;
    strongAgainst: string[];
    weakTo: string[];
    resistantTo: string[];
  };
}

/**
 * Tool: Compare two Pokemon
 */
interface ComparePokemonTool extends ITool {
  name: 'compare_pokemon';
  description: 'Compare stats and abilities of two Pokemon';
  params: {
    pokemon1Id: number;
    pokemon2Id: number;
  };
  result: {
    pokemon1: string;
    pokemon2: string;
    comparison: {
      stat: string;
      pokemon1Value: number;
      pokemon2Value: number;
      winner: string;
    }[];
    overall: {
      pokemon1Total: number;
      pokemon2Total: number;
      winner: string;
    };
  };
}

/**
 * Tool: Get evolution chain
 */
interface GetEvolutionChainTool extends ITool {
  name: 'get_evolution_chain';
  description: 'Get the evolution chain for a Pokemon';
  params: {
    pokemonName: string;
  };
  result: {
    pokemon: string;
    evolution?: string;
    info: string;
  };
}

// ============================================================================
// INTERFACE DEFINITIONS - Prompts
// ============================================================================

/**
 * Static prompt: Pokemon description generator
 */
interface PokemonDescriptionPrompt extends IPrompt {
  name: 'pokemon_description';
  description: 'Generate a poetic description of a Pokemon';
  args: {
    pokemonName: string;
    style?: 'poetic' | 'scientific' | 'casual';
  };
  template: 'Create a {style} description of the Pokemon {pokemonName}. Include its characteristics, habitat, and behavior.';
}

/**
 * Static prompt: Battle strategy prompt
 */
interface BattleStrategyPrompt extends IPrompt {
  name: 'battle_strategy';
  description: 'Generate a battle strategy for a Pokemon';
  args: {
    pokemonName: string;
    opponent?: string;
  };
  template: 'Suggest a battle strategy for {pokemonName}. Consider matchups against {opponent} if specified. Focus on type advantages and stat distribution.';
}

/**
 * Dynamic prompt: Real-time Pokemon recommendation
 */
interface PokemonRecommendationPrompt extends IPrompt {
  name: 'pokemon_recommendation';
  description: 'Get a personalized Pokemon recommendation based on preferences';
  args: {
    preferredType?: string;
    playstyle?: 'offense' | 'defense' | 'balanced';
  };
  dynamic: true;
}

// ============================================================================
// INTERFACE DEFINITIONS - Resources
// ============================================================================

/**
 * Static resource: Pokemon database overview
 */
interface PokemonDatabaseResource extends IResource {
  uri: 'pokemon://database/overview';
  name: 'Pokemon Database Overview';
  description: 'Summary of available Pokemon in this Pokedex';
  mimeType: 'application/json';
  data: {
    totalPokemon: number;
    generationsCovered: string;
    types: string[];
    lastUpdated: string;
  };
}

/**
 * Static resource: Type effectiveness chart
 */
interface TypeChartResource extends IResource {
  uri: 'pokemon://charts/types';
  name: 'Pokemon Type Effectiveness Chart';
  description: 'Complete type matchup chart for Pokemon battles';
  mimeType: 'application/json';
  data: Record<string, TypeEffectiveness>;
}

/**
 * Static resource: Pokedex HTML guide
 */
interface PokedexGuideResource extends IResource {
  uri: 'pokemon://guides/pokedex-guide';
  name: 'Pokedex Usage Guide';
  description: 'HTML guide on how to use the Pokedex MCP server';
  mimeType: 'text/html';
  data?: never;
  dynamic: false;
}

/**
 * Dynamic resource: Real-time server statistics
 */
interface ServerStatsResource extends IResource {
  uri: 'pokemon://stats/server';
  name: 'Server Statistics';
  description: 'Real-time Pokedex server statistics';
  mimeType: 'application/json';
  data: {
    queriesProcessed: number;
    uptime: number;
    availablePokemon: number;
  };
  dynamic: true;
}

// ============================================================================
// INTERFACE DEFINITIONS - Server
// ============================================================================

interface PokedexServer extends IServer {
  name: 'pokedex';
  version: '1.0.0';
  description: 'A complete Pokedex MCP server with Pokemon data, stats, and strategies';
}

// ============================================================================
// IMPLEMENTATION - Pokedex Service
// ============================================================================

let queryCount = 0;
const serverStartTime = Date.now();

export default class PokedexService implements PokedexServer {
  // ==================== TOOLS ====================

  /**
   * Search for a Pokemon by name
   */
  searchPokemon: SearchPokemonTool = async (params) => {
    queryCount++;
    const normalizedName = params.name.toLowerCase();
    const pokemon = Object.values(pokemonDatabase).find(
      p => p.name.toLowerCase() === normalizedName
    );

    if (pokemon) {
      return { found: true, pokemon };
    }
    return { found: false, error: `Pokemon "${params.name}" not found in Pokedex` };
  };

  /**
   * Get detailed stats for a Pokemon
   */
  getPokemonStats: GetPokemonStatsTool = async (params) => {
    queryCount++;
    const pokemon = pokemonDatabase[params.pokemonId];

    if (!pokemon) {
      throw new Error(`Pokemon with ID ${params.pokemonId} not found`);
    }

    const stats = {
      hp: pokemon.hp,
      attack: pokemon.attack,
      defense: pokemon.defense,
      spAtk: pokemon.spAtk,
      spDef: pokemon.spDef,
      speed: pokemon.speed,
      total: pokemon.hp + pokemon.attack + pokemon.defense + pokemon.spAtk + pokemon.spDef + pokemon.speed
    };

    const result: any = {
      pokemon: pokemon.name,
      stats
    };

    // Optional: Calculate percentages
    if (params.includePercentages) {
      const maxStat = 255; // Maximum possible stat value
      result.percentages = {
        hp: Math.round((pokemon.hp / maxStat) * 100),
        attack: Math.round((pokemon.attack / maxStat) * 100),
        defense: Math.round((pokemon.defense / maxStat) * 100),
        spAtk: Math.round((pokemon.spAtk / maxStat) * 100),
        spDef: Math.round((pokemon.spDef / maxStat) * 100),
        speed: Math.round((pokemon.speed / maxStat) * 100)
      };
    }

    return result;
  };

  /**
   * Get type effectiveness
   */
  getTypeEffectiveness: GetTypeEffectivenessTool = async (params) => {
    queryCount++;
    const effectiveness = typeEffectiveness[params.type];

    if (!effectiveness) {
      throw new Error(`Type "${params.type}" not found`);
    }

    return {
      type: effectiveness.type,
      strongAgainst: effectiveness.strongAgainst,
      weakTo: effectiveness.weakTo,
      resistantTo: effectiveness.resistantTo
    };
  };

  /**
   * Compare two Pokemon
   */
  comparePokemon: ComparePokemonTool = async (params) => {
    queryCount++;
    const poke1 = pokemonDatabase[params.pokemon1Id];
    const poke2 = pokemonDatabase[params.pokemon2Id];

    if (!poke1 || !poke2) {
      throw new Error('One or both Pokemon not found');
    }

    const stats = ['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed'] as const;
    const comparison = stats.map(stat => ({
      stat,
      pokemon1Value: poke1[stat],
      pokemon2Value: poke2[stat],
      winner: poke1[stat] > poke2[stat] ? poke1.name : poke2[stat] > poke1[stat] ? poke2.name : 'Tie'
    }));

    const total1 = stats.reduce((sum, stat) => sum + poke1[stat], 0);
    const total2 = stats.reduce((sum, stat) => sum + poke2[stat], 0);

    return {
      pokemon1: poke1.name,
      pokemon2: poke2.name,
      comparison,
      overall: {
        pokemon1Total: total1,
        pokemon2Total: total2,
        winner: total1 > total2 ? poke1.name : total2 > total1 ? poke2.name : 'Tie'
      }
    };
  };

  /**
   * Get evolution chain
   */
  getEvolutionChain: GetEvolutionChainTool = async (params) => {
    queryCount++;
    const normalizedName = params.pokemonName.toLowerCase();
    const pokemon = Object.values(pokemonDatabase).find(
      p => p.name.toLowerCase() === normalizedName
    );

    if (!pokemon) {
      throw new Error(`Pokemon "${params.pokemonName}" not found`);
    }

    return {
      pokemon: pokemon.name,
      evolution: pokemon.evolution,
      info: pokemon.evolution
        ? `${pokemon.name} evolves into ${pokemon.evolution}`
        : `${pokemon.name} does not have a known evolution in this Pokedex`
    };
  };

  // ==================== PROMPTS ====================

  /**
   * Static prompts are automatically picked up - no implementation needed!
   * The framework extracts the template string from the IPrompt interface.
   *
   * These would be used like:
   * - pokemonDescription: auto-handled
   * - battleStrategy: auto-handled
   */

  /**
   * Dynamic prompt: Pokemon recommendation
   */
  pokemonRecommendation = (args: any) => {
    const preferredType = args.preferredType?.toLowerCase();
    const candidates = Object.values(pokemonDatabase).filter(p => {
      if (preferredType) {
        return p.type.map(t => t.toLowerCase()).includes(preferredType);
      }
      return true;
    });

    if (candidates.length === 0) {
      return `No Pokemon found with type ${args.preferredType}. Here's Pikachu instead!`;
    }

    const recommendation = candidates[Math.floor(Math.random() * candidates.length)];
    const playstyleHint = args.playstyle === 'offense'
      ? 'This Pokemon excels in attack-based strategies'
      : args.playstyle === 'defense'
        ? 'This Pokemon is great for defensive play'
        : 'This Pokemon has a balanced stat distribution';

    return `Based on your preferences (type: ${args.preferredType || 'any'}, playstyle: ${args.playstyle || 'balanced'}), I recommend ${recommendation.name}. ${playstyleHint}.`;
  };

  // ==================== RESOURCES ====================

  /**
   * Static resources with explicit implementations
   */

  /**
   * Pokemon database overview resource
   */
  ['pokemon://database/overview'] = async () => {
    return {
      totalPokemon: Object.keys(pokemonDatabase).length,
      generationsCovered: 'Generation I (Classic)',
      types: ['Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'],
      lastUpdated: new Date().toISOString()
    };
  };

  /**
   * Type effectiveness chart resource
   */
  ['pokemon://charts/types'] = async () => {
    return typeEffectiveness;
  };

  /**
   * Provide HTML guide as dynamic content
   */
  ['pokemon://guides/pokedex-guide'] = async () => {
    return `
      <html>
        <head>
          <title>Pokedex MCP Guide</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            h1 { color: #333; }
            .tool { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #ff6b6b; }
            .tool h3 { margin: 0 0 10px 0; color: #ff6b6b; }
            .example { background: #f9f9f9; padding: 10px; margin: 10px 0; font-family: monospace; border-radius: 3px; }
          </style>
        </head>
        <body>
          <h1>Pokedex MCP Server Guide</h1>
          <p>This MCP server provides access to Pokemon data and information.</p>

          <h2>Available Tools:</h2>

          <div class="tool">
            <h3>search_pokemon</h3>
            <p>Search for a Pokemon by name</p>
            <div class="example">search_pokemon({ name: "Pikachu" })</div>
          </div>

          <div class="tool">
            <h3>get_pokemon_stats</h3>
            <p>Get detailed stats for a specific Pokemon</p>
            <div class="example">get_pokemon_stats({ pokemonId: 25, includePercentages: true })</div>
          </div>

          <div class="tool">
            <h3>get_type_effectiveness</h3>
            <p>Get type matchup information</p>
            <div class="example">get_type_effectiveness({ type: "Electric" })</div>
          </div>

          <div class="tool">
            <h3>compare_pokemon</h3>
            <p>Compare two Pokemon by their stats</p>
            <div class="example">compare_pokemon({ pokemon1Id: 1, pokemon2Id: 4 })</div>
          </div>

          <div class="tool">
            <h3>get_evolution_chain</h3>
            <p>Get evolution information for a Pokemon</p>
            <div class="example">get_evolution_chain({ pokemonName: "Bulbasaur" })</div>
          </div>
        </body>
      </html>
    `;
  };

  /**
   * Dynamic resource: Server statistics
   */
  ['pokemon://stats/server'] = async () => {
    const uptime = Date.now() - serverStartTime;
    return {
      queriesProcessed: queryCount,
      uptime: Math.floor(uptime / 1000), // in seconds
      availablePokemon: Object.keys(pokemonDatabase).length
    };
  };
}
