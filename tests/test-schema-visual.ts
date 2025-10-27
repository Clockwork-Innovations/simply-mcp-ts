/**
 * Test: Visual Schema Display
 *
 * Shows the generated Zod schemas in a readable format to verify correctness
 */

import { parseInterfaceFile } from '../src/parser.js';
import { typeNodeToZodSchema } from '../src/core/schema-generator.js';
import ts from 'typescript';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { zodToJsonSchema } from 'zod-to-json-schema';

const filePath = resolve('examples/interface-comprehensive.ts');

console.log('📊 Visual Zod Schema Display\n');
console.log('This shows the Zod schemas generated from TypeScript interfaces\n');
console.log('=' .repeat(80) + '\n');

// Parse the file
const result = parseInterfaceFile(filePath);
const sourceCode = readFileSync(filePath, 'utf-8');
const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);

// Display each tool's schema as JSON Schema
for (const tool of result.tools) {
  console.log(`🔧 TOOL: ${tool.name}`);
  console.log(`   Description: ${tool.description}`);
  console.log(`   Method: ${tool.methodName}()\n`);

  if (tool.paramsNode) {
    const zodSchema = typeNodeToZodSchema(tool.paramsNode, sourceFile);
    const jsonSchema = zodToJsonSchema(zodSchema, { name: `${tool.name}_params` });

    console.log('   TypeScript Interface:');
    console.log('   ' + '-'.repeat(76));
    const tsType = tool.paramsType
      .split('\n')
      .map(line => '   ' + line)
      .join('\n');
    console.log(tsType.substring(0, 500));
    if (tool.paramsType.length > 500) console.log('   ...(truncated)');

    console.log('\n   Generated JSON Schema:');
    console.log('   ' + '-'.repeat(76));
    const schemaStr = JSON.stringify(jsonSchema, null, 2)
      .split('\n')
      .map(line => '   ' + line)
      .join('\n');
    console.log(schemaStr.substring(0, 800));
    if (schemaStr.length > 800) console.log('   ...(truncated)');

    console.log('\n   Schema Properties:');
    console.log('   ' + '-'.repeat(76));
    if (jsonSchema.properties) {
      for (const [key, value] of Object.entries(jsonSchema.properties as any)) {
        const required = jsonSchema.required?.includes(key) ? 'REQUIRED' : 'OPTIONAL';
        const type = value.type || value.enum ? (value.enum ? `enum[${value.enum.join(', ')}]` : value.type) : 'object';
        console.log(`   • ${key}: ${type} (${required})`);

        // Show validation constraints
        if (value.minLength !== undefined) {
          console.log(`     ↳ minLength: ${value.minLength}`);
        }
        if (value.maxLength !== undefined) {
          console.log(`     ↳ maxLength: ${value.maxLength}`);
        }
        if (value.minimum !== undefined) {
          console.log(`     ↳ minimum: ${value.minimum}`);
        }
        if (value.maximum !== undefined) {
          console.log(`     ↳ maximum: ${value.maximum}`);
        }
        if (value.format) {
          console.log(`     ↳ format: ${value.format}`);
        }
        if (value.pattern) {
          console.log(`     ↳ pattern: ${value.pattern}`);
        }
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }
}

// Display prompt schemas
console.log('\n📝 PROMPTS\n');
console.log('='.repeat(80) + '\n');

for (const prompt of result.prompts) {
  const type = prompt.dynamic ? '🔄 DYNAMIC' : '📄 STATIC';
  console.log(`${type}: ${prompt.name}`);
  console.log(`   Description: ${prompt.description}`);
  console.log(`   Method: ${prompt.methodName}()`);

  if (prompt.template) {
    console.log(`   Template:\n`);
    const templateLines = prompt.template.split('\n').map(line => `      ${line}`);
    console.log(templateLines.join('\n'));
  } else {
    console.log(`   Template: <requires runtime implementation>`);
  }

  console.log(`\n   Args Type: ${prompt.argsType}\n`);
  console.log('-'.repeat(80) + '\n');
}

// Display resource schemas
console.log('\n📦 RESOURCES\n');
console.log('='.repeat(80) + '\n');

for (const resource of result.resources) {
  const type = resource.dynamic ? '🔄 DYNAMIC' : '📄 STATIC';
  console.log(`${type}: ${resource.uri}`);
  console.log(`   Name: ${resource.name}`);
  console.log(`   MIME Type: ${resource.mimeType}`);
  console.log(`   Method/Property: '${resource.methodName}'`);

  if (resource.data !== undefined) {
    console.log(`\n   Static Data:\n`);
    const dataStr = JSON.stringify(resource.data, null, 2)
      .split('\n')
      .map(line => `      ${line}`)
      .join('\n');
    console.log(dataStr);
  } else {
    console.log(`\n   Data: <requires runtime implementation>`);
    console.log(`   Expected Type: ${resource.dataType}`);
  }

  console.log('\n' + '-'.repeat(80) + '\n');
}

console.log('\n✅ Schema visualization complete!\n');
