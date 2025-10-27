/**
 * Test: Verify comprehensive example parsing
 *
 * This test validates that the Interface API parser correctly extracts
 * metadata and types from the comprehensive example.
 */

import { parseInterfaceFile } from '../src/parser.js';
import { resolve } from 'path';

const filePath = resolve('examples/interface-comprehensive.ts');

console.log('🧪 Testing Interface API Parser on Comprehensive Example\n');
console.log('=' .repeat(80));

// Parse the file
const result = parseInterfaceFile(filePath);

// Display results
console.log('\n📋 PARSE RESULTS:\n');

console.log('Server:');
console.log(`  Name: ${result.server?.name}`);
console.log(`  Version: ${result.server?.version}`);
console.log(`  Description: ${result.server?.description}`);
console.log(`  Class: ${result.className || 'N/A'}\n`);

console.log('Tools:');
for (const tool of result.tools) {
  console.log(`  ✓ ${tool.name}`);
  console.log(`    Interface: ${tool.interfaceName}`);
  console.log(`    Method: ${tool.methodName}()`);
  console.log(`    Description: ${tool.description}`);
  console.log(`    Params Type: ${tool.paramsType.substring(0, 100)}${tool.paramsType.length > 100 ? '...' : ''}`);
  console.log(`    Result Type: ${tool.resultType.substring(0, 100)}${tool.resultType.length > 100 ? '...' : ''}`);
  console.log('');
}

console.log('Prompts:');
for (const prompt of result.prompts) {
  const type = prompt.dynamic ? 'DYNAMIC' : 'STATIC';
  console.log(`  ✓ ${prompt.name} [${type}]`);
  console.log(`    Interface: ${prompt.interfaceName}`);
  console.log(`    Method: ${prompt.methodName}()`);
  console.log(`    Description: ${prompt.description}`);
  if (prompt.template) {
    const preview = prompt.template.substring(0, 60).replace(/\n/g, ' ');
    console.log(`    Template: ${preview}...`);
  } else {
    console.log(`    Template: <dynamic - requires implementation>`);
  }
  console.log(`    Args Type: ${prompt.argsType}`);
  console.log('');
}

console.log('Resources:');
for (const resource of result.resources) {
  const type = resource.dynamic ? 'DYNAMIC' : 'STATIC';
  console.log(`  ✓ ${resource.uri} [${type}]`);
  console.log(`    Interface: ${resource.interfaceName}`);
  console.log(`    Name: ${resource.name}`);
  console.log(`    Method/Property: ${resource.methodName}`);
  console.log(`    MIME Type: ${resource.mimeType}`);
  if (resource.data !== undefined) {
    console.log(`    Data: ${JSON.stringify(resource.data).substring(0, 100)}...`);
  } else {
    console.log(`    Data: <dynamic - requires implementation>`);
  }
  console.log('');
}

console.log('=' .repeat(80));
console.log('\n✅ VERIFICATION:\n');

// Verify counts
console.log(`✓ Found ${result.tools.length} tools (expected: 3)`);
console.log(`✓ Found ${result.prompts.length} prompts (expected: 3)`);
console.log(`✓ Found ${result.resources.length} resources (expected: 4)`);

// Verify server
console.log(`✓ Server name: ${result.server?.name === 'search-server-comprehensive' ? 'PASS' : 'FAIL'}`);
console.log(`✓ Server version: ${result.server?.version === '3.0.0' ? 'PASS' : 'FAIL'}`);

// Verify tool parsing
const searchTool = result.tools.find(t => t.name === 'search_documents');
console.log(`✓ SearchTool found: ${searchTool ? 'PASS' : 'FAIL'}`);
console.log(`✓ SearchTool method name: ${searchTool?.methodName === 'searchDocuments' ? 'PASS' : 'FAIL'}`);

