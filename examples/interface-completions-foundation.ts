/**
 * ICompletion Foundation Example
 *
 * Demonstrates autocomplete for prompt arguments.
 * Shows how to provide suggestions as users type.
 */

import type { IPrompt, IServer, ICompletion } from '../src/index.js';

// Server configuration with completions capability
interface CompletionsExampleServer extends IServer {
  name: 'completions-example';
  version: '1.0.0';
  description: 'Foundation example for completions protocol';
}

// Prompt with completable argument
interface WeatherPrompt extends IPrompt {
  name: 'weather_report';
  description: 'Generate weather report for a city';
  args: {
    city: string;      // City name (will have autocomplete)
    units?: 'C' | 'F'; // Temperature units
  };
  template: 'Generate a weather report for {city} in {units} degrees.';
}

// Completion for city argument
interface CityCompletion extends ICompletion<string[]> {
  name: 'city_autocomplete';
  description: 'Autocomplete city names';
  ref: { type: 'argument'; name: 'city' };  // Links to WeatherPrompt.city
}

export default class CompletionsExampleService implements CompletionsExampleServer {
  name = 'completions-example' as const;
  version = '1.0.0' as const;
  description = 'Foundation example for completions protocol' as const;

  // Static prompt definition (from IPrompt interface)
  weatherReport: WeatherPrompt = {
    name: 'weather_report',
    description: 'Generate weather report for a city',
    args: {
      city: '',
      units: 'C'
    },
    template: 'Generate a weather report for {city} in {units} degrees.'
  } as any;

  // Completion handler for city names - function-based pattern
  cityAutocomplete: CityCompletion = async (value: string) => {
    // Simulated city database
    const cities = [
      'New York',
      'New Orleans',
      'Newark',
      'Los Angeles',
      'London',
      'Paris',
      'Berlin',
      'Tokyo',
      'Sydney',
      'Toronto'
    ];

    // Filter cities that start with the typed value (case-insensitive)
    const suggestions = cities.filter(city =>
      city.toLowerCase().startsWith(value.toLowerCase())
    );

    return suggestions;
  };
}

// Foundation Layer Notes:
// - Interface types defined (ICompletion)
// - Function-based pattern: Just assign the completion function directly
// - Parser extracts metadata from the interface definition
// - BuildMCPServer wires up actual completion logic
// - CompleteRequest protocol handler calls registered completion functions
//
// Pattern Benefits:
// - Zero boilerplate: No need to repeat name/description/ref in implementation
// - Type-safe: Full IntelliSense on the value parameter
// - Consistent: Matches ITool/IPrompt pattern
