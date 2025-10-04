/**
 * Inline dependency parser
 * Extracts and parses PEP 723-style inline dependencies from TypeScript/JavaScript source files
 *
 * Format:
 * ```typescript
 * // /// dependencies
 * // axios@^1.6.0
 * // zod@^3.22.0
 * // ///
 * ```
 */

import {
  InlineDependencies,
  ParseOptions,
  ParseResult,
  DependencyError,
  Dependency,
  ParsedDependencies,
} from './dependency-types.js';
import { validateDependencies } from './dependency-validator.js';

/**
 * Grammar specification:
 *
 * InlineMetadata   ::= StartDelimiter DependencyLine* EndDelimiter
 * StartDelimiter   ::= "//" Whitespace* "///" Whitespace* "dependencies" Whitespace* EOL
 * EndDelimiter     ::= "//" Whitespace* "///" Whitespace* EOL
 * DependencyLine   ::= CommentPrefix Whitespace* (Dependency | Comment | Empty) Whitespace* EOL
 * CommentPrefix    ::= "//"
 * Dependency       ::= PackageName VersionSpec? Whitespace* Comment?
 * PackageName      ::= ScopedName | SimpleName
 * SimpleName       ::= [a-z0-9] [a-z0-9._-]*
 * ScopedName       ::= "@" SimpleName "/" SimpleName
 * VersionSpec      ::= "@" SemverRange
 * SemverRange      ::= Operator? Version | Keyword
 * Comment          ::= "#" [^\n]*
 */

// Regex patterns (compiled once for performance)
const START_DELIMITER = /^\/\/\s*\/\/\/\s*dependencies\s*$/;
const END_DELIMITER = /^\/\/\s*\/\/\/\s*$/;
const COMMENT_LINE = /^\/\/\s*(.*)$/;

// Package name pattern: supports scoped packages like @scope/package
// Must be lowercase, alphanumeric, hyphens, underscores, dots
const PACKAGE_NAME_PATTERN = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

// Dependency line pattern: package@version or package (without version)
// Supports inline comments after #
const DEPENDENCY_PATTERN = /^([a-z0-9@/_.-]+)(?:@([0-9.*^~<>=x\-+|& ]+|latest|next))?\s*(?:#.*)?$/i;

// Maximum limits for security (prevent DoS)
const MAX_DEPENDENCIES = 1000;
const MAX_LINE_LENGTH = 1000;

/**
 * Parse inline dependencies from source code
 *
 * @param sourceCode - TypeScript/JavaScript source code
 * @param options - Parsing options
 * @returns Parse result with dependencies, errors, and warnings
 *
 * @example
 * ```typescript
 * const source = `
 * // /// dependencies
 * // axios@^1.6.0
 * // zod@^3.22.0
 * // ///
 * `;
 * const result = parseInlineDependencies(source);
 * console.log(result.dependencies); // { 'axios': '^1.6.0', 'zod': '^3.22.0' }
 * ```
 */
export function parseInlineDependencies(
  sourceCode: string,
  options: ParseOptions = {}
): ParseResult {
  const {
    strict = false,
    validateSemver = true,
    allowComments = true,
  } = options;

  const errors: DependencyError[] = [];
  const warnings: string[] = [];
  const dependencies: InlineDependencies = {};

  // Extract metadata block
  const metadataBlock = extractDependencyBlock(sourceCode);
  if (!metadataBlock) {
    // No metadata block found - this is not an error
    return {
      dependencies: {},
      errors: [],
      warnings: [],
      raw: '',
    };
  }

  // Parse each line
  const lines = metadataBlock.content.split('\n');
  let lineNumber = metadataBlock.startLine + 1; // Start after opening delimiter

  for (const line of lines) {
    lineNumber++;

    // Check line length for security
    if (line.length > MAX_LINE_LENGTH) {
      errors.push({
        type: 'SECURITY',
        package: '',
        message: `Line ${lineNumber}: Line too long (max ${MAX_LINE_LENGTH} characters)`,
        line: lineNumber,
      });
      continue;
    }

    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine || trimmedLine === '//') {
      continue;
    }

    // Check if line has comment prefix
    const commentMatch = COMMENT_LINE.exec(trimmedLine);
    if (!commentMatch) {
      errors.push({
        type: 'INVALID_FORMAT',
        package: '',
        message: `Line ${lineNumber}: Invalid format (missing // prefix)`,
        line: lineNumber,
      });
      continue;
    }

    const content = commentMatch[1].trim();

    // Skip comment-only lines (start with #)
    if (content.startsWith('#')) {
      if (!allowComments) {
        warnings.push(`Line ${lineNumber}: Comments are not allowed in strict mode`);
      }
      continue;
    }

    // Skip empty content
    if (!content) {
      continue;
    }

    // Parse dependency
    const depResult = parseDependencyLine(content, lineNumber);
    if (depResult.error) {
      errors.push(depResult.error);
      continue;
    }

    if (depResult.dependency) {
      const { name, version } = depResult.dependency;

      // Check for duplicates
      if (dependencies[name]) {
        errors.push({
          type: 'DUPLICATE',
          package: name,
          message: `Line ${lineNumber}: Duplicate dependency: ${name}`,
          line: lineNumber,
        });
        continue;
      }

      // Check dependency count limit
      if (Object.keys(dependencies).length >= MAX_DEPENDENCIES) {
        errors.push({
          type: 'SECURITY',
          package: name,
          message: `Too many dependencies (max ${MAX_DEPENDENCIES})`,
          line: lineNumber,
        });
        break;
      }

      dependencies[name] = version;
    }
  }

  // Validate dependencies if requested
  if (validateSemver) {
    const validation = validateDependencies(dependencies);
    errors.push(...validation.errors);
    warnings.push(...validation.warnings);
  }

  // Throw if strict mode and errors exist
  if (strict && errors.length > 0) {
    const errorMessages = errors.map(e => `  Line ${e.line || '?'}: ${e.message}`).join('\n');
    throw new Error(
      `Failed to parse inline dependencies:\n${errorMessages}`
    );
  }

  return {
    dependencies,
    errors,
    warnings,
    raw: metadataBlock.raw,
  };
}

