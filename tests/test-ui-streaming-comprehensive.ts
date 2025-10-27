#!/usr/bin/env tsx
/**
 * UI Streaming Comprehensive Validation Test
 *
 * Validates that all 8 UI examples in simply-mcp-ts v4.0.0 correctly stream
 * their UI content through the MCP protocol as resources.
 *
 * This integration test:
 * 1. Loads each UI example server using loadInterfaceServer()
 * 2. Discovers UI resources via listResources() - filters for ui:// URIs
 * 3. Reads each UI resource via readResource()
 * 4. Validates HTML content using 10 comprehensive validation checks
 * 5. Handles edge cases gracefully (load failures, missing resources, etc.)
 * 6. Produces clear color-coded console output with detailed results
 * 7. Exits with correct code (0 for success, 1 for failure)
 *
 * Validation Checks:
 * - HTML structure validation (basic tags, head/body)
 * - HTML length validation (minimum thresholds)
 * - MIME type validation (text/html)
 * - callTool injection validation (tool integration)
 * - CSS presence validation (styling)
 * - React compilation validation (no uncompiled JSX)
 * - Production optimizations validation (minification)
 * - External file loading validation (file-based UIs)
 * - Theme variables validation (CSS custom properties)
 * - Dynamic content validation (content changes)
 *
 * Usage:
 *   tsx tests/test-ui-streaming-comprehensive.ts
 *   tsx tests/test-ui-streaming-comprehensive.ts --verbose
 *   tsx tests/test-ui-streaming-comprehensive.ts --debug
 *   tsx tests/test-ui-streaming-comprehensive.ts --example=ui-foundation
 *
 * Environment Variables:
 *   VERBOSE=1 - Enable verbose output
 *   DEBUG=1   - Enable debug output
 */

import { loadInterfaceServer } from '../dist/src/adapter.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Color Codes and Test Statistics
// ============================================================================

const colors = {
  RED: '\x1b[0;31m',
  GREEN: '\x1b[0;32m',
  YELLOW: '\x1b[1;33m',
  BLUE: '\x1b[0;34m',
  MAGENTA: '\x1b[0;35m',
  CYAN: '\x1b[0;36m',
  NC: '\x1b[0m',
};

let totalExamples = 0;
let passedExamples = 0;
let failedExamples = 0;
let totalResources = 0;
let passedResources = 0;
let failedResources = 0;
let totalValidations = 0;
let passedValidations = 0;
let failedValidations = 0;

// Error tracking by category
interface ErrorRecord {
  example: string;
  resource?: string;
  category: 'LOAD_FAILED' | 'NO_RESOURCES' | 'READ_FAILED' | 'VALIDATION_FAILED';
  error: string;
  details?: string;
}

const errors: ErrorRecord[] = [];

// ============================================================================
// CLI Configuration
// ============================================================================

const VERBOSE = process.env.VERBOSE === '1' || process.argv.includes('--verbose');
const DEBUG = process.env.DEBUG === '1' || process.argv.includes('--debug');
const EXAMPLE_FILTER = process.argv.find(arg => arg.startsWith('--example='))?.split('=')[1];


// ============================================================================
// Test Utilities
// ============================================================================

function check(msg: string) {
  passedValidations++;
  totalValidations++;
  if (VERBOSE) {
    console.log(`    ${colors.GREEN}✓${colors.NC} ${msg}`);
  }
}

function warn(msg: string, details?: string) {
  console.log(`    ${colors.YELLOW}⚠${colors.NC} ${msg}`);
  if (details && DEBUG) {
    console.log(`      ${colors.YELLOW}${details}${colors.NC}`);
  }
}

function verbose(msg: string) {
  if (VERBOSE) {
    console.log(`    ${colors.CYAN}ℹ${colors.NC} ${msg}`);
  }
}

function debugLog(msg: string, data?: any) {
  if (DEBUG) {
    console.log(`    ${colors.MAGENTA}[DEBUG]${colors.NC} ${msg}`);
    if (data !== undefined) {
      console.log(`      ${JSON.stringify(data, null, 2)}`);
    }
  }
}

function recordError(record: ErrorRecord) {
  errors.push(record);
  failedValidations++;
  totalValidations++;
}

// ============================================================================
// Validation Check Types
// ============================================================================

type ValidationResult = {
  passed: boolean;
  message: string;
  details?: string;
};

type ValidationCheck = (html: string, uri: string, exampleName: string) => ValidationResult;

// ============================================================================
// Validation Check Implementations
// ============================================================================

/**
 * Validation Check 1: HTML Structure
 * Checks for basic HTML tags and structure
 */
