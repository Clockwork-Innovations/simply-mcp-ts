# API Protocol Features

Advanced MCP protocol features for server-to-client communication.

## Table of Contents

- [ISampling - LLM Completion Requests](#isampling---llm-completion-requests)
- [IElicit - User Input Requests](#ielicit---user-input-requests)
- [IRoots - Root Directory Listing](#iroots---root-directory-listing)
- [ISubscription - Resource Update Notifications](#isubscription---resource-update-notifications)
- [ICompletion - Autocomplete](#icompletion---autocomplete)
- [HandlerContext Methods](#handlercontext-methods)
- [Related Guides](#related-guides)

---

## ISampling - LLM Completion Requests

Request LLM completions from the MCP client for AI-assisted tools.

**Interface Definition**:
```typescript
import type { ISampling, ISamplingMessage, ISamplingOptions } from 'simply-mcp';

interface ExplainCodeTool extends ITool {
  name: 'explain_code';
  description: 'Explain code with AI';
  params: { code: string };
  result: { explanation: string };
}
```

**Usage in Tool Handler**:
```typescript
explainCode: ExplainCodeTool = async (params, context) => {
  const messages: ISamplingMessage[] = [{
    role: 'user',
    content: { type: 'text', text: `Explain: ${params.code}` }
  }];

  const result = await context.sample(messages, {
    maxTokens: 500,
    temperature: 0.7
  });

  return { explanation: result.content.text };
};
```

**See**: [SAMPLING.md](./SAMPLING.md), [interface-sampling.ts](../../examples/interface-sampling.ts)

---

## IElicit - User Input Requests

Request structured user input during tool execution.

**Interface Definition**:
```typescript
import type { IElicit } from 'simply-mcp';

// Not needed - just use context.elicitInput() directly
```

**Usage in Tool Handler**:
```typescript
configureApiKey: ConfigureTool = async (params, context) => {
  const result = await context.elicitInput(
    'Please enter your API key',
    {
      apiKey: {
        type: 'string',
        title: 'API Key',
        minLength: 10
      }
    }
  );

  if (result.action === 'accept') {
    return { success: true, key: result.content.apiKey };
  }
  return { success: false };
};
```

**See**: [ELICITATION.md](./ELICITATION.md), [interface-elicitation.ts](../../examples/interface-elicitation.ts)

---

## IRoots - Root Directory Listing

Request the client's root directories for file operation scoping.

**Interface Definition**:
```typescript
import type { IRoots } from 'simply-mcp';

// Not needed - just use context.listRoots() directly
```

**Usage in Tool Handler**:
```typescript
listProjectFiles: ListFilesTool = async (params, context) => {
  const roots = await context.listRoots();
  // roots = [{ uri: 'file:///path/to/project', name: 'My Project' }]
  return { roots };
};
```

**See**: [ROOTS.md](./ROOTS.md), [interface-roots.ts](../../examples/interface-roots.ts)

---

## ISubscription - Resource Update Notifications

Notify clients when resource content changes.

**Interface Definition**:
```typescript
import type { IResource } from 'simply-mcp';

interface StatsResource extends IResource {
  uri: 'stats://current';
  name: 'Current Statistics';
  dynamic: true;  // ← Enables subscriptions
  data: { activeConnections: number };
}
```

**Notification**:
```typescript
private async updateStats(server: InterfaceServer) {
  this.connections++;
  await server.notifyResourceUpdate('stats://current');
}
```

**See**: [SUBSCRIPTIONS.md](./SUBSCRIPTIONS.md), [interface-subscriptions.ts](../../examples/interface-subscriptions.ts)

---

## ICompletion - Autocomplete

Provide autocomplete suggestions for prompt arguments.

**Interface Definition**:
```typescript
import type { ICompletion } from 'simply-mcp';

interface CityCompletion extends ICompletion<string[]> {
  name: 'city_autocomplete';
  description: 'Autocomplete city names';
  ref: { type: 'argument'; name: 'city' };
}
```

**Implementation** (function-based pattern):
```typescript
cityAutocomplete: CityCompletion = async (value: string) => {
  const cities = ['New York', 'Los Angeles', 'London'];
  return cities.filter(c => c.toLowerCase().startsWith(value.toLowerCase()));
};
```

**See**: [COMPLETIONS.md](./COMPLETIONS.md), [interface-completions.ts](../../examples/interface-completions.ts)

---

## HandlerContext Methods

The following methods are available in tool handlers via the `context` parameter:

### context.sample()
```typescript
context.sample(
  messages: ISamplingMessage[],
  options?: ISamplingOptions
): Promise<{
  content: { text: string };
  message?: { content: string };
}>
```

Request LLM completion from client.

**Availability**: When `capabilities.sampling = true`

---

### context.elicitInput()
```typescript
context.elicitInput(
  prompt: string,
  args: Record<string, JSONSchema>
): Promise<{
  action: 'accept' | 'decline' | 'cancel';
  content?: Record<string, any>;
}>
```

Request user input via form.

**Availability**: When `capabilities.elicitation = true`

---

### context.listRoots()
```typescript
context.listRoots(): Promise<Array<{
  uri: string;
  name?: string;
}>>
```

Get client's root directories.

**Availability**: When `capabilities.roots = true`

---

## Related Guides

- [API Core](./API_CORE.md) - Basic API structure
- [API Features](./API_FEATURES.md) - Tools, prompts, resources
- [Sampling Guide](./SAMPLING.md) - Complete sampling documentation
- [Elicitation Guide](./ELICITATION.md) - Complete elicitation documentation
- [Roots Guide](./ROOTS.md) - Complete roots documentation
- [Subscriptions Guide](./SUBSCRIPTIONS.md) - Complete subscriptions documentation
- [Completions Guide](./COMPLETIONS.md) - Complete completions documentation