/**
 * Extract dependency block from source code
 * Returns the content between // /// dependencies and // ///
 *
 * @param sourceCode - Source code to search
 * @returns Block content and metadata, or null if not found
 */
export function extractDependencyBlock(
  sourceCode: string
): { content: string; raw: string; startLine: number; endLine: number } | null {
  const lines = sourceCode.split('\n');
  let inBlock = false;
  let startLine = -1;
  let endLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!inBlock && START_DELIMITER.test(line)) {
      inBlock = true;
      startLine = i;
    } else if (inBlock && END_DELIMITER.test(line)) {
      endLine = i;
      break;
    }
  }

  // No metadata block found or incomplete block
  if (startLine === -1 || endLine === -1) {
    return null;
  }

  // Extract content (lines between delimiters)
  const blockLines = lines.slice(startLine + 1, endLine);
  const content = blockLines.join('\n');

  // Extract raw block (including delimiters)
  const raw = lines.slice(startLine, endLine + 1).join('\n');

  return {
    content,
    raw,
    startLine,
    endLine,
  };
}

/**
 * Parse a single dependency line
 *
 * @param line - Line content (without // prefix)
 * @param lineNumber - Line number for error reporting
 * @returns Parsed dependency or error
 */
export function parseDependencyLine(
  line: string,
  lineNumber: number
): { dependency?: Dependency; error?: DependencyError } {
  // Remove inline comments (anything after #)
  const contentBeforeComment = line.split('#')[0].trim();

  if (!contentBeforeComment) {
    return {}; // Empty line
  }

  // Try to parse as dependency
  const depMatch = DEPENDENCY_PATTERN.exec(contentBeforeComment);
  if (!depMatch) {
    return {
      error: {
        type: 'INVALID_FORMAT',
        package: contentBeforeComment,
        message: `Line ${lineNumber}: Invalid dependency format: "${contentBeforeComment}"`,
        line: lineNumber,
      },
    };
  }

  const [, packageName, versionSpec] = depMatch;
  const version = versionSpec || 'latest';

  return {
    dependency: {
      name: packageName,
      version,
      line: lineNumber,
    },
  };
}

/**
 * Parse inline dependencies and return detailed structure
 *
 * @param sourceCode - TypeScript/JavaScript source code
 * @param options - Parsing options
 * @returns Detailed parsed dependencies with array and map
 */
export function parseInlineDependenciesDetailed(
  sourceCode: string,
  options: ParseOptions = {}
): ParsedDependencies {
  const result = parseInlineDependencies(sourceCode, options);

  // Convert map to array of Dependency objects
  const dependencies: Dependency[] = Object.entries(result.dependencies).map(
    ([name, version]) => ({
      name,
      version,
    })
  );

  return {
    dependencies,
    map: result.dependencies,
    errors: result.errors,
    warnings: result.warnings,
    raw: result.raw,
  };
}
