#!/usr/bin/env tsx
/**
 * Test script for Interface API Reference documentation code examples
 *
 * Extracts and tests all TypeScript code blocks from the documentation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as os from 'os';

interface CodeExample {
  name: string;
  startLine: number;
  endLine: number;
  code: string;
  language: string;
}

interface TestResult {
  name: string;
  startLine: number;
  endLine: number;
  status: 'PASS' | 'FAIL';
  errors?: string[];
}

const DOCS_PATH = '/mnt/Shared/cs-projects/simply-mcp-ts/docs/guides/INTERFACE_API_REFERENCE.md';
const TEMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'interface-test-'));

/**
 * Extract all TypeScript code blocks from markdown
 */
function extractCodeExamples(content: string): CodeExample[] {
  const examples: CodeExample[] = [];
  const lines = content.split('\n');
  let inCodeBlock = false;
  let currentExample: Partial<CodeExample> = {};
  let codeLines: string[] = [];
  let exampleCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Check for code block start
    if (line.startsWith('```typescript') || line.startsWith('```ts')) {
      inCodeBlock = true;
      currentExample = {
        startLine: lineNumber,
        language: 'typescript',
      };
      codeLines = [];

      // Try to extract a name from the previous few lines
      let name = `Example ${exampleCounter}`;
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        const prevLine = lines[j].trim();
        if (prevLine.startsWith('##')) {
          name = prevLine.replace(/^#+\s*/, '').trim();
          break;
        }
        if (prevLine && !prevLine.startsWith('```')) {
          name = prevLine.replace(/^[*-]\s*/, '').trim();
          if (name.length > 50) name = name.substring(0, 50) + '...';
          break;
        }
      }
      currentExample.name = name;
      exampleCounter++;
    }
    // Check for code block end
    else if (line.startsWith('```') && inCodeBlock) {
      inCodeBlock = false;
      currentExample.endLine = lineNumber;
      currentExample.code = codeLines.join('\n');
      examples.push(currentExample as CodeExample);
    }
    // Collect code lines
    else if (inCodeBlock) {
      codeLines.push(line);
    }
  }

  return examples;
}

/**
 * Add necessary imports to make code compilable
 */
function prepareCode(code: string): string {
  // Check if imports are already present
  const hasImports = code.includes('import');

  // Define the standard imports we might need
  const standardImports = `import type {
  ITool,
  IPrompt,
  IResource,
  IServer,
  Tool,
  Prompt,
  Resource
} from 'simply-mcp';\nimport { JSONSchema7 } from 'json-schema';\n\n`;

  // If no imports, add them
  if (!hasImports) {
    return standardImports + code;
  }

  return code;
}

/**
 * Test a single code example
 */
function testCodeExample(example: CodeExample): TestResult {
  const result: TestResult = {
    name: example.name,
    startLine: example.startLine,
    endLine: example.endLine,
    status: 'PASS',
  };

  try {
    // Prepare the code with imports
    const preparedCode = prepareCode(example.code);

    // Write to temporary file
    const tempFile = path.join(TEMP_DIR, `test-${example.startLine}.ts`);
    fs.writeFileSync(tempFile, preparedCode);

    // Create a minimal tsconfig for testing
    const tsconfigPath = path.join(TEMP_DIR, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) {
      fs.writeFileSync(tsconfigPath, JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          lib: ['ES2022'],
          moduleResolution: 'node',
          esModuleInterop: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          types: ['node'],
          resolveJsonModule: true
        },
        include: ['*.ts']
      }, null, 2));
    }

    // Run TypeScript compiler
    try {
      execSync(`npx tsc --noEmit --project ${tsconfigPath} ${tempFile}`, {
        cwd: TEMP_DIR,
        stdio: 'pipe',
        encoding: 'utf-8',
      });
    } catch (error: any) {
      // Parse TypeScript errors
      const stderr = error.stderr || error.stdout || '';
      const errors = stderr
        .split('\n')
        .filter((line: string) => line.includes('error TS'))
        .map((line: string) => line.replace(tempFile, `Line ${example.startLine}`));

      if (errors.length > 0) {
        result.status = 'FAIL';
        result.errors = errors;
      }
    }
  } catch (error: any) {
    result.status = 'FAIL';
    result.errors = [error.message];
  }

  return result;
}

/**
 * Generate test report
 */
