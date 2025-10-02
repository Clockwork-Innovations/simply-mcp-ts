#!/usr/bin/env node
import {
  validateDependencies,
  validatePackageName,
  validateSemverRange,
  detectConflicts,
} from '../../core/dependency-validator.js';

const args = process.argv.slice(2);
const testName = args[0];
const testArgs = args.slice(1);

async function runTest() {
  try {
    switch (testName) {
      // Package name validation tests
      case 'validName': {
        const name = testArgs[0];
        const result = validatePackageName(name);
        console.log(JSON.stringify({ success: result.valid, data: result }));
        process.exit(result.valid ? 0 : 1);
      }

      case 'invalidName': {
        const name = testArgs[0];
        const result = validatePackageName(name);
        console.log(JSON.stringify({ success: !result.valid, data: result }));
        process.exit(!result.valid ? 0 : 1);
      }

      // Version validation tests
      case 'validVersion': {
        const version = testArgs[0];
        const result = validateSemverRange(version);
        console.log(JSON.stringify({ success: result.valid, data: result }));
        process.exit(result.valid ? 0 : 1);
      }

      case 'invalidVersion': {
        const version = testArgs[0];
        const result = validateSemverRange(version);
        console.log(JSON.stringify({ success: !result.valid, data: result }));
        process.exit(!result.valid ? 0 : 1);
      }

      // Full dependency validation
      case 'validateDeps': {
        const deps = JSON.parse(testArgs[0]);
        const result = validateDependencies(deps);
        console.log(JSON.stringify({ success: result.valid, data: result }));
        process.exit(result.valid ? 0 : 1);
      }

      // Conflict detection
      case 'detectConflicts': {
        const deps = JSON.parse(testArgs[0]);
        const result = detectConflicts(deps);
        console.log(JSON.stringify({ success: true, data: result }));
        process.exit(0);
      }

      default:
        console.log(JSON.stringify({ success: false, error: `Unknown test: ${testName}` }));
        process.exit(1);
    }
  } catch (error) {
    console.log(JSON.stringify({ success: false, error: (error as Error).message }));
    process.exit(1);
  }
}

runTest();
