# Prompts Guide

Learn how to add dynamic prompts to your MCP server.

**What are prompts?** Templates that guide the LLM on how to approach a task.

**See working examples:** [examples/class-prompts-resources.ts](../../examples/class-prompts-resources.ts)

---

## Basic Prompt

A prompt needs:
- **name** - Unique identifier
- **description** - What the prompt does
- **arguments** - Input parameters (optional)
- **template** - The prompt text with `{{variable}}` placeholders

```typescript
{
  name: 'summarize',
  description: 'Summarize text',
  arguments: [
    { name: 'text', description: 'Text to summarize', required: true },
    { name: 'length', description: 'Summary length: short/medium/long', required: false }
  ],
  template: `
Summarize the following text. Make it {{length || 'medium'}} length.

Text:
{{text}}

Summary:
  `
}
```

---

## Arguments

Define what parameters the prompt accepts:

```typescript
arguments: [
  {
    name: 'topic',
    description: 'Topic to write about',
    required: true
  },
  {
    name: 'style',
    description: 'Writing style: formal/casual/technical',
    required: false
  },
  {
    name: 'word_count',
    description: 'Target word count',
    required: false
  }
]
```

---

## Template Variables

Use `{{variable}}` to insert argument values:

```typescript
template: `
You are a {{style || 'professional'}} writer.
Write about: {{topic}}
Target length: {{word_count}} words

Start writing:
`
```

---

## Common Patterns

### Analysis Prompt

```typescript
{
  name: 'analyze-sentiment',
  description: 'Analyze sentiment of text',
  arguments: [
    { name: 'text', description: 'Text to analyze', required: true }
  ],
  template: `
Analyze the sentiment of the following text.
Provide:
1. Overall sentiment (positive/negative/neutral)
2. Key emotional words
3. Confidence score (0-100)

Text:
{{text}}

Analysis:
  `
}
```

### Code Review Prompt

```typescript
{
  name: 'code-review',
  description: 'Review code',
  arguments: [
    { name: 'code', description: 'Code to review', required: true },
    { name: 'language', description: 'Programming language', required: true }
  ],
  template: `
Review this {{language}} code for:
1. Correctness
2. Performance issues
3. Style/best practices
4. Security concerns

Code:
\`\`\`{{language}}
{{code}}
\`\`\`

Review:
  `
}
```

### Translation Prompt

```typescript
{
  name: 'translate',
  description: 'Translate text',
  arguments: [
    { name: 'text', description: 'Text to translate', required: true },
    { name: 'from_lang', description: 'Source language', required: true },
    { name: 'to_lang', description: 'Target language', required: true }
  ],
  template: `
Translate from {{from_lang}} to {{to_lang}}.

Original:
{{text}}

Translation:
  `
}
```

---

## Advanced Templates

### Conditional Logic (using JavaScript)

```typescript
template: `
You are helping with {{domain}}.

{{if (domain === 'technical')}}
Use technical terminology and precise language.
{{else}}
Use simple, accessible language.
{{endif}}

Request:
{{request}}
`
```

### Multi-step Prompts

```typescript
template: `
Follow these steps:

Step 1: Understand the request
{{request}}

Step 2: Break down the task
- What are the main components?
- What information do you need?

Step 3: Develop a solution
- Outline your approach
- Identify potential issues

Step 4: Execute and refine
- Implement your solution
- Review and improve

Begin:
`
```

---

## Multiple Prompts

### Functional API

```typescript
export default defineMCP({
  name: 'prompt-server',
  version: '1.0.0',
  prompts: [
    {
      name: 'prompt-1',
      description: 'First prompt',
      arguments: [{ name: 'input' }],
      template: 'Process: {{input}}'
    },
    {
      name: 'prompt-2',
      description: 'Second prompt',
      arguments: [{ name: 'input' }],
      template: 'Analyze: {{input}}'
    }
  ]
});
```

### Decorator API

```typescript
@MCPServer({ name: 'prompt-server', version: '1.0.0' })
class MyServer {
  @prompt('First prompt')
  prompt1(input: string): string {
    return `Process: ${input}`;
  }

  @prompt('Second prompt')
  prompt2(input: string): string {
    return `Analyze: ${input}`;
  }
}
```

---

## Best Practices

✅ **DO:**
- Be specific about what the LLM should do
- Use clear placeholders
- Include examples when helpful
- Make prompts reusable (parameterized)
- Test with real LLM usage

❌ **DON'T:**
- Create overly complex prompts (keep it focused)
- Assume the LLM knows your domain (provide context)
- Forget to document arguments
- Make prompts that change frequently
- Skip testing

---

## Debugging Prompts

### View Rendered Prompt

```bash
# Dry-run shows what prompts are available
npx simply-mcp run server.ts --dry-run --verbose
```

### Test Prompt Locally

```bash
npx simply-mcp run server.ts --watch
```

---

## Examples

**See working examples:**
- Prompts & resources: [examples/class-prompts-resources.ts](../../examples/class-prompts-resources.ts)

---

## Next Steps

- **Add tools?** See [TOOLS.md](./TOOLS.md)
- **Add resources?** See [RESOURCES.md](./RESOURCES.md)
- **Deploy server?** See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

**Need help?** Check [docs/README.md](../README.md) for the full documentation index.
