/**
 * Interface-Driven API - Completions (Autocomplete) Example
 *
 * Demonstrates:
 * - Autocomplete for prompt arguments with ICompletion
 * - Static suggestion lists
 * - Dynamic suggestion generation
 * - Filtered completions based on user input
 * - Multiple completion handlers for different arguments
 * - Production-ready error handling
 *
 * The completion capability allows servers to provide autocomplete suggestions
 * as users type prompt arguments. This improves UX and reduces input errors.
 *
 * Usage:
 *   npx simply-mcp run examples/interface-completions.ts
 *
 * Test with HTTP mode:
 *   # Start server
 *   npx simply-mcp run examples/interface-completions.ts --transport http --port 3000
 *
 *   # Initialize session
 *   curl -H "Content-Type: application/json" \
 *     http://localhost:3000/mcp \
 *     -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{"completions":{}},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}'
 *
 *   # List prompts
 *   curl -H "Content-Type: application/json" \
 *     http://localhost:3000/mcp \
 *     -d '{"jsonrpc":"2.0","method":"prompts/list","id":2}'
 *
 *   # Request completions
 *   curl -H "Content-Type: application/json" \
 *     http://localhost:3000/mcp \
 *     -d '{"jsonrpc":"2.0","method":"completion/complete","params":{"ref":{"type":"argument","name":"city"},"argument":{"name":"city","value":"New"}},"id":3}'
 *
 * Note: Completions require a connected MCP client that supports completions.
 */

import type { IPrompt, IResource, IServer, ICompletion } from 'simply-mcp';

// ============================================================================
// PROMPT INTERFACES
// ============================================================================

/**
 * Weather report prompt with city autocomplete
 *
 * Demonstrates city name completion for location arguments.
 */
interface WeatherPrompt extends IPrompt {
  name: 'weather_report';
  description: 'Generate weather report for a city with autocomplete';
  args: {
    /** City name (autocompleted) */
    city: string;
    /** Temperature units */
    units?: 'celsius' | 'fahrenheit';
    /** Include forecast */
    includeForecast?: boolean;
  };
  template: `Generate a weather report for {city}.

Temperature units: {units}
Include forecast: {includeForecast}

Provide current conditions and detailed weather information.`;
}

/**
 * File operation prompt with path completion
 *
 * Demonstrates file path completion for file operations.
 */
interface FileOperationPrompt extends IPrompt {
  name: 'file_operation';
  description: 'Perform file operation with path autocomplete';
  args: {
    /** Operation type */
    operation: 'read' | 'write' | 'delete' | 'move';
    /** File path (autocompleted) */
    path: string;
    /** Destination path for move (autocompleted) */
    destination?: string;
  };
  template: `Perform {operation} operation on file: {path}

Destination (if applicable): {destination}

Ensure the operation is safe and follows best practices.`;
}

/**
 * Command execution prompt with command completion
 *
 * Demonstrates command name completion.
 */
interface CommandPrompt extends IPrompt {
  name: 'execute_command';
  description: 'Execute command with autocomplete';
  args: {
    /** Command name (autocompleted) */
    command: string;
    /** Command arguments */
    args?: string;
  };
  template: `Execute command: {command} {args}

Provide the expected output and any important considerations.`;
}

/**
 * Language translation prompt with language completion
 *
 * Demonstrates language name completion.
 */
interface TranslationPrompt extends IPrompt {
  name: 'translate_text';
  description: 'Translate text with language autocomplete';
  args: {
    /** Text to translate */
    text: string;
    /** Source language (autocompleted) */
    sourceLanguage?: string;
    /** Target language (autocompleted) */
    targetLanguage: string;
  };
  template: `Translate the following text to {targetLanguage}:

Source language: {sourceLanguage}
Text: "{text}"

Provide an accurate, natural-sounding translation.`;
}

/**
 * Package installation prompt with package name completion
 *
 * Demonstrates dynamic package name completion (simulated API call).
 */
interface InstallPackagePrompt extends IPrompt {
  name: 'install_package';
  description: 'Install package with autocomplete';
  args: {
    /** Package name (autocompleted with dynamic search) */
    package: string;
    /** Package manager */
    manager?: 'npm' | 'yarn' | 'pnpm';
    /** Install as dev dependency */
    dev?: boolean;
  };
  template: `Install package: {package}

Package manager: {manager}
Dev dependency: {dev}

Provide installation command and expected outcome.`;
}

