# createUIResource Quick Reference

## Installation

```bash
npm install simply-mcp
```

## Import

```typescript
import { createUIResource } from 'simply-mcp';
```

## Basic Usage

### 1. Raw HTML (Inline)

```typescript
const resource = createUIResource({
  uri: 'ui://calculator/1',
  content: {
    type: 'rawHtml',
    htmlString: '<div><h1>Calculator</h1><button>Calculate</button></div>'
  }
});
```

### 2. External URL

```typescript
const resource = createUIResource({
  uri: 'ui://dashboard/1',
  content: {
    type: 'externalUrl',
    iframeUrl: 'https://example.com/dashboard'
  }
});
```

### 3. Remote DOM (React)

```typescript
const resource = createUIResource({
  uri: 'ui://counter/1',
  content: {
    type: 'remoteDom',
    framework: 'react',
    script: `
      import { useState } from 'react';
      export default function Counter() {
        const [count, setCount] = useState(0);
        return <div>Count: {count}</div>;
      }
    `
  }
});
```

## Options

### With Metadata

```typescript
createUIResource({
  uri: 'ui://calculator/1',
  content: { type: 'rawHtml', htmlString: '...' },
  metadata: {
    name: 'Simple Calculator',
    description: 'Add two numbers together'
  }
});
```

### With Blob Encoding

```typescript
createUIResource({
  uri: 'ui://large-content/1',
  content: { type: 'rawHtml', htmlString: '...' },
  encoding: 'blob'  // Base64-encode the content
});
```

### MIME Type Override

```typescript
createUIResource({
  uri: 'ui://custom/1',
  content: { type: 'rawHtml', htmlString: '...' },
  metadata: {
    mimeType: 'text/html; charset=utf-8'  // Override auto-detection
  }
});
```

## Return Format

All variants return a spec-compliant UIResource:

```typescript
{
  type: 'resource',
  resource: {
    uri: 'ui://calculator/1',
    mimeType: 'text/html',
    name?: 'Simple Calculator',
    description?: 'Add two numbers together',
    text?: '<div>...</div>',     // For text encoding
    blob?: 'PGRpdj4uLi48L2Rpdj4='  // For blob encoding (base64)
  }
}
```

## MIME Types

| Content Type | MIME Type | Description |
|-------------|-----------|-------------|
| `rawHtml` | `text/html` | Inline HTML rendered in sandboxed iframe |
| `externalUrl` | `text/uri-list` | External URL loaded in iframe |
| `remoteDom` (react) | `application/vnd.mcp-ui.remote-dom+javascript; framework=react` | React component in Web Worker |
| `remoteDom` (webcomponents) | `application/vnd.mcp-ui.remote-dom+javascript; framework=webcomponents` | Web Component in Web Worker |

## Using with MCP Tools

### In Tool Handler

```typescript
import type { ITool } from 'simply-mcp';
import { createUIResource } from 'simply-mcp';

interface ShowCalculatorTool extends ITool {
  name: 'show_calculator';
  description: 'Display a calculator UI';
  params: Record<string, never>;
  result: any;
}

export default class MyServer {
  show_calculator: ShowCalculatorTool = async () => {
    return {
      content: [
        createUIResource({
          uri: 'ui://calculator/' + Date.now(),
          content: {
            type: 'rawHtml',
            htmlString: '<div>Calculator HTML...</div>'
          }
        })
      ]
    };
  };
}
```

## Comparison: SDK vs Interface Approach

### SDK Approach (using createUIResource)

```typescript
import { createUIResource } from 'simply-mcp';

const resource = createUIResource({
  uri: 'ui://calculator/1',
  content: {
    type: 'rawHtml',
    htmlString: '<div>Calculator</div>'
  },
  metadata: {
    name: 'Calculator',
    description: 'Simple calculator'
  }
});
```

**Pros:**
- ✅ Matches official @mcp-ui/server API
- ✅ Easy for developers familiar with official SDK
- ✅ Runtime flexibility
- ✅ Works with external resources

**Cons:**
- ⚠️ Less type safety
- ⚠️ No compile-time validation

### Interface Approach (Simply-MCP style)

```typescript
import type { IUI } from 'simply-mcp';

interface CalculatorUI extends IUI {
  uri: 'ui://calculator/v1';
  name: 'Calculator';
  description: 'Simple calculator';
  html: string;
  tools: ['add', 'subtract'];
}

class MyServer {
  calculatorUI: CalculatorUI = {
    html: '<div>Calculator</div>'
  };
}
```

**Pros:**
- ✅ Excellent type safety
- ✅ Compile-time validation
- ✅ Better IDE autocomplete
- ✅ Simpler syntax for common cases

**Cons:**
- ⚠️ Different from official SDK
- ⚠️ Less flexible at runtime

### Which to Choose?

**Use `createUIResource` when:**
- Following official MCP-UI examples
- Integrating external resources
- Need runtime flexibility
- Prefer function-based APIs

**Use Interface approach when:**
- Want maximum type safety
- Need compile-time validation
- Building new resources from scratch
- Prefer declarative style

**Best practice:** Use both! They can coexist in the same codebase.

## Error Handling

### URI Validation

```typescript
// ❌ Will throw error
createUIResource({
  uri: 'http://invalid',  // Must start with ui://
  content: { type: 'rawHtml', htmlString: '...' }
});
// Error: UI resource URIs must start with "ui://"
```

### Required Fields

