# Sampling Guide - LLM Completion Requests

**Implementation requirement:** ✅ Always required - uses `context.sample()` within tool implementations

**Method naming:** N/A (context feature used within tool logic, not named separately)

---

Learn how to request LLM completions from MCP clients using the sampling capability.

**What is Sampling?** A server-side capability that allows your tools to request LLM completions from the client, enabling AI-assisted operations like code explanation, translation, and analysis.

**See working examples:**
- Foundation: [examples/interface-sampling-foundation.ts](../../examples/interface-sampling-foundation.ts)
- Advanced: [examples/interface-sampling.ts](../../examples/interface-sampling.ts)
- With UI: [examples/interface-sampling-ui.ts](../../examples/interface-sampling-ui.ts)
- Comprehensive: [examples/interface-protocol-comprehensive.ts](../../examples/interface-protocol-comprehensive.ts)

---

## Overview

Sampling enables MCP servers to request LLM completions through the client. This is useful when:
- **Code Analysis**: Request AI to analyze or explain code snippets
- **Translation**: Translate text between languages using the client's LLM
- **Summarization**: Generate summaries of long documents or data
- **Content Generation**: Create structured content with AI assistance
- **Multi-step Reasoning**: Build tools that combine data fetching with AI reasoning

Sampling is a **runtime capability** accessed through the `HandlerContext` in tool implementations. It is not defined in the interface layer - the `ISampling` interface is only for type definitions.

---

## ISampling Interface

The sampling interface defines the structure for LLM completion requests:

```typescript
import type { ISampling, ISamplingMessage, ISamplingOptions } from 'simply-mcp';

/**
 * Sampling request structure
 */
interface ISampling<TMessages = any, TOptions = any> {
  /**
   * Array of messages for the LLM conversation
   * Each message has a role ('user' or 'assistant') and content
   */
  messages: TMessages;

  /**
   * Optional sampling parameters to control LLM generation
   */
  options?: TOptions;
}

/**
 * Individual message in the conversation
 */
interface ISamplingMessage {
  role: 'user' | 'assistant';
  content: {
    type: string;
    text?: string;
    data?: string;      // Base64-encoded data
    mimeType?: string;
    [key: string]: unknown;
  };
}

/**
 * Options to control LLM generation
 */
interface ISamplingOptions {
  maxTokens?: number;        // Max tokens to generate
  temperature?: number;      // 0.0 = deterministic, 1.0 = creative
  topP?: number;            // Nucleus sampling threshold
  topK?: number;            // Top-k sampling
  stopSequences?: string[]; // Stop generation at these sequences
  metadata?: Record<string, unknown>;
}
```

---

## Basic Usage

### Simple Text Request

Request a basic LLM completion from within a tool:

```typescript
import type { ITool, IServer } from 'simply-mcp';

interface ExplainCodeTool extends ITool {
  name: 'explain_code';
  description: 'Explain code with AI assistance';
  params: {
    /** Code to explain */
    code: string;
    /** Programming language */
    language: string;
  };
  result: {
    explanation: string;
  };
}

interface MyServer extends IServer {
  name: 'code-assistant';
  version: '1.0.0';
}

export default class MyServerImpl implements MyServer {
  explainCode: ExplainCodeTool = async (params, context) => {
    // Check if sampling is available
    if (!context.sample) {
      throw new Error('Sampling not supported by this client');
    }

    // Request LLM completion
    const result = await context.sample([
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Explain this ${params.language} code:\n\n${params.code}`
        }
      }
    ]);

    return {
      explanation: result.content.text || 'No explanation generated'
    };
  };
}
```

**Key points:**
- Access sampling via `context.sample()` in tool handlers
- Always check if `context.sample` exists before using
- Messages array contains conversation history
- Result contains the LLM's response

---

## Using in Tool Handlers

### Code Analysis Tool

```typescript
interface AnalyzeCodeTool extends ITool {
  name: 'analyze_code';
  description: 'Perform deep code analysis using AI';
  params: {
    code: string;
    language: string;
    analysisType?: 'security' | 'performance' | 'style' | 'all';
  };
  result: {
    analysis: string;
    issues: Array<{
      line: number;
      severity: 'low' | 'medium' | 'high';
      message: string;
    }>;
  };
}

