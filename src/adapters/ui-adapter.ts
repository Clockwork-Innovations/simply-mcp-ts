/**
 * UI Adapter - Lazy-loaded UI resource registration
 *
 * Only loaded when ParseResult.uis.length > 0
 * Registers parsed UI resources with MCP server as HTML resources
 */

import type { ParsedUI } from '../server/parser.js';
import type { BuildMCPServer } from '../server/builder-server.js';
import type { Theme } from '../features/ui/theme-manager.js';
import { registry } from '../index.js';
import { detectSourceType } from '../features/ui/source-detector.js';
import { extractDependencies } from '../compiler/dependency-extractor.js';
import { loadConfig } from '../config/config-loader.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * File-to-URI mapping metadata
 */
interface FileURIMetadata {
  uri: string;
  subscribable: boolean;
  role: 'file' | 'component' | 'script' | 'stylesheet';
}

/**
 * Global file-to-URI mapping for watch mode
 * Maps absolute file paths to all URIs that use that file
 */
const fileToURIMap: Map<string, Set<FileURIMetadata>> = new Map();

/**
 * Get all subscribable URIs that use a given file
 * @param absolutePath Absolute path to the file
 * @returns Array of URIs for subscribable resources using this file
 */
export function getSubscribableURIsForFile(absolutePath: string): string[] {
  const metadata = fileToURIMap.get(absolutePath);
  if (!metadata) {
    return [];
  }

  return Array.from(metadata)
    .filter(m => m.subscribable)
    .map(m => m.uri);
}

/**
 * Add a file-to-URI mapping
 * @param absolutePath Absolute path to the file
 * @param uri URI of the resource using this file
 * @param subscribable Whether the resource is subscribable
 * @param role The role this file plays (file/component/script/stylesheet)
 */
function addFileMapping(
  absolutePath: string,
  uri: string,
  subscribable: boolean,
  role: 'file' | 'component' | 'script' | 'stylesheet'
): void {
  if (!fileToURIMap.has(absolutePath)) {
    fileToURIMap.set(absolutePath, new Set());
  }

  // Use custom equality check since Set doesn't deep-compare objects
  const existing = fileToURIMap.get(absolutePath)!;
  const existingEntry = Array.from(existing).find(
    m => m.uri === uri && m.role === role
  );

  if (!existingEntry) {
    existing.add({ uri, subscribable, role });
  }
}

/**
 * Clear all file mappings (useful for testing)
 */
export function clearFileMappings(): void {
  fileToURIMap.clear();
}

/**
 * Register UI resources with MCP server
 *
 * Processes all parsed UI interfaces and registers them as MCP resources
 * with proper HTML injection (tool helpers, CSS, etc.)
 */
export async function registerUIResources(
  server: BuildMCPServer,
  uis: ParsedUI[],
  serverInstance: any,
  serverFilePath: string
): Promise<void> {
  for (const ui of uis) {
    await registerSingleUI(server, ui, serverInstance, serverFilePath);
  }
}

/**
 * Register a single UI resource
 *
 * Handles:
 * - Static inline HTML (Foundation Layer)
 * - Dynamic server-generated HTML (Foundation Layer)
 * - File-based HTML with external CSS/JS (Feature Layer)
 * - React components (Feature Layer - deferred to Task 17)
 */