```typescript
// ❌ Will throw error
createUIResource({
  uri: 'ui://test/1',
  content: {
    type: 'rawHtml',
    htmlString: ''  // Cannot be empty
  }
});
// Error: rawHtml content requires htmlString field
```

### Try-Catch Pattern

```typescript
try {
  const resource = createUIResource({
    uri: userProvidedURI,
    content: { type: 'rawHtml', htmlString: userHTML }
  });
  return { content: [resource] };
} catch (error) {
  console.error('Failed to create UI resource:', error);
  return { content: [], error: error.message };
}
```

## Advanced Patterns

### Dynamic URI Generation

```typescript
function createCalculatorResource(sessionId: string) {
  return createUIResource({
    uri: `ui://calculator/${sessionId}/${Date.now()}`,
    content: { type: 'rawHtml', htmlString: '...' }
  });
}
```

### Conditional Content Type

```typescript
function createResource(mode: 'inline' | 'external') {
  if (mode === 'inline') {
    return createUIResource({
      uri: 'ui://widget/1',
      content: { type: 'rawHtml', htmlString: '...' }
    });
  } else {
    return createUIResource({
      uri: 'ui://widget/1',
      content: { type: 'externalUrl', iframeUrl: 'https://...' }
    });
  }
}
```

### Template-Based Generation

```typescript
function createFormResource(fields: Field[]) {
  const html = `
    <form>
      ${fields.map(f => `
        <div>
          <label>${f.label}</label>
          <input type="${f.type}" name="${f.name}" />
        </div>
      `).join('')}
      <button type="submit">Submit</button>
    </form>
  `;

  return createUIResource({
    uri: 'ui://form/' + Date.now(),
    content: { type: 'rawHtml', htmlString: html },
    metadata: {
      name: 'Dynamic Form',
      description: `Form with ${fields.length} fields`
    }
  });
}
```

## TypeScript Types

### Full Type Signatures

```typescript
// Options
interface UIResourceOptions {
  uri: string;
  content: UIResourceContent;
  encoding?: 'text' | 'blob';
  metadata?: {
    name?: string;
    description?: string;
    mimeType?: string;
  };
}

// Content types
type UIResourceContent =
  | { type: 'rawHtml'; htmlString: string }
  | { type: 'externalUrl'; iframeUrl: string }
  | { type: 'remoteDom'; script: string; framework: 'react' | 'webcomponents' };

// Return type
interface UIResource {
  type: 'resource';
  resource: {
    uri: string;
    mimeType: string;
    name?: string;
    description?: string;
    text?: string;
    blob?: string;
  };
}
```

## Examples in Code

See full working examples:
- `/examples/create-ui-resource-demo.ts` - Comprehensive demonstration
- `/tests/unit/interface-api/create-ui-resource.test.ts` - Test examples

## Common Recipes

### Calculator with Tool Integration

```typescript
createUIResource({
  uri: 'ui://calculator/1',
  content: {
    type: 'rawHtml',
    htmlString: `
      <div>
        <input id="a" type="number" />
        <input id="b" type="number" />
        <button onclick="calculate()">Calculate</button>
        <div id="result"></div>
      </div>
      <script>
        function calculate() {
          const a = Number(document.getElementById('a').value);
          const b = Number(document.getElementById('b').value);

          window.parent.postMessage({
            type: 'tool',
            payload: { toolName: 'add', params: { a, b } },
            messageId: 'calc_' + Date.now()
          }, '*');
        }

        window.addEventListener('message', (event) => {
          if (event.data.type === 'tool-response') {
            document.getElementById('result').textContent =
              'Result: ' + event.data.payload.result;
          }
        });
      </script>
    `
  }
})
```

### Styled Dashboard

```typescript
createUIResource({
  uri: 'ui://dashboard/1',
  content: {
    type: 'rawHtml',
    htmlString: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial; padding: 20px; }
          .card { background: white; padding: 20px;
                  border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          h2 { color: #333; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Dashboard</h2>
          <p>Welcome to your dashboard!</p>
        </div>
      </body>
      </html>
    `
  },
  metadata: {
    name: 'Dashboard',
    description: 'User dashboard interface'
  }
})
```

### React Component with State

```typescript
createUIResource({
  uri: 'ui://counter/1',
  content: {
    type: 'remoteDom',
    framework: 'react',
    script: `
      import { useState } from 'react';

      export default function Counter() {
        const [count, setCount] = useState(0);

        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2>Count: {count}</h2>
            <button onClick={() => setCount(count + 1)}>
              Increment
            </button>
            <button onClick={() => setCount(0)}>
              Reset
            </button>
          </div>
        );
      }
    `
  },
  metadata: {
    name: 'Counter',
    description: 'Simple counter component'
  }
})
```

## Resources

- **Official MCP-UI Spec:** https://github.com/idosal/mcp-ui
- **Simply-MCP Docs:** https://github.com/vrknetha/simply-mcp-ts
- **MCP-UI Client:** https://mcpui.dev
- **Full Implementation Doc:** `/docs/CREATE_UI_RESOURCE_IMPLEMENTATION.md`

## Support

For issues or questions:
1. Check the test file for more examples: `/tests/unit/interface-api/create-ui-resource.test.ts`
2. Review the parity analysis: `/MCP_UI_PROTOCOL_PARITY_ANALYSIS.md`
3. Open an issue on GitHub

---

**Last Updated:** 2025-10-30
**Version:** 4.0.0
**Status:** Production Ready
