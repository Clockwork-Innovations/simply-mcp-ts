# API Integration Layer Specification

**Layer**: 4 of 5
**Duration**: ~4 hours
**Goal**: Support UI resources across all API styles

---

## Overview

Make UI resources available through all four API styles:
- Programmatic API (already done in Foundation)
- Decorator API (`@uiResource()`)
- Functional API (builder functions)
- Interface API (`IUIResource` interface)

All styles produce identical results; this is just syntactic sugar.

---

## Decorator API Changes

**File**: `src/api/decorator/decorators.ts`

```typescript
/**
 * Decorator for UI resources
 * Usage: @uiResource('ui://myui/v1', 'text/html')
 */
export function uiResource(
  uri: string,
  mimeType: 'text/html' | 'text/uri-list' | 'application/vnd.mcp-ui.remote-dom+javascript' = 'text/html',
  options?: { name?: string; description?: string }
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Register with server
    descriptor.value._isUIResource = true;
    descriptor.value._uri = uri;
    descriptor.value._mimeType = mimeType;
    descriptor.value._name = options?.name || propertyKey;
    descriptor.value._description = options?.description || `UI resource: ${uri}`;
    return descriptor;
  };
}
```

**Usage Example**:
```typescript
@MCPServer()
class MyServer {
  @uiResource('ui://form/feedback', 'text/html', {
    name: 'Feedback Form',
    description: 'User feedback form'
  })
  async getFeedbackForm() {
    return '<form>...</form>';
  }
}
```

---

## Functional API Changes

**File**: `src/api/functional/builders.ts`

```typescript
interface UIResourceBuilder {
  uiResource(uri: string, name: string, description: string, mimeType: string, content: string | (() => string)): UIResourceBuilder;
}

export function defineMCP(config: {
  name: string;
  version: string;
  uiResources?: Array<{ uri: string; name: string; description: string; mimeType: string; content: string | (() => string) }>;
}): MCPServer {
  // Implementation
}
```

**Usage Example**:
```typescript
const server = defineMCP({
  name: 'my-server',
  version: '1.0.0',
  uiResources: [
    {
      uri: 'ui://form/feedback',
      name: 'Feedback Form',
      description: 'User feedback',
      mimeType: 'text/html',
      content: '<form>...</form>'
    }
  ]
});
```

---

## Interface API Changes

**File**: `src/api/interface/types.ts`

```typescript
export interface IUIResource {
  readonly uri: string;
  readonly name: string;
  readonly description: string;
  readonly mimeType: string;
  readonly content: string | (() => string | Promise<string>);
}

export interface IUIResourceProvider {
  getUIResources(): IUIResource[];
}
```

**Usage Example**:
```typescript
class MyUIResources implements IUIResourceProvider {
  getUIResources(): IUIResource[] {
    return [
      {
        uri: 'ui://form/feedback',
        name: 'Feedback Form',
        description: 'User feedback',
        mimeType: 'text/html',
        content: '<form>...</form>'
      }
    ];
  }
}
```

---

## Validation

- [ ] All API styles can create UI resources
- [ ] All produce identical MIME types and URIs
- [ ] Examples for each style exist
- [ ] Tests cover all API styles
- [ ] No regressions

---

## Exit Criteria

✅ All API styles support UI resources
✅ Behavior identical across styles
✅ Tests pass
✅ Examples demonstrate each style
