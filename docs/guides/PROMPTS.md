# Prompts Guide

Learn how to add prompt templates to your MCP server using the Interface API.

**What are prompts?** Pre-defined templates that help LLMs structure their requests.

**Implementation requirement:**
- ❌ **Static prompts** (with `template` field): No implementation needed - framework auto-interpolates
- ✅ **Dynamic prompts** (with `dynamic: true` or no template): Implementation required

**See working examples:** [examples/interface-advanced.ts](../../examples/interface-advanced.ts)

---

## Overview

The Interface API provides two ways to define prompts:

1. **Static Prompts** - Template strings with placeholders, defined entirely in the interface
2. **Dynamic Prompts** - Functions that generate prompts with runtime logic

---

## IPrompt Interface

All prompts extend the `IPrompt` interface:

```typescript
interface IPrompt<TArgs = any> {
  name: string;           // Prompt name (snake_case)
  description: string;    // What the prompt does
  args: TArgs;           // Template argument types
  template?: string;     // Template string (for static prompts)
  dynamic?: boolean;     // Set true for runtime logic
}
```

---

## Static Prompts

Static prompts are defined entirely in the interface with a literal template string. No implementation needed - the framework extracts the template and handles argument interpolation automatically.

### Basic Example

```typescript
import type { IPrompt, IServer } from 'simply-mcp';

interface SummarizePrompt extends IPrompt {
  name: 'summarize';
  description: 'Summarize text with customizable length';
  args: {
    text: string;
    length?: 'short' | 'medium' | 'long';
  };
  template: `Summarize the following text. Make it {length} length.

Text:
{text}

Summary:`;
}

interface MyServer extends IServer {
  name: 'prompt-server';
  version: '1.0.0';
}

export default class MyServerImpl implements MyServer {
  // No implementation needed for static prompts!
}
```

### Template Interpolation

Use `{variable}` syntax for placeholders:

```typescript
interface WritePrompt extends IPrompt {
  name: 'write_article';
  description: 'Generate article with style and length';
  args: {
    topic: string;
    style?: 'formal' | 'casual' | 'technical';
    word_count?: number;
  };
  template: `You are a {style} writer.
Write about: {topic}
Target length: {word_count} words

Start writing:`;
}
```

### Conditional Templates

You can include conditional logic directly in the template:

```typescript
interface WeatherPrompt extends IPrompt {
  name: 'weather_report';
  description: 'Generate weather report with optional extended forecast';
  args: {
    location: string;
    includeExtended?: boolean;
  };
  template: `Generate a detailed weather report for {location}.

{includeExtended ? 'Include a 7-day extended forecast with hourly breakdowns.' : 'Focus on current conditions and 3-day outlook.'}

Format the response in a clear, easy-to-read style.`;
}
```

---

## Dynamic Prompts

Dynamic prompts require runtime logic to generate the template. Set `dynamic: true` and implement the prompt as a method.

### Basic Dynamic Prompt

```typescript
interface ContextualPrompt extends IPrompt {
  name: 'contextual_search';
  description: 'Context-aware search prompt based on user level';
  args: {
    query: string;
    userLevel?: 'beginner' | 'intermediate' | 'expert';
  };
  dynamic: true; // Requires implementation
}

export default class MyServerImpl implements MyServer {
  // Method name is camelCase version of prompt name
  contextualSearch: ContextualPrompt = (args) => {
    const level = args.userLevel || 'intermediate';

    const prompts = {
      beginner: `You are a friendly search assistant. Help a beginner user search for: ${args.query}

Explain search concepts in simple terms and suggest easy-to-understand results.`,

      intermediate: `You are a search assistant. Help the user find information about: ${args.query}

Provide relevant results with moderate technical detail.`,

      expert: `Advanced search query: ${args.query}

Provide comprehensive results with technical details, advanced filters, and expert-level insights.`
    };

    return prompts[level];
  };
}
```

### Dynamic Prompt with Runtime Data

```typescript
interface TimeAwarePrompt extends IPrompt {
  name: 'greeting';
  description: 'Generate time-appropriate greeting';
  args: {
    name: string;
  };
  dynamic: true;
}

export default class MyServerImpl implements MyServer {
  greeting: TimeAwarePrompt = (args) => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

    return `Good ${timeOfDay}, ${args.name}! How can I help you today?`;
  };
}
```

---

## Method Naming Conventions