// ============================================================================
// COMPLETION INTERFACES
// ============================================================================

/**
 * City name completion
 *
 * Static list of cities filtered by user input.
 */
interface CityCompletion extends ICompletion<string[]> {
  name: 'city_autocomplete';
  description: 'Autocomplete city names';
  ref: { type: 'argument'; name: 'city' };
}

/**
 * File path completion
 *
 * Simulated file path completion based on common patterns.
 */
interface FilePathCompletion extends ICompletion<string[]> {
  name: 'file_path_autocomplete';
  description: 'Autocomplete file paths';
  ref: { type: 'argument'; name: 'path' };
}

/**
 * Destination path completion (for file moves)
 *
 * Similar to file path completion but for destination argument.
 */
interface DestinationPathCompletion extends ICompletion<string[]> {
  name: 'destination_path_autocomplete';
  description: 'Autocomplete destination paths';
  ref: { type: 'argument'; name: 'destination' };
}

/**
 * Command name completion
 *
 * Common command names for execution.
 */
interface CommandCompletion extends ICompletion<string[]> {
  name: 'command_autocomplete';
  description: 'Autocomplete command names';
  ref: { type: 'argument'; name: 'command' };
}

/**
 * Language name completion
 *
 * ISO language names for translation.
 */
interface LanguageCompletion extends ICompletion<string[]> {
  name: 'language_autocomplete';
  description: 'Autocomplete language names';
  ref: { type: 'argument'; name: 'targetLanguage' };
}

/**
 * Source language completion
 *
 * Separate completion for source language argument.
 */
interface SourceLanguageCompletion extends ICompletion<string[]> {
  name: 'source_language_autocomplete';
  description: 'Autocomplete source language names';
  ref: { type: 'argument'; name: 'sourceLanguage' };
}

/**
 * Package name completion
 *
 * Dynamic package search simulation.
 */
interface PackageCompletion extends ICompletion<string[]> {
  name: 'package_autocomplete';
  description: 'Autocomplete package names';
  ref: { type: 'argument'; name: 'package' };
}

// ============================================================================
// RESOURCE INTERFACES
// ============================================================================

/**
 * Completion usage statistics
 *
 * Dynamic resource tracking completion usage.
 */
interface CompletionStatsResource extends IResource {
  uri: 'stats://completions';
  name: 'Completion Statistics';
  description: 'Completion usage statistics';
  mimeType: 'application/json';
  dynamic: true;
  data: {
    totalRequests: number;
    requestsByCompletion: Record<string, number>;
    averageSuggestions: number;
    lastRequest: string;
  };
}

/**
 * Completion guide resource
 *
 * Static documentation for completion usage.
 */
interface CompletionGuideResource extends IResource {
  uri: 'docs://completions';
  name: 'Completion Guide';
  description: 'How to use autocomplete effectively';
  mimeType: 'text/markdown';
  data: `# Autocomplete Guide

## Overview

Autocomplete provides suggestions as you type prompt arguments,
improving accuracy and reducing typing effort.

## Available Completions

### city_autocomplete
Suggests city names for weather queries.

**Supported cities:**
- New York, New Orleans, Newark (US)
- London, Liverpool, Leeds (UK)
- Paris, Lyon (France)
- Tokyo, Osaka (Japan)
- Sydney, Melbourne (Australia)
- Toronto, Vancouver (Canada)

### file_path_autocomplete
Suggests common file paths.

**Pattern matching:**
- \`/src/\` � Source files
- \`/tests/\` � Test files
- \`/docs/\` � Documentation
- \`/config/\` � Configuration files

### command_autocomplete
Suggests common commands.

**Categories:**
- Git: git, clone, commit, push, pull
- NPM: npm, install, test, build
- Docker: docker, run, build, compose
- System: ls, cd, mkdir, rm, cp, mv

### language_autocomplete
Suggests language names for translation.

**Supported languages:**
- English, Spanish, French, German, Italian
- Chinese, Japanese, Korean
- Portuguese, Russian, Arabic
- Hindi, Bengali, Turkish

### package_autocomplete
Suggests NPM package names (simulated).

**Popular packages:**
- react, vue, angular, svelte
- express, fastify, koa
- typescript, babel, webpack
- jest, mocha, vitest

## Usage Pattern

1. **Start typing:** Begin entering the argument value
2. **Get suggestions:** Completions filter based on your input
3. **Select suggestion:** Choose from the filtered list
4. **Continue:** Move to next argument or submit

## Best Practices

1. **Type ahead:** Start with distinctive characters
2. **Case insensitive:** Matching is case-insensitive
3. **Partial matches:** Works with prefix matching
4. **Error handling:** Falls back gracefully if unavailable

## Implementation Notes

- Static completions: Pre-defined lists
- Dynamic completions: Generated on-demand
- Filtering: Server-side prefix matching
- Performance: Optimized for low latency
`;
}

