#!/usr/bin/env node
/**
 * Test helper for inline dependency parser
 * Runs tests and outputs JSON results
 */

import { readFile } from 'fs/promises';
import {
  parseInlineDependencies,
  extractDependencyBlock,
  parseDependencyLine,
} from '../../features/dependencies/dependency-parser.js';

const args = process.argv.slice(2);
const testName = args[0];
const testArgs = args.slice(1);

interface TestResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

async function runTest(): Promise<TestResult> {
  try {
    switch (testName) {
      // ========================================================================
      // Parser Tests - Valid Formats
      // ========================================================================
      case 'parseSimple': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            dependencies: result.dependencies,
            errorCount: result.errors.length,
            warningCount: result.warnings.length,
          },
        };
      }

      case 'parseScoped': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            dependencies: result.dependencies,
            packageNames: Object.keys(result.dependencies),
          },
        };
      }

      case 'parseComments': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            dependencies: result.dependencies,
            count: Object.keys(result.dependencies).length,
          },
        };
      }

      case 'parseEmpty': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            isEmpty: Object.keys(result.dependencies).length === 0,
            errorCount: result.errors.length,
          },
        };
      }

      case 'parseVersions': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            dependencies: result.dependencies,
            versions: Object.entries(result.dependencies).map(([n, v]) => `${n}=${v}`),
          },
        };
      }

      case 'parseNoVersion': {
        const source = `// /// dependencies\n// axios\n// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            dependencies: result.dependencies,
            axiosVersion: result.dependencies.axios,
          },
        };
      }

      case 'parseWhitespace': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            dependencies: result.dependencies,
            count: Object.keys(result.dependencies).length,
          },
        };
      }

      case 'parseNoDeps': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            isEmpty: Object.keys(result.dependencies).length === 0,
            hasErrors: result.errors.length > 0,
          },
        };
      }

      case 'parseMultipleBlocks': {
        const source = `// /// dependencies
// axios@^1.6.0
// ///

// /// dependencies
// zod@^3.22.0
// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            dependencies: result.dependencies,
            hasAxios: 'axios' in result.dependencies,
            hasZod: 'zod' in result.dependencies,
          },
        };
      }

      case 'parseMixedLineEndings': {
        const source = "// /// dependencies\r\n// axios@^1.6.0\n// zod@^3.22.0\r\n// ///";
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            count: Object.keys(result.dependencies).length,
            hasAxios: 'axios' in result.dependencies,
            hasZod: 'zod' in result.dependencies,
          },
        };
      }

      // ========================================================================
      // Parser Tests - Invalid Formats
      // ========================================================================
      case 'parseInvalidName': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            errorCount: result.errors.length,
            hasInvalidNameError: result.errors.some(e => e.type === 'INVALID_NAME'),
            errorTypes: result.errors.map(e => e.type),
          },
        };
      }

      case 'parseInvalidVersion': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            errorCount: result.errors.length,
            hasInvalidVersionError: result.errors.some(e => e.type === 'INVALID_VERSION'),
          },
        };
      }

      case 'parseDuplicate': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            errorCount: result.errors.length,
            hasDuplicateError: result.errors.some(e => e.type === 'DUPLICATE'),
          },
        };
      }

      case 'parseMissingEnd': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            isEmpty: Object.keys(result.dependencies).length === 0,
            raw: result.raw,
          },
        };
      }

      case 'parseStrictMode': {
        const source = `// /// dependencies\n// INVALID@^1.0.0\n// ///`;
        try {
          parseInlineDependencies(source, { strict: true });
          return { success: false, error: 'Should have thrown' };
        } catch (err) {
          return {
            success: true,
            data: { threw: true, message: (err as Error).message },
          };
        }
      }

      case 'parseLongName': {
        const longName = 'a'.repeat(215);
        const source = `// /// dependencies\n// ${longName}@^1.0.0\n// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            errorCount: result.errors.length,
            hasError: result.errors.length > 0,
          },
        };
      }

      case 'parseSpacesInName': {
        const source = `// /// dependencies\n// my package@^1.0.0\n// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            errorCount: result.errors.length,
            hasError: result.errors.length > 0,
          },
        };
      }

      // ========================================================================
      // extractDependencyBlock Tests
      // ========================================================================
      case 'extractBlock': {
        const source = await readFile(testArgs[0], 'utf-8');
        const block = extractDependencyBlock(source);
        return {
          success: true,
          data: {
            found: block !== null,
            hasContent: block?.content !== undefined,
            hasRaw: block?.raw !== undefined,
            startLine: block?.startLine,
            endLine: block?.endLine,
          },
        };
      }

      case 'extractNoBlock': {
        const source = await readFile(testArgs[0], 'utf-8');
        const block = extractDependencyBlock(source);
        return {
          success: true,
          data: {
            isNull: block === null,
          },
        };
      }

      // ========================================================================
      // parseDependencyLine Tests
      // ========================================================================
      case 'parseLine': {
        const line = testArgs[0];
        const result = parseDependencyLine(line, 1);
        return {
          success: true,
          data: {
            hasDependency: result.dependency !== undefined,
            hasError: result.error !== undefined,
            dependency: result.dependency,
            error: result.error,
          },
        };
      }

      // ========================================================================
      // Edge Case Tests
      // ========================================================================
      case 'parseLargeList': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            count: Object.keys(result.dependencies).length,
            errorCount: result.errors.length,
          },
        };
      }

      case 'parseUnicode': {
        const source = `// /// dependencies\n// 中文包@^1.0.0\n// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            errorCount: result.errors.length,
            hasError: result.errors.length > 0,
          },
        };
      }

      case 'parseSecurityInjection': {
        const source = await readFile(testArgs[0], 'utf-8');
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            errorCount: result.errors.length,
            isEmpty: Object.keys(result.dependencies).length === 0,
            errors: result.errors.map(e => ({ type: e.type, msg: e.message })),
          },
        };
      }

      case 'parseTabsVsSpaces': {
        const source = `//\t///\tdependencies\n//\taxios@^1.6.0\n//   zod@^3.22.0\n//\t///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            count: Object.keys(result.dependencies).length,
            dependencies: result.dependencies,
          },
        };
      }

      case 'parseNestedDelimiters': {
        const source = `// /// dependencies
// axios@^1.6.0
// # /// nested
// # zod@^3.22.0
// # ///
// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            dependencies: result.dependencies,
            hasZod: 'zod' in result.dependencies,
            hasAxios: 'axios' in result.dependencies,
          },
        };
      }

      case 'parseVeryLongLine': {
        const longContent = 'a'.repeat(1500);
        const source = `// /// dependencies\n// ${longContent}@^1.0.0\n// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            errorCount: result.errors.length,
            hasSecurityError: result.errors.some(e => e.type === 'SECURITY'),
          },
        };
      }

      // ========================================================================
      // Version Range Tests
      // ========================================================================
      case 'parseCaretRange': {
        const source = `// /// dependencies\n// axios@^1.6.0\n// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            version: result.dependencies.axios,
            isCaret: result.dependencies.axios?.startsWith('^'),
          },
        };
      }

      case 'parseTildeRange': {
        const source = `// /// dependencies\n// axios@~1.6.0\n// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            version: result.dependencies.axios,
            isTilde: result.dependencies.axios?.startsWith('~'),
          },
        };
      }

      case 'parseGteRange': {
        const source = `// /// dependencies\n// axios@>=1.6.0\n// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            version: result.dependencies.axios,
          },
        };
      }

      case 'parseWildcard': {
        const source = `// /// dependencies\n// axios@*\n// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            version: result.dependencies.axios,
            warningCount: result.warnings.length,
          },
        };
      }

      case 'parseLatest': {
        const source = `// /// dependencies\n// axios@latest\n// ///`;
        const result = parseInlineDependencies(source);
        return {
          success: true,
          data: {
            version: result.dependencies.axios,
            isLatest: result.dependencies.axios === 'latest',
            warningCount: result.warnings.length,
          },
        };
      }

      default:
        return {
          success: false,
          error: `Unknown test: ${testName}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

runTest().then((result) => {
  console.log(JSON.stringify(result));
  process.exit(result.success ? 0 : 1);
});