async function registerSingleUI(
  server: BuildMCPServer,
  ui: ParsedUI,
  serverInstance: any,
  serverFilePath: string
): Promise<void> {
  const { uri, name, description, source, html, css, tools, dynamic, methodName, file, component, script, stylesheets, scripts, imports, theme, externalUrl, remoteDom } = ui;

  // Process component imports (if any)
  // NOTE: We validate imports lazily (on first read) rather than eagerly (at registration)
  // to avoid timing issues where registry.register() calls in the user's module
  // may not have executed yet when this code runs during module loading.
  // The bundler will validate and resolve imports when the resource is actually read.

  // ============================================================================
  // NEW v4.0: Source-based Routing
  // ============================================================================
  if (source) {
    // Detect source type
    const detection = detectSourceType(source, {
      basePath: path.dirname(serverFilePath),
      checkFileSystem: true,
      verbose: false,
    });

    if (detection.confidence < 0.5) {
      throw new Error(
        `Could not detect source type for UI "${uri}"\n` +
        `Source: "${source}"\n` +
        `Reason: ${detection.reason}\n` +
        `\n` +
        `Supported source types:\n` +
        `- External URL: https://example.com/dashboard\n` +
        `- Inline HTML: <div>Hello</div>\n` +
        `- Remote DOM JSON: {"type":"div",...}\n` +
        `- HTML file: ./pages/dashboard.html\n` +
        `- React component: ./components/Dashboard.tsx\n` +
        `- Folder: ./ui/dashboard/`
      );
    }

    // Load build configuration
    const config = await loadConfig({ basePath: path.dirname(serverFilePath) });

    // Route based on detected type
    switch (detection.type) {
      case 'url':
        // External URL - return as text/uri-list
        server.addResource({
          uri,
          name: name || extractNameFromUri(uri),
          description: description || `External UI: ${uri}`,
          mimeType: 'text/uri-list',
          content: source,
          subscribable: ui.subscribable,
        });
        return;

      case 'inline-html':
        // Inline HTML - return as text/html
        server.addResource({
          uri,
          name: name || extractNameFromUri(uri),
          description: description || `UI: ${uri}`,
          mimeType: 'text/html',
          content: async () => {
            let htmlContent = source;

            // Apply CSS if provided
            if (css) {
              htmlContent = `<style>${css}</style>${htmlContent}`;
            }

            // Inject helpers
            htmlContent = await injectHelpers(htmlContent, tools, undefined, theme);

            return htmlContent;
          },
          subscribable: ui.subscribable,
        });
        return;

      case 'inline-remote-dom':
        // Remote DOM JSON - pass through
        server.addResource({
          uri,
          name: name || extractNameFromUri(uri),
          description: description || `Remote DOM UI: ${uri}`,
          mimeType: 'application/vnd.mcp-ui.remote-dom+javascript; framework=react',
          content: source,
          subscribable: ui.subscribable,
        });
        return;

      case 'file-html':
        // HTML file - read and return
        const htmlFilePath = detection.resolvedPath!;
        server.addResource({
          uri,
          name: name || extractNameFromUri(uri),
          description: description || `UI: ${uri}`,
          mimeType: 'text/html',
          content: async () => {
            let htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');

            // Inject helpers
            htmlContent = await injectHelpers(htmlContent, tools, css, theme);

            return htmlContent;
          },
          subscribable: ui.subscribable,
        });

        // Track file for watch mode
        addFileMapping(htmlFilePath, uri, ui.subscribable === true, 'file');
        return;

      case 'file-component':
        // React component - extract deps, compile, return
        const componentPath = detection.resolvedPath!;

        // Extract dependencies from component
        const extracted = extractDependencies({
          filePath: componentPath,
        });

        // Compile component (will be updated in Task 1.4)
        const { compileReactComponent } = await import('../features/ui/ui-react-compiler.js');

        server.addResource({
          uri,
          name: name || extractNameFromUri(uri),
          description: description || `UI: ${uri}`,
          mimeType: 'text/html',
          content: async () => {
            const componentCode = fs.readFileSync(componentPath, 'utf-8');

            // Compile with extracted dependencies and build config
            const compiled = await compileReactComponent({
              componentPath,
              componentCode,
              extractedDeps: extracted,
              buildConfig: config.build,
            });

            return compiled.html;
          },
          subscribable: ui.subscribable,
        });

        // Track component file for watch mode
        addFileMapping(componentPath, uri, ui.subscribable === true, 'component');

        // Track dependency files for watch mode
        if (extracted.localFiles.length > 0) {
          const basePath = path.dirname(componentPath);
          for (const localFile of extracted.localFiles) {
            const depPath = path.resolve(basePath, localFile);
            addFileMapping(depPath, uri, ui.subscribable === true, 'component');
          }
        }

        return;

      case 'folder':
        // Folder - look for index.html
        const folderPath = detection.resolvedPath!;
        const indexPath = path.join(folderPath, 'index.html');

        if (!fs.existsSync(indexPath)) {
          throw new Error(
            `UI resource "${uri}" points to folder "${source}" but no index.html found.\n` +
            `Expected: ${indexPath}`
          );
        }

        server.addResource({
          uri,
          name: name || extractNameFromUri(uri),
          description: description || `UI: ${uri}`,
          mimeType: 'text/html',
          content: async () => {
            let htmlContent = fs.readFileSync(indexPath, 'utf-8');

            // Inject helpers
            htmlContent = await injectHelpers(htmlContent, tools, css, theme);

            return htmlContent;
          },
          subscribable: ui.subscribable,
        });

        // Track index.html for watch mode
        addFileMapping(indexPath, uri, ui.subscribable === true, 'file');
        return;

      default:
        throw new Error(
          `Unsupported source type for UI "${uri}": ${detection.type}\n` +
          `Source: "${source}"`
        );
    }
  }

  // ============================================================================
  // OLD FIELD ROUTING (Legacy - will be removed in future versions)
  // ============================================================================

  // Route 0: External URL (text/uri-list MIME type) - HIGHEST PRIORITY
  if (externalUrl) {
    // Validate URL format
    try {
      new URL(externalUrl);
    } catch (error) {
      throw new Error(
        `UI resource "${uri}" has invalid externalUrl: "${externalUrl}"\n` +
        `externalUrl must be a valid URL (http://, https://, file://, etc.)`
      );
    }

    server.addResource({
      uri,
      name: name || extractNameFromUri(uri),
      description: description || `External UI: ${uri}`,
      mimeType: 'text/uri-list',
      content: externalUrl,  // Just the URL as plain text
      subscribable: ui.subscribable,
    });

    return;
  }

  // Route 0.5: Remote DOM (application/vnd.mcp-ui.remote-dom MIME type)
  if (remoteDom) {
    const { compileRemoteDOM } = await import('../features/ui/ui-remote-dom-compiler.js');

    let remoteDomContent: string;
    try {
      remoteDomContent = await compileRemoteDOM(remoteDom, {
        format: 'string',
        validate: true,
      });
    } catch (error: any) {
      throw new Error(
        `UI resource "${uri}" Remote DOM compilation failed: ${error.message}\n` +
        `Remote DOM must be valid JSON with {type, properties?, children?} structure or React component code.`
      );
    }

    // Per MCP UI specification, Remote DOM MIME types must include framework parameter
    // Format: application/vnd.mcp-ui.remote-dom+javascript; framework={react | webcomponents}
    // Default to 'react' as the current implementation uses React components
    server.addResource({
      uri,
      name: name || extractNameFromUri(uri),
      description: description || `Remote DOM UI: ${uri}`,
      mimeType: 'application/vnd.mcp-ui.remote-dom+javascript; framework=react',
      content: remoteDomContent,
      subscribable: ui.subscribable,
    });

    return;
  }

  // Route 1: Dynamic UI (server method)
  if (dynamic && methodName) {
    const method = serverInstance[methodName];

    if (!method) {
      throw new Error(
        `Dynamic UI resource "${uri}" requires method "${methodName}" but it was not found on server class.\n` +
        `Expected: class implements { ${methodName}: ${ui.interfaceName} }\n` +
        `Did you forget to implement the method?`
      );
    }

    if (typeof method !== 'function') {
      throw new Error(
        `Dynamic UI resource "${uri}" method "${methodName}" is not a function (found: ${typeof method})`
      );
    }

    // Register dynamic UI handler
    server.addResource({
      uri,
      name: name || uri,
      description: description || `UI: ${uri}`,
      mimeType: 'text/html',
      subscribable: ui.subscribable,
      content: async () => {
        const htmlContent = await Promise.resolve(method.call(serverInstance));

        if (typeof htmlContent !== 'string') {
          throw new Error(
            `Dynamic UI resource "${uri}" method "${methodName}" must return a string (HTML), ` +
            `but returned: ${typeof htmlContent}`
          );
        }

        let finalHTML = await injectHelpers(htmlContent, tools, css, theme);

        // Apply optimizations if enabled
        if (ui.minify || ui.performance) {
          const { optimizeHTML } = await import('../features/ui/ui-optimizer.js');
          const optimized = await optimizeHTML(finalHTML, ui);
          finalHTML = optimized.html;
        }

        return finalHTML;
      },
    });

    return;
  }

  // Route 2: File-based UI (external HTML file)
  if (file) {
    const { resolveUIFile } = await import('../features/ui/ui-file-resolver.js');

    // Load HTML file
    const htmlFile = await resolveUIFile(file, {
      serverFilePath,
      cache: true,
    });

    let htmlContent = htmlFile.content;

    // Track main HTML file mapping for watch mode
    if (htmlFile?.path) {
      addFileMapping(htmlFile.path, uri, ui.subscribable === true, 'file');
    }

    // Load additional stylesheets
    if (stylesheets && stylesheets.length > 0) {
      for (const stylesheet of stylesheets) {
        const cssFile = await resolveUIFile(stylesheet, { serverFilePath, cache: true });
        htmlContent = injectCSS(htmlContent, cssFile.content);
        // Track stylesheet mapping for watch mode
        if (cssFile.path) {
          addFileMapping(cssFile.path, uri, ui.subscribable === true, 'stylesheet');
        }
      }
    }

    // Load additional scripts
    if (scripts && scripts.length > 0) {
      for (const scriptPath of scripts) {
        const scriptFile = await resolveUIFile(scriptPath, { serverFilePath, cache: true });
        htmlContent = injectScript(htmlContent, scriptFile.content);
        // Track script mapping for watch mode
        if (scriptFile.path) {
          addFileMapping(scriptFile.path, uri, ui.subscribable === true, 'script');
        }
      }
    }

    // Load single script (if specified)
    if (script) {
      const scriptFile = await resolveUIFile(script, { serverFilePath, cache: true });
      htmlContent = injectScript(htmlContent, scriptFile.content);
      // Track script mapping for watch mode
      if (scriptFile.path) {
        addFileMapping(scriptFile.path, uri, ui.subscribable === true, 'script');
      }
    }

    // Inject tool helpers, inline CSS, and theme
    htmlContent = await injectHelpers(htmlContent, tools, css, theme);

    // Apply optimizations if enabled
    if (ui.minify || ui.performance) {
      const { optimizeHTML } = await import('../features/ui/ui-optimizer.js');
      const optimized = await optimizeHTML(htmlContent, ui);
      htmlContent = optimized.html;
    }

    // Register resource with subscribable flag
    server.addResource({
      uri,
      name: name || uri,
      description: description || `UI: ${uri}`,
      mimeType: 'text/html',
      content: htmlContent,
      subscribable: ui.subscribable,
    });

    return;
  }

  // Route 3: React component UI (lazy-loaded compiler)
  if (component) {
    const { resolveUIFile } = await import('../features/ui/ui-file-resolver.js');

    // Load component source code
    const componentFile = await resolveUIFile(component, {
      serverFilePath,
      cache: true,
    });

    let htmlContent: string;

    // Route 3a: Bundled React component (with dependencies)
    if (ui.bundle) {
      const { bundleComponent } = await import('../features/ui/ui-bundler.js');
      const { validateComponentCode } = await import('../features/ui/ui-react-compiler.js');

      // Validate component code
      validateComponentCode(componentFile.content, component);

      // Extract bundle options
      const bundleOptions = typeof ui.bundle === 'boolean' ? {} : ui.bundle;
      const minify = bundleOptions.minify ?? false;
      const sourcemap = bundleOptions.sourcemap ?? false;
      const external = bundleOptions.external ?? ['react', 'react-dom'];
      const format = bundleOptions.format ?? 'iife';

      // Bundle component with dependencies
      const bundled = await bundleComponent({
        entryPoint: componentFile.path,
        entryCode: componentFile.content,
        minify,
        sourcemap,
        external,
        format,
        verbose: false,
      });

      // Wrap bundled code in HTML
      htmlContent = generateBundledHTML({
        code: bundled.code,
        sourceMap: bundled.map,
        external,
      });
    }
    // Route 3b: CDN-based React component (no bundling)
    else {
      const { compileReactComponent, validateComponentCode } = await import('../features/ui/ui-react-compiler.js');

      // Validate component code
      validateComponentCode(componentFile.content, component);

      // Extract dependencies from component (v4.0)
      const extracted = extractDependencies({
        filePath: component,
      });

      // Load build config (v4.0)
      const config = await loadConfig({ basePath: path.dirname(serverFilePath) });

      // Compile component (Babel only, dependencies from CDN)
      const compiled = await compileReactComponent({
        componentPath: component,
        componentCode: componentFile.content,
        extractedDeps: extracted,
        buildConfig: config.build,
      });

      htmlContent = compiled.html;
    }

    // Inject tool helpers if tools specified
    if (tools && tools.length > 0) {
      htmlContent = injectToolHelpersForReact(htmlContent, tools);
    }

    // Apply optimizations if enabled
    if (ui.minify || ui.performance) {
      const { optimizeHTML } = await import('../features/ui/ui-optimizer.js');
      const optimized = await optimizeHTML(htmlContent, ui);
      htmlContent = optimized.html;
    }

    // Track component file mapping for watch mode
    if (componentFile?.path) {
      addFileMapping(componentFile.path, uri, ui.subscribable === true, 'component');
    }

    // Register as MCP resource
    server.addResource({
      uri,
      name: name || uri,
      description: description || `UI: ${uri}`,
      mimeType: 'text/html',
      content: htmlContent,
      subscribable: ui.subscribable,
    });

    return;
  }

  // Route 4: Static inline HTML UI (Foundation Layer - existing)
  if (html) {
    let htmlContent = await injectHelpers(html, tools, css, theme);

    // Apply optimizations if enabled
    if (ui.minify || ui.performance) {
      const { optimizeHTML } = await import('../features/ui/ui-optimizer.js');
      const optimized = await optimizeHTML(htmlContent, ui);
      htmlContent = optimized.html;
    }

    server.addResource({
      uri,
      name: name || uri,
      description: description || `UI: ${uri}`,
      mimeType: 'text/html',
      content: htmlContent,
      subscribable: ui.subscribable,
    });

    return;
  }

  // Error: No content source found
  throw new Error(
    `UI resource "${uri}" has no content source. ` +
    `Provide one of: html (inline), file (external), component (React), externalUrl (external URL), remoteDom (Remote DOM), or dynamic: true (server method).`
  );
}

