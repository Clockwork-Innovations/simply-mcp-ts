/**
 * URI Template Resources Example
 *
 * This example demonstrates how to use URI templates in resources.
 * URI templates allow you to create parameterized resources that can
 * match multiple URIs and extract parameters from them.
 *
 * Run this example:
 *   npm run build
 *   node dist/examples/uri-template-resources.js
 */

import { BuildMCPServer } from 'simply-mcp';

async function main() {
  const server = new BuildMCPServer({
    name: 'uri-template-example',
    version: '1.0.0',
  });

  // Example 1: Simple template with one parameter
  // This matches URIs like: pokemon://pikachu, pokemon://charizard, etc.
  server.addResource({
    uri: 'pokemon://{name}',
    name: 'Pokemon Info',
    description: 'Get information about a specific Pokemon',
    mimeType: 'application/json',
    content: (context) => {
      // Extract params from context.metadata.params
      const params = (context?.metadata?.params as Record<string, string>) || {};
      return JSON.stringify({
        name: params.name || 'unknown',
        level: 50,
        type: 'Unknown',
        description: `This is ${params.name || 'a Pokemon'}`,
      }, null, 2);
    },
  });

  // Example 2: Multiple parameters
  // This matches URIs like: api://v1/users, api://v2/posts, etc.
  server.addResource({
    uri: 'api://{version}/{endpoint}',
    name: 'API Endpoint',
    description: 'Access versioned API endpoints',
    mimeType: 'application/json',
    content: (context) => {
      const params = (context?.metadata?.params as Record<string, string>) || {};
      return JSON.stringify({
        version: params.version || 'unknown',
        endpoint: params.endpoint || 'unknown',
        status: 'ok',
        message: `Accessing ${params.endpoint} on ${params.version}`,
      }, null, 2);
    },
  });

  // Example 3: Exact match alongside template
  // Exact matches take precedence over templates
  server.addResource({
    uri: 'pokemon://pikachu',
    name: 'Pikachu',
    description: 'The famous electric mouse Pokemon',
    mimeType: 'application/json',
    content: JSON.stringify({
      name: 'Pikachu',
      level: 100,
      type: 'Electric',
      special: true,
      description: 'The mascot of Pokemon!',
    }, null, 2),
  });

  // Example 4: Legacy dynamic resource (backward compatible)
  // Functions without parameters still work
  server.addResource({
    uri: 'time://current',
    name: 'Current Time',
    description: 'Get the current server time',
    mimeType: 'text/plain',
    content: () => {
      return new Date().toISOString();
    },
  });

  // Example 5: Static resource (backward compatible)
  server.addResource({
    uri: 'info://server',
    name: 'Server Info',
    description: 'Static server information',
    mimeType: 'application/json',
    content: JSON.stringify({
      name: 'URI Template Example Server',
      features: ['templates', 'exact-match', 'dynamic-content'],
    }, null, 2),
  });

  console.log('URI Template Resources Example\n');
  console.log('Registered resources:');
  console.log('  pokemon://{name} - Template for any Pokemon');
  console.log('  pokemon://pikachu - Exact match (takes precedence)');
  console.log('  api://{version}/{endpoint} - Multi-parameter template');
  console.log('  time://current - Legacy dynamic resource');
  console.log('  info://server - Static resource');
  console.log('\nTest URIs:');
  console.log('  pokemon://pikachu → Exact match (special Pikachu data)');
  console.log('  pokemon://charizard → Template match (generic Pokemon data)');
  console.log('  api://v1/users → Multi-param match (version=v1, endpoint=users)');
  console.log('  time://current → Legacy dynamic (current timestamp)');
  console.log('  info://server → Static content');

  // Demonstrate reading resources directly
  console.log('\n--- Testing Resource Reads ---\n');

  try {
    // 1. Exact match takes precedence
    console.log('1. Reading pokemon://pikachu (exact match):');
    const pikachuResult = await server.readResourceDirect('pokemon://pikachu');
    console.log('   Result:', JSON.stringify(pikachuResult.contents[0].text || pikachuResult.contents[0], null, 2));
  } catch (error: any) {
    console.error('   Error:', error.message);
  }

  try {
    // 2. Template match
    console.log('\n2. Reading pokemon://charizard (template match):');
    const charizardResult = await server.readResourceDirect('pokemon://charizard');
    const content = JSON.parse(charizardResult.contents[0].text);
    console.log('   Result:', JSON.stringify(content, null, 2));
    console.log('   ✓ Extracted parameter: name =', content.name);
  } catch (error: any) {
    console.error('   Error:', error.message);
  }

  try {
    // 3. Multi-parameter template
    console.log('\n3. Reading api://v2/posts (multi-param template):');
    const apiResult = await server.readResourceDirect('api://v2/posts');
    const content = JSON.parse(apiResult.contents[0].text);
    console.log('   Result:', JSON.stringify(content, null, 2));
    console.log('   ✓ Extracted parameters: version =', content.version, ', endpoint =', content.endpoint);
  } catch (error: any) {
    console.error('   Error:', error.message);
  }

  try {
    // 4. Legacy dynamic resource
    console.log('\n4. Reading time://current (legacy dynamic):');
    const timeResult = await server.readResourceDirect('time://current');
    console.log('   Result:', timeResult.contents[0].text);
  } catch (error: any) {
    console.error('   Error:', error.message);
  }

  try {
    // 5. Non-existent resource
    console.log('\n5. Reading pokemon://nonexistent (should fail):');
    await server.readResourceDirect('pokemon://fakemon');
  } catch (error: any) {
    console.log('   ✓ Expected error:', error.message.split('\n')[0]);
  }

  console.log('\n--- Example Complete ---\n');
  console.log('Key Features Demonstrated:');
  console.log('  ✓ URI template matching with parameter extraction');
  console.log('  ✓ Exact match priority over templates');
  console.log('  ✓ Multiple parameters in templates');
  console.log('  ✓ Backward compatibility with legacy resources');
  console.log('  ✓ Proper error handling for unknown URIs');
}

main().catch(console.error);