Dynamic prompts follow the same naming convention as tools: **snake_case → camelCase**.

| Prompt Name | Implementation Method |
|-------------|----------------------|
| `contextual_search` | `contextualSearch` |
| `format_report` | `formatReport` |
| `generateSummary` | `generateSummary` (already camelCase) |

### Example

```typescript
interface ContextualSearchPrompt extends IPrompt {
  name: 'contextual_search';  // snake_case in interface
  description: 'Search with context';
  dynamic: true;
  args: { query: string; context: string };
}

// Implementation method MUST be named 'contextualSearch' (camelCase)
export default class MyServer implements IServer {
  contextualSearch: ContextualSearchPrompt = (args) => {
    return `Search for ${args.query} in context: ${args.context}`;
  };
}
```

### Static Prompts

Static prompts (with `template` field) don't need implementation, so naming doesn't apply:

```typescript
interface SummarizePrompt extends IPrompt {
  name: 'summarize';
  template: `Summarize this text: {text}`;
  // No implementation needed - framework handles it
}
```

---

## Loading Prompts from Files

Load prompt content from external markdown files for better organization:

```typescript
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load at module level
const orchestratorContent = readFileSync(
  join(__dirname, 'prompts', 'orchestrator.md'),
  'utf-8'
);

interface OrchestratorPrompt extends IPrompt {
  name: 'orchestrator';
  description: 'Agentic coding loop guide';
  args: {
    task: string;
    context?: string;
  };
  dynamic: true; // File content requires runtime interpolation
}

export default class MyServerImpl implements MyServer {
  orchestrator: OrchestratorPrompt = (args) => {
    let result = orchestratorContent;
    result = result.replace('{task}', args.task);
    result = result.replace('{context}', args.context || 'No additional context');
    return result;
  };
}
```

---

## Common Patterns

### Analysis Prompt

```typescript
interface AnalyzeSentiment extends IPrompt {
  name: 'analyze_sentiment';
  description: 'Analyze sentiment of text';
  args: {
    text: string;
  };
  template: `Analyze the sentiment of the following text.
Provide:
1. Overall sentiment (positive/negative/neutral)
2. Key emotional words
3. Confidence score (0-100)

Text:
{text}

Analysis:`;
}
```

### Code Review Prompt

```typescript
interface CodeReview extends IPrompt {
  name: 'code_review';
  description: 'Review code for quality and issues';
  args: {
    code: string;
    language: string;
  };
  template: `Review this {language} code for:
1. Correctness
2. Performance issues
3. Style/best practices
4. Security concerns

Code:
\`\`\`{language}
{code}
\`\`\`

Review:`;
}
```

### Translation Prompt

```typescript
interface Translate extends IPrompt {
  name: 'translate';
  description: 'Translate text between languages';
  args: {
    text: string;
    from_lang: string;
    to_lang: string;
  };
  template: `Translate from {from_lang} to {to_lang}.

Original:
{text}

Translation:`;
}
```

### Multi-step Prompt

```typescript
interface ProblemSolver extends IPrompt {
  name: 'solve_problem';
  description: 'Structured problem-solving approach';
  args: {
    problem: string;
  };
  template: `Follow these steps to solve the problem:

Problem:
{problem}

Step 1: Understand the problem
- What are we trying to solve?
- What information do we have?

Step 2: Break down the task
- What are the main components?
- What are the dependencies?

Step 3: Develop a solution
- Outline your approach
- Identify potential issues

Step 4: Execute and refine
- Implement your solution
- Review and improve

Begin:`;
}
```

---

## Multiple Prompts

Define multiple prompts by creating multiple interfaces:

```typescript
interface SummarizePrompt extends IPrompt {
  name: 'summarize';
  description: 'Summarize text';
  args: { text: string };
  template: 'Summarize: {text}';
}

interface AnalyzePrompt extends IPrompt {
  name: 'analyze';
  description: 'Analyze text';
  args: { text: string };
  template: 'Analyze: {text}';
}

interface ExplainPrompt extends IPrompt {
  name: 'explain';
  description: 'Explain concept';
  args: { concept: string; level?: string };
  dynamic: true;
}

export default class MyServerImpl implements MyServer {
  // Static prompts require no implementation