/**
 * Inject CSS into HTML
 *
 * @param html - Original HTML content
 * @param css - CSS content to inject
 * @returns Modified HTML with CSS injected
 */
function injectCSS(html: string, css: string): string {
  const styleTag = `<style>\n${css}\n</style>`;

  if (html.includes('</head>')) {
    return html.replace('</head>', `${styleTag}\n</head>`);
  } else if (html.includes('<body>')) {
    return html.replace('<body>', `<body>\n${styleTag}`);
  } else {
    return styleTag + '\n' + html;
  }
}

/**
 * Inject script into HTML
 *
 * @param html - Original HTML content
 * @param script - JavaScript content to inject
 * @returns Modified HTML with script injected
 */
function injectScript(html: string, script: string): string {
  const scriptTag = `<script>\n${script}\n</script>`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${scriptTag}\n</body>`);
  } else {
    return html + '\n' + scriptTag;
  }
}

/**
 * Resolve theme to CSS
 *
 * Handles:
 * - String theme name (lookup in themeManager)
 * - Inline theme object (generate CSS directly)
 *
 * @param theme - Theme name or inline theme object
 * @returns CSS string or null if theme not found
 */
async function resolveThemeCSS(theme: string | { name: string; variables: Record<string, string> }): Promise<string | null> {
  // Lazy-load theme manager and prebuilt themes using ESM imports
  const { themeManager } = await import('../features/ui/theme-manager.js');
  await import('../core/themes/prebuilt.js'); // Auto-register light/dark

  // String theme name - lookup in registry
  if (typeof theme === 'string') {
    const themeObj = themeManager.get(theme);
    if (!themeObj) {
      console.warn(`Theme "${theme}" not found. Available themes: ${themeManager.getThemeNames().join(', ')}`);
      return null;
    }
    return themeManager.generateCSS(themeObj);
  }

  // Inline theme object - generate CSS directly
  return themeManager.generateCSS(theme);
}

/**
 * Inject tool helpers and CSS into HTML
 *
 * Injects:
 * 1. Theme CSS (if specified)
 * 2. Inline CSS in <head> (or at start if no <head>)
 * 3. Tool helper script at </body> (or at end if no </body>)
 *
 * @param html - Original HTML content
 * @param tools - Array of allowed tool names (for allowlist)
 * @param css - Optional CSS to inject
 * @param theme - Optional theme name or inline theme
 * @returns Modified HTML with injections
 */
async function injectHelpers(
  html: string,
  tools?: string[],
  css?: string,
  theme?: string | { name: string; variables: Record<string, string> }
): Promise<string> {
  let result = html;

  // Inject theme CSS first (if specified)
  if (theme) {
    const themeCSS = await resolveThemeCSS(theme);
    if (themeCSS) {
      const themeStyleTag = `<style>\n${themeCSS}\n</style>`;

      if (result.includes('<head>')) {
        result = result.replace('<head>', `<head>\n${themeStyleTag}`);
      } else if (result.includes('</head>')) {
        result = result.replace('</head>', `${themeStyleTag}\n</head>`);
      } else {
        result = themeStyleTag + '\n' + result;
      }
    }
  }

  // Inject inline CSS in <head> tag (or at start if no <head>)
  if (css) {
    const styleTag = `<style>\n${css}\n</style>`;

    if (result.includes('<head>')) {
      // Insert after <head> tag
      result = result.replace('<head>', `<head>\n${styleTag}`);
    } else if (result.includes('</head>')) {
      // Insert before </head> tag
      result = result.replace('</head>', `${styleTag}\n</head>`);
    } else {
      // No <head> tag, prepend to document
      result = styleTag + '\n' + result;
    }
  }

  // Inject tool helper script at </body> (or at end if no </body>)
  const scriptTag = generateToolHelperScript(tools || []);

  if (result.includes('</body>')) {
    // Insert before </body> tag
    result = result.replace('</body>', `${scriptTag}\n</body>`);
  } else {
    // No </body> tag, append to document
    result = result + '\n' + scriptTag;
  }

  return result;
}

/**
 * Generate tool helper script
 *
 * Creates window.callTool() and window.notify() functions that:
 * - Enforce tool allowlist (security)
 * - Use postMessage API for parent communication
 * - Handle async responses with Promise-based API
 *
 * @param tools - Array of allowed tool names
 * @returns Script tag with helper functions
 */
function generateToolHelperScript(tools: string[]): string {
  // Convert tools array to JSON for embedding
  const toolsJson = JSON.stringify(tools);

  return `<script>
(function() {
  'use strict';

  // Tool allowlist (security feature)
  const ALLOWED_TOOLS = ${toolsJson};

  // Pending requests map (requestId -> { resolve, reject, timeout })
  const pendingRequests = new Map();

  // Listen for responses from parent window
  window.addEventListener('message', function(event) {
    // Handle acknowledgment (spec-compliant)
    if (event.data.type === 'ui-message-received') {
      // Optional: Can track acknowledgments if needed
      console.debug('Message acknowledged:', event.data.messageId);
    }

    // Handle result/response (spec-compliant)
    if (event.data.type === 'ui-message-response') {
      const { messageId, result, error } = event.data;
      const pending = pendingRequests.get(messageId);

      if (pending) {
        clearTimeout(pending.timeout);
        pendingRequests.delete(messageId);

        if (error) {
          pending.reject(new Error(error || 'Tool call failed'));
        } else {
          pending.resolve(result);
        }
      }
    }
  });

  /**
   * Call an MCP tool from the UI
   *
   * @param toolName - Name of the tool to call (must be in allowlist)
   * @param params - Tool parameters object
   * @returns Promise that resolves with tool result
   * @throws Error if tool is not in allowlist or call fails
   */
  window.callTool = function(toolName, params) {
    // Enforce allowlist (critical security feature)
    if (!ALLOWED_TOOLS.includes(toolName)) {
      return Promise.reject(new Error(
        'Tool "' + toolName + '" is not allowed. ' +
        'Allowed tools: ' + ALLOWED_TOOLS.join(', ')
      ));
    }

    return new Promise(function(resolve, reject) {
      // Generate unique request ID
      const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

      // Set 30 second timeout
      const timeout = setTimeout(function() {
        pendingRequests.delete(requestId);
        reject(new Error('Tool call timed out after 30 seconds'));
      }, 30000);

      // Store pending request
      pendingRequests.set(requestId, { resolve, reject, timeout });

      // Send request to parent window
      window.parent.postMessage({
        type: 'tool',
        payload: {
          toolName: toolName,
          params: params
        },
        messageId: requestId
      }, '*');
    });
  };

  /**
   * Send a notification to the parent window
   *
   * @param level - Notification level ('info', 'warning', 'error')
   * @param message - Notification message
   */
  window.notify = function(level, message) {
    window.parent.postMessage({
      type: 'notify',
      payload: {
        message: message,
        level: level
      }
    }, '*');
  };

  /**
   * Submit a prompt to the LLM
   * @param {string} promptText - The prompt text to submit
   */
  window.submitPrompt = function(promptText) {
    if (typeof promptText !== 'string') {
      console.error('submitPrompt: promptText must be a string');
      return;
    }

    window.parent.postMessage({
      type: 'prompt',
      payload: {
        prompt: promptText
      }
    }, '*');
  };

  /**
   * Trigger an application intent
   * @param {string} intent - The intent name (e.g., 'open_file', 'navigate')
   * @param {any} params - Optional parameters for the intent
   */
  window.triggerIntent = function(intent, params) {
    if (typeof intent !== 'string') {
      console.error('triggerIntent: intent must be a string');
      return;
    }

    window.parent.postMessage({
      type: 'intent',
      payload: {
        intent: intent,
        params: params || {}
      }
    }, '*');
  };

  /**
   * Request navigation to a URL
   * @param {string} url - The URL to navigate to
   */
  window.openLink = function(url) {
    if (typeof url !== 'string') {
      console.error('openLink: url must be a string');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch (e) {
      console.error('openLink: invalid URL format:', url);
      return;
    }

    window.parent.postMessage({
      type: 'link',
      payload: {
        url: url
      }
    }, '*');
  };

  // Clean up on unload
  window.addEventListener('beforeunload', function() {
    pendingRequests.forEach(function(pending) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('UI unloaded'));
    });
    pendingRequests.clear();
  });
})();
</script>`;
}

/**
 * Inject tool helpers into React component HTML
 *
 * React components have a specific structure with React runtime scripts,
 * so we need to inject our tool helpers before the compiled component script.
 *
 * This function:
 * 1. Detects the compiled component script section
 * 2. Injects tool helpers before it
 * 3. Makes helpers available globally and in React context
 *
 * @param html - React component HTML (from compiler)
 * @param tools - Array of allowed tool names
 * @returns Modified HTML with tool helpers injected
 */
function injectToolHelpersForReact(html: string, tools: string[]): string {
  const toolsJson = JSON.stringify(tools);

  // Enhanced helper script for React compatibility
  const helperScript = `
  <script>
    // Tool integration helpers (available globally and in React)
    (function() {
      'use strict';

      // Tool allowlist (security feature)
      const ALLOWED_TOOLS = ${toolsJson};

      // Pending requests map
      const pendingRequests = new Map();

      // Listen for responses from parent window
      window.addEventListener('message', function(event) {
        // Handle acknowledgment (spec-compliant)
        if (event.data.type === 'ui-message-received') {
          // Optional: Can track acknowledgments if needed
          console.debug('Message acknowledged:', event.data.messageId);
        }

        // Handle result/response (spec-compliant)
        if (event.data.type === 'ui-message-response') {
          const { messageId, result, error } = event.data;
          const pending = pendingRequests.get(messageId);

          if (pending) {
            clearTimeout(pending.timeout);
            pendingRequests.delete(messageId);

            if (error) {
              pending.reject(new Error(error || 'Tool call failed'));
            } else {
              pending.resolve(result);
            }
          }
        }
      });

      /**
       * Call an MCP tool from the UI
       * @param toolName - Name of the tool to call (must be in allowlist)
       * @param params - Tool parameters object
       * @returns Promise that resolves with tool result
       */
      window.callTool = function(toolName, params) {
        if (!ALLOWED_TOOLS.includes(toolName)) {
          return Promise.reject(new Error(
            'Tool "' + toolName + '" is not allowed. ' +
            'Allowed tools: ' + ALLOWED_TOOLS.join(', ')
          ));
        }

        return new Promise(function(resolve, reject) {
          const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

          const timeout = setTimeout(function() {
            pendingRequests.delete(requestId);
            reject(new Error('Tool call timed out after 30 seconds'));
          }, 30000);

          pendingRequests.set(requestId, { resolve, reject, timeout });

          window.parent.postMessage({
            type: 'tool',
            payload: {
              toolName: toolName,
              params: params
            },
            messageId: requestId
          }, '*');
        });
      };

      /**
       * Send a notification to the parent window
       * @param level - Notification level ('info', 'warning', 'error')
       * @param message - Notification message
       */
      window.notify = function(level, message) {
        window.parent.postMessage({
          type: 'notify',
          payload: {
            message: message,
            level: level
          }
        }, '*');
      };

      // Make helpers available in React context after React loads
      if (typeof React !== 'undefined') {
        React.callTool = window.callTool;
        React.notify = window.notify;
      }

      // Clean up on unload
      window.addEventListener('beforeunload', function() {
        pendingRequests.forEach(function(pending) {
          clearTimeout(pending.timeout);
          pending.reject(new Error('UI unloaded'));
        });
        pendingRequests.clear();
      });
    })();
  </script>`;

  // Find the compiled component script
  // It's usually after React/ReactDOM scripts but before rendering
  // Look for the script tag that contains the compiled component code
  const componentScriptPattern = /<script>\s*(?:\/\/ Compiled Component|"use strict")/;
  const match = html.match(componentScriptPattern);

  if (match && match.index !== undefined) {
    // Insert tool helpers before component script
    return html.slice(0, match.index) + helperScript + '\n\n  ' + html.slice(match.index);
  } else {
    // Fallback: inject before </body>
    if (html.includes('</body>')) {
      return html.replace('</body>', `${helperScript}\n</body>`);
    } else {
      return html + helperScript;
    }
  }
}

/**
 * Generate HTML wrapper for bundled React component
 *
 * Creates a minimal HTML document that loads React from CDN
 * and executes the bundled component code.
 *
 * @param params - HTML generation parameters
 * @returns Complete HTML document string
 */
function generateBundledHTML(params: {
  code: string;
  sourceMap?: string;
  external: string[];
}): string {
  const { code, sourceMap, external } = params;

  // React runtime from CDN (only if not bundled)
  const needsReact = external.includes('react') || external.includes('react-dom');
  const reactVersion = '18.2.0';

  const reactScripts = needsReact
    ? `
  <!-- React Runtime (CDN) -->
  <script crossorigin src="https://unpkg.com/react@${reactVersion}/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@${reactVersion}/umd/react-dom.production.min.js"></script>