export default class CodeAnalyzer implements IServer {
  analyzeCode: AnalyzeCodeTool = async (params, context) => {
    if (!context.sample) {
      return {
        analysis: 'Sampling not available',
        issues: []
      };
    }

    const analysisType = params.analysisType || 'all';

    const result = await context.sample(
      [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analyze this ${params.language} code for ${analysisType}:

\`\`\`${params.language}
${params.code}
\`\`\`

Provide:
1. Overall analysis
2. Specific issues (format: LINE:SEVERITY:MESSAGE)

Be thorough and specific.`
          }
        }
      ],
      {
        maxTokens: 1000,
        temperature: 0.3  // Lower temperature for consistent analysis
      }
    );

    // Parse LLM response
    const analysisText = result.content.text || '';
    const issues = parseIssues(analysisText);

    return {
      analysis: analysisText,
      issues
    };
  };
}

function parseIssues(text: string) {
  // Parse issues from LLM response
  const issuePattern = /(\d+):(low|medium|high):(.+)/gi;
  const issues = [];
  let match;

  while ((match = issuePattern.exec(text)) !== null) {
    issues.push({
      line: parseInt(match[1]),
      severity: match[2] as 'low' | 'medium' | 'high',
      message: match[3].trim()
    });
  }

  return issues;
}
```

---

## Advanced Patterns

### Multi-turn Conversation

See the advanced example below which includes context management.

### Context Management

Store conversation context for iterative refinement:

```typescript
interface RefineTextTool extends ITool {
  name: 'refine_text';
  description: 'Iteratively refine text with AI feedback';
  params: {
    text: string;
    iterations?: number;
  };
  result: {
    refined: string;
    changes: string[];
  };
}

export default class TextRefiner implements IServer {
  refineText: RefineTextTool = async (params, context) => {
    if (!context.sample) {
      throw new Error('Sampling not available');
    }

    const iterations = params.iterations || 2;
    let currentText = params.text;
    const changes: string[] = [];

    // Build conversation history across iterations
    const messages: any[] = [];

    for (let i = 0; i < iterations; i++) {
      messages.push({
        role: 'user',
        content: {
          type: 'text',
          text: i === 0
            ? `Improve this text:\n\n${currentText}`
            : `Further improve based on previous feedback:\n\n${currentText}`
        }
      });

      const result = await context.sample(messages, {
        maxTokens: 500,
        temperature: 0.7
      });

      const improved = result.content.text || currentText;
      changes.push(`Iteration ${i + 1}: ${improved.substring(0, 50)}...`);

      // Add assistant response to conversation history
      messages.push({
        role: 'assistant',
        content: {
          type: 'text',
          text: improved
        }
      });

      currentText = improved;
    }

    return {
      refined: currentText,
      changes
    };
  };
}
```

---

## Best Practices

### When to Use Sampling

**Good Use Cases:**
- Code explanation and analysis
- Natural language processing (translation, summarization)
- Content generation with structured output
- Pattern recognition and classification
- Multi-step reasoning tasks

**Avoid Sampling For:**
- Simple data retrieval (use regular tool logic)
- Deterministic calculations (use code)
- High-frequency operations (sampling adds latency)
- Tasks requiring guaranteed format (LLM output varies)

### Performance Considerations

1. **Token Limits**: Set reasonable `maxTokens` to control costs and latency
   ```typescript
   await context.sample(messages, { maxTokens: 500 });
   ```

2. **Temperature**: Lower for consistent output, higher for creative tasks
   ```typescript
   // Consistent analysis
   await context.sample(messages, { temperature: 0.3 });

   // Creative generation
   await context.sample(messages, { temperature: 0.8 });
   ```

3. **Message Length**: Keep conversations concise to reduce processing time
   ```typescript
   // Good: Focused prompt
   const messages = [{
     role: 'user',
     content: { type: 'text', text: 'Summarize: ...' }
   }];

   // Bad: Excessive context
   const messages = [/* 20 messages with full history */];
   ```

4. **Caching**: Cache LLM results when appropriate
   ```typescript
   const cache = new Map<string, string>();

   const cacheKey = `${params.code}-${params.language}`;
   if (cache.has(cacheKey)) {
     return { explanation: cache.get(cacheKey)! };
   }

   const result = await context.sample([...]);
   cache.set(cacheKey, result.content.text);
   ```

---

## Error Handling

### Missing Capability

Always check if sampling is available:

```typescript
explainCode: ExplainCodeTool = async (params, context) => {
  if (!context.sample) {
    // Graceful degradation
    return {
      explanation: 'AI explanation not available. This is a basic analysis: ...'
    };
  }

  try {
    const result = await context.sample([...]);
    return { explanation: result.content.text || '' };
  } catch (error) {
    throw new Error(`Sampling failed: ${error.message}`);
  }
};
```

### Timeout Handling

Implement timeouts for long-running requests:

```typescript
async function sampleWithTimeout(
  context: HandlerContext,
  messages: any[],
  options: any = {},
  timeoutMs: number = 30000
): Promise<any> {
  return Promise.race([
    context.sample!(messages, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Sampling timeout')), timeoutMs)
    )
  ]);
}