  // Dynamic prompts need implementation
  explain: ExplainPrompt = (args) => {
    const level = args.level || 'intermediate';
    return `Explain ${args.concept} at a ${level} level.`;
  };
}
```

---

## Best Practices

### DO

- Be specific about what the LLM should do
- Use clear, descriptive placeholder names
- Include examples in templates when helpful
- Make prompts reusable with parameters
- Use static prompts when possible (simpler, no implementation needed)
- Organize file-based prompts in a dedicated directory
- Test prompts with real LLM usage

### DON'T

- Create overly complex prompts (keep focused)
- Assume the LLM knows your domain (provide context)
- Forget to document arguments with clear descriptions
- Mix template syntax (`{var}` for templates, `${var}` for TypeScript)
- Use dynamic prompts when static templates would work

---

## Static vs Dynamic: When to Use Each

### Use Static Prompts When:
- Template is fixed with simple variable interpolation
- No runtime logic needed
- Simpler to maintain (no code needed)
- Template can be expressed as a literal string

### Use Dynamic Prompts When:
- Need runtime logic (time of day, calculations, etc.)
- Content depends on external data sources
- Complex conditional logic
- Loading from files (file content requires runtime interpolation)

---

## How to Determine: Static vs Dynamic

### Decision Tree

Use this flowchart to determine if your prompt needs implementation:

```
1. Does your prompt have a `template` field with a template string?
   ├─ YES → Is `dynamic: true` explicitly set?
   │  ├─ YES → DYNAMIC (needs implementation)
   │  └─ NO  → STATIC (no implementation needed)
   └─ NO → DYNAMIC (needs implementation)
```

### Static Prompts (No Implementation Needed)

A prompt is **static** when:
- ✅ Has `template` field with literal template string
- ✅ No `dynamic: true` flag
- ✅ Uses placeholder syntax: `{variable}`

**Examples:**

```typescript
// Static - has template, no dynamic flag
interface SummarizePrompt extends IPrompt {
  name: 'summarize';
  template: `Summarize this text: {text}`;
}

// Static - template with multiple placeholders
interface WeatherPrompt extends IPrompt {
  name: 'weather_report';
  template: `Generate a weather report for {city} in {units} degrees.`;
  args: { city: string; units: string };
}
```

### Dynamic Prompts (Implementation Required)

A prompt is **dynamic** when:
- ✅ Has `dynamic: true` flag, OR
- ✅ No `template` field provided

**Examples:**

```typescript
// Dynamic - explicit dynamic flag
interface ContextualPrompt extends IPrompt {
  name: 'contextual_search';
  dynamic: true;  // Needs implementation
  args: { query: string };
}

// Dynamic - no template provided
interface CustomPrompt extends IPrompt {
  name: 'custom_format';
  args: { data: any };
  // No template - needs implementation
}
```

### Why Static vs Dynamic?

**Static prompts** are simple templates with placeholders. The framework can handle interpolation automatically.

**Dynamic prompts** need custom logic: conditional formatting, API calls, database queries, complex transformations. These require your implementation.

### Explicit Marking

You can always be explicit:

```typescript
// Explicitly mark as static (though not necessary if template present)
interface MyPrompt extends IPrompt {
  name: 'my_prompt';
  template: `Template text`;
  dynamic: false;  // Explicitly static (default behavior)
}

// Explicitly mark as dynamic
interface MyPrompt extends IPrompt {
  name: 'my_prompt';
  template: `Template text`;
  dynamic: true;  // Override - needs implementation even with template
}
```

---

## Testing Prompts

### View Available Prompts

```bash
# List all prompts
npx simply-mcp run server.ts --dry-run --verbose
```

### Test Prompts Interactively

```bash
# Run server in watch mode
npx simply-mcp run server.ts --watch
```

### Test in Code

```typescript
import { loadInterfaceServer } from 'simply-mcp';

const server = await loadInterfaceServer({
  filePath: './server.ts',
  verbose: true
});

await server.start();
```

---

## Examples

**Working examples:**
- [interface-file-prompts.ts](../../examples/interface-file-prompts.ts) - File-based prompts with static and dynamic patterns
- [interface-protocol-comprehensive.ts](../../examples/interface-protocol-comprehensive.ts) - Complete examples of static and dynamic prompts

---

## Next Steps

- **Add tools?** See [TOOLS.md](./TOOLS.md)
- **Add resources?** See [RESOURCES.md](./RESOURCES.md)
- **Interface API reference?** See [API_FEATURES.md](./API_FEATURES.md)

---

**Need help?** Check [docs/README.md](../README.md) for the full documentation index.