`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React UI Component</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #root { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>
${reactScripts}
  <!-- Bundled Component -->
  <script>
    ${code}

    // Render component to root
    const container = document.getElementById('root');
    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(Component));
  </script>

  ${sourceMap ? `<!-- Source Map -->\n  <script type="application/json" id="source-map">${sourceMap}</script>` : ''}
</body>
</html>`;
}

/**
 * Extract a readable name from URI
 *
 * Converts URI patterns to readable names:
 * - "ui://stats/live" -> "Stats Live"
 * - "ui://dashboard/main" -> "Dashboard Main"
 * - "ui://form" -> "Form"
 *
 * @param uri - UI resource URI
 * @returns Human-readable name
 */
function extractNameFromUri(uri: string): string {
  // Remove ui:// prefix
  let path = uri.replace(/^ui:\/\//, '');

  // Split on / or - to get parts
  const parts = path.split(/[\/\-]/);

  // Convert to Title Case
  return parts
    .map((part) => {
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Convert URI to method name
 *
 * Converts URI patterns to camelCase method names:
 * - "ui://stats/live" -> "statsLive"
 * - "ui://dashboard/main" -> "dashboardMain"
 * - "ui://form" -> "form"
 * - "greeting://message" -> "message"
 * - "config://server" -> "server"
 *
 * Note: The scheme is stripped as it represents addressing, not semantic meaning.
 *
 * @param uri - Resource URI (any scheme)
 * @returns camelCase method name
 */
export function uriToMethodName(uri: string): string {
  // Extract scheme and path separately
  const match = uri.match(/^([a-z]+):\/\/(.+)$/);
  if (!match) {
    // No scheme found, just convert the whole URI
    return uri.replace(/[\/\-]/g, '');
  }

  const [, , path] = match;

  // Use ONLY path parts (scheme stripped for semantic naming)
  const allParts = path.split(/[\/\-]/);

  // Convert to camelCase (first word lowercase, rest capitalized)
  return allParts
    .map((part, index) => {
      if (index === 0) {
        // First part: lowercase
        return part.toLowerCase();
      } else {
        // Subsequent parts: capitalize first letter
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      }
    })
    .join('');
}
