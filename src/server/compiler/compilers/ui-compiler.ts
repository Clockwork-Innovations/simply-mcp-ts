/**
 * UI Interface Compiler
 *
 * Compiles IUI interfaces into ParsedUI metadata for runtime use.
 */

import * as ts from 'typescript';
import type { ParsedUI } from '../types.js';
import { extractStaticData } from '../compiler-helpers.js';
import { toKebabCase } from '../utils.js';

export function compileUIInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): ParsedUI | null {
  const interfaceName = node.name.text;
  // DEBUG: Log when parsing UI interface
  console.error(`[DEBUG:UI-PARSER] Parsing UI interface: "${interfaceName}"`);

  let uri = '';
  let name = '';
  let description = '';
  let html: string | undefined;
  let css: string | undefined;
  let tools: string[] | undefined;
  let size: { width?: number; height?: number } | undefined;
  let subscribable: boolean | undefined;
  let dynamic = false;
  let dataType = 'any';

  // Feature Layer fields
  let file: string | undefined;
  let component: string | undefined;
  let script: string | undefined;
  let stylesheets: string[] | undefined;
  let scripts: string[] | undefined;
  let dependencies: string[] | undefined;
  let bundle:
    | boolean
    | { minify?: boolean; sourcemap?: boolean; external?: string[]; format?: 'iife' | 'esm' }
    | undefined;
  let imports: string[] | undefined;
  let theme: string | { name: string; variables: Record<string, string> } | undefined;

  // Polish Layer fields - Production Optimizations
  let minify: boolean | { html?: boolean; css?: boolean; js?: boolean } | undefined;
  let cdn:
    | boolean
    | { baseUrl?: string; sri?: boolean | 'sha256' | 'sha384' | 'sha512'; compression?: 'gzip' | 'brotli' | 'both' }
    | undefined;
  let performance:
    | boolean
    | {
        track?: boolean;
        report?: boolean;
        thresholds?: {
          maxBundleSize?: number;
          maxCompilationTime?: number;
          minCacheHitRate?: number;
          minCompressionSavings?: number;
        };
      }
    | undefined;

  // Phase 3A: text/uri-list MIME type support
  let externalUrl: string | undefined;

  // Phase 3B: Remote DOM MIME type support
  let remoteDom: string | undefined;

  // v4.0: Unified source field
  let source: string | undefined;

  // Parse interface members
  for (const member of node.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const memberName = member.name.getText(sourceFile);

      if (memberName === 'uri' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          uri = literal.text;
        }
      } else if (memberName === 'name' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          name = literal.text;
        }
      } else if (memberName === 'description' && member.type && ts.isLiteralTypeNode(member.type)) {
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          description = literal.text;
        }
      } else if (memberName === 'html' && member.type) {
        // Extract HTML content from string literal or template literal
        if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (ts.isStringLiteral(literal) || ts.isNoSubstitutionTemplateLiteral(literal)) {
            html = literal.text;
            // DEBUG: Log HTML extraction
            console.error(`[DEBUG:UI-PARSER] Extracted HTML from template literal in interface "${interfaceName}", length=${html.length}`);
          }
        }
      } else if (memberName === 'css' && member.type) {
        // Extract CSS content from string literal or template literal
        if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (ts.isStringLiteral(literal) || ts.isNoSubstitutionTemplateLiteral(literal)) {
            css = literal.text;
          }
        }
      } else if (memberName === 'tools' && member.type) {
        // Extract tools array from tuple type
        if (ts.isTupleTypeNode(member.type)) {
          const toolsArray: string[] = [];
          for (const element of member.type.elements) {
            const elementType = ts.isNamedTupleMember(element) ? element.type : element;
            if (ts.isLiteralTypeNode(elementType)) {
              const literal = elementType.literal;
              if (ts.isStringLiteral(literal)) {
                toolsArray.push(literal.text);
              }
            }
          }
          if (toolsArray.length > 0) {
            tools = toolsArray;
          }
        }
      } else if (memberName === 'size' && member.type) {
        // Extract size object from type literal
        if (ts.isTypeLiteralNode(member.type)) {
          const sizeObj: { width?: number; height?: number } = {};
          for (const sizeMember of member.type.members) {
            if (ts.isPropertySignature(sizeMember) && sizeMember.name && sizeMember.type) {
              const sizeMemberName = sizeMember.name.getText(sourceFile);
              if (ts.isLiteralTypeNode(sizeMember.type)) {
                const literal = sizeMember.type.literal;
                if (ts.isNumericLiteral(literal)) {
                  const value = parseInt(literal.text, 10);
                  if (sizeMemberName === 'width') {
                    sizeObj.width = value;
                  } else if (sizeMemberName === 'height') {
                    sizeObj.height = value;
                  }
                }
              }
            }
          }
          if (sizeObj.width !== undefined || sizeObj.height !== undefined) {
            size = sizeObj;
          }
        }
      } else if (memberName === 'subscribable' && member.type) {
        // Handle both direct boolean keywords and literal type nodes
        if (member.type.kind === ts.SyntaxKind.TrueKeyword) {
          subscribable = true;
        } else if (member.type.kind === ts.SyntaxKind.FalseKeyword) {
          subscribable = false;
        } else if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (literal.kind === ts.SyntaxKind.TrueKeyword) {
            subscribable = true;
          } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
            subscribable = false;
          }
        }
      } else if (memberName === 'dynamic' && member.type) {
        // Handle both direct boolean keywords and literal type nodes
        if (member.type.kind === ts.SyntaxKind.TrueKeyword) {
          dynamic = true;
        } else if (member.type.kind === ts.SyntaxKind.FalseKeyword) {
          dynamic = false;
        } else if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (literal.kind === ts.SyntaxKind.TrueKeyword) {
            dynamic = true;
          } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
            dynamic = false;
          }
        }
      } else if (memberName === 'data' && member.type) {
        dataType = member.type.getText(sourceFile);
      } else if (memberName === 'file' && member.type && ts.isLiteralTypeNode(member.type)) {
        // Extract file path
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          file = literal.text;
        }
      } else if (memberName === 'component' && member.type && ts.isLiteralTypeNode(member.type)) {
        // Extract component path
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          component = literal.text;
        }
      } else if (memberName === 'script' && member.type && ts.isLiteralTypeNode(member.type)) {
        // Extract script path
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          script = literal.text;
        }
      } else if (memberName === 'stylesheets' && member.type) {
        // Extract stylesheets array from tuple type
        if (ts.isTupleTypeNode(member.type)) {
          const stylesheetsArray: string[] = [];
          for (const element of member.type.elements) {
            const elementType = ts.isNamedTupleMember(element) ? element.type : element;
            if (ts.isLiteralTypeNode(elementType)) {
              const literal = elementType.literal;
              if (ts.isStringLiteral(literal)) {
                stylesheetsArray.push(literal.text);
              }
            }
          }
          if (stylesheetsArray.length > 0) {
            stylesheets = stylesheetsArray;
          }
        }
      } else if (memberName === 'scripts' && member.type) {
        // Extract scripts array from tuple type
        if (ts.isTupleTypeNode(member.type)) {
          const scriptsArray: string[] = [];
          for (const element of member.type.elements) {
            const elementType = ts.isNamedTupleMember(element) ? element.type : element;
            if (ts.isLiteralTypeNode(elementType)) {
              const literal = elementType.literal;
              if (ts.isStringLiteral(literal)) {
                scriptsArray.push(literal.text);
              }
            }
          }
          if (scriptsArray.length > 0) {
            scripts = scriptsArray;
          }
        }
      } else if (memberName === 'dependencies' && member.type) {
        // Extract dependencies array from tuple type
        if (ts.isTupleTypeNode(member.type)) {
          const dependenciesArray: string[] = [];
          for (const element of member.type.elements) {
            const elementType = ts.isNamedTupleMember(element) ? element.type : element;
            if (ts.isLiteralTypeNode(elementType)) {
              const literal = elementType.literal;
              if (ts.isStringLiteral(literal)) {
                dependenciesArray.push(literal.text);
              }
            }
          }
          if (dependenciesArray.length > 0) {
            dependencies = dependenciesArray;
          }
        }
      } else if (memberName === 'imports' && member.type) {
        // Extract imports array from tuple type
        if (ts.isTupleTypeNode(member.type)) {
          const importsArray: string[] = [];
          for (const element of member.type.elements) {
            const elementType = ts.isNamedTupleMember(element) ? element.type : element;
            if (ts.isLiteralTypeNode(elementType)) {
              const literal = elementType.literal;
              if (ts.isStringLiteral(literal)) {
                importsArray.push(literal.text);
              }
            }
          }
          if (importsArray.length > 0) {
            imports = importsArray;
          }
        }
      } else if (memberName === 'bundle' && member.type) {
        // Parse bundle configuration (boolean or object)
        if (member.type.kind === ts.SyntaxKind.TrueKeyword) {
          bundle = true;
        } else if (member.type.kind === ts.SyntaxKind.FalseKeyword) {
          bundle = false;
        } else if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (literal.kind === ts.SyntaxKind.TrueKeyword) {
            bundle = true;
          } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
            bundle = false;
          }
        } else if (ts.isTypeLiteralNode(member.type)) {
          // Parse bundle object with minify, sourcemap, external, format
          const bundleObj: { minify?: boolean; sourcemap?: boolean; external?: string[]; format?: 'iife' | 'esm' } = {};
          for (const bundleMember of member.type.members) {
            if (ts.isPropertySignature(bundleMember) && bundleMember.name && bundleMember.type) {
              const bundleMemberName = bundleMember.name.getText(sourceFile);

              if ((bundleMemberName === 'minify' || bundleMemberName === 'sourcemap') && bundleMember.type) {
                // Parse boolean fields
                if (bundleMember.type.kind === ts.SyntaxKind.TrueKeyword) {
                  bundleObj[bundleMemberName] = true;
                } else if (bundleMember.type.kind === ts.SyntaxKind.FalseKeyword) {
                  bundleObj[bundleMemberName] = false;
                } else if (ts.isLiteralTypeNode(bundleMember.type)) {
                  const literal = bundleMember.type.literal;
                  if (literal.kind === ts.SyntaxKind.TrueKeyword) {
                    bundleObj[bundleMemberName] = true;
                  } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
                    bundleObj[bundleMemberName] = false;
                  }
                }
              } else if (bundleMemberName === 'external' && ts.isTupleTypeNode(bundleMember.type)) {
                // Parse external array
                const externalArray: string[] = [];
                for (const element of bundleMember.type.elements) {
                  const elementType = ts.isNamedTupleMember(element) ? element.type : element;
                  if (ts.isLiteralTypeNode(elementType)) {
                    const literal = elementType.literal;
                    if (ts.isStringLiteral(literal)) {
                      externalArray.push(literal.text);
                    }
                  }
                }
                if (externalArray.length > 0) {
                  bundleObj.external = externalArray;
                }
              } else if (bundleMemberName === 'format' && ts.isLiteralTypeNode(bundleMember.type)) {
                // Parse format field
                const literal = bundleMember.type.literal;
                if (ts.isStringLiteral(literal)) {
                  if (literal.text === 'iife' || literal.text === 'esm') {
                    bundleObj.format = literal.text;
                  }
                }
              }
            }
          }
          bundle = bundleObj;
        }
      } else if (memberName === 'theme' && member.type) {
        // Parse theme field (string or object)
        if (ts.isLiteralTypeNode(member.type)) {
          // String theme name: theme: 'light'
          const literal = member.type.literal;
          if (ts.isStringLiteral(literal)) {
            theme = literal.text;
          }
        } else if (ts.isTypeLiteralNode(member.type)) {
          // Inline theme object: { name: 'custom'; variables: { ... } }
          const themeObj: { name?: string; variables?: Record<string, string> } = {};

          for (const themeMember of member.type.members) {
            if (ts.isPropertySignature(themeMember) && themeMember.name && themeMember.type) {
              const themeMemberName = themeMember.name.getText(sourceFile);

              if (themeMemberName === 'name' && ts.isLiteralTypeNode(themeMember.type)) {
                const literal = themeMember.type.literal;
                if (ts.isStringLiteral(literal)) {
                  themeObj.name = literal.text;
                }
              } else if (themeMemberName === 'variables' && ts.isTypeLiteralNode(themeMember.type)) {
                // Parse variables object
                const variables: Record<string, string> = {};
                for (const varMember of themeMember.type.members) {
                  if (ts.isPropertySignature(varMember) && varMember.name && varMember.type) {
                    const varKey = varMember.name.getText(sourceFile);
                    if (ts.isLiteralTypeNode(varMember.type)) {
                      const literal = varMember.type.literal;
                      if (ts.isStringLiteral(literal)) {
                        variables[varKey] = literal.text;
                      }
                    }
                  }
                }
                if (Object.keys(variables).length > 0) {
                  themeObj.variables = variables;
                }
              }
            }
          }

          if (themeObj.name && themeObj.variables) {
            theme = themeObj as { name: string; variables: Record<string, string> };
          }
        }
      } else if (memberName === 'minify' && member.type) {
        // Parse minify field (boolean or object)
        if (member.type.kind === ts.SyntaxKind.TrueKeyword) {
          minify = true;
        } else if (member.type.kind === ts.SyntaxKind.FalseKeyword) {
          minify = false;
        } else if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (literal.kind === ts.SyntaxKind.TrueKeyword) {
            minify = true;
          } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
            minify = false;
          }
        } else if (ts.isTypeLiteralNode(member.type)) {
          // Parse minify object with html, css, js
          const minifyObj: { html?: boolean; css?: boolean; js?: boolean } = {};
          for (const minifyMember of member.type.members) {
            if (ts.isPropertySignature(minifyMember) && minifyMember.name && minifyMember.type) {
              const minifyMemberName = minifyMember.name.getText(sourceFile);
              if (
                (minifyMemberName === 'html' || minifyMemberName === 'css' || minifyMemberName === 'js') &&
                minifyMember.type
              ) {
                if (minifyMember.type.kind === ts.SyntaxKind.TrueKeyword) {
                  minifyObj[minifyMemberName] = true;
                } else if (minifyMember.type.kind === ts.SyntaxKind.FalseKeyword) {
                  minifyObj[minifyMemberName] = false;
                } else if (ts.isLiteralTypeNode(minifyMember.type)) {
                  const literal = minifyMember.type.literal;
                  if (literal.kind === ts.SyntaxKind.TrueKeyword) {
                    minifyObj[minifyMemberName] = true;
                  } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
                    minifyObj[minifyMemberName] = false;
                  }
                }
              }
            }
          }
          minify = minifyObj;
        }
      } else if (memberName === 'cdn' && member.type) {
        // Parse cdn field (boolean or object)
        if (member.type.kind === ts.SyntaxKind.TrueKeyword) {
          cdn = true;
        } else if (member.type.kind === ts.SyntaxKind.FalseKeyword) {
          cdn = false;
        } else if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (literal.kind === ts.SyntaxKind.TrueKeyword) {
            cdn = true;
          } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
            cdn = false;
          }
        } else if (ts.isTypeLiteralNode(member.type)) {
          // Parse cdn object
          const cdnObj: {
            baseUrl?: string;
            sri?: boolean | 'sha256' | 'sha384' | 'sha512';
            compression?: 'gzip' | 'brotli' | 'both';
          } = {};
          for (const cdnMember of member.type.members) {
            if (ts.isPropertySignature(cdnMember) && cdnMember.name && cdnMember.type) {
              const cdnMemberName = cdnMember.name.getText(sourceFile);

              if (cdnMemberName === 'baseUrl' && ts.isLiteralTypeNode(cdnMember.type)) {
                const literal = cdnMember.type.literal;
                if (ts.isStringLiteral(literal)) {
                  cdnObj.baseUrl = literal.text;
                }
              } else if (cdnMemberName === 'sri' && cdnMember.type) {
                if (cdnMember.type.kind === ts.SyntaxKind.TrueKeyword) {
                  cdnObj.sri = true;
                } else if (cdnMember.type.kind === ts.SyntaxKind.FalseKeyword) {
                  cdnObj.sri = false;
                } else if (ts.isLiteralTypeNode(cdnMember.type)) {
                  const literal = cdnMember.type.literal;
                  if (literal.kind === ts.SyntaxKind.TrueKeyword) {
                    cdnObj.sri = true;
                  } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
                    cdnObj.sri = false;
                  } else if (ts.isStringLiteral(literal)) {
                    // Validate SRI algorithm
                    if (literal.text === 'sha256' || literal.text === 'sha384' || literal.text === 'sha512') {
                      cdnObj.sri = literal.text;
                    }
                  }
                }
              } else if (cdnMemberName === 'compression' && ts.isLiteralTypeNode(cdnMember.type)) {
                const literal = cdnMember.type.literal;
                if (ts.isStringLiteral(literal)) {
                  if (
                    literal.text === 'gzip' ||
                    literal.text === 'brotli' ||
                    literal.text === 'both'
                  ) {
                    cdnObj.compression = literal.text;
                  }
                }
              }
            }
          }
          cdn = cdnObj;
        }
      } else if (memberName === 'performance' && member.type) {
        // Parse performance field (boolean or object)
        if (member.type.kind === ts.SyntaxKind.TrueKeyword) {
          performance = true;
        } else if (member.type.kind === ts.SyntaxKind.FalseKeyword) {
          performance = false;
        } else if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (literal.kind === ts.SyntaxKind.TrueKeyword) {
            performance = true;
          } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
            performance = false;
          }
        } else if (ts.isTypeLiteralNode(member.type)) {
          // Parse performance object
          const perfObj: {
            track?: boolean;
            report?: boolean;
            thresholds?: {
              maxBundleSize?: number;
              maxCompilationTime?: number;
              minCacheHitRate?: number;
              minCompressionSavings?: number;
            };
          } = {};
          for (const perfMember of member.type.members) {
            if (ts.isPropertySignature(perfMember) && perfMember.name && perfMember.type) {
              const perfMemberName = perfMember.name.getText(sourceFile);

              if ((perfMemberName === 'track' || perfMemberName === 'report') && perfMember.type) {
                if (perfMember.type.kind === ts.SyntaxKind.TrueKeyword) {
                  perfObj[perfMemberName] = true;
                } else if (perfMember.type.kind === ts.SyntaxKind.FalseKeyword) {
                  perfObj[perfMemberName] = false;
                } else if (ts.isLiteralTypeNode(perfMember.type)) {
                  const literal = perfMember.type.literal;
                  if (literal.kind === ts.SyntaxKind.TrueKeyword) {
                    perfObj[perfMemberName] = true;
                  } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
                    perfObj[perfMemberName] = false;
                  }
                }
              } else if (perfMemberName === 'thresholds' && ts.isTypeLiteralNode(perfMember.type)) {
                // Parse thresholds object
                const thresholds: {
                  maxBundleSize?: number;
                  maxCompilationTime?: number;
                  minCacheHitRate?: number;
                  minCompressionSavings?: number;
                } = {};
                for (const threshMember of perfMember.type.members) {
                  if (ts.isPropertySignature(threshMember) && threshMember.name && threshMember.type) {
                    const threshName = threshMember.name.getText(sourceFile);
                    if (ts.isLiteralTypeNode(threshMember.type)) {
                      const literal = threshMember.type.literal;
                      if (ts.isNumericLiteral(literal)) {
                        const value = parseFloat(literal.text);
                        if (
                          threshName === 'maxBundleSize' ||
                          threshName === 'maxCompilationTime' ||
                          threshName === 'minCacheHitRate' ||
                          threshName === 'minCompressionSavings'
                        ) {
                          thresholds[threshName] = value;
                        }
                      }
                    }
                  }
                }
                if (Object.keys(thresholds).length > 0) {
                  perfObj.thresholds = thresholds;
                }
              }
            }
          }
          performance = perfObj;
        }
      } else if (memberName === 'externalUrl' && member.type && ts.isLiteralTypeNode(member.type)) {
        // Extract external URL
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal)) {
          externalUrl = literal.text;
        }
      } else if (memberName === 'remoteDom' && member.type) {
        // Extract Remote DOM content (string literal or template literal)
        if (ts.isLiteralTypeNode(member.type)) {
          const literal = member.type.literal;
          if (ts.isStringLiteral(literal) || ts.isNoSubstitutionTemplateLiteral(literal)) {
            remoteDom = literal.text;
          }
        }
      } else if (memberName === 'source' && member.type && ts.isLiteralTypeNode(member.type)) {
        // Extract source field (v4.0)
        const literal = member.type.literal;
        if (ts.isStringLiteral(literal) || ts.isNoSubstitutionTemplateLiteral(literal)) {
          const sourceValue = literal.text.trim();
          if (sourceValue) {  // Only set if non-empty
            source = sourceValue;
          }
        }
      }
    }
  }

  // Check for callable signature (dynamic UI)
  for (const member of node.members) {
    if (ts.isCallSignatureDeclaration(member)) {
      dynamic = true;

      // Extract return type if available
      if (member.type) {
        dataType = member.type.getText(sourceFile);
      }

      // Callable IUIs generate content dynamically
      break;
    }
  }

  // Validate required fields
  if (!uri) {
    console.warn(`UI interface ${interfaceName} missing 'uri' property`);
    return null;
  }

  if (!name) {
    console.warn(`UI interface ${interfaceName} missing 'name' property`);
    return null;
  }

  if (!description) {
    console.warn(`UI interface ${interfaceName} missing 'description' property`);
    return null;
  }

  // v4.0: Validate source field or callable signature
  if (!source && !dynamic) {
    throw new Error(
      `UI interface ${interfaceName} must have either:\n` +
      `1. A 'source' field (URL, HTML, file path, folder), or\n` +
      `2. A callable signature: (): string | Promise<string>\n` +
      `\n` +
      `Example with source:\n` +
      `  interface MyUI extends IUI {\n` +
      `    uri: 'ui://example';\n` +
      `    name: 'Example';\n` +
      `    description: 'Example UI';\n` +
      `    source: './Dashboard.tsx';  // <-- Add this\n` +
      `  }\n` +
      `\n` +
      `Example with callable:\n` +
      `  interface MyUI extends IUI {\n` +
      `    uri: 'ui://example';\n` +
      `    name: 'Example';\n` +
      `    description: 'Example UI';\n` +
      `    (): Promise<string>;  // <-- Add this\n` +
      `  }`
    );
  }

  // Ensure source and callable are mutually exclusive
  if (source && dynamic) {
    throw new Error(
      `UI interface ${interfaceName} cannot have both 'source' field and callable signature.\n` +
      `These are mutually exclusive - use one or the other.`
    );
  }

  // Auto-infer dynamic flag:
  // If html/file/component/externalUrl/remoteDom was not extracted, it must be dynamic
  const isDynamic = dynamic || (html === undefined && file === undefined && component === undefined && externalUrl === undefined && remoteDom === undefined);

  // For dynamic UIs, generate method name from URI
  let methodName: string | undefined;
  if (isDynamic) {
    // Use URI as method name (like resources)
    methodName = uri;
  }

  // Auto-detect subscribable for file-based UIs if not explicitly set
  // Only set to true if file-based features are present, otherwise leave undefined
  if (subscribable === undefined && (file || component || scripts?.length || stylesheets?.length)) {
    subscribable = true;
  }

  // DEBUG: Log what's being returned
  console.error(`[DEBUG:UI-PARSER] Returning UI interface: "${interfaceName}", uri="${uri}", dynamic=${isDynamic}, html length=${html?.length || 'none'}, file="${file || 'none'}", component="${component || 'none'}", subscribable=${subscribable}`);

  return {
    interfaceName,
    uri,
    name,
    description,
    source,  // NEW v4.0
    html,
    css,
    tools,
    size,
    subscribable,
    dynamic: isDynamic,
    methodName,
    dataType,
    file,
    component,
    script,
    stylesheets,
    scripts,
    dependencies,
    bundle,
    imports,
    theme,
    minify,
    cdn,
    performance,
    externalUrl,
    remoteDom,
  };
}

/**
 * Parse an IToolRouter interface
 */