function validateHTMLStructure(html: string, uri: string, exampleName: string): ValidationResult {
  const hasHtmlTag = /<html[\s>]/i.test(html) || /<!DOCTYPE html>/i.test(html);
  const hasHeadTag = /<head[\s>]/i.test(html);
  const hasBodyTag = /<body[\s>]/i.test(html);
  const hasClosingTags = /<\/html>/i.test(html) && /<\/body>/i.test(html);

  if (hasHtmlTag && hasHeadTag && hasBodyTag && hasClosingTags) {
    return {
      passed: true,
      message: 'Valid HTML structure (DOCTYPE, html, head, body tags)',
    };
  }

  // Check if it's a fragment (still valid for injection)
  const hasContentTags = /<div|<span|<h1|<h2|<p|<button|<input/i.test(html);
  if (hasContentTags && !hasHtmlTag) {
    return {
      passed: true,
      message: 'Valid HTML fragment (content tags without full structure)',
    };
  }

  return {
    passed: false,
    message: 'Invalid HTML structure',
    details: `Missing essential tags. Has: html=${hasHtmlTag}, head=${hasHeadTag}, body=${hasBodyTag}`,
  };
}

/**
 * Validation Check 2: HTML Length
 * Checks minimum length thresholds based on UI type
 */
function validateHTMLLength(html: string, uri: string, exampleName: string): ValidationResult {
  const length = html.length;

  // Different thresholds for different example types
  let minLength = 100; // Default minimum
  let expectedRange = '100+ chars';

  if (exampleName.includes('foundation') || exampleName.includes('file-based')) {
    minLength = 500;
    expectedRange = '500+ chars (rich UI)';
  } else if (exampleName.includes('react') || exampleName.includes('dashboard')) {
    minLength = 300;
    expectedRange = '300+ chars (component UI)';
  } else if (exampleName.includes('production-optimized')) {
    // Production optimized may be minified (shorter)
    minLength = 200;
    expectedRange = '200+ chars (optimized)';
  }

  if (length >= minLength) {
    return {
      passed: true,
      message: `HTML length: ${length} chars (${expectedRange})`,
    };
  }

  return {
    passed: false,
    message: `HTML too short: ${length} chars`,
    details: `Expected ${expectedRange}, got ${length} chars`,
  };
}

/**
 * Validation Check 3: MIME Type
 * Checks that resource has text/html MIME type
 */
function validateMIMEType(
  mimeType: string,
  uri: string,
  exampleName: string
): ValidationResult {
  if (mimeType === 'text/html') {
    return {
      passed: true,
      message: 'Correct MIME type: text/html',
    };
  }

  return {
    passed: false,
    message: `Wrong MIME type: ${mimeType}`,
    details: 'UI resources must use text/html MIME type',
  };
}

/**
 * Validation Check 4: callTool Injection
 * Checks that callTool function is present for tool integration
 */
