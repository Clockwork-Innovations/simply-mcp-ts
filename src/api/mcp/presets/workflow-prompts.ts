/**
 * Workflow Prompts Preset - Layer 2
 *
 * Prompts that guide users through the MCP Builder workflow.
 * Provide instructions, best practices, and procedural guidance.
 *
 * @module api/mcp/presets/workflow-prompts
 */

import type { PromptPreset } from '../types.js';

/**
 * Workflow Prompts Preset
 *
 * Provides comprehensive guidance prompts for the MCP Builder workflow.
 * These prompts explain how to use the tools, what sampling does,
 * and best practices for high-quality tool development.
 */
export const WorkflowPromptsPreset: PromptPreset = {
  name: 'Workflow Prompts',
  description: 'Workflow guidance and best practices for MCP tool development',
  prompts: [
    {
      name: 'mcp_builder_workflow',
      description: 'Complete MCP Builder workflow guide - explains the full process from design to implementation',
      template: `# MCP Builder Workflow

Welcome to the MCP Builder! This server helps you design high-quality MCP tools through guided validation and AI-powered feedback.

## How It Works

The MCP Builder provides **tools for input collection** and **AI-powered validation** using sampling.

### What is Sampling?

Sampling allows MCP tools to request analysis from your (the client's) LLM. When you call certain tools, they will send prompts back to you for intelligent analysis, then return expert feedback.

### Tools That Use Sampling:
- **analyze_tool_design** - AI reviews your tool design against Anthropic principles
- **validate_schema_quality** - AI analyzes your Zod schema for completeness
- **review_test_coverage** - AI evaluates your test scenarios

## Complete Workflow

### Step 1: Design Your Tool
Call existing design tools (from Layer 1):
- **design_tool** - Get initial tool structure
- **create_zod_schema** - Generate Zod schema from parameters

### Step 2: Validate with AI (Layer 2 - Sampling)
Call sampling-based validation tools:
- **analyze_tool_design** - Submit your design for AI analysis
  - Checks Anthropic principles
  - Validates naming, parameters, descriptions
  - Returns quality score and specific improvements

### Step 3: Refine Based on Feedback
Use AI suggestions to improve your design:
- Fix naming issues
- Improve descriptions
- Add better validation rules

### Step 4: Validate Schema Quality
- **validate_schema_quality** - Submit your Zod schema for AI review
  - Checks for .describe() on all fields
  - Validates validation rules are appropriate
  - Suggests improvements

### Step 5: Plan Tests
- **review_test_coverage** - Submit test scenarios for AI analysis
  - Identifies missing edge cases
  - Suggests additional tests
  - Validates error handling

### Step 6: Implement
Once all validations pass with high scores (80+):
- Generate your tool implementation
- Use validated schema
- Include comprehensive tests
- Deploy with confidence

## Your Role

As the client/user, you:
1. Collect requirements from end user
2. Call tools to submit data for validation
3. Receive AI-powered feedback (via sampling)
4. Iterate based on suggestions
5. Generate final implementation code

The MCP Builder **validates and guides** - you **drive the process**.

## Next Steps

Start with **design_tool** or ask for specific guidance using other prompts:
- **anthropic_best_practices** - Quality guidelines
- **how_to_use_sampling_tools** - Understanding sampling
- **zod_schema_patterns** - Schema best practices`
    },

    {
      name: 'anthropic_best_practices',
      description: 'Anthropic\'s principles for building high-quality AI agent tools',
      template: `# Anthropic's Tool Building Best Practices

Based on Anthropic's research and principles for building tools that work well with AI agents.

## Strategic Selection

### Is This Tool Necessary?
- Each tool should serve a clear, specific purpose
- Avoid creating overlapping functionality
- Consider if existing tools can be combined or extended

### Questions to Ask:
- What specific problem does this tool solve?
- Could this be handled by an existing tool?
- Is the scope focused enough?

## Thoughtful Implementation

### Clear, Descriptive Naming
- Use **snake_case** for tool names (e.g., \`get_weather\`, not \`getWeather\`)
- Names should be unambiguous and descriptive
- Avoid abbreviations unless universally understood

### Descriptions for AI Agents
- Write descriptions that explain **what** the tool does
- Include **when** to use it
- Be specific about **inputs** and **outputs**
- Assume the reader doesn't know your system

### Parameter Design
- Use appropriate types (don't default to string)
- Add \`.describe()\` to **every** Zod schema field
- Mark optional fields explicitly with \`.optional()\`
- Consider sensible defaults with \`.default()\`
- Add validation rules (\`.min()\`, \`.max()\`, \`.email()\`, etc.)

### Return Values
- Return structured, parseable data
- Use consistent formats across tools
- Include relevant context in responses
- Consider both success and error cases

## Token Efficiency

### Keep Scope Focused
- Don't try to do too much in one tool
- Return only relevant information
- Avoid unnecessary verbosity
- Structure data for easy parsing

### Example - Good vs Bad:

**Bad (verbose, unfocused):**
\`\`\`
description: "This tool can do lots of things with weather including getting current weather, forecasts, historical data, and more. It's very flexible and can handle many different types of requests."
\`\`\`

**Good (focused, specific):**
\`\`\`
description: "Get current temperature and conditions for a city. Returns temperature in specified units (celsius/fahrenheit) and current weather conditions."
\`\`\`

## Error Handling

### Define Expected Errors
- What happens with invalid input?
- How are external service failures handled?
- Are error messages helpful?

### Validation
- Validate all inputs with Zod
- Provide clear error messages
- Handle edge cases gracefully

## Evaluation & Iteration

### Test Thoroughly
- Happy path scenarios
- Edge cases (empty, null, extreme values)
- Error conditions

### Iterate Based on Feedback
- Use the validation tools (sampling-based)
- Address issues systematically
- Aim for quality scores of 80+

## Remember

> "Design tools that enable agents to solve problems intuitively and flexibly."

Focus on clarity, validation, and token efficiency.`
    },

    {
      name: 'how_to_use_sampling_tools',
      description: 'Explanation of how sampling-based validation works in MCP Builder',
      template: `# How Sampling-Based Validation Works

Layer 2 of the MCP Builder introduces **sampling** - a powerful MCP capability where tools can request the client's LLM to perform analysis.

## What is Sampling?

**Sampling** allows an MCP server tool to send a prompt to the client, asking the client's LLM to analyze something and return the result.

### Normal Tool Flow:
\`\`\`
User → Client → Tool → Simple logic → Response → Client → User
\`\`\`

### Sampling Tool Flow:
\`\`\`
User → Client → Tool → Sends prompt → Client's LLM analyzes → Response → Tool → Client → User
\`\`\`

## Why This Is Powerful

Instead of the server implementing complex analysis logic, it **leverages your intelligence** (the client's LLM) to:
- Analyze designs against best practices
- Validate schema quality
- Review test coverage
- Provide expert-level feedback

## Tools That Use Sampling

### analyze_tool_design
Sends your tool design to your LLM with a prompt like:
> "You are an expert in Anthropic's principles. Analyze this tool design..."

Your LLM responds with detailed analysis, which the tool returns to you.

### validate_schema_quality
Sends your Zod schema to your LLM with:
> "You are a Zod expert. Check this schema for best practices..."

### review_test_coverage
Sends your test scenarios to your LLM with:
> "Evaluate this test coverage. What's missing?"

## How To Use Sampling Tools

### 1. Call the Tool Normally
\`\`\`typescript
// You call the tool like any other
client.callTool({
  name: 'analyze_tool_design',
  arguments: {
    tool_name: 'my_tool',
    description: '...',
    parameters: [...],
    purpose: '...'
  }
});
\`\`\`

### 2. Server Requests Sampling
Behind the scenes, the tool uses \`context.sampling.createMessage()\` to send a prompt back to you.

### 3. Your LLM Analyzes
You (the client/LLM) receive the prompt and generate a response using your knowledge.

### 4. Server Returns Analysis
The tool receives your analysis and formats it as a response.

### 5. You Get Expert Feedback
You receive structured feedback like:
\`\`\`json
{
  "ai_analysis": {
    "score": 85,
    "issues": ["specific issue 1", "specific issue 2"],
    "improvements": ["do this", "change that"],
    "reasoning": "explanation"
  },
  "overall_ready": true
}
\`\`\`

## Benefits

- **Expert Analysis**: Leverage AI expertise for validation
- **Context-Aware**: Analysis is specific to your inputs
- **Actionable**: Get specific, concrete suggestions
- **Iterative**: Quickly refine based on feedback

## Example Workflow

1. You design a tool
2. Call \`analyze_tool_design\`
3. Tool asks you to analyze (via sampling)
4. You analyze using your AI capabilities
5. Tool returns your analysis to you (formatted)
6. You see exactly what needs improvement
7. You refine and re-validate
8. Repeat until score >= 80

## Note

If sampling isn't available, tools will still perform basic validation but won't provide AI-powered analysis. Ensure your MCP client supports sampling for the full experience.`
    },

    {
      name: 'zod_schema_patterns',
      description: 'Common Zod validation patterns and best practices for MCP tool parameters',
      template: `# Zod Schema Patterns for MCP Tools

Quick reference for creating high-quality Zod schemas for MCP tool parameters.

## Basic Types

\`\`\`typescript
// String
z.string().describe('A text value')

// Number
z.number().describe('A numeric value')

// Boolean
z.boolean().describe('True or false')

// Any (avoid if possible)
z.any().describe('Any value')
\`\`\`

## String Validation

\`\`\`typescript
// Email
z.string().email().describe('User email address')

// URL
z.string().url().describe('Website URL')

// UUID
z.string().uuid().describe('Unique identifier')

// Min/Max length
z.string().min(3).max(50).describe('Username (3-50 characters)')

// Regex pattern
z.string().regex(/^[a-z]+$/).describe('Lowercase letters only')

// Non-empty
z.string().min(1).describe('Required text')
\`\`\`

## Number Validation

\`\`\`typescript
// Positive
z.number().positive().describe('Must be greater than zero')

// Non-negative
z.number().nonnegative().describe('Zero or greater')

// Integer
z.number().int().describe('Whole number')

// Range
z.number().min(0).max(100).describe('Percentage (0-100)')
\`\`\`

## Optional & Default Values

\`\`\`typescript
// Optional
z.string().optional().describe('Optional description')

// With default
z.string().default('celsius').describe('Temperature unit')

// Nullable
z.string().nullable().describe('Can be null')

// Optional with default
z.number().optional().default(10).describe('Limit (default 10)')
\`\`\`

## Enums & Literals

\`\`\`typescript
// Enum from array
z.enum(['small', 'medium', 'large']).describe('Size option')

// Literal value
z.literal('admin').describe('Role type')

// Union of literals
z.union([
  z.literal('celsius'),
  z.literal('fahrenheit')
]).describe('Temperature unit')
\`\`\`

## Objects

\`\`\`typescript
// Simple object
z.object({
  name: z.string().describe('Person name'),
  age: z.number().positive().describe('Person age')
}).describe('Person information')

// Strict (reject unknown keys)
z.object({
  username: z.string(),
  email: z.string().email()
}).strict().describe('User credentials')

// Passthrough (allow unknown keys)
z.object({
  id: z.string()
}).passthrough().describe('Flexible object')
\`\`\`

## Arrays

\`\`\`typescript
// Array of strings
z.array(z.string()).describe('List of names')

// Non-empty array
z.array(z.string()).min(1).describe('At least one item required')

// Array with max length
z.array(z.number()).max(10).describe('Up to 10 numbers')

// Array of objects
z.array(z.object({
  id: z.string(),
  value: z.number()
})).describe('List of items')
\`\`\`

## Advanced Patterns

\`\`\`typescript
// Discriminated union
z.discriminatedUnion('type', [
  z.object({ type: z.literal('email'), address: z.string().email() }),
  z.object({ type: z.literal('phone'), number: z.string() })
]).describe('Contact method')

// Transform
z.string().transform(val => val.toLowerCase()).describe('Username (auto-lowercased)')

// Refine (custom validation)
z.number().refine(val => val % 2 === 0, {
  message: 'Must be even number'
}).describe('Even number')

// Preprocess
z.preprocess(
  val => Number(val),
  z.number()
).describe('Numeric string converted to number')
\`\`\`

## Complete Example for MCP Tool

\`\`\`typescript
const parameters = z.object({
  // Required fields with validation
  city: z.string().min(1).describe('City name to get weather for'),

  // Optional with default
  units: z.enum(['celsius', 'fahrenheit'])
    .optional()
    .default('celsius')
    .describe('Temperature units (default: celsius)'),

  // Optional field
  include_forecast: z.boolean()
    .optional()
    .describe('Include 5-day forecast'),

  // Number with constraints
  days: z.number()
    .int()
    .min(1)
    .max(7)
    .optional()
    .default(3)
    .describe('Number of forecast days (1-7, default: 3)')
}).strict(); // Reject unknown keys
\`\`\`

## Best Practices

1. **Always add .describe()** - Helps AI agents understand parameters
2. **Use .strict()** - Prevents typos and unexpected keys
3. **Validate appropriately** - Use .min(), .max(), .email(), etc.
4. **Provide defaults** - Makes tools easier to use
5. **Be specific** - Use enums instead of free-form strings when possible
6. **Avoid z.any()** - Be explicit about types

Use **validate_schema_quality** tool to get AI feedback on your schemas!`
    }
  ]
};