// ============================================================================
// SERVER INTERFACE
// ============================================================================

interface CompletionsDemoServer extends IServer {
  name: 'completions-demo';
  version: '1.0.0';
  description: 'Production-ready completions (autocomplete) demonstration';
}

// ============================================================================
// SERVER IMPLEMENTATION
// ============================================================================

/**
 * Completions Demo Server Implementation
 *
 * All completion handlers filter suggestions based on user input.
 * Demonstrates various completion patterns: static lists, dynamic generation.
 */
export default class CompletionsDemo implements CompletionsDemoServer {
  // Track completion usage
  private totalRequests = 0;
  private requestsByCompletion: Record<string, number> = {};
  private lastRequest = new Date().toISOString();

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  /**
   * Filter suggestions by prefix (case-insensitive)
   */
  private filterByPrefix(suggestions: string[], prefix: string): string[] {
    if (!prefix) return suggestions;
    const lowerPrefix = prefix.toLowerCase();
    return suggestions.filter((s) => s.toLowerCase().startsWith(lowerPrefix));
  }

  /**
   * Track completion request
   */
  private trackRequest(completionName: string) {
    this.totalRequests++;
    this.requestsByCompletion[completionName] = (this.requestsByCompletion[completionName] || 0) + 1;
    this.lastRequest = new Date().toISOString();
  }

  // ========================================================================
  // COMPLETION IMPLEMENTATIONS
  // ========================================================================

  /**
   * City name autocomplete
   *
   * Static list of major cities worldwide.
   */
  cityAutocomplete: CityCompletion = async (value: string) => {
    this.trackRequest('city_autocomplete');

    const cities = [
      // United States
      'New York',
      'New Orleans',
      'Newark',
      'Los Angeles',
      'Chicago',
      'Houston',
      'Phoenix',
      'Philadelphia',
      'San Antonio',
      'San Diego',
      'San Francisco',
      'Seattle',
      // United Kingdom
      'London',
      'Liverpool',
      'Leeds',
      'Manchester',
      'Birmingham',
      // Europe
      'Paris',
      'Lyon',
      'Berlin',
      'Munich',
      'Madrid',
      'Barcelona',
      'Rome',
      'Milan',
      'Amsterdam',
      'Vienna',
      // Asia
      'Tokyo',
      'Osaka',
      'Beijing',
      'Shanghai',
      'Seoul',
      'Singapore',
      'Bangkok',
      'Mumbai',
      'Delhi',
      // Oceania
      'Sydney',
      'Melbourne',
      'Auckland',
      // Canada
      'Toronto',
      'Vancouver',
      'Montreal',
    ];

    return this.filterByPrefix(cities, value);
  };

  /**
   * File path autocomplete
   *
   * Simulated file paths based on common project structures.
   */
  filePathAutocomplete: FilePathCompletion = async (value: string) => {
    this.trackRequest('file_path_autocomplete');

    const paths = [
      '/src/index.ts',
      '/src/server.ts',
      '/src/utils.ts',
      '/src/types.ts',
      '/src/config.ts',
      '/tests/unit.test.ts',
      '/tests/integration.test.ts',
      '/tests/fixtures/',
      '/docs/README.md',
      '/docs/API.md',
      '/docs/GUIDE.md',
      '/config/default.json',
      '/config/production.json',
      '/config/development.json',
      '/dist/index.js',
      '/dist/bundle.js',
      '/package.json',
      '/tsconfig.json',
      '/.env',
      '/.gitignore',
    ];

    return this.filterByPrefix(paths, value);
  };

  /**
   * Destination path autocomplete
   *
   * Same as file path but for move destination.
   */
  destinationPathAutocomplete: DestinationPathCompletion = async (value: string) => {
    this.trackRequest('destination_path_autocomplete');

    // Reuse file path suggestions for destination
    const paths = [
      '/archive/',
      '/backup/',
      '/src/',
      '/tests/',
      '/docs/',
      '/config/',
      '/dist/',
      '/tmp/',
    ];

    return this.filterByPrefix(paths, value);
  };

