#!/usr/bin/env node
/**
 * Test script for CLI config loading functionality
 */

import { loadCLIConfig, mergeRunConfig, getConfigFilePath } from '../dist/src/cli/cli-config-loader.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function test() {
  console.log('='.repeat(60));
  console.log('Testing CLI Config Loader');
  console.log('='.repeat(60));
  console.log('');

  // Test 1: Load JS config
  console.log('Test 1: Load simplymcp.config.test.js');
  console.log('-'.repeat(60));
  try {
    const jsConfigPath = join(__dirname, 'simplymcp.config.test.js');
    const config1 = await loadCLIConfig(jsConfigPath);
    console.log('Loaded config:', JSON.stringify(config1, null, 2));
    console.log('✓ Test 1 passed');
  } catch (error) {
    console.error('✗ Test 1 failed:', error.message);
  }
  console.log('');

  // Test 2: Load JSON config
  console.log('Test 2: Load simplymcp.config.test.json');
  console.log('-'.repeat(60));
  try {
    const jsonConfigPath = join(__dirname, 'simplymcp.config.test.json');
    const config2 = await loadCLIConfig(jsonConfigPath);
    console.log('Loaded config:', JSON.stringify(config2, null, 2));
    console.log('✓ Test 2 passed');
  } catch (error) {
    console.error('✗ Test 2 failed:', error.message);
  }
  console.log('');

  // Test 3: Auto-detect config (using existing simplemcp.config.js)
  console.log('Test 3: Auto-detect config file');
  console.log('-'.repeat(60));
  try {
    const config3 = await loadCLIConfig();
    const detectedPath = await getConfigFilePath();
    console.log('Detected config file:', detectedPath);
    console.log('Loaded config:', JSON.stringify(config3, null, 2));
    console.log('✓ Test 3 passed');
  } catch (error) {
    console.error('✗ Test 3 failed:', error.message);
  }
  console.log('');

  // Test 4: Merge config with CLI args
  console.log('Test 4: Merge config with CLI arguments');
  console.log('-'.repeat(60));
  try {
    const jsConfigPath = join(__dirname, 'simplymcp.config.test.js');
    const config4 = await loadCLIConfig(jsConfigPath);

    // Simulate CLI args
    const cliArgs = {
      port: 4000,  // This should override config
      verbose: false, // This should override config
      // http is not specified, so should use config value
    };

    const merged = mergeRunConfig(config4, cliArgs);
    console.log('Config run options:', config4.run);
    console.log('CLI arguments:', cliArgs);
    console.log('Merged options:', merged);
    console.log('');

    // Verify precedence
    if (merged.port === 4000 && merged.verbose === false && merged.http === true) {
      console.log('✓ Test 4 passed - CLI args take precedence, config fills gaps');
    } else {
      console.error('✗ Test 4 failed - Merge precedence incorrect');
      console.error('Expected: port=4000, verbose=false, http=true');
      console.error('Got:', merged);
    }
  } catch (error) {
    console.error('✗ Test 4 failed:', error.message);
  }
  console.log('');

  // Test 5: Test validation errors
  console.log('Test 5: Test config validation');
  console.log('-'.repeat(60));

  // Create a temp invalid config
  const invalidConfigPath = join(__dirname, 'invalid-config-test.json');
  const fs = await import('fs/promises');

  try {
    // Invalid run.port
    await fs.writeFile(invalidConfigPath, JSON.stringify({
      run: {
        port: 99999 // Invalid port number
      }
    }));

    try {
      await loadCLIConfig(invalidConfigPath);
      console.error('✗ Test 5 failed - Should have thrown validation error');
    } catch (error) {
      if (error.message.includes('port')) {
        console.log('✓ Test 5 passed - Validation caught invalid port');
      } else {
        console.error('✗ Test 5 failed - Wrong validation error:', error.message);
      }
    }

    // Clean up
    await fs.unlink(invalidConfigPath);
  } catch (error) {
    console.error('✗ Test 5 failed:', error.message);
  }
  console.log('');

  // Test 6: Test missing config file (explicit path)
  console.log('Test 6: Test missing config file error');
  console.log('-'.repeat(60));
  try {
    await loadCLIConfig('non-existent-config.js');
    console.error('✗ Test 6 failed - Should have thrown error for missing file');
  } catch (error) {
    if (error.message.includes('not found')) {
      console.log('✓ Test 6 passed - Missing config file error thrown');
    } else {
      console.error('✗ Test 6 failed - Wrong error:', error.message);
    }
  }
  console.log('');

  // Test 7: Test all run config options
  console.log('Test 7: Test all run config options');
  console.log('-'.repeat(60));
  try {
    const fullConfig = {
      run: {
        style: 'functional',
        http: true,
        port: 5000,
        watch: true,
        watchPoll: true,
        watchInterval: 500,
        inspect: true,
        inspectPort: 9230,
        verbose: true,
      }
    };

    // Write temp config
    const tempConfigPath = join(__dirname, 'temp-full-config.json');
    await fs.writeFile(tempConfigPath, JSON.stringify(fullConfig, null, 2));

    // Load and verify
    const loadedConfig = await loadCLIConfig(tempConfigPath);

    let allMatch = true;
    for (const [key, value] of Object.entries(fullConfig.run)) {
      if (loadedConfig.run[key] !== value) {
        allMatch = false;
        console.error(`Mismatch for ${key}: expected ${value}, got ${loadedConfig.run[key]}`);
      }
    }

    // Clean up
    await fs.unlink(tempConfigPath);

    if (allMatch) {
      console.log('✓ Test 7 passed - All run config options work correctly');
    } else {
      console.error('✗ Test 7 failed - Some options did not match');
    }
  } catch (error) {
    console.error('✗ Test 7 failed:', error.message);
  }
  console.log('');

  console.log('='.repeat(60));
  console.log('Config Loading Tests Complete');
  console.log('='.repeat(60));
}

test().catch(console.error);
