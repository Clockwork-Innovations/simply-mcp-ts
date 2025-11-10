/**
 * TypeScript Runtime
 *
 * Compiles TypeScript code to JavaScript using ts.transpileModule.
 * Provides in-memory compilation without file I/O.
 * Supports tool injection for Layer 2 code execution.
 */

import type * as tsType from 'typescript';
import type { IRuntime, IRuntimeConfig, RuntimeEnvironment, CompilationResult } from './base-runtime.js';
import type { InternalTool } from '../tool-injection/type-generator.js';
import { generateTypeDeclarations } from '../tool-injection/type-generator.js';
import { createToolWrappers } from '../tool-injection/tool-wrapper.js';

/**
 * TypeScript runtime using ts.transpileModule for compilation
 *
 * Features:
 * - In-memory TypeScript compilation
 * - Strict type checking enabled
 * - Target ES2020 for modern JavaScript features
 * - Detailed error reporting with line/column numbers
 * - Tool injection with type declarations (Layer 2.2)
 *
 * @example
 * ```typescript
 * const runtime = new TypeScriptRuntime({
 *   language: 'typescript',
 *   timeout: 5000,
 *   captureOutput: true
 * }, tools);
 *
 * const env = await runtime.prepare('const x: number = 42; return x * 2;');
 * // env.compiledCode contains transpiled JavaScript
 * // env.sandbox contains injected tool wrappers
 * ```
 */
export class TypeScriptRuntime implements IRuntime {
  private config: IRuntimeConfig;
  private typescript?: typeof tsType;
  private tools?: Map<string, InternalTool>;
  private declarations?: string;

  constructor(config: IRuntimeConfig, tools?: Map<string, InternalTool>) {
    this.config = config;
    this.tools = tools;

    // Pre-generate type declarations if tools provided and introspection enabled
    if (tools && config.introspectTools !== false) {
      this.declarations = generateTypeDeclarations(tools, true);
    }
  }

  /**
   * Lazy load TypeScript compiler
   *
   * TypeScript is only loaded when actually needed.
   * Provides clear error message if not installed.
   *
   * @returns TypeScript module
   * @throws Error if TypeScript is not installed
   */
  private async loadTypeScript(): Promise<typeof tsType> {
    if (this.typescript) {
      return this.typescript;
    }

    try {
      this.typescript = await import('typescript');
      return this.typescript;
    } catch (error) {
      throw new Error(
        'TypeScript runtime requires the typescript package.\n' +
        'Install it with: npm install typescript\n' +
        'Or set language: "javascript" to use JavaScript runtime.'
      );
    }
  }

  /**
   * Compile TypeScript code to JavaScript
   *
   * Uses ts.transpileModule for fast, in-memory compilation.
   * Reports all compilation errors with location information.
   *
   * @param code - TypeScript source code
   * @returns Compilation result with JavaScript or errors
   *
   * @example
   * ```typescript
   * const result = await runtime.compile('const x: number = 42;');
   * if (result.success) {
   *   console.log('Compiled:', result.javascript);
   * } else {
   *   console.error('Errors:', result.errors);
   * }
   * ```
   */
  async compile(code: string): Promise<CompilationResult> {
    const ts = await this.loadTypeScript();

    const result = ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
      },
      reportDiagnostics: true,
    });

    if (result.diagnostics && result.diagnostics.length > 0) {
      const errors = result.diagnostics.map(diagnostic => {
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

        if (diagnostic.file && diagnostic.start !== undefined) {
          const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
          return {
            line: line + 1, // Convert to 1-indexed
            column: character + 1,
            message,
            code: `TS${diagnostic.code}`,
          };
        }

        return {
          line: 0,
          column: 0,
          message,
          code: `TS${diagnostic.code}`,
        };
      });

      return {
        success: false,
        errors,
      };
    }

    return {
      success: true,
      javascript: result.outputText,
    };
  }

  /**
   * Prepare TypeScript code for execution with tool injection
   *
   * Layer 2.2: Adds tool injection support
   *
   * Steps:
   * 1. Prepend type declarations for tools (if introspection enabled)
   * 2. Compile TypeScript to JavaScript
   * 3. Wrap in IIFE to allow return statements
   * 4. Create sandbox with tool wrappers
   *
   * @param code - TypeScript source code
   * @param context - Optional execution context (for tool injection)
   * @returns Runtime environment ready for VM execution
   * @throws Error if compilation fails
   *
   * @example
   * ```typescript
   * const env = await runtime.prepare('const x: number = 42; return x;', context);
   * // env.compiledCode is wrapped JavaScript
   * // env.sandbox contains tool wrappers (if introspection enabled)
   * ```
   */
  async prepare(code: string, context?: any): Promise<RuntimeEnvironment> {
    // Generate full code with type declarations
    let fullCode = code;
    if (this.declarations) {
      fullCode = `${this.declarations}\n\n// User code\n${code}`;
    }

    // Compile TypeScript to JavaScript
    const compileResult = await this.compile(fullCode);

    if (!compileResult.success || !compileResult.javascript) {
      // Format errors for LLM-friendly display
      const errorMessages = compileResult.errors!
        .map(err => {
          if (err.line === 0) {
            return err.message;
          }
          return `Line ${err.line}, Column ${err.column}: ${err.message}`;
        })
        .join('\n');

      throw new Error(`TypeScript compilation failed:\n${errorMessages}`);
    }

    // Wrap in IIFE to allow return statements
    const wrappedCode = `(async () => {\n${compileResult.javascript}\n})()`;

    // Create sandbox with tool wrappers
    const sandbox: Record<string, any> = {};

    // Inject tool wrappers if introspection enabled
    if (this.tools && this.config.introspectTools !== false && context) {
      const wrappers = createToolWrappers(this.tools, context, true);
      Object.assign(sandbox, wrappers);
    }

    // Capture output flag (handled by VmExecutor)
    if (this.config.captureOutput) {
      sandbox._captureOutput = true;
    }

    return {
      compiledCode: wrappedCode,
      sandbox,
      declarations: this.declarations,
    };
  }
}