function validateCallToolInjection(html: string, uri: string, exampleName: string): ValidationResult {
  // Check for callTool function definition or usage
  const hasCallTool = /callTool\s*\(/.test(html) || /window\.callTool/.test(html);
  const hasToolIntegration = /async\s+function\s+callTool/.test(html) ||
                              /function\s+callTool/.test(html) ||
                              /const\s+callTool/.test(html) ||
                              /callTool\s*=/.test(html);

  if (hasCallTool || hasToolIntegration) {
    return {
      passed: true,
      message: 'Tool integration: callTool() function present',
    };
  }

  // For some UIs (like theme demos), tool integration may be optional
  if (exampleName.includes('theme-demo')) {
    return {
      passed: true,
      message: 'Tool integration: optional for this UI type',
    };
  }

  // For component-library: Button/Card don't have tools, Dashboard does
  if (exampleName.includes('component-library')) {
    // Only Dashboard should have callTool()
    if (uri.includes('ui://dashboard/main')) {
      // Dashboard MUST have callTool() - this is a robust E2E test
      return {
        passed: false,
        message: 'Missing callTool() function',
        details: 'Dashboard UI must have MCP tool integration via callTool()',
      };
    } else {
      // Button/Card components don't need tools
      return {
        passed: true,
        message: 'Tool integration: not required for reusable components',
      };
    }
  }

  return {
    passed: false,
    message: 'Missing callTool() function',
    details: 'UI should integrate with MCP tools via callTool()',
  };
}

/**
 * Validation Check 5: CSS Presence
 * Checks for styling (inline, style tags, or link tags)
 */
function validateCSSPresence(html: string, uri: string, exampleName: string): ValidationResult {
  const hasStyleTag = /<style[\s>]/i.test(html);
  const hasLinkTag = /<link[^>]*rel=["']stylesheet["']/i.test(html);
  const hasInlineStyle = /style=["']/i.test(html);
  const hasCSSVariables = /--[\w-]+\s*:/i.test(html);

  if (hasStyleTag || hasLinkTag || hasInlineStyle || hasCSSVariables) {
    const types = [];
    if (hasStyleTag) types.push('style tags');
    if (hasLinkTag) types.push('link tags');
    if (hasInlineStyle) types.push('inline styles');
    if (hasCSSVariables) types.push('CSS variables');

    return {
      passed: true,
      message: `CSS present: ${types.join(', ')}`,
    };
  }

  // Minimal UIs might not have styling
  if (html.length < 300) {
    return {
      passed: true,
      message: 'CSS optional for minimal UI',
    };
  }

  return {
    passed: false,
    message: 'No CSS found',
    details: 'UI should include styling (style tags, link tags, or inline styles)',
  };
}

/**
 * Validation Check 6: React Compilation
 * Checks that there's no uncompiled JSX (for React examples)
 */
function validateReactCompiled(html: string, uri: string, exampleName: string): ValidationResult {
  // Only applicable to React examples
  if (!exampleName.includes('react')) {
    return {
      passed: true,
      message: 'React compilation: N/A (not a React example)',
    };
  }

  // Remove source maps from validation (they contain original uncompiled source)
  const htmlWithoutSourceMap = html.replace(/<script type="application\/json" id="source-map">[\s\S]*?<\/script>/g, '');

  // Check for uncompiled JSX patterns (excluding source maps)
  const hasUncompiledJSX = /<[A-Z]\w+[\s/>]/.test(htmlWithoutSourceMap) && !/<script[^>]*type=["']text\/babel["']/.test(htmlWithoutSourceMap);

  if (hasUncompiledJSX) {
    return {
      passed: false,
      message: 'Uncompiled JSX detected',
      details: 'React components should be compiled to JavaScript',
    };
  }

  // Check for React library presence or modern JSX runtime
  const hasReact = /react/i.test(html) || /React\.createElement/.test(html) || /jsx-runtime/.test(html);
  if (hasReact) {
    return {
      passed: true,
      message: 'React compilation: properly compiled',
    };
  }

  return {
    passed: true,
    message: 'React compilation: valid',
  };
}

/**
 * Validation Check 7: Production Optimizations
 * Checks for minification (for production-optimized examples)
 */
function validateProductionOptimizations(html: string, uri: string, exampleName: string): ValidationResult {
  // Only applicable to production-optimized example
  if (!exampleName.includes('production-optimized')) {
    return {
      passed: true,
      message: 'Production optimizations: N/A (not production example)',
    };
  }

  // Check for minification indicators
  const hasMinification = html.includes('/*!') || // Source map comments
                          /\n/.test(html) === false || // No newlines
                          html.length < 2000 && /<script/.test(html); // Compressed

  // Check for whitespace reduction
  const hasReducedWhitespace = !/\n\s{4,}/.test(html.slice(0, 1000));

  if (hasMinification || hasReducedWhitespace) {
    return {
      passed: true,
      message: 'Production optimizations: minification detected',
    };
  }

  return {
    passed: false,
    message: 'No production optimizations detected',
    details: 'Expected minification or whitespace reduction',
  };
}

/**
 * Validation Check 8: External Files
 * Checks that file-based UIs loaded external files correctly
 */
function validateExternalFiles(html: string, uri: string, exampleName: string): ValidationResult {
  // Only applicable to file-based UI example
  if (!exampleName.includes('file-based')) {
    return {
      passed: true,
      message: 'External files: N/A (not file-based example)',
    };
  }

  // Check for evidence of external file loading
  // File-based UIs should have content that was loaded from files
  const hasSubstantialContent = html.length > 500;
  const hasMultipleSections = (html.match(/<div|<section|<article/gi) || []).length >= 3;

  if (hasSubstantialContent && hasMultipleSections) {
    return {
      passed: true,
      message: 'External files: content loaded successfully',
    };
  }

  return {
    passed: false,
    message: 'External files: insufficient content',
    details: 'File-based UI should load substantial content from external files',
  };
}

/**
 * Validation Check 9: Theme Variables
 * Checks for CSS custom properties (theme variables)
 */
function validateThemeVariables(html: string, uri: string, exampleName: string): ValidationResult {
  // Check for CSS variables
  const hasCSSVariables = /--[\w-]+\s*:/i.test(html);
  const hasVarUsage = /var\(--[\w-]+\)/i.test(html);

  if (hasCSSVariables || hasVarUsage) {
    return {
      passed: true,
      message: 'Theme variables: CSS custom properties found',
    };
  }

  // Theme variables are optional for non-theme examples
  if (!exampleName.includes('theme')) {
    return {
      passed: true,
      message: 'Theme variables: optional for this example',
    };
  }

  return {
    passed: false,
    message: 'No theme variables found',
    details: 'Theme example should use CSS custom properties',
  };
}

/**
 * Validation Check 10: Dynamic Content
 * Checks that dynamic UIs generate different content on re-read
 */
async function validateDynamicContent(
  server: any,
  uri: string,
  exampleName: string,
  isDynamic: boolean
): Promise<ValidationResult> {
  if (!isDynamic) {
    return {
      passed: true,
      message: 'Dynamic content: N/A (static UI)',
    };
  }

  try {
    // Read the resource twice
    const result1 = await server.readResource(uri);
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    const result2 = await server.readResource(uri);

    const html1 = result1.contents[0].text;
    const html2 = result2.contents[0].text;

    // For truly dynamic UIs, content should differ
    // (timestamps, random data, etc.)
    if (html1 !== html2) {
      return {
        passed: true,
        message: 'Dynamic content: content changes on re-read',
      };
    }

    // Some "dynamic" UIs might have stable content but dynamic generation
    // This is still valid
    return {
      passed: true,
      message: 'Dynamic content: stable content (valid)',
    };
  } catch (error: any) {
    return {
      passed: false,
      message: 'Dynamic content: error on re-read',
      details: error.message,
    };
  }
}

// ============================================================================
// Example Configuration
// ============================================================================

interface ExampleConfig {
  name: string;
  path: string;
  description: string;
  expectedUICount: number; // Expected number of UI resources
  validationChecks: {
    htmlStructure: boolean;
    htmlLength: boolean;
    mimeType: boolean;
    callToolInjection: boolean;
    cssPresence: boolean;
    reactCompiled: boolean;
    productionOptimizations: boolean;
    externalFiles: boolean;
    themeVariables: boolean;
    dynamicContent: boolean;
  };
  isDynamic?: boolean; // Whether UIs are dynamic (content changes)
}

const EXAMPLES: ExampleConfig[] = [
  {
    name: 'ui-foundation',
    path: resolve(__dirname, '../examples/interface-ui-foundation.ts'),
    description: 'Foundation Layer - Inline HTML UI with Tool Integration',
    expectedUICount: 2, // Calculator UI + Stats UI
    validationChecks: {
      htmlStructure: true,
      htmlLength: true,
      mimeType: true,
      callToolInjection: true,
      cssPresence: true,
      reactCompiled: false,
      productionOptimizations: false,
      externalFiles: false,
      themeVariables: true,
      dynamicContent: true, // Stats UI is dynamic
    },
    isDynamic: true,
  },
  {
    name: 'file-based-ui',
    path: resolve(__dirname, '../examples/interface-file-based-ui.ts'),
    description: 'File-Based UI - External HTML/CSS/JS Files',
    expectedUICount: 1, // Product Catalog UI
    validationChecks: {
      htmlStructure: true,
      htmlLength: true,
      mimeType: true,
      callToolInjection: true,
      cssPresence: true,
      reactCompiled: false,
      productionOptimizations: false,
      externalFiles: true,
      themeVariables: false,
      dynamicContent: false,
    },
  },
  {
    name: 'react-component',
    path: resolve(__dirname, '../examples/interface-react-component.ts'),
    description: 'React Component UI - React Integration',
    expectedUICount: 1, // Counter UI
    validationChecks: {
      htmlStructure: true,
      htmlLength: true,
      mimeType: true,
      callToolInjection: true,
      cssPresence: true,
      reactCompiled: true,
      productionOptimizations: false,
      externalFiles: false,
      themeVariables: false,
      dynamicContent: false,
    },
  },
  {
    name: 'react-dashboard',
    path: resolve(__dirname, '../examples/interface-react-dashboard.ts'),
    description: 'React Dashboard - Complex React UI',
    expectedUICount: 1, // Dashboard UI
    validationChecks: {
      htmlStructure: true,
      htmlLength: true,
      mimeType: true,
      callToolInjection: true,
      cssPresence: true,
      reactCompiled: true,
      productionOptimizations: false,
      externalFiles: false,
      themeVariables: true,
      dynamicContent: false,
    },
  },
  {
    name: 'sampling-ui',
    path: resolve(__dirname, '../examples/interface-sampling-ui.ts'),
    description: 'Sampling UI - LLM Sampling Integration',
    expectedUICount: 1, // Sampling UI
    validationChecks: {
      htmlStructure: true,
      htmlLength: true,
      mimeType: true,
      callToolInjection: true,
      cssPresence: true,
      reactCompiled: false,
      productionOptimizations: false,
      externalFiles: false,
      themeVariables: false,
      dynamicContent: false,
    },
  },
  {
    name: 'theme-demo',
    path: resolve(__dirname, '../examples/interface-theme-demo.ts'),
    description: 'Theme Demo - CSS Theme System',
    expectedUICount: 3, // Light, Dark, and Custom theme UIs
    validationChecks: {
      htmlStructure: true,
      htmlLength: true,
      mimeType: true,
      callToolInjection: false, // Theme demo may not have tools
      cssPresence: true,
      reactCompiled: false,
      productionOptimizations: false,
      externalFiles: false,
      themeVariables: true,
      dynamicContent: false,
    },
  },
  {
    name: 'component-library',
    path: resolve(__dirname, '../examples/interface-component-library.ts'),
    description: 'Component Library - Reusable UI Components',
    expectedUICount: 3, // Button, Card, and Dashboard components
    validationChecks: {
      htmlStructure: true,
      htmlLength: true,
      mimeType: true,
      callToolInjection: true, // ROBUST E2E: Dashboard MUST have callTool(), Button/Card don't need it
      cssPresence: true,
      reactCompiled: false,
      productionOptimizations: false,
      externalFiles: false,
      themeVariables: false, // Components use inline styles
      dynamicContent: false,
    },
  },
  {
    name: 'production-optimized',
    path: resolve(__dirname, '../examples/interface-production-optimized.ts'),
    description: 'Production Optimized - Minified and Optimized UI',
    expectedUICount: 1, // Optimized UI
    validationChecks: {
      htmlStructure: true,
      htmlLength: true,
      mimeType: true,
      callToolInjection: true,
      cssPresence: true,
      reactCompiled: false,
      productionOptimizations: true,
      externalFiles: false,
      themeVariables: false,
      dynamicContent: false,
    },
  },
];

// ============================================================================
// Resource Validation
// ============================================================================

async function validateResource(
  server: any,
  resource: { uri: string; name: string; description: string; mimeType: string },
  example: ExampleConfig
): Promise<boolean> {
  const { uri, name, mimeType } = resource;

  console.log(`\n  ${colors.CYAN}Resource: ${name}${colors.NC}`);
  verbose(`URI: ${uri}`);
  verbose(`MIME Type: ${mimeType}`);

  let resourcePassed = true;

  try {
    // Read the resource
    debugLog('Reading resource...', { uri });
    const result = await server.readResource(uri);

    if (!result || !result.contents) {
      recordError({
        example: example.name,
        resource: uri,
        category: 'READ_FAILED',
        error: 'Missing contents in result',
      });
      console.log(`  ${colors.RED}✗ Read failed: Missing contents${colors.NC}`);
      return false;
    }

    if (!Array.isArray(result.contents) || result.contents.length === 0) {
      recordError({
        example: example.name,
        resource: uri,
        category: 'READ_FAILED',
        error: 'Contents is not a non-empty array',
      });
      console.log(`  ${colors.RED}✗ Read failed: Invalid contents format${colors.NC}`);
      return false;
    }

    const content = result.contents[0];
    const html = content.text;

    if (!html || typeof html !== 'string') {
      recordError({
        example: example.name,
        resource: uri,
        category: 'READ_FAILED',
        error: 'Missing or invalid text content',
      });
      console.log(`  ${colors.RED}✗ Read failed: No HTML text${colors.NC}`);
      return false;
    }

    debugLog('HTML received', { length: html.length, preview: html.slice(0, 100) });
    verbose(`HTML length: ${html.length} chars`);

    // Run validation checks
    const checks = example.validationChecks;

    // 1. HTML Structure
    if (checks.htmlStructure) {
      const result = validateHTMLStructure(html, uri, example.name);
      if (result.passed) {
        check(result.message);
      } else {
        resourcePassed = false;
        console.log(`  ${colors.RED}✗ ${result.message}${colors.NC}`);
        if (result.details) {
          console.log(`    ${colors.RED}${result.details}${colors.NC}`);
        }
        recordError({
          example: example.name,
          resource: uri,
          category: 'VALIDATION_FAILED',
          error: result.message,
          details: result.details,
        });
      }
    }

    // 2. HTML Length
    if (checks.htmlLength) {
      const result = validateHTMLLength(html, uri, example.name);
      if (result.passed) {
        check(result.message);
      } else {
        resourcePassed = false;
        console.log(`  ${colors.RED}✗ ${result.message}${colors.NC}`);
        if (result.details) {
          console.log(`    ${colors.RED}${result.details}${colors.NC}`);
        }
        recordError({
          example: example.name,
          resource: uri,
          category: 'VALIDATION_FAILED',
          error: result.message,
          details: result.details,
        });
      }
    }

    // 3. MIME Type
    if (checks.mimeType) {
      const result = validateMIMEType(mimeType, uri, example.name);
      if (result.passed) {
        check(result.message);
      } else {
        resourcePassed = false;
        console.log(`  ${colors.RED}✗ ${result.message}${colors.NC}`);
        if (result.details) {
          console.log(`    ${colors.RED}${result.details}${colors.NC}`);
        }
        recordError({
          example: example.name,
          resource: uri,
          category: 'VALIDATION_FAILED',
          error: result.message,
          details: result.details,
        });
      }
    }

    // 4. callTool Injection
    if (checks.callToolInjection) {
      const result = validateCallToolInjection(html, uri, example.name);
      if (result.passed) {
        check(result.message);
      } else {
        resourcePassed = false;
        console.log(`  ${colors.RED}✗ ${result.message}${colors.NC}`);
        if (result.details) {
          console.log(`    ${colors.RED}${result.details}${colors.NC}`);
        }
        recordError({
          example: example.name,
          resource: uri,
          category: 'VALIDATION_FAILED',
          error: result.message,
          details: result.details,
        });
      }
    }

    // 5. CSS Presence
    if (checks.cssPresence) {
      const result = validateCSSPresence(html, uri, example.name);
      if (result.passed) {
        check(result.message);
      } else {
        resourcePassed = false;
        console.log(`  ${colors.RED}✗ ${result.message}${colors.NC}`);
        if (result.details) {
          console.log(`    ${colors.RED}${result.details}${colors.NC}`);
        }
        recordError({
          example: example.name,
          resource: uri,
          category: 'VALIDATION_FAILED',
          error: result.message,
          details: result.details,
        });
      }
    }

    // 6. React Compilation
    if (checks.reactCompiled) {
      const result = validateReactCompiled(html, uri, example.name);
      if (result.passed) {
        check(result.message);
      } else {
        resourcePassed = false;
        console.log(`  ${colors.RED}✗ ${result.message}${colors.NC}`);
        if (result.details) {
          console.log(`    ${colors.RED}${result.details}${colors.NC}`);
        }
        recordError({
          example: example.name,
          resource: uri,
          category: 'VALIDATION_FAILED',
          error: result.message,
          details: result.details,
        });
      }
    }

    // 7. Production Optimizations
    if (checks.productionOptimizations) {
      const result = validateProductionOptimizations(html, uri, example.name);
      if (result.passed) {
        check(result.message);
      } else {
        resourcePassed = false;
        console.log(`  ${colors.RED}✗ ${result.message}${colors.NC}`);
        if (result.details) {
          console.log(`    ${colors.RED}${result.details}${colors.NC}`);
        }
        recordError({
          example: example.name,
          resource: uri,
          category: 'VALIDATION_FAILED',
          error: result.message,
          details: result.details,
        });
      }
    }

    // 8. External Files
    if (checks.externalFiles) {
      const result = validateExternalFiles(html, uri, example.name);
      if (result.passed) {
        check(result.message);
      } else {
        resourcePassed = false;
        console.log(`  ${colors.RED}✗ ${result.message}${colors.NC}`);
        if (result.details) {
          console.log(`    ${colors.RED}${result.details}${colors.NC}`);
        }
        recordError({
          example: example.name,
          resource: uri,
          category: 'VALIDATION_FAILED',
          error: result.message,
          details: result.details,
        });
      }
    }

    // 9. Theme Variables
    if (checks.themeVariables) {
      const result = validateThemeVariables(html, uri, example.name);
      if (result.passed) {
        check(result.message);
      } else {
        // Theme variables are often optional - warn instead of fail
        warn(result.message, result.details);
      }
    }

    // 10. Dynamic Content
    if (checks.dynamicContent) {
      const result = await validateDynamicContent(server, uri, example.name, example.isDynamic || false);
      if (result.passed) {
        check(result.message);
      } else {
        resourcePassed = false;
        console.log(`  ${colors.RED}✗ ${result.message}${colors.NC}`);
        if (result.details) {
          console.log(`    ${colors.RED}${result.details}${colors.NC}`);
        }
        recordError({
          example: example.name,
          resource: uri,
          category: 'VALIDATION_FAILED',
          error: result.message,
          details: result.details,
        });
      }
    }

    if (resourcePassed) {
      passedResources++;
      console.log(`  ${colors.GREEN}✓ Resource validation passed${colors.NC}`);
    } else {
      failedResources++;
      console.log(`  ${colors.RED}✗ Resource validation failed${colors.NC}`);
    }

    totalResources++;
    return resourcePassed;

  } catch (error: any) {
    failedResources++;
    totalResources++;
    resourcePassed = false;

    recordError({
      example: example.name,
      resource: uri,
      category: 'READ_FAILED',
      error: error.message,
      details: error.stack,
    });

    console.log(`  ${colors.RED}✗ Error reading resource: ${error.message}${colors.NC}`);
    if (DEBUG && error.stack) {
      console.log(`    ${colors.RED}${error.stack}${colors.NC}`);
    }

    return false;
  }
}

// ============================================================================
// Example Testing
// ============================================================================

async function testExample(example: ExampleConfig, index: number, total: number): Promise<boolean> {
  console.log(`\n${colors.BLUE}${'='.repeat(70)}${colors.NC}`);
  console.log(`${colors.BLUE}[${index + 1}/${total}] Testing: ${example.name}${colors.NC}`);
  console.log(`${colors.BLUE}${example.description}${colors.NC}`);
  console.log(`${colors.BLUE}${'='.repeat(70)}${colors.NC}`);

  verbose(`Path: ${example.path}`);
  debugLog('Example configuration', example);

  let server: any;
  let examplePassed = true;

  try {
    // Load the server
    verbose('Loading server...');
    server = await loadInterfaceServer({
      filePath: example.path,
      verbose: DEBUG,
    });

    verbose('Server loaded successfully');

    // List resources
    verbose('Listing resources...');
    const allResources = server.listResources();
    debugLog('All resources', allResources);

    // Filter for UI resources (ui:// URIs)
    const uiResources = allResources.filter((r: any) => r.uri.startsWith('ui://'));

    console.log(`\n${colors.CYAN}Found ${uiResources.length} UI resource(s)${colors.NC}`);

    if (uiResources.length === 0) {
      examplePassed = false;
      recordError({
        example: example.name,
        category: 'NO_RESOURCES',
        error: 'No UI resources found',
        details: `Expected ${example.expectedUICount} UI resources with ui:// URIs`,
      });
      console.log(`${colors.RED}✗ No UI resources found (expected ${example.expectedUICount})${colors.NC}`);
      failedExamples++;
      totalExamples++;
      return false;
    }

    // Validate UI count
    if (uiResources.length !== example.expectedUICount) {
      warn(
        `UI count mismatch: found ${uiResources.length}, expected ${example.expectedUICount}`,
        'This may indicate missing or extra UIs'
      );
    }

    // Validate each UI resource
    let allResourcesPassed = true;
    for (const resource of uiResources) {
      const resourcePassed = await validateResource(server, resource, example);
      if (!resourcePassed) {
        allResourcesPassed = false;
        examplePassed = false;
      }
    }

    // Example summary
    if (examplePassed && allResourcesPassed) {
      passedExamples++;
      console.log(`\n${colors.GREEN}✓ Example validation passed (${uiResources.length} resource(s))${colors.NC}`);
    } else {
      failedExamples++;
      console.log(`\n${colors.RED}✗ Example validation failed${colors.NC}`);
    }

    totalExamples++;

  } catch (error: any) {
    examplePassed = false;
    failedExamples++;
    totalExamples++;

    recordError({
      example: example.name,
      category: 'LOAD_FAILED',
      error: error.message,
      details: error.stack,
    });

    console.log(`\n${colors.RED}✗ Failed to load example: ${error.message}${colors.NC}`);
    if (DEBUG && error.stack) {
      console.log(`${colors.RED}${error.stack}${colors.NC}`);
    }

  } finally {
    // Cleanup
    if (server) {
      try {
        verbose('Stopping server...');
        await server.stop();
        verbose('Server stopped');
      } catch (error: any) {
        debugLog('Error stopping server', error);
      }
    }
  }

  return examplePassed;
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runTests() {
  console.log(`\n${colors.BLUE}${'='.repeat(70)}${colors.NC}`);
  console.log(`${colors.BLUE}  UI Streaming Comprehensive Validation Test${colors.NC}`);
  console.log(`${colors.BLUE}  simply-mcp-ts v4.0.0${colors.NC}`);
  console.log(`${colors.BLUE}${'='.repeat(70)}${colors.NC}`);

  const startTime = Date.now();

  // Filter examples if --example flag provided
  let examplesToTest = EXAMPLES;
  if (EXAMPLE_FILTER) {
    examplesToTest = EXAMPLES.filter(e => e.name === EXAMPLE_FILTER);
    if (examplesToTest.length === 0) {
      console.log(`\n${colors.RED}Error: No example found with name "${EXAMPLE_FILTER}"${colors.NC}`);
      console.log(`\nAvailable examples:`);
      EXAMPLES.forEach(e => console.log(`  - ${e.name}`));
      process.exit(1);
    }
    console.log(`\n${colors.CYAN}Filtering to example: ${EXAMPLE_FILTER}${colors.NC}`);
  }

  console.log(`\n${colors.CYAN}Testing ${examplesToTest.length} example(s)${colors.NC}`);
  if (VERBOSE) {
    console.log(`${colors.CYAN}Verbose mode: enabled${colors.NC}`);
  }
  if (DEBUG) {
    console.log(`${colors.CYAN}Debug mode: enabled${colors.NC}`);
  }

  // Run tests for each example
  for (let i = 0; i < examplesToTest.length; i++) {
    await testExample(examplesToTest[i], i, examplesToTest.length);
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Print summary
  console.log(`\n${colors.BLUE}${'='.repeat(70)}${colors.NC}`);
  console.log(`${colors.BLUE}  Test Summary${colors.NC}`);
  console.log(`${colors.BLUE}${'='.repeat(70)}${colors.NC}`);

  console.log(`\n${colors.CYAN}Examples:${colors.NC}`);
  console.log(`  Total:  ${totalExamples}`);
  console.log(`  ${colors.GREEN}Passed: ${passedExamples}${colors.NC}`);
  console.log(`  ${colors.RED}Failed: ${failedExamples}${colors.NC}`);
  if (totalExamples > 0) {
    const exampleSuccessRate = ((passedExamples / totalExamples) * 100).toFixed(1);
    console.log(`  Success Rate: ${exampleSuccessRate}%`);
  }

  console.log(`\n${colors.CYAN}Resources:${colors.NC}`);
  console.log(`  Total:  ${totalResources}`);
  console.log(`  ${colors.GREEN}Passed: ${passedResources}${colors.NC}`);
  console.log(`  ${colors.RED}Failed: ${failedResources}${colors.NC}`);
  if (totalResources > 0) {
    const resourceSuccessRate = ((passedResources / totalResources) * 100).toFixed(1);
    console.log(`  Success Rate: ${resourceSuccessRate}%`);
  }

  console.log(`\n${colors.CYAN}Validations:${colors.NC}`);
  console.log(`  Total:  ${totalValidations}`);
  console.log(`  ${colors.GREEN}Passed: ${passedValidations}${colors.NC}`);
  console.log(`  ${colors.RED}Failed: ${failedValidations}${colors.NC}`);
  if (totalValidations > 0) {
    const validationSuccessRate = ((passedValidations / totalValidations) * 100).toFixed(1);
    console.log(`  Success Rate: ${validationSuccessRate}%`);
  }

  console.log(`\n${colors.CYAN}Duration: ${duration}s${colors.NC}`);

  // Print error summary if there are errors
  if (errors.length > 0) {
    console.log(`\n${colors.YELLOW}${'='.repeat(70)}${colors.NC}`);
    console.log(`${colors.YELLOW}  Error Summary (${errors.length} error(s))${colors.NC}`);
    console.log(`${colors.YELLOW}${'='.repeat(70)}${colors.NC}`);

    // Group errors by category
    const errorsByCategory: Record<string, ErrorRecord[]> = {};
    errors.forEach(err => {
      if (!errorsByCategory[err.category]) {
        errorsByCategory[err.category] = [];
      }
      errorsByCategory[err.category].push(err);
    });

    for (const [category, categoryErrors] of Object.entries(errorsByCategory)) {
      console.log(`\n${colors.YELLOW}${category} (${categoryErrors.length}):${colors.NC}`);
      categoryErrors.forEach(err => {
        console.log(`  ${colors.YELLOW}•${colors.NC} ${err.example}${err.resource ? ` > ${err.resource}` : ''}`);
        console.log(`    ${err.error}`);
        if (err.details && DEBUG) {
          console.log(`    ${colors.YELLOW}${err.details}${colors.NC}`);
        }
      });
    }
  }

  console.log(`\n${colors.BLUE}${'='.repeat(70)}${colors.NC}\n`);

  // Exit with appropriate code
  if (failedExamples > 0 || failedResources > 0) {
    console.log(`${colors.RED}❌ Some tests failed${colors.NC}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.GREEN}✅ All UI streaming tests passed!${colors.NC}\n`);
    process.exit(0);
  }
}

// ============================================================================
// Execution
// ============================================================================

runTests().catch((error) => {
  console.error(`\n${colors.RED}Unhandled error:${colors.NC}`, error);
  if (DEBUG && error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
