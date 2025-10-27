/**
 * Remote DOM Compiler for MCP UI
 * Converts React components to Remote DOM format
 *
 * Remote DOM (@remote-dom/core) allows UI components to render in a parent window
 * while executing in a sandboxed iframe. Unlike HTML which transfers markup,
 * Remote DOM transfers component trees that can be dynamically updated.
 */

export interface RemoteDOMCompilerOptions {
  /** Output format (json or string) */
  format?: 'json' | 'string';
  /** Validate output structure */
  validate?: boolean;
}

/**
 * Remote DOM node structure
 */
interface RemoteDOMNode {
  type: string;
  properties?: Record<string, any>;
  children?: (RemoteDOMNode | string)[];
}

/**
 * Compile Remote DOM content
 *
 * Supports:
 * 1. Pre-serialized Remote DOM strings (passthrough)
 * 2. Simple React component conversion (basic)
 *
 * @param content - Remote DOM JSON or React component code
 * @param options - Compilation options
 * @returns Serialized Remote DOM string
 */
export async function compileRemoteDOM(
  content: string,
  options: RemoteDOMCompilerOptions = {}
): Promise<string> {
  const { format = 'string', validate = true } = options;

  // If already serialized Remote DOM, validate and return
  if (isRemoteDOMFormat(content)) {
    if (validate) {
      validateRemoteDOMStructure(content);
    }
    return content;
  }

  // If React component, convert to Remote DOM
  if (isReactComponent(content)) {
    const remoteDomNode = convertReactToRemoteDOM(content);
    const serialized = JSON.stringify(remoteDomNode);

    if (validate) {
      validateRemoteDOMStructure(serialized);
    }

    return serialized;
  }

  throw new Error(
    'Content must be either Remote DOM JSON or React component. ' +
    'Remote DOM should be valid JSON with {type, properties?, children?}. ' +
    'React should contain JSX or React element syntax.'
  );
}

/**
 * Check if content is already Remote DOM format
 */
function isRemoteDOMFormat(content: string): boolean {
  try {
    const parsed = JSON.parse(content);
    // Remote DOM nodes must have a 'type' field
    // Children are optional but if present should be an array
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.type === 'string' &&
      (parsed.children === undefined || Array.isArray(parsed.children))
    );
  } catch {
    return false;
  }
}

/**
 * Check if content looks like React component
 */