// Usage
try {
  const result = await sampleWithTimeout(context, messages, {}, 10000);
  return { analysis: result.content.text };
} catch (error) {
  if (error.message === 'Sampling timeout') {
    return { analysis: 'Request timed out - analysis incomplete' };
  }
  throw error;
}
```

### Invalid Responses

Handle cases where LLM output is malformed:

```typescript
analyzeCode: AnalyzeCodeTool = async (params, context) => {
  if (!context.sample) {
    throw new Error('Sampling not available');
  }

  const result = await context.sample([...]);
  const text = result.content.text;

  if (!text || text.trim().length === 0) {
    return {
      analysis: 'No analysis generated',
      issues: []
    };
  }

  try {
    const issues = parseIssues(text);
    return { analysis: text, issues };
  } catch (error) {
    // Parsing failed, return raw text
    return {
      analysis: text,
      issues: []
    };
  }
};
```

---

## Integration Examples

### Using with Tools and Resources

Combine sampling with resource data for enriched analysis:

```typescript
interface AnalyzeProjectTool extends ITool {
  name: 'analyze_project';
  description: 'Analyze project structure with AI';
  params: {
    projectPath: string;
  };
  result: {
    summary: string;
    recommendations: string[];
  };
}

interface ProjectStructureResource extends IResource {
  uri: 'project://structure';
  name: 'Project Structure';
  mimeType: 'application/json';
  data: {
    files: string[];
    directories: string[];
  };
}

export default class ProjectAnalyzer implements IServer {
  analyzeProject: AnalyzeProjectTool = async (params, context) => {
    // Fetch project structure from resource
    const structure = await this.getProjectStructure(params.projectPath);

    // Use sampling to analyze structure
    if (!context.sample) {
      return {
        summary: 'AI analysis not available',
        recommendations: []
      };
    }

    const result = await context.sample([
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Analyze this project structure and provide recommendations:

Files: ${structure.files.join(', ')}
Directories: ${structure.directories.join(', ')}

Provide:
1. Summary of project organization
2. Specific recommendations for improvement`
        }
      }
    ], {
      maxTokens: 800,
      temperature: 0.5
    });

    const text = result.content.text || '';
    const recommendations = text
      .split('\n')
      .filter(line => line.match(/^\d+\./))
      .map(line => line.replace(/^\d+\.\s*/, ''));

    return {
      summary: text.split('\n')[0],
      recommendations
    };
  };

  private async getProjectStructure(path: string) {
    // Implementation to scan project structure
    return {
      files: ['index.ts', 'server.ts', 'types.ts'],
      directories: ['src', 'tests', 'docs']
    };
  }
}
```

### Integration Examples

See `examples/interface-protocol-comprehensive.ts` for integration patterns combining multiple protocol features.

---

## Testing Sampling

### Local Testing

```bash
# Run server in verbose mode
npx simply-mcp run server.ts --verbose

# Use dry-run to validate without connecting
npx simply-mcp run server.ts --dry-run
```

### Integration Testing

```typescript
import { loadInterfaceServer } from 'simply-mcp';

describe('Sampling Integration', () => {
  it('should request LLM completion', async () => {
    const server = await loadInterfaceServer({
      filePath: './server.ts',
      verbose: false
    });

    // Mock context with sample function
    const context = {
      sample: async (messages: any[], options?: any) => ({
        content: {
          type: 'text',
          text: 'Mocked LLM response'
        }
      })
    };

    // Test tool with mocked sampling
    const result = await server.explainCode(
      { code: 'const x = 1;', language: 'typescript' },
      context
    );

    expect(result.explanation).toBe('Mocked LLM response');
  });
});
```

---

## Examples

**See working examples:**
- Foundation: [examples/interface-sampling-foundation.ts](../../examples/interface-sampling-foundation.ts)
- Advanced: [examples/interface-sampling.ts](../../examples/interface-sampling.ts)
- With UI: [examples/interface-sampling-ui.ts](../../examples/interface-sampling-ui.ts)
- Comprehensive: [examples/interface-protocol-comprehensive.ts](../../examples/interface-protocol-comprehensive.ts)

---

## Next Steps

- **Request user input?** See [ELICITATION.md](./ELICITATION.md)
- **List client roots?** See [ROOTS.md](./ROOTS.md)
- **Add subscriptions?** See [SUBSCRIPTIONS.md](./SUBSCRIPTIONS.md)
- **Learn more about Interface API?** See [API_PROTOCOL.md](./API_PROTOCOL.md)

---

**Need help?** Check [docs/README.md](../README.md) for the full documentation index.
