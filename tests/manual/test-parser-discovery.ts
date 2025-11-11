/**
 * Test script to verify v4 auto-discovery
 */

import { parseInterfaceFile } from './dist/src/server/parser.js';
import { resolve } from 'path';

const testFile = resolve('test-auto-discovery.ts');

console.log('\n🧪 Testing v4 Auto-Discovery Parser\n');
console.log('=' .repeat(80));
console.log(`Parsing: ${testFile}\n`);

try {
  const result = parseInterfaceFile(testFile);

  // Display results
  console.log('📋 PARSE RESULTS:\n');

  // Server
  console.log('Server:');
  console.log(`  Name: ${result.server?.name}`);
  console.log(`  Version: ${result.server?.version}`);
  console.log(`  Description: ${result.server?.description}\n`);

  // Tools
  console.log(`Tools (${result.tools.length}):`);
  for (const tool of result.tools) {
    console.log(`  ✓ ${tool.name || tool.interfaceName}`);
    console.log(`    Interface: ${tool.interfaceName}`);
    console.log(`    Description: ${tool.description}`);
    if ((tool as any).implementation) {
      const impl = (tool as any).implementation;
      console.log(`    Implementation: ${impl.kind} - ${impl.name}${impl.className ? ` (class: ${impl.className})` : ''}`);
    }
    console.log('');
  }

  // Resources
  console.log(`Resources (${result.resources.length}):`);
  for (const resource of result.resources) {
    console.log(`  ✓ ${resource.uri}`);
    console.log(`    Interface: ${resource.interfaceName}`);
    console.log(`    Description: ${resource.description}`);
    if ((resource as any).implementation) {
      const impl = (resource as any).implementation;
      console.log(`    Implementation: ${impl.kind} - ${impl.name}${impl.className ? ` (class: ${impl.className})` : ''}`);
    }
    console.log('');
  }

  // Prompts
  console.log(`Prompts (${result.prompts.length}):`);
  for (const prompt of result.prompts) {
    console.log(`  ✓ ${prompt.name}`);
    console.log(`    Interface: ${prompt.interfaceName}`);
    console.log(`    Description: ${prompt.description}`);
    if ((prompt as any).implementation) {
      const impl = (prompt as any).implementation;
      console.log(`    Implementation: ${impl.kind} - ${impl.name}${impl.className ? ` (class: ${impl.className})` : ''}`);
    }
    console.log('');
  }

  // Discovered implementations
  console.log(`\n🔍 DISCOVERED IMPLEMENTATIONS (${result.implementations?.length || 0}):\n`);
  if (result.implementations && result.implementations.length > 0) {
    for (const impl of result.implementations) {
      console.log(`  ✓ ${impl.name}: ${impl.helperType}<${impl.interfaceName}>`);
      console.log(`    Kind: ${impl.kind}`);
      if (impl.className) {
        console.log(`    Class: ${impl.className}`);
      }
      console.log('');
    }
  } else {
    console.log('  (none found)');
  }

  // Discovered instances
  console.log(`\n🏗️  DISCOVERED INSTANCES (${result.instances?.length || 0}):\n`);
  if (result.instances && result.instances.length > 0) {
    for (const instance of result.instances) {
      console.log(`  ✓ ${instance.instanceName} = new ${instance.className}()`);
    }
  } else {
    console.log('  (none found)');
  }

  console.log('\n' + '=' .repeat(80));
  console.log('\n✅ VERIFICATION:\n');

  // Verify expected results
  const checks = [
    { name: 'Server discovered', pass: result.server !== undefined },
    { name: 'Server name is "auto-discovery-test"', pass: result.server?.name === 'auto-discovery-test' },
    { name: 'Found 2 tools', pass: result.tools.length === 2 },
    { name: 'Found 1 resource', pass: result.resources.length === 1 },
    { name: 'Found 1 prompt', pass: result.prompts.length === 1 },
    { name: 'Discovered implementations', pass: (result.implementations?.length || 0) > 0 },
    { name: 'Discovered instances', pass: (result.instances?.length || 0) > 0 },
    { name: 'AddTool has implementation linked', pass: result.tools.some(t => t.interfaceName === 'AddTool' && (t as any).implementation) },
    { name: 'UsersResource has implementation linked', pass: result.resources.some(r => r.interfaceName === 'UsersResource' && (r as any).implementation) },
    { name: 'GreetPrompt has implementation linked', pass: result.prompts.some(p => p.interfaceName === 'GreetPrompt' && (p as any).implementation) },
  ];

  for (const check of checks) {
    const status = check.pass ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status}: ${check.name}`);
  }

  const passCount = checks.filter(c => c.pass).length;
  console.log(`\n${passCount}/${checks.length} checks passed\n`);

  if (passCount === checks.length) {
    console.log('🎉 All auto-discovery features working correctly!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some checks failed\n');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Error parsing file:', error);
  process.exit(1);
}