function isReactComponent(content: string): boolean {
  // Check for common React patterns
  const reactPatterns = [
    /import\s+React/,                    // import React
    /from\s+['"]react['"]/,              // from 'react'
    /<\w+[^>]*>/,                        // JSX opening tag
    /React\.createElement/,              // React.createElement
    /jsx\(/,                             // jsx()
  ];

  return reactPatterns.some(pattern => pattern.test(content));
}

/**
 * Convert simple React component to Remote DOM format
 *
 * NOTE: This is a basic converter for simple elements.
 * Complex components with state, hooks, or advanced features
 * should be pre-converted using actual @remote-dom/core APIs.
 *
 * Supported patterns:
 * - Simple JSX elements: <div>Hello</div>
 * - Elements with attributes: <div className="foo">Hello</div>
 * - Nested elements: <div><span>Hello</span></div>
 */
function convertReactToRemoteDOM(reactCode: string): RemoteDOMNode {
  // Remove imports and exports for parsing
  const cleanCode = reactCode
    .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
    .replace(/export\s+(default\s+)?/g, '')
    .trim();

  // Try to extract JSX content
  const jsxMatch = cleanCode.match(/<(\w+)([^>]*)>(.*?)<\/\1>/s);

  if (jsxMatch) {
    const [, tagName, attrsString, content] = jsxMatch;

    const node: RemoteDOMNode = {
      type: tagName,
    };

    // Parse attributes
    const properties = parseJSXAttributes(attrsString);
    if (Object.keys(properties).length > 0) {
      node.properties = properties;
    }

    // Parse children
    const children = parseJSXChildren(content);
    if (children.length > 0) {
      node.children = children;
    }

    return node;
  }

  // Self-closing tag: <div />
  const selfClosingMatch = cleanCode.match(/<(\w+)([^>]*?)\/>/s);
  if (selfClosingMatch) {
    const [, tagName, attrsString] = selfClosingMatch;

    const node: RemoteDOMNode = {
      type: tagName,
    };

    const properties = parseJSXAttributes(attrsString);
    if (Object.keys(properties).length > 0) {
      node.properties = properties;
    }

    return node;
  }

  // Fallback: Treat as text content wrapped in a remote-text node
  return {
    type: 'remote-text',
    children: [cleanCode],
  };
}

/**
 * Parse JSX attributes into properties object
 * Example: ' className="foo" id="bar"' -> { className: 'foo', id: 'bar' }
 */
function parseJSXAttributes(attrsString: string): Record<string, any> {
  const properties: Record<string, any> = {};

  if (!attrsString.trim()) {
    return properties;
  }

  // Match attribute patterns: name="value" or name={value}
  const attrRegex = /(\w+)=(?:"([^"]*)"|{([^}]*)})/g;
  let match;

  while ((match = attrRegex.exec(attrsString)) !== null) {
    const [, name, stringValue, jsValue] = match;

    if (stringValue !== undefined) {
      properties[name] = stringValue;
    } else if (jsValue !== undefined) {
      // Try to parse JS value (simple cases: numbers, booleans)
      try {
        properties[name] = JSON.parse(jsValue);
      } catch {
        // If can't parse, store as string
        properties[name] = jsValue;
      }
    }
  }

  return properties;
}

/**
 * Parse JSX children
 * Simple implementation: treats nested tags and text content
 */
function parseJSXChildren(content: string): (RemoteDOMNode | string)[] {
  const children: (RemoteDOMNode | string)[] = [];

  if (!content.trim()) {
    return children;
  }

  // Check if content has nested JSX
  const nestedMatch = content.match(/<(\w+)([^>]*)>(.*?)<\/\1>/s);

  if (nestedMatch) {
    // Has nested elements - recursively parse
    const [fullMatch, tagName, attrsString, innerContent] = nestedMatch;

    const node: RemoteDOMNode = {
      type: tagName,
    };

    const properties = parseJSXAttributes(attrsString);
    if (Object.keys(properties).length > 0) {
      node.properties = properties;
    }

    const nestedChildren = parseJSXChildren(innerContent);
    if (nestedChildren.length > 0) {
      node.children = nestedChildren;
    }

    children.push(node);

    // Check for content before/after nested element
    const beforeContent = content.substring(0, content.indexOf(fullMatch)).trim();
    const afterContent = content.substring(content.indexOf(fullMatch) + fullMatch.length).trim();

    if (beforeContent) {
      children.unshift(beforeContent);
    }
    if (afterContent) {
      children.push(afterContent);
    }
  } else {
    // No nested elements - treat as text content
    const trimmed = content.trim();
    if (trimmed) {
      children.push(trimmed);
    }
  }

  return children;
}

/**
 * Validate Remote DOM structure
 * Ensures the serialized content is valid Remote DOM JSON
 */
function validateRemoteDOMStructure(serialized: string): void {
  try {
    const parsed = JSON.parse(serialized);

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Remote DOM must be an object');
    }

    if (typeof parsed.type !== 'string') {
      throw new Error('Remote DOM node must have a "type" field (string)');
    }

    if (parsed.properties !== undefined && typeof parsed.properties !== 'object') {
      throw new Error('Remote DOM "properties" must be an object if present');
    }

    if (parsed.children !== undefined) {
      if (!Array.isArray(parsed.children)) {
        throw new Error('Remote DOM "children" must be an array if present');
      }

      // Recursively validate children
      for (const child of parsed.children) {
        if (typeof child === 'string') {
          // Text nodes are valid
          continue;
        }
        if (typeof child === 'object' && child !== null) {
          // Recursively validate child nodes
          validateRemoteDOMStructure(JSON.stringify(child));
        } else {
          throw new Error('Remote DOM children must be strings or objects');
        }
      }
    }
  } catch (error: any) {
    throw new Error(`Invalid Remote DOM structure: ${error.message}`);
  }
}

/**
 * Check if a Remote DOM node is valid
 * (Convenience function for runtime validation)
 */
export function isValidRemoteDOMNode(node: any): node is RemoteDOMNode {
  try {
    validateRemoteDOMStructure(JSON.stringify(node));
    return true;
  } catch {
    return false;
  }
}