function generateReport(results: TestResult[]): string {
  let report = '## CODE EXAMPLE TEST REPORT\n\n';
  report += '### TypeScript Examples (Interface API Reference)\n\n';

  // Individual results
  results.forEach((result, index) => {
    const statusIcon = result.status === 'PASS' ? '✅' : '❌';
    report += `#### Example ${index + 1}: ${result.name} (Lines ${result.startLine}-${result.endLine})\n`;
    report += `Status: ${statusIcon} ${result.status}\n`;

    if (result.errors && result.errors.length > 0) {
      report += `Errors:\n`;
      result.errors.forEach(error => {
        report += `  - ${error}\n`;
      });
    }
    report += '\n';
  });

  // Summary
  const totalTests = results.length;
  const passedTests = results.filter(r => r.status === 'PASS').length;
  const failedTests = totalTests - passedTests;
  const overallStatus = failedTests === 0 ? 'PASS' : 'FAIL';

  report += '### Summary\n\n';
  report += `**TypeScript Examples**: ${totalTests} tested, ${passedTests} passed, ${failedTests} failed\n`;
  report += `**Overall Status**: ${overallStatus}\n\n`;

  if (failedTests > 0) {
    report += '**Details**:\n';
    const failedResults = results.filter(r => r.status === 'FAIL');
    failedResults.forEach(result => {
      report += `- ❌ ${result.name} (Lines ${result.startLine}-${result.endLine})\n`;
    });
    report += '\n';

    report += '**Recommendations**:\n';
    report += '- Several examples use types that are not exported from the package (e.g., `MCPServerConfig`, `JSONSchema`)\n';
    report += '- The documentation should clarify which types are available for import\n';
    report += '- Consider adding explicit import statements to all examples\n';
    report += '- Some examples may be intentionally incomplete for brevity - consider adding notes\n';
  }

  return report;
}

/**
 * Categorize examples by type
 */
function categorizeExamples(examples: CodeExample[]): {
  interfaces: CodeExample[];
  implementations: CodeExample[];
  complete: CodeExample[];
  schemas: CodeExample[];
} {
  return {
    interfaces: examples.filter(ex =>
      ex.code.includes('interface') && !ex.code.includes('class') && !ex.code.includes('export default')
    ),
    implementations: examples.filter(ex =>
      ex.code.includes('export default class')
    ),
    complete: examples.filter(ex =>
      ex.code.includes('export default') && ex.code.length > 300
    ),
    schemas: examples.filter(ex =>
      ex.code.includes('JSONSchema') || ex.code.includes('inputSchema')
    ),
  };
}

/**
 * Main test execution
 */
async function main() {
  console.log('📚 Interface API Reference - Code Example Tester\n');
  console.log('=' .repeat(70));

  // Read documentation
  console.log('\n📖 Reading documentation...');
  const docContent = fs.readFileSync(DOCS_PATH, 'utf-8');

  // Extract examples
  console.log('🔍 Extracting code examples...');
  const examples = extractCodeExamples(docContent);
  console.log(`   Found ${examples.length} TypeScript code examples\n`);

  // Categorize
  const categorized = categorizeExamples(examples);
  console.log('📊 Example breakdown:');
  console.log(`   - Interface definitions: ${categorized.interfaces.length}`);
  console.log(`   - Implementation examples: ${categorized.implementations.length}`);
  console.log(`   - Complete servers: ${categorized.complete.length}`);
  console.log(`   - Schema examples: ${categorized.schemas.length}\n`);

  // Test each example
  console.log('🧪 Testing code examples...\n');
  const results: TestResult[] = [];

  for (const example of examples) {
    process.stdout.write(`   Testing: ${example.name.substring(0, 50).padEnd(50)} `);
    const result = testCodeExample(example);
    results.push(result);

    const statusIcon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${statusIcon} ${result.status}`);
  }

  // Generate report
  console.log('\n📝 Generating report...\n');
  const report = generateReport(results);

  // Write report to file
  const reportPath = path.join(process.cwd(), 'interface-docs-test-report.md');
  fs.writeFileSync(reportPath, report);
  console.log(`Report written to: ${reportPath}\n`);

  // Print summary to console
  console.log('=' .repeat(70));
  const totalTests = results.length;
  const passedTests = results.filter(r => r.status === 'PASS').length;
  const failedTests = totalTests - passedTests;

  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total Examples: ${totalTests}`);
  console.log(`   Passed: ${passedTests} ✅`);
  console.log(`   Failed: ${failedTests} ❌`);
  console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  // Cleanup
  console.log(`\n🧹 Cleaning up temporary files...`);
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });

  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
main().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