  /**
   * Command name autocomplete
   *
   * Common development and system commands.
   */
  commandAutocomplete: CommandCompletion = async (value: string) => {
    this.trackRequest('command_autocomplete');

    const commands = [
      // Git
      'git',
      'git clone',
      'git commit',
      'git push',
      'git pull',
      'git status',
      'git log',
      'git branch',
      // NPM
      'npm',
      'npm install',
      'npm test',
      'npm build',
      'npm start',
      'npm run',
      // Yarn
      'yarn',
      'yarn install',
      'yarn test',
      'yarn build',
      // Docker
      'docker',
      'docker run',
      'docker build',
      'docker compose',
      'docker ps',
      'docker logs',
      // System
      'ls',
      'cd',
      'pwd',
      'mkdir',
      'rm',
      'cp',
      'mv',
      'cat',
      'grep',
      'find',
    ];

    return this.filterByPrefix(commands, value);
  };

  /**
   * Language name autocomplete (target language)
   *
   * ISO language names for translation.
   */
  languageAutocomplete: LanguageCompletion = async (value: string) => {
    this.trackRequest('language_autocomplete');

    const languages = [
      'English',
      'Spanish',
      'French',
      'German',
      'Italian',
      'Portuguese',
      'Russian',
      'Chinese',
      'Japanese',
      'Korean',
      'Arabic',
      'Hindi',
      'Bengali',
      'Turkish',
      'Dutch',
      'Swedish',
      'Polish',
      'Vietnamese',
      'Thai',
      'Indonesian',
    ];

    return this.filterByPrefix(languages, value);
  };

  /**
   * Source language autocomplete
   *
   * Same list as target language, separate handler for different ref.
   */
  sourceLanguageAutocomplete: SourceLanguageCompletion = async (value: string) => {
    this.trackRequest('source_language_autocomplete');

    // Reuse language list
    const languages = [
      'English',
      'Spanish',
      'French',
      'German',
      'Italian',
      'Portuguese',
      'Russian',
      'Chinese',
      'Japanese',
      'Korean',
      'Arabic',
      'Hindi',
      'Bengali',
      'Turkish',
      'Dutch',
      'Swedish',
      'Polish',
      'Vietnamese',
      'Thai',
      'Indonesian',
    ];

    return this.filterByPrefix(languages, value);
  };

  /**
   * Package name autocomplete
   *
   * Simulated dynamic package search (in production, query npm registry).
   */
  packageAutocomplete: PackageCompletion = async (value: string) => {
    this.trackRequest('package_autocomplete');

    // Simulate async API call delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Simulated popular packages
    const packages = [
      'react',
      'react-dom',
      'react-router',
      'vue',
      'angular',
      'svelte',
      'express',
      'fastify',
      'koa',
      'next',
      'nuxt',
      'typescript',
      'babel',
      'webpack',
      'vite',
      'rollup',
      'jest',
      'mocha',
      'vitest',
      'lodash',
      'axios',
      'fetch',
      'date-fns',
      'moment',
      'dayjs',
    ];

    // In production, you'd search npm registry:
    // const results = await fetch(`https://registry.npmjs.org/-/v1/search?text=${value}`);

    return this.filterByPrefix(packages, value);
  };

  // ========================================================================
  // STATIC PROMPTS - No implementation needed
  // ========================================================================

  // WeatherPrompt - template auto-interpolated
  // FileOperationPrompt - template auto-interpolated
  // CommandPrompt - template auto-interpolated
  // TranslationPrompt - template auto-interpolated
  // InstallPackagePrompt - template auto-interpolated

  // ========================================================================
  // STATIC RESOURCES - No implementation needed
  // ========================================================================

  // CompletionGuideResource - markdown documentation served as-is

  // ========================================================================
  // DYNAMIC RESOURCES - Require implementation
  // ========================================================================

  /**
   * Completion statistics resource
   */
  'stats://completions': CompletionStatsResource = async () => {
    const suggestionCounts = Object.values(this.requestsByCompletion);
    const averageSuggestions = suggestionCounts.length > 0
      ? suggestionCounts.reduce((a, b) => a + b, 0) / suggestionCounts.length
      : 0;

    return {
      totalRequests: this.totalRequests,
      requestsByCompletion: this.requestsByCompletion,
      averageSuggestions: Math.round(averageSuggestions),
      lastRequest: this.lastRequest,
    };
  };
}