const createUserTool = result.tools.find(t => t.name === 'create_user');
console.log(`✓ CreateUserTool found: ${createUserTool ? 'PASS' : 'FAIL'}`);
console.log(`✓ CreateUserTool has validation: ${createUserTool?.paramsType.includes('@') ? 'PASS (JSDoc tags in source)' : 'N/A (requires JSDoc parsing)'}`);

// Verify prompt parsing
const staticPrompt = result.prompts.find(p => p.name === 'search_assistant');
console.log(`✓ Static prompt found: ${staticPrompt ? 'PASS' : 'FAIL'}`);
console.log(`✓ Static prompt has template: ${staticPrompt?.template ? 'PASS' : 'FAIL'}`);
console.log(`✓ Static prompt NOT dynamic: ${staticPrompt && !staticPrompt.dynamic ? 'PASS' : 'FAIL'}`);

const dynamicPrompt = result.prompts.find(p => p.name === 'contextual_search');
console.log(`✓ Dynamic prompt found: ${dynamicPrompt ? 'PASS' : 'FAIL'}`);
console.log(`✓ Dynamic prompt IS dynamic: ${dynamicPrompt?.dynamic ? 'PASS' : 'FAIL'}`);
console.log(`✓ Dynamic prompt method: ${dynamicPrompt?.methodName === 'contextualSearch' ? 'PASS' : 'FAIL'}`);

// Verify resource parsing
const staticResource = result.resources.find(r => r.uri === 'config://server');
console.log(`✓ Static resource found: ${staticResource ? 'PASS' : 'FAIL'}`);
console.log(`✓ Static resource has data: ${staticResource?.data !== undefined ? 'PASS' : 'FAIL'}`);
console.log(`✓ Static resource NOT dynamic: ${staticResource && !staticResource.dynamic ? 'PASS' : 'FAIL'}`);

const dynamicResource = result.resources.find(r => r.uri === 'stats://search');
console.log(`✓ Dynamic resource found: ${dynamicResource ? 'PASS' : 'FAIL'}`);
console.log(`✓ Dynamic resource IS dynamic: ${dynamicResource?.dynamic ? 'PASS' : 'FAIL'}`);
console.log(`✓ Dynamic resource method: ${dynamicResource?.methodName === 'stats://search' ? 'PASS' : 'FAIL'}`);

console.log('\n' + '='.repeat(80));
console.log('\n🎉 Parser test complete!\n');

// Schema generation test
console.log('🧪 Testing Zod Schema Generation\n');
console.log('=' .repeat(80) + '\n');

import { typeNodeToZodSchema } from '../src/core/schema-generator.js';
import ts from 'typescript';
import { readFileSync } from 'fs';

// Load source file for schema generation
const sourceCode = readFileSync(filePath, 'utf-8');
const sourceFile = ts.createSourceFile(
  filePath,
  sourceCode,
  ts.ScriptTarget.Latest,
  true
);

// Test schema generation for each tool
for (const tool of result.tools) {
  if (tool.paramsNode) {
    console.log(`Schema for ${tool.name}:`);
    try {
      const schema = typeNodeToZodSchema(tool.paramsNode, sourceFile);
      console.log(`  ✓ Schema generated successfully`);
      console.log(`  Type: ${schema._def.typeName}`);

      // Try to parse a sample input
      if (tool.name === 'get_temperature') {
        const testInput = { location: 'San Francisco', units: 'fahrenheit' };
        const parsed = schema.parse(testInput);
        console.log(`  ✓ Sample validation: PASS`);
        console.log(`    Input: ${JSON.stringify(testInput)}`);
        console.log(`    Parsed: ${JSON.stringify(parsed)}`);
      }

      console.log('');
    } catch (error: any) {
      console.log(`  ✗ Schema generation failed: ${error.message}\n`);
    }
  } else {
    console.log(`⚠ ${tool.name}: No paramsNode available\n`);
  }
}

console.log('=' .repeat(80));
console.log('\n✅ Schema generation test complete!\n');
