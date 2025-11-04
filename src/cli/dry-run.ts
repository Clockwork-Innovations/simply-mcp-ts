/**
 * Dry-run mode for validating server configuration without starting
 * Validates server files, detects API style, and extracts metadata
 */

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { APIStyle } from './run.js';

/**
 * Dynamically load TypeScript file
 * If tsx is loaded as Node loader, use direct import for decorator support
 * Otherwise use tsImport API
 */
async function loadTypeScriptFile(absolutePath: string): Promise<any> {
  // Check if tsx is loaded as Node loader (via --import tsx)
  const tsxLoaded = process.execArgv.some(arg => arg.includes('tsx') || arg.includes('--import tsx'));

  if (tsxLoaded) {
    // tsx is loaded as loader, use direct import for full decorator support
    const fileUrl = pathToFileURL(absolutePath).href;
    return await import(fileUrl);
  }

  // Fallback to tsImport API (for backwards compatibility)
  try {
    const { tsImport } = await import('tsx/esm/api');
    return await tsImport(absolutePath, import.meta.url);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot find module')) {
      console.error('Error: tsx package is required to load TypeScript files');
      console.error('');
      console.error('Solutions:');
      console.error('  1. Install tsx: npm install tsx');
      console.error('  2. Use bundled output: simplymcp bundle ' + absolutePath);
      console.error('  3. Compile to .js first: tsc ' + absolutePath);
      console.error('');
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Validation issue severity
 */
type ValidationSeverity = 'error' | 'warn' | 'info';

/**
 * Structured validation issue
 */
interface ValidationIssue {
  severity: ValidationSeverity;
  message: string;
  fix?: string;
  details?: string;
}

/**
 * Categorized validation issues by prompt name
 */
interface PromptValidationResult {
  promptName: string;
  interfaceName: string;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  infos: ValidationIssue[];
  argumentsSummary?: string[];
}

/**
 * Result of dry-run validation
 */
export interface DryRunResult {
  success: boolean;
  detectedStyle: APIStyle;
  serverConfig: {
    name: string;
    version: string;
    description?: string;
    port?: number;
  };
  tools: Array<{ name?: string; description?: string; methodName?: string }>;
  prompts: Array<{ name: string; description?: string }>;
  resources: Array<{ name: string; description?: string }>;
  transport: 'stdio' | 'http';
  portConfig: number;
  warnings: string[];
  errors: string[];
  promptValidation?: PromptValidationResult[];
}

/**
 * Validation functions
 */

/**
 * Validate server configuration
 */
function validateServerConfig(name: string, version: string, description: string | undefined, errors: string[], warnings: string[]): void {
  if (!name) {
    errors.push('Missing required field: name');
  }
  if (!description) {
    errors.push('Missing required field: description');
  }
  // Version is optional - defaults to '1.0.0' if not specified
  if (version && !/^\d+\.\d+\.\d+/.test(version)) {
    warnings.push(`Version "${version}" doesn't follow semver format (x.y.z)`);
  }
}

/**
 * Validate port number
 */
function validatePort(port: number, errors: string[]): void {
  if (port < 1 || port > 65535) {
    errors.push(`Invalid port: ${port} (must be 1-65535)`);
  }
}

/**
 * Validate tool names for duplicates and valid naming
 */
function validateToolNames(tools: Array<{ name: string; description?: string }>, errors: string[], warnings: string[]): void {
  const seen = new Set<string>();

  for (const tool of tools) {
    if (!tool.name) {
      errors.push('Tool found with missing name');
      continue;
    }

    if (seen.has(tool.name)) {
      errors.push(`Duplicate tool name: ${tool.name}`);
    }
    seen.add(tool.name);

    if (!tool.description) {
      warnings.push(`Tool '${tool.name}' has no description`);
    }

    // Check for valid naming convention (lowercase, hyphens)
    if (!/^[a-z][a-z0-9-]*$/.test(tool.name)) {
      warnings.push(`Tool '${tool.name}' doesn't follow kebab-case naming convention`);
    }
  }

  // Warn if too many tools
  if (tools.length > 50) {
    warnings.push(`Large number of tools (${tools.length}). Consider splitting into multiple servers.`);
  }
}

/**
 * Check if a type node represents a readonly array (with 'as const')
 *
 * NOTE: This validation rule is currently disabled because the parser
 * extracts argument metadata from interface definitions, not from
 * runtime values. The 'as const' assertion is a runtime concern that
 * can't be reliably detected from the interface AST alone.
 *
 * To properly validate this, we would need to:
 * 1. Parse the actual implementation (not just the interface)
 * 2. Track the AST node for enum values
 * 3. Check if they have a const assertion
 *
 * This is left as a future enhancement for the Feature Layer.
 */
function isReadonlyArray(node: any): boolean {
  // Disabled - see note above
  return false;

  // Check for TypeAssertion with 'as const'
  // if (node && node.kind === 232) { // ts.SyntaxKind.TypeAssertionExpression
  //   return true;
  // }
  // // Check for AsExpression with 'const' type
  // if (node && node.kind === 233) { // ts.SyntaxKind.AsExpression
  //   return true;
  // }
  // return false;
}

/**
 * Validate prompt interfaces with new argument system
 */
function validatePromptInterfaces(
  parsedPrompts: any[],
  serverInstance: any,
  errors: string[],
  warnings: string[]
): PromptValidationResult[] {
  const results: PromptValidationResult[] = [];

  for (const prompt of parsedPrompts) {
    const promptErrors: ValidationIssue[] = [];
    const promptWarnings: ValidationIssue[] = [];
    const promptInfos: ValidationIssue[] = [];
    const argsSummary: string[] = [];

    // Validation Rule 1: Missing args field
    if (!prompt.argsMetadata) {
      promptErrors.push({
        severity: 'error',
        message: `Prompt '${prompt.name}' missing required 'args' field`,
        fix: `Add args: { argName: {} } or args: {} for no args`,
      });
    } else {
      // Validate individual arguments
      const argEntries = Object.entries(prompt.argsMetadata);

      if (argEntries.length === 0) {
        argsSummary.push('No arguments');
      } else {
        for (const [argName, argDef] of argEntries) {
          const arg = argDef as any;

          // Validation Rule 2: Invalid type value (if type is specified)
          if (arg.type && !['string', 'number', 'boolean'].includes(arg.type)) {
            promptErrors.push({
              severity: 'error',
              message: `Argument '${argName}' has invalid type '${arg.type}'`,
              fix: `Valid types: 'string' | 'number' | 'boolean'`,
            });
          }

          // Validation Rule 3: Enum arrays
          // NOTE: Do NOT use 'as const' on enum arrays - it causes LiteralType errors at runtime.
          // The parsed enum values can't tell us if 'as const' was used, so we can't validate this
          // at dry-run time. Instead, rely on runtime errors to catch this issue.
          // Documentation: See PROMPTS.md "Important: Don't Use `as const` on Enums"
          // This is left as a user responsibility to follow best practices.

          // Validation Rule 4: Empty argument definition (info)
          // Only show info for truly empty arguments (no fields at all)
          const hasAnyMetadata = arg.description || arg.type || arg.enum || arg.required !== undefined;
          if (Object.keys(arg).length === 0 || !hasAnyMetadata) {
            promptInfos.push({
              severity: 'info',
              message: `Argument '${argName}' uses default settings`,
              details: `Type: string (default), Required: true (default)`,
            });
          }

          // Build argument summary
          const argType = arg.type || 'string';
          const required = arg.required !== false;
          const enumValues = arg.enum && arg.enum.length > 0 ? ` (${arg.enum.join(' | ')})` : '';
          argsSummary.push(`- ${argName}: ${argType}${enumValues} (${required ? 'required' : 'optional'})`);
        }
      }
    }

    // Validation Rule 5: Missing implementation method
    if (serverInstance && !serverInstance[prompt.methodName]) {
      promptErrors.push({
        severity: 'error',
        message: `Prompt '${prompt.name}' has no implementation method`,
        fix: `Add ${prompt.methodName}: ${prompt.interfaceName} = (args) => { ... }`,
      });
    }

    // Add to results if there are any issues
    if (promptErrors.length > 0 || promptWarnings.length > 0 || promptInfos.length > 0) {
      results.push({
        promptName: prompt.name,
        interfaceName: prompt.interfaceName,
        errors: promptErrors,
        warnings: promptWarnings,
        infos: promptInfos,
        argumentsSummary: argsSummary.length > 0 ? argsSummary : undefined,
      });
    } else if (argsSummary.length > 0) {
      // Valid prompt with arguments - show summary
      results.push({
        promptName: prompt.name,
        interfaceName: prompt.interfaceName,
        errors: [],
        warnings: [],
        infos: [],
        argumentsSummary: argsSummary,
      });
    }

    // Add errors/warnings to global lists
    for (const issue of promptErrors) {
      errors.push(`[PROMPT: ${prompt.name}] ${issue.message}${issue.fix ? ` → Fix: ${issue.fix}` : ''}`);
    }
    for (const issue of promptWarnings) {
      warnings.push(`[PROMPT: ${prompt.name}] ${issue.message}${issue.fix ? ` → Fix: ${issue.fix}` : ''}`);
    }
  }

  return results;
}

/**
 * Perform dry-run for interface API style
 */
async function dryRunInterface(filePath: string, useHttp: boolean, port: number): Promise<DryRunResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const tools: Array<{ name?: string; description?: string; methodName?: string }> = [];
  const prompts: Array<{ name: string; description?: string }> = [];
  const resources: Array<{ name: string; description?: string }> = [];

  let serverConfig = {
    name: '',
    version: '',
    description: undefined as string | undefined,
    port: undefined as number | undefined,
  };

  try {
    // Import the interface parser and adapter
    const { dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const distPath = resolve(__dirname, '..');

    const { parseInterfaceFile } = await import(
      pathToFileURL(resolve(distPath, 'server/parser.js')).href
    );

    // Parse the interface file directly to get metadata
    const absolutePath = resolve(process.cwd(), filePath);
    const parsed = parseInterfaceFile(absolutePath);

    // Add any validation errors from parsing to the errors array
    if (parsed.validationErrors && parsed.validationErrors.length > 0) {
      errors.push(...parsed.validationErrors);
    }

    // Extract server config (including transport/port/stateful from IServer)
    let fileTransport: 'stdio' | 'http' | undefined;
    let filePort: number | undefined;

    if (parsed.server) {
      serverConfig = {
        name: parsed.server.name || '',
        version: parsed.server.version || '',
        description: parsed.server.description,
        port: parsed.server.port,
      };
      fileTransport = parsed.server.transport;
      filePort = parsed.server.port;
    }

    // Validate server config
    validateServerConfig(serverConfig.name, serverConfig.version, serverConfig.description, errors, warnings);

    // Determine final transport (CLI flag overrides file config)
    const finalTransport = useHttp ? 'http' : (fileTransport || 'stdio');
    // Port priority: CLI --port > file port > default 3000
    const finalPort = port !== 3000 ? port : (filePort || 3000);

    // If file specifies HTTP transport, note it in warnings (informational)
    if (fileTransport === 'http' && !useHttp) {
      warnings.push(`Server configured for HTTP transport (port ${filePort || 3000}) in IServer interface. Will use HTTP unless --stdio flag is provided.`);
    }

    // Extract tool metadata with actual names and descriptions
    for (const tool of parsed.tools) {
      tools.push({
        name: tool.name,
        description: tool.description || undefined,
        methodName: tool.methodName,  // Phase 2.1: Include methodName for inference
      });

      // Warn if tool has no description
      if (!tool.description) {
        // Use inferred name if explicit name not provided
        const displayName = tool.name || (tool.methodName ? `${tool.methodName} (inferred)` : 'unnamed');
        warnings.push(`Tool '${displayName}' has no description. Add a description field to improve documentation.`);
      }
    }

    // Load the server instance to check for prompt and resource implementations
    let serverInstance: any = null;
    try {
      const module = await loadTypeScriptFile(absolutePath);
      const ServerClass =
        module.default ||
        (parsed.className ? module[parsed.className] : null);

      if (ServerClass) {
        serverInstance = new ServerClass();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Distinguish between TypeScript compilation errors and runtime errors
      const isSyntaxError =
        errorMessage.includes('Transform failed') ||
        errorMessage.includes('Unexpected') ||
        errorMessage.includes('SyntaxError') ||
        errorMessage.includes('Parse error');

      // Check for export pattern errors (instance instead of class)
      const isExportError =
        errorMessage.includes('is not a constructor') ||
        errorMessage.includes('is not a class');

      if (isSyntaxError || isExportError) {
        // Syntax/Export error = FAIL dry-run
        let helpMessage = isSyntaxError
          ? `TypeScript compilation error: ${errorMessage}`
          : `Invalid server export: ${errorMessage}`;

        // Add helpful context for common mistakes
        if (errorMessage.includes('Unexpected "{"')) {
          helpMessage += '\n\n' +
            '    Common issue: Interfaces cannot have method implementations.\n' +
            '    \n' +
            '    ❌ WRONG:\n' +
            '    interface MyResource extends IResource {\n' +
            '      returns: string;\n' +
            '      text() { return "data"; }  // Invalid in interface!\n' +
            '    }\n' +
            '    \n' +
            '    ✅ CORRECT:\n' +
            '    interface MyResource extends IResource {\n' +
            '      returns: string;  // Type definition only\n' +
            '    }\n' +
            '    \n' +
            '    class MyServer implements MyServerInterface {\n' +
            '      "resource://uri": MyResource = async () => "data";  // Implementation here\n' +
            '    }';
        } else if (isExportError) {
          helpMessage += '\n\n' +
            '    Server must export a class constructor, not an instance.\n' +
            '    \n' +
            '    ❌ WRONG:\n' +
            '    export default new MyServer();\n' +
            '    \n' +
            '    ✅ CORRECT:\n' +
            '    export default MyServer;';
        }

        errors.push(helpMessage);
      } else {
        // Runtime error = WARNING (allow dry-run to continue)
        warnings.push(
          `Could not load server implementation: ${errorMessage}\n` +
          '    This may be due to missing environment variables or runtime dependencies.\n' +
          '    Implementation checks will be skipped.'
        );
      }
    }

    // Extract prompt metadata with actual names and descriptions
    for (const prompt of parsed.prompts) {
      prompts.push({
        name: prompt.name,
        description: prompt.description || undefined,
      });

      // Warn if prompt has no description
      if (!prompt.description) {
        warnings.push(`Prompt '${prompt.name}' has no description. Add a description field to improve documentation.`);
      }
    }

    // Validate prompt interfaces with new argument system
    const promptValidation = validatePromptInterfaces(parsed.prompts, serverInstance, errors, warnings);

    // Extract resource metadata with actual URIs and descriptions
    for (const resource of parsed.resources) {
      resources.push({
        name: resource.uri,
        description: resource.description || resource.name || undefined,
      });

      // Warn if resource has no description
      if (!resource.description) {
        warnings.push(`Resource '${resource.uri}' has no description. Add a description field to improve documentation.`);
      }

      // Check if dynamic resources have implementation
      // Only warn if the resource is dynamic AND no implementation exists
      if (resource.dynamic) {
        // Phase 2.2: Check both semantic name and URI property
        const hasSemanticImpl = serverInstance && serverInstance[resource.methodName] !== undefined &&
                                typeof serverInstance[resource.methodName] === 'function';
        const hasUriImpl = serverInstance && serverInstance[resource.uri] !== undefined &&
                          typeof serverInstance[resource.uri] === 'function';
        const hasImplementation = hasSemanticImpl || hasUriImpl;

        if (!hasImplementation) {
          warnings.push(`Resource '${resource.uri}' is dynamic and requires implementation.\n` +
                       `    Expected: A method with URI as property name ('${resource.uri}') or semantic name.\n` +
                       `    Note: Semantic names (e.g., 'userStats') can't be detected in dry-run mode.`);
        }
      }
    }

    // Validate port if HTTP is used
    if (finalTransport === 'http') {
      validatePort(finalPort, errors);
    }

    return {
      success: errors.length === 0 && warnings.length === 0,
      detectedStyle: 'interface',
      serverConfig,
      tools,
      prompts,
      resources,
      transport: finalTransport,
      portConfig: finalPort,
      warnings,
      errors,
      promptValidation,
    };
  } catch (error) {
    errors.push(`Failed to load interface server: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      detectedStyle: 'interface',
      serverConfig,
      tools,
      prompts,
      resources,
      transport: useHttp ? 'http' : 'stdio',
      portConfig: port,
      warnings,
      errors,
    };
  }
}

/**
 * Display dry-run result in human-readable format
 */
async function displayDryRunResult(result: DryRunResult): Promise<void> {
  console.log('');

  if (result.success) {
    console.log('✓ Dry run complete\n');
  } else {
    console.log('✗ Dry run failed\n');
  }

  // Server Configuration
  console.log('Server Configuration:');
  console.log(`  Name: ${result.serverConfig.name || '(missing)'}`);
  console.log(`  Version: ${result.serverConfig.version || '(missing)'}`);
  console.log(`  API Style: ${result.detectedStyle}`);
  console.log('');

  // Transport
  console.log('Transport:');
  console.log(`  Type: ${result.transport}`);
  if (result.transport === 'http') {
    console.log(`  Port: ${result.portConfig}`);
  } else {
    console.log('  Port: N/A (stdio mode)');
  }
  console.log('');

  // Capabilities
  console.log('Capabilities:');
  console.log(`  Tools: ${result.tools.length}`);

  if (result.tools.length > 0) {
    // Import camelToSnake for name inference
    const { camelToSnake } = await import('../server/parser.js');

    for (const tool of result.tools.slice(0, 10)) {
      // Phase 2.1: Infer tool name from method name if not explicit
      const toolName = tool.name || (tool.methodName ? camelToSnake(tool.methodName) : 'unnamed');
      console.log(`    - ${toolName}: ${tool.description || '(no description)'}`);
    }
    if (result.tools.length > 10) {
      console.log(`    ... and ${result.tools.length - 10} more`);
    }
  }

  console.log(`  Prompts: ${result.prompts.length}`);
  if (result.prompts.length > 0) {
    for (const prompt of result.prompts.slice(0, 5)) {
      console.log(`    - ${prompt.name}: ${prompt.description || '(no description)'}`);
    }
    if (result.prompts.length > 5) {
      console.log(`    ... and ${result.prompts.length - 5} more`);
    }
  }

  console.log(`  Resources: ${result.resources.length}`);
  if (result.resources.length > 0) {
    for (const resource of result.resources.slice(0, 5)) {
      console.log(`    - ${resource.name}: ${resource.description || '(no description)'}`);
    }
    if (result.resources.length > 5) {
      console.log(`    ... and ${result.resources.length - 5} more`);
    }
  }
  console.log('');

  // Enhanced Prompt Validation Results
  if (result.promptValidation && result.promptValidation.length > 0) {
    console.log('Validating prompt interfaces...\n');

    let validCount = 0;
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    for (const validation of result.promptValidation) {
      const hasErrors = validation.errors.length > 0;
      const hasWarnings = validation.warnings.length > 0;
      const hasInfos = validation.infos.length > 0;

      if (!hasErrors && !hasWarnings && !hasInfos) {
        // Valid prompt
        validCount++;
        console.log(`✅ ${validation.promptName} - Valid`);
        if (validation.argumentsSummary && validation.argumentsSummary.length > 0) {
          console.log('   Arguments:');
          for (const arg of validation.argumentsSummary) {
            console.log(`   ${arg}`);
          }
        }
        console.log('');
      } else {
        // Prompt with issues
        if (hasErrors) {
          errorCount++;
          console.log(`❌ ${validation.promptName} - ${validation.errors.length} error${validation.errors.length > 1 ? 's' : ''}:`);
          console.log('');
          for (const error of validation.errors) {
            console.log(`   [ERROR] ${error.message}`);
            if (error.fix) {
              console.log(`   → Fix: ${error.fix}`);
            }
            if (error.details) {
              console.log(`   → Details: ${error.details}`);
            }
            console.log('');
          }
        } else if (hasWarnings) {
          warningCount++;
          console.log(`⚠️  ${validation.promptName} - ${validation.warnings.length} warning${validation.warnings.length > 1 ? 's' : ''}:`);
          console.log('');
          for (const warning of validation.warnings) {
            console.log(`   [WARN] ${warning.message}`);
            if (warning.fix) {
              console.log(`   → Fix: ${warning.fix}`);
            }
            if (warning.details) {
              console.log(`   → Details: ${warning.details}`);
            }
            console.log('');
          }
        } else if (hasInfos) {
          infoCount++;
          console.log(`ℹ️  ${validation.promptName} - ${validation.infos.length} info message${validation.infos.length > 1 ? 's' : ''}:`);
          console.log('');
          for (const info of validation.infos) {
            console.log(`   [INFO] ${info.message}`);
            if (info.details) {
              console.log(`   → ${info.details}`);
            }
            console.log('');
          }
        }
      }
    }

    // Summary
    console.log('Summary:');
    if (validCount > 0) {
      console.log(`  ✅ ${validCount} prompt${validCount > 1 ? 's' : ''} valid`);
    }
    if (errorCount > 0) {
      console.log(`  ❌ ${errorCount} prompt${errorCount > 1 ? 's' : ''} with errors`);
    }
    if (warningCount > 0) {
      console.log(`  ⚠️  ${warningCount} prompt${warningCount > 1 ? 's' : ''} with warnings`);
    }
    if (infoCount > 0) {
      console.log(`  ℹ️  ${infoCount} prompt${infoCount > 1 ? 's' : ''} with info messages`);
    }
    console.log('');

    if (errorCount > 0) {
      console.log('Validation failed - fix errors before running server');
      console.log('');
    }
  }

  // Warnings
  if (result.warnings.length > 0) {
    console.log('Warnings:');
    for (const warning of result.warnings) {
      console.log(`  - ${warning}`);
    }
    console.log('');
  }

  // Errors
  if (result.errors.length > 0) {
    console.log('Errors:');
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
    console.log('');
  }

  // Status
  if (result.success) {
    console.log('Status: ✓ Ready to run');
  } else {
    const hasErrors = result.errors.length > 0;
    const hasWarnings = result.warnings.length > 0;

    if (hasErrors && hasWarnings) {
      console.log('Status: ✗ Cannot run (fix errors and warnings above)');
    } else if (hasErrors) {
      console.log('Status: ✗ Cannot run (fix errors above)');
    } else {
      console.log('Status: ✗ Cannot run (fix warnings above)');
    }
  }
  console.log('');
}

/**
 * Main entry point for dry-run mode
 */
export async function runDryRun(
  filePath: string,
  style: APIStyle,
  useHttp: boolean,
  port: number,
  jsonOutput: boolean = false
): Promise<void> {
  let result: DryRunResult;

  // Perform dry-run for interface API
  result = await dryRunInterface(filePath, useHttp, port);

  // Output results
  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    await displayDryRunResult(result);
  }

  // Exit with appropriate code
  process.exit(result.errors.length > 0 ? 1 : 0);
}

