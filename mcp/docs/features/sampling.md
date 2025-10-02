# Sampling & LLM Completion

**Status:** ✅ Implemented (Phase 1)
**Priority:** HIGH
**MCP Protocol:** `sampling/createMessage`

## Overview

Sampling allows MCP servers to request LLM completions from connected clients. This enables servers to leverage AI capabilities without requiring direct access to LLM APIs or API keys.

### Key Benefits

- 🔐 **Security** - No server-side API keys needed
- 🎯 **Flexibility** - Clients control which LLM to use
- 🔄 **Agentic Behaviors** - Servers can implement AI-assisted workflows
- 💰 **Cost Control** - Clients manage LLM usage and billing

## Quick Start

### 1. Enable Sampling in Server

```typescript
import { SimpleMCP } from './SimpleMCP.js';
import { z } from 'zod';

const server = new SimpleMCP({
  name: 'ai-assistant-server',
  version: '1.0.0',
  capabilities: {
    sampling: true, // Enable sampling
  },
});
```

### 2. Use in Tool

```typescript
server.addTool({
  name: 'smart_summarize',
  description: 'Summarize text using AI',
  parameters: z.object({
    text: z.string().describe('Text to summarize'),
    style: z.enum(['brief', 'detailed']).optional(),
  }),
  execute: async (args, context) => {
    // Check if sampling is available
    if (!context?.sample) {
      return 'Sampling not available';
    }

    // Request LLM completion
    const messages = [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Summarize the following text ${args.style === 'brief' ? 'in 2-3 sentences' : 'in detail'}:\n\n${args.text}`,
        },
      },
    ];

    const result = await context.sample(messages, {
      maxTokens: args.style === 'brief' ? 150 : 500,
      temperature: 0.7,
    });

    return result.content.text || '(no response)';
  },
});
```

## API Reference

### Context Method

```typescript
context.sample(messages: SamplingMessage[], options?: SamplingOptions): Promise<SamplingResult>
```

### SamplingMessage

```typescript
interface SamplingMessage {
  role: 'user' | 'assistant' | 'system';
  content: {
    type: 'text' | 'image';
    text?: string;
    data?: string;  // Base64 for images
    mimeType?: string;
  };
}
```

### SamplingOptions

```typescript
interface SamplingOptions {
  maxTokens?: number;        // Maximum tokens to generate (default: 1000)
  temperature?: number;      // Sampling temperature 0-2 (default: 1.0)
  stopSequences?: string[];  // Stop generation at these sequences
  topP?: number;            // Nucleus sampling parameter
  topK?: number;            // Top-K sampling parameter
}
```

### SamplingResult

```typescript
interface SamplingResult {
  role: 'assistant';
  content: {
    type: 'text';
    text: string;
  };
  model?: string;           // Model used by client
  stopReason?: 'end_turn' | 'stop_sequence' | 'max_tokens';
}
```

## Examples

### Example 1: Text Analysis

```typescript
server.addTool({
  name: 'analyze_sentiment',
  description: 'Analyze sentiment of text',
  parameters: z.object({
    text: z.string(),
  }),
  execute: async (args, context) => {
    if (!context?.sample) {
      return 'Sampling not available';
    }

    const result = await context.sample([
      {
        role: 'system' as const,
        content: {
          type: 'text' as const,
          text: 'You are a sentiment analyzer. Respond with only: POSITIVE, NEGATIVE, or NEUTRAL.',
        },
      },
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: args.text,
        },
      },
    ], {
      maxTokens: 10,
      temperature: 0.3, // Low temperature for consistency
    });

    return `Sentiment: ${result.content.text.trim()}`;
  },
});
```

### Example 2: Code Generation

```typescript
server.addTool({
  name: 'generate_code',
  description: 'Generate code from description',
  parameters: z.object({
    description: z.string(),
    language: z.string(),
  }),
  execute: async (args, context) => {
    if (!context?.sample) {
      return 'Sampling not available';
    }

    const result = await context.sample([
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Write ${args.language} code that does: ${args.description}\n\nReturn only the code, no explanations.`,
        },
      },
    ], {
      maxTokens: 1000,
      temperature: 0.7,
      stopSequences: ['```'],
    });

    return result.content.text;
  },
});
```

### Example 3: Multi-Turn Conversation

```typescript
server.addTool({
  name: 'chat_assistant',
  description: 'Multi-turn conversation assistant',
  parameters: z.object({
    messages: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })),
    newMessage: z.string(),
  }),
  execute: async (args, context) => {
    if (!context?.sample) {
      return 'Sampling not available';
    }

    // Convert history to sampling format
    const messages = [
      ...args.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: { type: 'text' as const, text: msg.content },
      })),
      {
        role: 'user' as const,
        content: { type: 'text' as const, text: args.newMessage },
      },
    ];

    const result = await context.sample(messages, {
      maxTokens: 500,
      temperature: 0.8,
    });

    return result.content.text;
  },
});
```

## Best Practices

### 1. Always Check Availability

```typescript
if (!context?.sample) {
  return 'This tool requires LLM support. Please use a client that supports sampling.';
}
```

### 2. Use Appropriate Temperature

- **Low (0.0-0.3)**: For consistent, deterministic outputs (classification, extraction)
- **Medium (0.4-0.7)**: For balanced creativity and consistency (summarization, translation)
- **High (0.8-2.0)**: For creative tasks (story generation, brainstorming)

### 3. Set Reasonable Token Limits

```typescript
const options = {
  maxTokens: args.style === 'brief' ? 150 :
             args.style === 'detailed' ? 1000 :
             500,
};
```

### 4. Use System Messages for Instructions

```typescript
const messages = [
  {
    role: 'system' as const,
    content: {
      type: 'text' as const,
      text: 'You are a helpful assistant. Always be concise and accurate.',
    },
  },
  // ... user messages
];
```

### 5. Handle Errors Gracefully

```typescript
try {
  const result = await context.sample(messages, options);
  return result.content.text;
} catch (error) {
  context.logger?.error('Sampling failed:', error);
  return 'Failed to get LLM response. Please try again.';
}
```

## Limitations

### Current Implementation

- **Client Support Required** - Client must implement `sampling/createMessage` handler
- **No Streaming** - Responses are returned after completion (no token-by-token streaming)
- **No Vision** - Image content in messages not yet fully supported
- **No Function Calling** - Tool use within sampling not supported

### MCP Protocol Limitations

- Sampling is a **client capability** - not all clients support it
- Client controls which LLM model is used
- Client may reject sampling requests based on policy/quotas

## Use Cases

### 1. Content Processing
- Summarization
- Translation
- Sentiment analysis
- Content moderation

### 2. Code Tools
- Code generation
- Code review
- Bug explanation
- Documentation generation

### 3. Data Extraction
- Entity extraction
- Schema inference
- Classification
- Pattern recognition

### 4. Agentic Workflows
- Multi-step reasoning
- Decision making
- Plan generation
- Task decomposition

## Comparison with Direct LLM APIs

| Aspect | Sampling | Direct API |
|--------|----------|------------|
| API Keys | ❌ Not needed | ✅ Required |
| Model Selection | Client chooses | Server chooses |
| Cost Control | Client manages | Server manages |
| Rate Limiting | Client enforces | Server enforces |
| Security | ✅ Better | ⚠️ Keys in server |
| Flexibility | ⚠️ Client-dependent | ✅ Full control |

## Related Features

- [Progress Notifications](./progress.md) - Report progress during long LLM requests
- [Logging](./logging.md) - Log sampling requests and responses
- [Context API](./context-api.md) - Full context interface documentation

## Troubleshooting

### "Sampling not available" Error

**Cause:** Client doesn't support sampling or it's not enabled

**Solutions:**
1. Verify `capabilities.sampling = true` in server
2. Use a client that supports MCP sampling (e.g., Claude Desktop)
3. Check client configuration for sampling permissions

### "Sampling requires client-side implementation" Error

**Cause:** Server-to-client request mechanism not yet implemented in MCP SDK

**Status:** Known limitation documented

**Workaround:** Ensure using latest MCP SDK and compatible client

### Slow Response Times

**Cause:** LLM generation inherently takes time

**Solutions:**
1. Use progress notifications to update user
2. Set appropriate `maxTokens` limits
3. Consider caching common requests
4. Use lower temperature for faster generation

## Future Enhancements

- [ ] Streaming support for token-by-token responses
- [ ] Vision support for image analysis
- [ ] Function calling within sampling
- [ ] Sampling cost tracking
- [ ] Response caching
- [ ] Prompt templates

---

**Next Steps:**
- Learn about [Progress Notifications](./progress.md)
- See [Complete Context API](./context-api.md)
- Explore [Examples](../../examples/phase1-features.ts)
