# MCP Builder Guide

> **Use MCP to Build MCP** - An AI-Powered Tool Development System

Version: 2.5.0-beta.3
Last Updated: 2025-10-09

---

## Table of Contents

- [Introduction](#introduction)
  - [What is MCP Builder?](#what-is-mcp-builder)
  - [The Meta Concept](#the-meta-concept)
  - [Why Use MCP Builder?](#why-use-mcp-builder)
  - [Key Benefits](#key-benefits)
- [Architecture](#architecture)
  - [Layered Development Model](#layered-development-model)
  - [Layer 1: Foundation Tools](#layer-1-foundation-tools)
  - [Layer 2: AI Validation Tools](#layer-2-ai-validation-tools)
  - [How Interactive Validation Works](#how-interactive-validation-works)
- [Quick Start](#quick-start)
  - [Creating Your First Builder](#creating-your-first-builder)
  - [Running the Builder](#running-the-builder)
  - [Connecting from Claude](#connecting-from-claude)
- [Foundation Tools (Layer 1)](#foundation-tools-layer-1)
  - [design_tool](#design_tool)
  - [create_zod_schema](#create_zod_schema)
  - [validate_schema](#validate_schema)
- [AI Validation Tools (Layer 2)](#ai-validation-tools-layer-2)
  - [analyze_tool_design_interactive](#analyze_tool_design_interactive)
  - [submit_tool_analysis](#submit_tool_analysis)
  - [analyze_schema_interactive](#analyze_schema_interactive)
  - [submit_schema_analysis](#submit_schema_analysis)
- [Code Generation Tools](#code-generation-tools)
  - [generate_tool_code](#generate_tool_code)
  - [generate_server_file](#generate_server_file)
  - [write_file](#write_file)
  - [preview_file_write](#preview_file_write)
- [Workflow Prompts](#workflow-prompts)
- [Complete Workflow Tutorial](#complete-workflow-tutorial)
- [Presets System](#presets-system)
- [Builder Patterns](#builder-patterns)
- [Anthropic Best Practices](#anthropic-best-practices)
- [Advanced Topics](#advanced-topics)
- [Testing MCP Builder](#testing-mcp-builder)
- [Real-World Examples](#real-world-examples)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Comparison](#comparison)

---

## Introduction

### What is MCP Builder?

MCP Builder is a revolutionary approach to developing Model Context Protocol (MCP) tools: **it uses MCP itself to build MCP servers**. Instead of manually writing tools from scratch, you use an MCP server that provides specialized tools for designing, validating, generating, and deploying high-quality MCP servers.

Think of it as an IDE for MCP development, but delivered through the MCP protocol itself.

### The Meta Concept

The core innovation is **meta-programming through MCP**:

```
┌─────────────────────────────────────────────────────────┐
│  You: "Create a weather tool"                           │
│   ↓                                                      │
│  Claude Code CLI (connected to MCP Builder)             │
│   ↓                                                      │
│  MCP Builder Server (provides design/validation tools)  │
│   ↓                                                      │
│  Generated: weather-server.ts (a new MCP server!)       │
└─────────────────────────────────────────────────────────┘
```

You're using MCP tools to create MCP tools. It's MCP all the way down!

### Why Use MCP Builder?

**Traditional MCP Development:**
- 2+ hours of manual coding
- Must remember all best practices
- Manual Zod schema writing
- No automated quality validation
- Risk of missing edge cases

**With MCP Builder:**
- 2-5 minutes from idea to working server
- AI-validated against Anthropic principles
- Automatic Zod schema generation
- Built-in quality checks (scoring 0-100)
- Guided workflow ensures completeness

### Key Benefits

1. **Intelligent Validation**
   - AI-powered design review
   - Validates against Anthropic's 5 principles
   - Provides actionable, specific feedback
   - Scores designs 0-100 for objective measurement

2. **Guided Workflow**
   - Interactive design assistance
   - Step-by-step process
   - Built-in best practices prompts
   - No need to remember every detail

3. **Quality Assurance**
   - AI reviews tool designs (Strategic Selection, Naming, Parameters, etc.)
   - Schema completeness validation
   - Iterative refinement until quality >= 80
   - Production-ready code generation

4. **Time Savings**
   - ~97.5% time reduction (2 hours → 2-5 minutes)
   - Automatic schema generation
   - Complete server file generation
   - One-command deployment

5. **Consistent Excellence**
   - Every tool follows Anthropic best practices
   - Consistent code structure
   - Type-safe implementations
   - Comprehensive validation

---

## Architecture

### Layered Development Model

MCP Builder follows a layered architecture inspired by software development best practices:

```
┌─────────────────────────────────────────────────────┐
│  Layer 2: AI Validation + Code Generation          │
│  - Interactive validation tools                     │
│  - Code generation tools                            │
│  - Workflow guidance prompts                        │
├─────────────────────────────────────────────────────┤
│  Layer 1: Foundation                                │
│  - Design tools                                     │
│  - Schema creation                                  │
│  - Basic validation                                 │
└─────────────────────────────────────────────────────┘
```

**Why Layers?**
- **Modularity**: Use only what you need
- **Clarity**: Each layer has a specific purpose
- **Extensibility**: Easy to add Layer 3 (testing, deployment, etc.)
- **Learning Curve**: Start with Layer 1, progress to Layer 2

### Layer 1: Foundation Tools

**Purpose**: Basic tool design and schema creation

**Tools Included**:
1. `design_tool` - Interactive tool conceptualization
2. `create_zod_schema` - Generate Zod schemas from type definitions
3. `validate_schema` - Basic schema validation checks

**Use Case**: When you want basic design assistance without AI validation.

**Example Server**:
```typescript
import { defineMCPBuilder, DesignToolsPreset } from 'simply-mcp';

export default defineMCPBuilder({
  name: 'mcp-dev-foundation',
  version: '1.0.0',
  toolPresets: [DesignToolsPreset]
});
```

### Layer 2: AI Validation Tools

**Purpose**: AI-powered quality validation and code generation

**Tools Included**:
1. `analyze_tool_design_interactive` - AI design review (start)
2. `submit_tool_analysis` - Submit AI's analysis
3. `analyze_schema_interactive` - AI schema review (start)
4. `submit_schema_analysis` - Submit schema analysis
5. `generate_tool_code` - Generate tool implementation
6. `generate_server_file` - Generate complete server
7. `write_file` - Write to filesystem
8. `preview_file_write` - Preview before writing

**Prompts Included**:
1. `mcp_builder_workflow` - Complete workflow guide
2. `anthropic_best_practices` - Quality principles
3. `how_to_use_sampling_tools` - Validation explanation
4. `zod_schema_patterns` - Schema patterns reference

**Use Case**: Complete workflow from idea to production-ready server.

**Example Server**:
```typescript
import {
  defineMCPBuilder,
  DesignToolsPreset,
  InteractiveValidationToolsPreset,
  CodeGenerationToolsPreset,
  WorkflowPromptsPreset
} from 'simply-mcp';

export default defineMCPBuilder({
  name: 'mcp-builder-complete',
  version: '2.5.0',
  toolPresets: [
    DesignToolsPreset,
    InteractiveValidationToolsPreset,
    CodeGenerationToolsPreset
  ],
  promptPresets: [WorkflowPromptsPreset]
});
```

### How Interactive Validation Works

Unlike traditional MCP sampling (which requires special client support), MCP Builder uses an **interactive validation pattern** that works with ANY MCP client:

**Traditional Sampling Flow** (not always supported):
```
User → Tool → Server requests sampling → Client LLM → Response → Tool → User
```

**Interactive Validation Flow** (works everywhere):
```
User → analyze_* tool → Returns analysis prompt as text
     ↓
Claude reads prompt and analyzes design in context
     ↓
Claude calls submit_* tool with analysis
     ↓
Tool validates and provides feedback → User
```

**Key Innovation**: Instead of the server requesting LLM analysis via sampling, we return a structured prompt that guides Claude to analyze the design, then submit its analysis back through a tool call.

**Advantages**:
- Works with Claude Code CLI (no sampling support needed)
- Works with ANY MCP client
- More transparent (Claude's reasoning visible)
- Better UX (user sees analysis happen)
- No extra API costs
- Multi-turn refinement is natural

---

## Quick Start

### Creating Your First Builder

Choose your style based on needs:

**Option 1: Minimal (Foundation Only)**
```typescript
// mcp-dev.ts
import { defineMCPBuilder, DesignToolsPreset } from 'simply-mcp';

export default defineMCPBuilder({
  name: 'mcp-dev',
  version: '1.0.0',
  toolPresets: [DesignToolsPreset]
});
```

**Option 2: Complete (All Layers)**
```typescript
// mcp-dev-complete.ts
import {
  defineMCPBuilder,
  DesignToolsPreset,
  InteractiveValidationToolsPreset,
  CodeGenerationToolsPreset,
  WorkflowPromptsPreset
} from 'simply-mcp';

export default defineMCPBuilder({
  name: 'mcp-dev-complete',
  version: '2.5.0',
  toolPresets: [
    DesignToolsPreset,
    InteractiveValidationToolsPreset,
    CodeGenerationToolsPreset
  ],
  promptPresets: [WorkflowPromptsPreset]
});
```

**Option 3: Builder Pattern (Advanced)**
```typescript
// mcp-dev-custom.ts
import { createMCPBuilder } from 'simply-mcp';
import { DesignToolsPreset, ValidationToolsPreset } from 'simply-mcp';

export default createMCPBuilder({
  name: 'mcp-dev-custom',
  version: '1.0.0'
})
  .useToolPreset(DesignToolsPreset)
  .useToolPreset(ValidationToolsPreset)
  .addTool({
    name: 'custom_validator',
    description: 'My custom validation',
    parameters: z.object({ code: z.string() }),
    execute: async (args) => 'Custom result'
  })
  .build();
```

### Running the Builder

**Start the server:**
```bash
npx simply-mcp run mcp-dev-complete.ts
```

**With HTTP transport:**
```bash
npx simply-mcp run mcp-dev-complete.ts --http --port 3000
```

**Watch mode (auto-restart on changes):**
```bash
npx simply-mcp run mcp-dev-complete.ts --watch
```

### Connecting from Claude

**Claude Code CLI:**
```bash
# Create config file (one-time)
cat > claude-code-mcp-config.json << 'EOF'
{
  "mcpServers": {
    "mcp-builder": {
      "command": "npx",
      "args": ["simply-mcp", "run", "mcp-dev-complete.ts"]
    }
  }
}
EOF

# Use with Claude Code CLI
claude --mcp-config claude-code-mcp-config.json
```

**Claude Desktop:**
```json
{
  "mcpServers": {
    "mcp-builder": {
      "command": "npx",
      "args": ["simply-mcp", "run", "/absolute/path/to/mcp-dev-complete.ts"]
    }
  }
}
```

**First Conversation:**
```
You: "I want to create a tool to calculate tips"

Claude: "I'll help you create a tip calculator tool using the MCP Builder..."
[Claude uses the MCP Builder tools to guide you through design, validation, and code generation]
```

---

## Foundation Tools (Layer 1)

### design_tool

**Purpose**: Interactive assistant for designing MCP tools. Guides you through tool conceptualization.

**Parameters**:
```typescript
{
  purpose: string;              // What the tool should accomplish
  expected_inputs?: string;     // Description of inputs
  expected_outputs?: string;    // Description of outputs
  edge_cases?: string;          // Edge cases to consider
}
```

**Returns**:
```json
{
  "tool_name": "calculate_tip",
  "description": "Calculate tip amount and total bill",
  "parameters": {
    "suggestion": "bill_amount (number), tip_percentage (number)",
    "schema_type": "z.object({ ... })"
  },
  "result_type": {
    "suggestion": "Formatted string with tip and total",
    "format": "string | object | HandlerResult"
  },
  "considerations": {
    "validation": "Consider input validation using Zod refinements",
    "error_handling": "Handle negative amounts, invalid percentages",
    "description_clarity": "Ensure description is clear for AI agents",
    "parameter_descriptions": "Add .describe() to all schema fields"
  },
  "next_steps": [
    "1. Refine the tool name (use snake_case)",
    "2. Create Zod schema using create_zod_schema tool",
    "3. Implement execute function with proper error handling",
    "4. Validate design using validate_schema tool"
  ],
  "anthropic_principles": {
    "strategic_selection": "Is this tool necessary?",
    "clear_naming": "Use descriptive, unambiguous tool names",
    "token_efficiency": "Return only relevant information",
    "flexible_formats": "Consider multiple output formats"
  }
}
```

**Example Usage**:
```typescript
// Call from Claude Code CLI
design_tool({
  purpose: "Get weather information for a city",
  expected_inputs: "city name, optional temperature units",
  expected_outputs: "current temperature, weather conditions, humidity",
  edge_cases: "Invalid city name, API timeout, missing data"
})
```

**When to Use**:
- Starting a new tool design
- Need structure and guidance
- Want to follow best practices
- Brainstorming tool capabilities

### create_zod_schema

**Purpose**: Generate Zod schema code from TypeScript type definitions or natural language descriptions.

**Parameters**:
```typescript
{
  description: string;      // Type definition or natural language
  schema_name?: string;     // Optional name for documentation
  strict?: boolean;         // Use .strict() mode (default: false)
}
```

**Input Formats Supported**:

1. **TypeScript-style**:
```
email: string
age: number
active: boolean
```

2. **Natural language**:
```
- email (string): User's email address
- age (number): User's age in years
- active (boolean, optional): Account status
```

3. **Mixed format**:
```
city: string
units (celsius|fahrenheit) - Temperature units, optional
forecast_days: number
```

**Returns**:
```json
{
  "schema_code": "z.object({\n  email: z.string().describe('email'),\n  age: z.number().describe('age')\n}).strict()",
  "usage_example": "const UserSchema = z.object({...}).strict();",
  "notes": [
    "Import zod: import { z } from 'zod'",
    "Add .optional() for optional fields",
    "Use .refine() for custom validation",
    "Chain .min(), .max(), .email(), etc. for validations"
  ],
  "next_steps": [
    "Review generated schema for accuracy",
    "Add custom validation with .refine() if needed",
    "Test schema with sample data",
    "Use in tool definition parameters field"
  ]
}
```

**Example Usage**:
```typescript
// Simple types
create_zod_schema({
  description: "city: string\nunits: celsius|fahrenheit",
  strict: true
})

// With descriptions
create_zod_schema({
  description: `
    - city (string): City name to get weather for
    - country_code (string, optional): ISO country code
    - units (celsius|fahrenheit): Temperature units
  `,
  schema_name: "WeatherParams",
  strict: true
})
```

**Generated Schema Example**:
```typescript
z.object({
  city: z.string().describe('City name to get weather for'),
  country_code: z.string().optional().describe('ISO country code'),
  units: z.enum(['celsius', 'fahrenheit']).describe('Temperature units')
}).strict()
```

### validate_schema

**Purpose**: Validate a Zod schema for quality, completeness, and best practices.

**Parameters**:
```typescript
{
  schema_code: string;    // Zod schema code as string
  context?: string;       // What this schema is for
}
```

**Validation Checks**:
1. Field descriptions (`.describe()` usage)
2. Validation methods (`.min()`, `.max()`, `.email()`, etc.)
3. Strict mode consideration
4. Optional fields handling
5. Default values usage
6. Complex type handling

**Returns**:
```json
{
  "valid": true,
  "score": 85,
  "issues": ["No critical issues found"],
  "warnings": ["No optional fields found - confirm all required"],
  "suggestions": [
    "Consider using .strict() to reject unknown keys",
    "Consider using .default() for optional fields"
  ],
  "best_practices": {
    "descriptions": "✓ Has field descriptions",
    "validation": "✓ Includes validation rules",
    "optionality": "○ All fields required",
    "defaults": "○ Could add defaults"
  },
  "anthropic_alignment": {
    "clear_intent": "Good - descriptions help agents understand",
    "validation": "Good - validation prevents errors",
    "flexibility": "Could improve - consider optional fields"
  }
}
```

**Example Usage**:
```typescript
validate_schema({
  schema_code: `z.object({
    city: z.string().min(1).describe('City name'),
    units: z.enum(['celsius', 'fahrenheit'])
      .optional()
      .default('celsius')
      .describe('Temperature units')
  }).strict()`,
  context: "Weather tool parameters"
})
```

**Scoring Guide**:
- **90-100**: Excellent, production-ready
- **80-89**: Good, minor improvements suggested
- **70-79**: Acceptable, address warnings
- **60-69**: Needs work, fix issues
- **<60**: Significant problems, major revision needed

---

## AI Validation Tools (Layer 2)

### analyze_tool_design_interactive

**Purpose**: Start AI-powered analysis of a tool design. Returns an analysis prompt that guides Claude through evaluation.

**Parameters**:
```typescript
{
  tool_name: string;           // Tool name (snake_case)
  description: string;         // Tool description
  parameters: Array<{          // Tool parameters
    name: string;
    type: string;
    description: string;
    optional?: boolean;
  }>;
  purpose: string;             // What the tool accomplishes
}
```

**How It Works**:
1. You call this tool with your design
2. Tool returns a structured analysis prompt
3. Claude reads the prompt and evaluates the design
4. Claude calls `submit_tool_analysis` with its evaluation
5. You receive validated feedback

**Returns**: Analysis prompt text guiding Claude to evaluate:
```
# Tool Design Review Request

## Design to Analyze
**Tool Name**: get_weather
**Description**: Fetch current weather for a city
**Purpose**: Retrieve weather information

**Parameters**:
- city (string): City name
- units (celsius|fahrenheit, optional): Temperature units

## Your Task: Analyze Against Anthropic Principles

### 1. Strategic Selection (0-100)
- Is this tool necessary and well-scoped?
- Does it serve a clear, specific purpose?

### 2. Clear Naming (0-100)
- Is the name descriptive and unambiguous?
- Does it use snake_case convention?

### 3. Parameter Design (0-100)
- Are parameters well-designed with appropriate types?
- Are descriptions clear and specific?

### 4. Description Quality (0-100)
- Is the description clear enough for AI agents?
- Does it explain exactly what the tool does?

### 5. Token Efficiency (0-100)
- Is the scope focused?
- Would this require excessive context?

## Instructions
Analyze the design, then call submit_tool_analysis with scores...
```

**Example Usage**:
```typescript
analyze_tool_design_interactive({
  tool_name: "get_weather",
  description: "Fetch current weather data for a specified city",
  parameters: [
    {
      name: "city",
      type: "string",
      description: "City name to get weather for",
      optional: false
    },
    {
      name: "units",
      type: "celsius | fahrenheit",
      description: "Temperature units (default: celsius)",
      optional: true
    }
  ],
  purpose: "Retrieve current weather information for user queries"
})
```

### submit_tool_analysis

**Purpose**: Submit Claude's analysis of a tool design. This is called BY Claude after analyzing the design.

**Parameters**:
```typescript
{
  overall_score: number;               // 0-100
  strategic_selection_score: number;   // 0-100
  naming_score: number;                // 0-100
  parameters_score: number;            // 0-100
  description_score: number;           // 0-100
  efficiency_score: number;            // 0-100
  issues: string[];                    // Specific problems
  improvements: string[];              // Actionable suggestions
  ready: boolean;                      // Ready to implement?
  reasoning: string;                   // Explanation
}
```

**Returns**: Validated feedback and next steps:
```json
{
  "analysis_received": {
    "overall_score": 85,
    "breakdown": {
      "strategic_selection": 90,
      "naming": 85,
      "parameters": 80,
      "description": 85,
      "efficiency": 85
    },
    "issues_count": 1,
    "improvements_count": 2,
    "ready": true
  },
  "detailed_analysis": {
    "issues": [
      "Missing country parameter for city disambiguation"
    ],
    "improvements": [
      "Add optional 'country_code' parameter (ISO 3166)",
      "Specify what weather data fields are returned"
    ],
    "reasoning": "Good basic design with clear purpose. Minor enhancements for real-world use."
  },
  "feedback": [
    "✅ **Excellent!** This design meets high quality standards."
  ],
  "next_steps": [
    "**Next**: Call `create_zod_schema` to generate parameter schema"
  ],
  "summary": "✅ Design validated with score 85/100 - Ready to proceed!"
}
```

**Feedback Thresholds**:
- **≥85**: "Excellent! High quality standards met"
- **70-84**: "Good! Solid design with minor improvements"
- **50-69**: "Needs Work: Address identified issues"
- **<50**: "Significant Issues: Major improvements required"

**Example Usage** (Claude calls this):
```typescript
submit_tool_analysis({
  overall_score: 85,
  strategic_selection_score: 90,
  naming_score: 85,
  parameters_score: 80,
  description_score: 85,
  efficiency_score: 85,
  issues: [
    "Missing country parameter for disambiguation"
  ],
  improvements: [
    "Add optional country_code parameter",
    "Document expected return format in description"
  ],
  ready: true,
  reasoning: "Well-designed tool with clear purpose. Parameters are appropriate. Minor additions would improve real-world usability."
})
```

### analyze_schema_interactive

**Purpose**: Start AI-powered Zod schema analysis. Returns analysis prompt for Claude.

**Parameters**:
```typescript
{
  schema_code: string;    // Zod schema code
  purpose: string;        // What schema is for
}
```

**Returns**: Schema analysis prompt guiding Claude to evaluate:
```
# Schema Quality Review Request

## Schema to Analyze
```typescript
z.object({
  city: z.string().min(1).describe('City name'),
  units: z.enum(['celsius', 'fahrenheit'])
    .optional()
    .default('celsius')
    .describe('Temperature units')
}).strict()
```

**Purpose**: Weather tool parameters

## Your Task: Evaluate Schema Quality

### 1. Field Descriptions (0-100)
- Does every field have .describe()?
- Are descriptions clear and specific?

### 2. Validation Rules (0-100)
- Are appropriate validations used?
- Are constraints appropriate?

### 3. Optional Fields (0-100)
- Are optional fields properly marked?
- Are defaults sensible?

### 4. Type Safety (0-100)
- Are types appropriate?
- Are enums used where appropriate?

### 5. Strictness (0-100)
- Should this use .strict()?
- Is schema appropriately restrictive?

## Instructions
Analyze the schema, then call submit_schema_analysis...
```

**Example Usage**:
```typescript
analyze_schema_interactive({
  schema_code: `z.object({
    city: z.string().min(1).describe('City name'),
    units: z.enum(['celsius', 'fahrenheit']).optional().default('celsius')
  }).strict()`,
  purpose: "Weather tool parameters"
})
```

### submit_schema_analysis

**Purpose**: Submit Claude's schema analysis. Called BY Claude after evaluation.

**Parameters**:
```typescript
{
  overall_score: number;           // 0-100
  descriptions_score: number;      // 0-100
  validation_score: number;        // 0-100
  optional_fields_score: number;   // 0-100
  type_safety_score: number;       // 0-100
  strictness_score: number;        // 0-100
  missing: string[];               // Missing elements
  violations: string[];            // Best practice violations
  improvements: string[];          // Suggestions
  ready: boolean;                  // Production ready?
}
```

**Returns**: Validation feedback:
```json
{
  "analysis_received": {
    "overall_score": 90,
    "breakdown": {
      "descriptions": 95,
      "validation": 90,
      "optional_fields": 85,
      "type_safety": 90,
      "strictness": 90
    },
    "issues_count": 0,
    "ready": true
  },
  "detailed_analysis": {
    "missing": [],
    "violations": [],
    "improvements": [
      "Consider adding .max() to city to prevent extremely long inputs"
    ]
  },
  "feedback": [
    "✅ **Excellent Schema!** Production-ready quality."
  ],
  "next_step": "Schema validated! Ready for implementation",
  "production_ready": true
}
```

---

## Code Generation Tools

### generate_tool_code

**Purpose**: Generate complete TypeScript code for an MCP tool including imports, schema, and execute function.

**Parameters**:
```typescript
{
  tool_name: string;              // Tool name (snake_case)
  description: string;            // Tool description
  schema_code: string;            // Zod schema from create_zod_schema
  purpose: string;                // What tool accomplishes
  implementation_notes?: string;  // Implementation hints
}
```

**Returns**:
```json
{
  "tool_name": "calculate_tip",
  "generated_code": "import { z } from 'zod';\n...",
  "file_name": "calculate_tip.ts",
  "next_steps": [
    "Review the generated code",
    "Implement the TODO section with your logic",
    "Call generate_server_file to create complete server"
  ],
  "usage_example": "import { calculate_tip, calculate_tipSchema } from './calculate_tip.js';\n..."
}
```

**Generated Code Structure**:
```typescript
import { z } from 'zod';
import type { HandlerContext } from 'simply-mcp';

/**
 * Calculate tip amount and total bill
 *
 * Purpose: Help users calculate tips
 * Implementation: Multiply bill by percentage/100
 */

// Schema
export const calculate_tipSchema = z.object({
  bill_amount: z.number().positive().describe('Bill amount before tip'),
  tip_percentage: z.number().min(0).max(100).describe('Tip percentage')
}).strict();

// Type inference
export type CalculateTipParams = z.infer<typeof calculate_tipSchema>;

/**
 * calculate_tip - Calculate tip amount and total bill
 */
export async function calculate_tip(
  params: CalculateTipParams,
  context?: HandlerContext
): Promise<string> {
  context?.logger?.info('calculate_tip called with params:', params);

  // TODO: Implement your logic here
  // You have access to:
  // - params: Validated input parameters
  // - context.logger: For logging
  // - context.reportProgress: For progress updates

  throw new Error('Not implemented yet. Replace with logic.');
}
```

**Example Usage**:
```typescript
generate_tool_code({
  tool_name: "calculate_tip",
  description: "Calculate tip amount and total bill",
  schema_code: "z.object({ bill_amount: z.number().positive(), tip_percentage: z.number().min(0).max(100) }).strict()",
  purpose: "Help users calculate restaurant tips",
  implementation_notes: "Multiply bill_amount by tip_percentage/100 to get tip"
})
```

### generate_server_file

**Purpose**: Generate a complete MCP server file with one or more tools.

**Parameters**:
```typescript
{
  server_name: string;           // Server name
  server_version: string;        // Version (e.g., "1.0.0")
  tools: Array<{                 // Tools to include
    name: string;
    description: string;
    schema_code: string;
    implementation?: string;     // Optional implementation code
  }>;
  api_style?: 'functional' | 'decorator' | 'programmatic';  // Default: functional
}
```

**API Styles**:

1. **Functional** (recommended):
```typescript
export default defineMCP({
  name: 'my-server',
  version: '1.0.0',
  tools: [{ ... }]
});
```

2. **Decorator**:
```typescript
@MCPServer({ name: 'my-server' })
export default class MyServer {
  @tool() async myTool() { }
}
```

3. **Programmatic**:
```typescript
const server = new BuildMCPServer({ ... });
server.addTool({ ... });
await server.start();
```

**Returns**:
```json
{
  "server_name": "tip-calculator",
  "api_style": "functional",
  "generated_code": "/**\n * tip-calculator - MCP Server\n...",
  "file_name": "tip-calculator.ts",
  "tools_count": 1,
  "ready_to_run": true,
  "next_steps": [
    "Review the generated server code",
    "Call write_file to save to filesystem",
    "Run: npx simply-mcp run ./tip-calculator.ts"
  ]
}
```

**Generated Server Example**:
```typescript
/**
 * tip-calculator - MCP Server
 * Generated by MCP Builder
 * Version: 1.0.0
 */

import { defineMCP } from 'simply-mcp';
import { z } from 'zod';

export default defineMCP({
  name: 'tip-calculator',
  version: '1.0.0',
  description: 'MCP server with 1 tool(s)',

  tools: [
    {
      name: 'calculate_tip',
      description: 'Calculate tip amount and total bill',
      parameters: z.object({
        bill_amount: z.number().positive().describe('Bill amount before tip'),
        tip_percentage: z.number().min(0).max(100).describe('Tip percentage')
      }).strict(),
      execute: async (params, context) => {
        const tip = params.bill_amount * (params.tip_percentage / 100);
        const total = params.bill_amount + tip;
        return `Tip: $${tip.toFixed(2)}, Total: $${total.toFixed(2)}`;
      }
    }
  ]
});
```

**Example Usage**:
```typescript
generate_server_file({
  server_name: "tip-calculator",
  server_version: "1.0.0",
  tools: [{
    name: "calculate_tip",
    description: "Calculate tip amount and total",
    schema_code: "z.object({ bill_amount: z.number().positive(), tip_percentage: z.number().min(0).max(100) }).strict()",
    implementation: "const tip = params.bill_amount * (params.tip_percentage / 100);\nconst total = params.bill_amount + tip;\nreturn `Tip: $${tip.toFixed(2)}, Total: $${total.toFixed(2)}`;"
  }],
  api_style: "functional"
})
```

### write_file

**Purpose**: Write generated code to the filesystem.

**Parameters**:
```typescript
{
  file_path: string;      // Path relative to current directory
  content: string;        // File content
  overwrite?: boolean;    // Allow overwriting (default: false)
}
```

**Security Features**:
- Restricts writes to current directory only
- Requires `overwrite: true` for existing files
- Creates parent directories automatically
- Returns detailed success/error information

**Returns**:
```json
{
  "success": true,
  "file_path": "/absolute/path/to/tip-calculator.ts",
  "file_size": 1234,
  "message": "Successfully wrote 1234 bytes to ./tip-calculator.ts",
  "next_steps": [
    "Review the file content",
    "Run: npx simply-mcp run ./tip-calculator.ts"
  ]
}
```

**Error Cases**:
```json
{
  "success": false,
  "error": "File already exists",
  "file_path": "/path/to/file.ts",
  "message": "File exists and overwrite=false. Set overwrite=true to replace it.",
  "existing_file": true
}
```

**Example Usage**:
```typescript
// Create new file
write_file({
  file_path: "./servers/tip-calculator.ts",
  content: generatedCode
})

// Overwrite existing
write_file({
  file_path: "./tip-calculator.ts",
  content: updatedCode,
  overwrite: true
})
```

### preview_file_write

**Purpose**: Preview what would be written without actually writing. Safe way to check before executing.

**Parameters**:
```typescript
{
  file_path: string;    // Path that would be written
  content: string;      // Content that would be written
}
```

**Returns**:
```json
{
  "preview": {
    "file_path": "/absolute/path/tip-calculator.ts",
    "relative_path": "./tip-calculator.ts",
    "content_length": 1234,
    "content_lines": 45,
    "file_exists": false,
    "action": "CREATE NEW",
    "content_preview": "/**\n * tip-calculator - MCP Server\n * Generated by MCP Builder..."
  },
  "safe_to_write": true,
  "next_step": "Call write_file to create this file"
}
```

**Example Usage**:
```typescript
// Preview before writing
preview_file_write({
  file_path: "./my-server.ts",
  content: generatedCode
})

// Then if safe:
write_file({
  file_path: "./my-server.ts",
  content: generatedCode
})
```

---

## Workflow Prompts

Four comprehensive prompts guide you through the MCP Builder workflow:

### 1. mcp_builder_workflow

**Access**: `get_prompt mcp_builder_workflow`

**Content**: Complete workflow guide explaining:
- How MCP Builder works
- What interactive validation is
- Step-by-step process (Design → Validate → Refine → Implement)
- Your role vs. the builder's role
- Next steps

**When to Use**: Starting with MCP Builder, need overview

### 2. anthropic_best_practices

**Access**: `get_prompt anthropic_best_practices`

**Content**: Anthropic's 5 principles for AI agent tools:
- Strategic Selection (Is this tool necessary?)
- Thoughtful Implementation (Clear naming, descriptions, parameters)
- Token Efficiency (Focused scope, relevant information)
- Error Handling (Validation, helpful messages)
- Evaluation & Iteration (Testing, refinement)

**When to Use**: Understanding quality standards, improving designs

### 3. how_to_use_sampling_tools

**Access**: `get_prompt how_to_use_sampling_tools`

**Content**: Explanation of validation tools:
- What interactive validation is
- How it works (prompt → analysis → submission)
- Why it's powerful
- Benefits over traditional validation
- Example workflow

**When to Use**: Understanding AI validation, troubleshooting validation

### 4. zod_schema_patterns

**Access**: `get_prompt zod_schema_patterns`

**Content**: Comprehensive Zod reference:
- Basic types (string, number, boolean)
- String validation (email, URL, regex, min/max)
- Number validation (positive, min/max, integer)
- Optional & default values
- Enums & literals
- Objects & arrays
- Advanced patterns (discriminated unions, transforms, refinements)
- Complete examples
- Best practices

**When to Use**: Writing schemas, learning Zod patterns, reference

---

## Complete Workflow Tutorial

Let's walk through creating a complete temperature converter tool from scratch.

### Step 1: Start MCP Builder

```bash
npx simply-mcp run examples/mcp-builder-complete.ts
```

### Step 2: Connect Claude

```bash
claude --mcp-config '{"mcpServers":{"mcp-builder":{"command":"npx","args":["simply-mcp","run","examples/mcp-builder-complete.ts"]}}}'
```

### Step 3: Design the Tool

**You**: "I want to create a temperature converter tool"

**Claude calls**:
```typescript
design_tool({
  purpose: "Convert temperatures between Celsius, Fahrenheit, and Kelvin",
  expected_inputs: "temperature value, source unit, target unit",
  expected_outputs: "converted temperature value",
  edge_cases: "absolute zero validation, same-unit conversion"
})
```

**Returns**: Structured design with recommendations:
```json
{
  "tool_name": "convert_temperature",
  "description": "Convert temperatures between Celsius, Fahrenheit, and Kelvin",
  "parameters": {
    "suggestion": "value (number), from_unit (enum), to_unit (enum)"
  },
  "next_steps": [
    "Call analyze_tool_design_interactive to validate design",
    "Then call create_zod_schema"
  ]
}
```

### Step 4: Validate Design with AI

**Claude calls**:
```typescript
analyze_tool_design_interactive({
  tool_name: "convert_temperature",
  description: "Convert temperature between Celsius, Fahrenheit, and Kelvin",
  parameters: [
    { name: "value", type: "number", description: "Temperature value to convert" },
    { name: "from_unit", type: "celsius|fahrenheit|kelvin", description: "Source unit" },
    { name: "to_unit", type: "celsius|fahrenheit|kelvin", description: "Target unit" }
  ],
  purpose: "Convert temperatures between different units"
})
```

**Tool returns**: Analysis prompt

**Claude analyzes** and calls:
```typescript
submit_tool_analysis({
  overall_score: 92,
  strategic_selection_score: 95,
  naming_score: 95,
  parameters_score: 90,
  description_score: 85,
  efficiency_score: 95,
  issues: [],
  improvements: [
    "Consider adding absolute zero validation in description",
    "Document supported units explicitly"
  ],
  ready: true,
  reasoning: "Excellent tool design. Clear purpose, good naming, appropriate parameters. Minor documentation improvements suggested."
})
```

**Returns**: Validation feedback with score 92/100 - Ready to proceed!

### Step 5: Generate Schema

**Claude calls**:
```typescript
create_zod_schema({
  description: `
    - value (number): Temperature value to convert
    - from_unit (celsius|fahrenheit|kelvin): Source temperature unit
    - to_unit (celsius|fahrenheit|kelvin): Target temperature unit
  `,
  strict: true
})
```

**Returns**:
```json
{
  "schema_code": "z.object({\n  value: z.number().describe('Temperature value to convert'),\n  from_unit: z.enum(['celsius', 'fahrenheit', 'kelvin']).describe('Source temperature unit'),\n  to_unit: z.enum(['celsius', 'fahrenheit', 'kelvin']).describe('Target temperature unit')\n}).strict()"
}
```

### Step 6: Validate Schema (Optional)

**Claude calls**:
```typescript
analyze_schema_interactive({
  schema_code: "z.object({ value: z.number().describe('...'), from_unit: z.enum(['celsius', 'fahrenheit', 'kelvin']).describe('...'), to_unit: z.enum(['celsius', 'fahrenheit', 'kelvin']).describe('...') }).strict()",
  purpose: "Temperature converter parameters"
})
```

Claude analyzes and submits - Score: 95/100

### Step 7: Generate Server Code

**Claude calls**:
```typescript
generate_server_file({
  server_name: "temp-converter",
  server_version: "1.0.0",
  tools: [{
    name: "convert_temperature",
    description: "Convert temperature between Celsius, Fahrenheit, and Kelvin",
    schema_code: "<schema from step 5>",
    implementation: `
      // Conversion formulas
      const conversions = {
        celsius_to_fahrenheit: (c) => (c * 9/5) + 32,
        celsius_to_kelvin: (c) => c + 273.15,
        fahrenheit_to_celsius: (f) => (f - 32) * 5/9,
        fahrenheit_to_kelvin: (f) => ((f - 32) * 5/9) + 273.15,
        kelvin_to_celsius: (k) => k - 273.15,
        kelvin_to_fahrenheit: (k) => ((k - 273.15) * 9/5) + 32
      };

      // Same unit check
      if (params.from_unit === params.to_unit) {
        return params.value.toString();
      }

      // Absolute zero validation
      const absoluteZero = {
        celsius: -273.15,
        fahrenheit: -459.67,
        kelvin: 0
      };

      if (params.value < absoluteZero[params.from_unit]) {
        return { content: [{ type: 'text', text: 'Error: Below absolute zero!' }], isError: true };
      }

      // Convert
      const conversionKey = params.from_unit + '_to_' + params.to_unit;
      const result = conversions[conversionKey](params.value);
      return result.toFixed(2);
    `
  }],
  api_style: "functional"
})
```

**Returns**: Complete server code, 2,921 bytes

### Step 8: Write to File

**Claude calls**:
```typescript
preview_file_write({
  file_path: "./temp-converter.ts",
  content: generatedCode
})
```

**Returns**: Safe to write (file doesn't exist)

**Claude calls**:
```typescript
write_file({
  file_path: "./temp-converter.ts",
  content: generatedCode
})
```

**Returns**:
```json
{
  "success": true,
  "file_path": "/path/to/temp-converter.ts",
  "file_size": 2921,
  "message": "Successfully wrote 2921 bytes to ./temp-converter.ts"
}
```

### Step 9: Run Your Server!

```bash
npx simply-mcp run ./temp-converter.ts
```

**Result**: Working MCP server ready to use! ✅

**Total Time**: ~2.5 minutes from idea to working server

---

## Presets System

### What Are Presets?

Presets are **curated collections of tools and prompts** designed for specific purposes. They ensure consistency and completeness.

### Tool Presets

**DesignToolsPreset**:
```typescript
import { DesignToolsPreset } from 'simply-mcp';

// Includes:
// - design_tool
// - create_zod_schema
// - validate_schema
```

**InteractiveValidationToolsPreset**:
```typescript
import { InteractiveValidationToolsPreset } from 'simply-mcp';

// Includes:
// - analyze_tool_design_interactive
// - submit_tool_analysis
// - analyze_schema_interactive
// - submit_schema_analysis
```

**CodeGenerationToolsPreset**:
```typescript
import { CodeGenerationToolsPreset } from 'simply-mcp';

// Includes:
// - generate_tool_code
// - generate_server_file
// - write_file
// - preview_file_write
```

### Prompt Presets

**WorkflowPromptsPreset**:
```typescript
import { WorkflowPromptsPreset } from 'simply-mcp';

// Includes:
// - mcp_builder_workflow
// - anthropic_best_practices
// - how_to_use_sampling_tools
// - zod_schema_patterns
```

### Creating Custom Presets

```typescript
import type { ToolPreset, PromptPreset } from 'simply-mcp';
import { z } from 'zod';

// Custom tool preset
export const MyCustomTools: ToolPreset = {
  name: 'My Custom Tools',
  description: 'Custom validation tools',
  tools: [
    {
      name: 'validate_api_design',
      description: 'Validate REST API design',
      category: 'validate',
      parameters: z.object({
        endpoints: z.array(z.string()),
        methods: z.array(z.string())
      }),
      execute: async (args) => {
        // Custom validation logic
        return 'Validation result';
      }
    }
  ]
};

// Custom prompt preset
export const MyCustomPrompts: PromptPreset = {
  name: 'My Custom Prompts',
  description: 'Custom workflow prompts',
  prompts: [
    {
      name: 'api_design_guide',
      description: 'REST API design guidelines',
      template: `# API Design Best Practices\n...`
    }
  ]
};

// Use in builder
export default defineMCPBuilder({
  name: 'custom-builder',
  version: '1.0.0',
  toolPresets: [DesignToolsPreset, MyCustomTools],
  promptPresets: [WorkflowPromptsPreset, MyCustomPrompts]
});
```

### Combining Presets

```typescript
import {
  defineMCPBuilder,
  DesignToolsPreset,
  InteractiveValidationToolsPreset,
  CodeGenerationToolsPreset,
  WorkflowPromptsPreset
} from 'simply-mcp';

export default defineMCPBuilder({
  name: 'mcp-builder-complete',
  version: '2.5.0',

  // Combine multiple tool presets
  toolPresets: [
    DesignToolsPreset,
    InteractiveValidationToolsPreset,
    CodeGenerationToolsPreset
  ],

  // Combine prompt presets
  promptPresets: [
    WorkflowPromptsPreset
  ]
});
```

---

## Builder Patterns

### defineMCPBuilder (Simple)

**Use When**: You want a quick, declarative builder

```typescript
import { defineMCPBuilder } from 'simply-mcp';
import { DesignToolsPreset, WorkflowPromptsPreset } from 'simply-mcp';

export default defineMCPBuilder({
  name: 'mcp-dev',
  version: '1.0.0',
  description: 'MCP development assistant',
  toolPresets: [DesignToolsPreset],
  promptPresets: [WorkflowPromptsPreset]
});
```

**Characteristics**:
- Clean, declarative syntax
- All configuration in one object
- Auto-detection of transport
- Immediate export

### createMCPBuilder (Builder Pattern)

**Use When**: You need step-by-step configuration or custom tools

```typescript
import { createMCPBuilder } from 'simply-mcp';
import { DesignToolsPreset, ValidationToolsPreset } from 'simply-mcp';
import { z } from 'zod';

export default createMCPBuilder({
  name: 'mcp-dev-custom',
  version: '1.0.0'
})
  .useToolPreset(DesignToolsPreset)
  .useToolPreset(ValidationToolsPreset)
  .addTool({
    name: 'custom_validator',
    description: 'My custom validation logic',
    parameters: z.object({
      code: z.string().describe('Code to validate')
    }),
    execute: async (args) => {
      // Custom validation logic
      return 'Validation result';
    }
  })
  .addPrompt({
    name: 'custom_guide',
    description: 'Custom workflow guide',
    template: 'Custom workflow instructions...'
  })
  .withPort(3000)  // Optional HTTP config
  .build();
```

**Methods**:
- `.useToolPreset(preset)` - Add tool preset
- `.usePromptPreset(preset)` - Add prompt preset
- `.addTool(tool)` - Add individual tool
- `.addPrompt(prompt)` - Add individual prompt
- `.withPort(port)` - Configure HTTP port
- `.build()` - Finalize and return server

### Configuration Options

```typescript
defineMCPBuilder({
  // Required
  name: string;           // Server name
  version: string;        // Semantic version

  // Optional
  description?: string;   // Server description
  toolPresets?: ToolPreset[];     // Tool collections
  promptPresets?: PromptPreset[]; // Prompt collections
  transport?: {           // Transport config
    type: 'stdio' | 'http';
    port?: number;
    stateful?: boolean;
  };
})
```

---

## Anthropic Best Practices

MCP Builder validates against Anthropic's 5 principles for building high-quality AI agent tools:

### 1. Strategic Selection

**Question**: Is this tool necessary?

**Good**:
- Clear, specific purpose
- Solves a real problem
- Can't be handled by existing tools
- Well-scoped functionality

**Bad**:
- Overlapping with existing tools
- Too broad or vague purpose
- Could be handled by LLM directly
- Combines unrelated features

**Example**:
```
Bad: "greet_user" - LLMs can greet naturally without a tool
Good: "convert_temperature" - Requires specific calculations
```

### 2. Clear Naming

**Rules**:
- Use `snake_case` for tool names
- Be descriptive and unambiguous
- Avoid abbreviations unless universal
- Name should indicate action

**Good**:
- `get_weather`
- `calculate_tip`
- `convert_temperature`
- `send_email_notification`

**Bad**:
- `weather` (not verb-based)
- `calc` (abbreviation)
- `do_stuff` (vague)
- `getWeather` (wrong case)

### 3. Thoughtful Implementation

**Parameter Design**:
```typescript
// Good - specific types, descriptions, validation
z.object({
  city: z.string().min(1).describe('City name to get weather for'),
  country_code: z.string().length(2).optional().describe('ISO 3166 country code'),
  units: z.enum(['celsius', 'fahrenheit'])
    .optional()
    .default('celsius')
    .describe('Temperature units (default: celsius)')
}).strict()

// Bad - no descriptions, loose validation
z.object({
  city: z.string(),
  country: z.string(),
  units: z.string()
})
```

**Description Quality**:
```typescript
// Good - specific, actionable
description: "Convert temperature between Celsius, Fahrenheit, and Kelvin. Returns converted value rounded to 2 decimal places. Validates against absolute zero."

// Bad - vague, unhelpful
description: "Converts temperatures"
```

### 4. Token Efficiency

**Focused Scope**:
```typescript
// Good - single, clear purpose
{
  name: 'get_current_weather',
  description: 'Get current temperature and conditions for a city'
}

// Bad - trying to do too much
{
  name: 'weather_service',
  description: 'Get weather, forecasts, historical data, alerts, radar, and more'
}
```

**Relevant Returns**:
```typescript
// Good - structured, parseable
return JSON.stringify({
  temperature: 72,
  conditions: 'Sunny',
  humidity: 45
});

// Bad - verbose, hard to parse
return "The current weather in London is quite pleasant today with a temperature of 72 degrees Fahrenheit. The sky is sunny and clear with some occasional clouds. Humidity levels are moderate at around 45 percent...";
```

### 5. Flexible Formats

**Support Multiple Outputs**:
```typescript
{
  parameters: z.object({
    city: z.string(),
    format: z.enum(['json', 'text', 'markdown'])
      .optional()
      .default('json')
  })
}
```

**Error Handling**:
```typescript
// Validate inputs
if (value < absoluteZero[from_unit]) {
  return {
    content: [{ type: 'text', text: 'Error: Temperature below absolute zero!' }],
    isError: true
  };
}

// Provide helpful errors
if (!validCities.includes(city)) {
  return {
    content: [{ type: 'text', text: `City "${city}" not found. Try: ${suggestedCities.join(', ')}` }],
    isError: true
  };
}
```

---

## Advanced Topics

### Creating Custom Validation Tools

Build your own validation tools following the interactive pattern:

```typescript
import { z } from 'zod';
import type { ToolPreset } from 'simply-mcp';

export const APIValidationPreset: ToolPreset = {
  name: 'API Validation Tools',
  description: 'Validate REST API designs',
  tools: [
    {
      name: 'analyze_api_design_interactive',
      description: 'Analyze REST API design interactively',
      category: 'analyze',
      parameters: z.object({
        endpoints: z.array(z.object({
          path: z.string(),
          method: z.string(),
          description: z.string()
        })),
        authentication: z.string()
      }),
      execute: async (args) => {
        // Return analysis prompt
        return {
          content: [{
            type: 'text',
            text: `# API Design Analysis\n\n## Endpoints\n${JSON.stringify(args.endpoints, null, 2)}\n\n## Your Task\nAnalyze this API design for:\n1. RESTful principles (0-100)\n2. Security (0-100)\n3. Consistency (0-100)\n\nThen call submit_api_analysis...`
          }]
        };
      }
    },
    {
      name: 'submit_api_analysis',
      description: 'Submit your API analysis',
      category: 'analyze',
      parameters: z.object({
        overall_score: z.number().min(0).max(100),
        restful_score: z.number().min(0).max(100),
        security_score: z.number().min(0).max(100),
        consistency_score: z.number().min(0).max(100),
        issues: z.array(z.string()),
        improvements: z.array(z.string())
      }),
      execute: async (args) => {
        // Process and return feedback
        const feedback = args.overall_score >= 80
          ? '✅ Excellent API design!'
          : '⚠️ Needs improvement';

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              analysis_received: args,
              feedback: [feedback],
              next_steps: args.overall_score >= 80
                ? ['Implement the API']
                : ['Address issues and re-analyze']
            }, null, 2)
          }]
        };
      }
    }
  ]
};
```

### Custom Presets for Teams

Create team-specific presets:

```typescript
// team-presets.ts
export const CompanyToolsPreset: ToolPreset = {
  name: 'Company Tools',
  description: 'Company-specific development tools',
  tools: [
    {
      name: 'validate_against_company_standards',
      description: 'Validate against company coding standards',
      // ...
    }
  ]
};

export const CompanyPromptsPreset: PromptPreset = {
  name: 'Company Prompts',
  description: 'Company workflow guides',
  prompts: [
    {
      name: 'company_best_practices',
      description: 'Company MCP development standards',
      template: `# Company MCP Standards\n...`
    }
  ]
};

// Use in builder
export default defineMCPBuilder({
  name: 'company-mcp-builder',
  version: '1.0.0',
  toolPresets: [
    DesignToolsPreset,
    InteractiveValidationToolsPreset,
    CompanyToolsPreset
  ],
  promptPresets: [
    WorkflowPromptsPreset,
    CompanyPromptsPreset
  ]
});
```

### Integration with CI/CD

Automate tool validation in CI:

```typescript
// validate-tools.ts
import { defineMCPBuilder, InteractiveValidationToolsPreset } from 'simply-mcp';

const builder = defineMCPBuilder({
  name: 'ci-validator',
  toolPresets: [InteractiveValidationToolsPreset]
});

// In CI pipeline
const designs = loadToolDesigns('./tools/**/*.json');

for (const design of designs) {
  const analysis = await validateDesign(design);

  if (analysis.score < 80) {
    console.error(`Tool ${design.name} failed validation: ${analysis.score}/100`);
    process.exit(1);
  }
}

console.log('All tools validated successfully!');
```

---

## Testing MCP Builder

### Testing the Builder Server

```bash
# Run the complete builder
npx simply-mcp run examples/mcp-builder-complete.ts

# Verify tools are registered
# In another terminal:
curl http://localhost:3000/v1/tools
```

### Testing Tool Creation Workflow

```typescript
// test-workflow.ts
import { defineMCPBuilder } from 'simply-mcp';

async function testWorkflow() {
  console.log('Step 1: Design tool');
  // Test design_tool

  console.log('Step 2: Validate design');
  // Test analyze_tool_design_interactive

  console.log('Step 3: Generate schema');
  // Test create_zod_schema

  console.log('Step 4: Generate server');
  // Test generate_server_file

  console.log('Step 5: Write file');
  // Test write_file

  console.log('All steps completed!');
}

testWorkflow();
```

### Validation Testing

Test that validation correctly identifies issues:

```typescript
// Test bad design (should score low)
const badDesign = {
  tool_name: 'doStuff',  // Bad: camelCase, vague
  description: 'Does stuff',  // Bad: too vague
  parameters: []  // Bad: no parameters
};

// Should receive low scores and specific issues

// Test good design (should score high)
const goodDesign = {
  tool_name: 'convert_temperature',  // Good: snake_case, clear
  description: 'Convert temperature between Celsius, Fahrenheit, and Kelvin',
  parameters: [
    { name: 'value', type: 'number', description: 'Temperature value' },
    { name: 'from_unit', type: 'celsius|fahrenheit|kelvin', description: 'Source unit' }
  ]
};

// Should receive high scores and approval
```

---

## Real-World Examples

### Example 1: Weather Tool

**Complete workflow from idea to working server:**

```typescript
// 1. Design
design_tool({
  purpose: "Get current weather for a city",
  expected_inputs: "city name, optional country code, optional temperature units",
  expected_outputs: "temperature, conditions, humidity, wind speed",
  edge_cases: "invalid city, API timeout, missing data"
})

// 2. Analyze design (Claude evaluates)
analyze_tool_design_interactive({
  tool_name: "get_weather",
  description: "Fetch current weather data for a specified city",
  parameters: [
    { name: "city", type: "string", description: "City name" },
    { name: "country_code", type: "string", description: "ISO country code", optional: true },
    { name: "units", type: "celsius|fahrenheit", description: "Temperature units", optional: true }
  ],
  purpose: "Retrieve current weather information"
})
// Claude submits analysis: Score 88/100

// 3. Generate schema
create_zod_schema({
  description: `
    - city (string): City name to get weather for
    - country_code (string, optional): ISO 3166 country code for disambiguation
    - units (celsius|fahrenheit, optional): Temperature units (default: celsius)
  `,
  strict: true
})

// 4. Generate server
generate_server_file({
  server_name: "weather-server",
  server_version: "1.0.0",
  tools: [{
    name: "get_weather",
    description: "Fetch current weather data for a specified city",
    schema_code: "<generated schema>",
    implementation: `
      const response = await fetch(\`https://api.weather.com/current?city=\${params.city}\`);
      const data = await response.json();
      return JSON.stringify({
        temperature: params.units === 'fahrenheit' ? data.temp_f : data.temp_c,
        conditions: data.conditions,
        humidity: data.humidity
      });
    `
  }]
})

// 5. Write file
write_file({
  file_path: "./weather-server.ts",
  content: generatedCode
})

// 6. Run!
// npx simply-mcp run ./weather-server.ts
```

**Time**: ~3 minutes
**Result**: Production-ready weather server

### Example 2: File Processor

**Creating a CSV processor tool:**

```typescript
// Design
design_tool({
  purpose: "Parse CSV file and return structured data",
  expected_inputs: "file path or content, optional delimiter, optional headers flag",
  expected_outputs: "array of objects with parsed data",
  edge_cases: "invalid CSV, missing file, encoding issues"
})

// Schema
create_zod_schema({
  description: `
    - file_path (string, optional): Path to CSV file
    - content (string, optional): CSV content as string
    - delimiter (string, optional): Column delimiter (default: comma)
    - has_headers (boolean, optional): First row is headers (default: true)
  `,
  strict: true
})

// Implementation
generate_server_file({
  server_name: "csv-processor",
  server_version: "1.0.0",
  tools: [{
    name: "parse_csv",
    description: "Parse CSV data into structured objects",
    schema_code: "<schema>",
    implementation: `
      const csv = params.content || await fs.readFile(params.file_path, 'utf-8');
      const delimiter = params.delimiter || ',';
      const lines = csv.split('\\n');

      if (params.has_headers !== false) {
        const headers = lines[0].split(delimiter);
        const data = lines.slice(1).map(line => {
          const values = line.split(delimiter);
          return headers.reduce((obj, header, i) => {
            obj[header] = values[i];
            return obj;
          }, {});
        });
        return JSON.stringify(data, null, 2);
      }

      return JSON.stringify(lines.map(l => l.split(delimiter)), null, 2);
    `
  }]
})
```

### Example 3: Database Query Tool

**Creating a safe SQL query tool:**

```typescript
// Design with emphasis on security
design_tool({
  purpose: "Execute safe, read-only SQL queries",
  expected_inputs: "SQL SELECT query, optional parameters for parameterized queries",
  expected_outputs: "query results as JSON array",
  edge_cases: "SQL injection attempts, write operations, connection failures"
})

// Analyze (Claude validates security)
analyze_tool_design_interactive({
  tool_name: "execute_sql_query",
  description: "Execute read-only SQL queries with parameterized inputs for security",
  parameters: [
    { name: "query", type: "string", description: "SQL SELECT query" },
    { name: "params", type: "object", description: "Query parameters", optional: true }
  ],
  purpose: "Safely query database with read-only access"
})
// Claude checks for security considerations

// Schema with security validation
create_zod_schema({
  description: `
    - query (string): SQL query (must start with SELECT)
    - params (object, optional): Named parameters for query
    - max_rows (number, optional): Maximum rows to return (default: 100)
  `,
  strict: true
})

// Generate with security checks
generate_server_file({
  server_name: "sql-query-server",
  server_version: "1.0.0",
  tools: [{
    name: "execute_sql_query",
    description: "Execute safe, read-only SQL queries",
    schema_code: "<schema>",
    implementation: `
      // Security: Validate query is SELECT only
      if (!params.query.trim().toUpperCase().startsWith('SELECT')) {
        return { content: [{ type: 'text', text: 'Error: Only SELECT queries allowed' }], isError: true };
      }

      // Parameterized query execution
      const results = await db.query(params.query, params.params || {});

      // Limit results
      const limited = results.slice(0, params.max_rows || 100);

      return JSON.stringify(limited, null, 2);
    `
  }]
})
```

---

## API Reference

### defineMCPBuilder

```typescript
function defineMCPBuilder(config: MCPBuilderConfig): MCPServer

interface MCPBuilderConfig {
  name: string;                    // Server name
  version: string;                 // Semantic version
  description?: string;            // Server description
  toolPresets?: ToolPreset[];      // Tool collections to include
  promptPresets?: PromptPreset[];  // Prompt collections to include
  transport?: TransportConfig;     // Optional transport configuration
}
```

**Example**:
```typescript
export default defineMCPBuilder({
  name: 'mcp-dev',
  version: '1.0.0',
  description: 'MCP development assistant',
  toolPresets: [DesignToolsPreset],
  promptPresets: [WorkflowPromptsPreset]
});
```

### createMCPBuilder

```typescript
function createMCPBuilder(config: BaseConfig): MCPBuilderFactory

class MCPBuilderFactory {
  useToolPreset(preset: ToolPreset): this
  usePromptPreset(preset: PromptPreset): this
  addTool(tool: ToolDefinition): this
  addPrompt(prompt: PromptDefinition): this
  withPort(port: number): this
  build(): MCPServer
}
```

**Example**:
```typescript
export default createMCPBuilder({ name: 'mcp-dev', version: '1.0.0' })
  .useToolPreset(DesignToolsPreset)
  .addTool({ name: 'custom_tool', ... })
  .build();
```

### Tool Signatures

All tools return `Promise<HandlerResult | string>`:

```typescript
type HandlerResult = {
  content: Array<{ type: 'text' | 'image' | 'resource', text?: string, ... }>;
  isError?: boolean;
}
```

**design_tool**:
```typescript
(args: {
  purpose: string;
  expected_inputs?: string;
  expected_outputs?: string;
  edge_cases?: string;
}) => Promise<string>
```

**create_zod_schema**:
```typescript
(args: {
  description: string;
  schema_name?: string;
  strict?: boolean;
}) => Promise<string>
```

**validate_schema**:
```typescript
(args: {
  schema_code: string;
  context?: string;
}) => Promise<string>
```

**analyze_tool_design_interactive**:
```typescript
(args: {
  tool_name: string;
  description: string;
  parameters: Array<{ name: string; type: string; description: string; optional?: boolean }>;
  purpose: string;
}) => Promise<HandlerResult>
```

**submit_tool_analysis**:
```typescript
(args: {
  overall_score: number;
  strategic_selection_score: number;
  naming_score: number;
  parameters_score: number;
  description_score: number;
  efficiency_score: number;
  issues: string[];
  improvements: string[];
  ready: boolean;
  reasoning: string;
}) => Promise<HandlerResult>
```

**generate_server_file**:
```typescript
(args: {
  server_name: string;
  server_version: string;
  tools: Array<{
    name: string;
    description: string;
    schema_code: string;
    implementation?: string;
  }>;
  api_style?: 'functional' | 'decorator' | 'programmatic';
}) => Promise<HandlerResult>
```

**write_file**:
```typescript
(args: {
  file_path: string;
  content: string;
  overwrite?: boolean;
}, context?: HandlerContext) => Promise<HandlerResult>
```

### Preset Types

```typescript
interface ToolPreset {
  name: string;
  description: string;
  tools: ToolDefinition[];
}

interface PromptPreset {
  name: string;
  description: string;
  prompts: PromptDefinition[];
}

interface ToolDefinition {
  name: string;
  description: string;
  category?: string;
  parameters: ZodSchema;
  execute: (args: any, context?: HandlerContext) => Promise<HandlerResult | string>;
  examples?: Array<{
    input: any;
    output: string;
    description: string;
  }>;
}

interface PromptDefinition {
  name: string;
  description: string;
  template: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}
```

---

## Best Practices

### When to Use MCP Builder

**Use MCP Builder When**:
- Creating new MCP tools from scratch
- Learning MCP development
- Want AI-validated quality
- Need to follow best practices
- Rapid prototyping
- Team onboarding

**Don't Use When**:
- Modifying existing complex tools
- Need very specialized/unique patterns
- Offline development (requires LLM access)
- Simple one-off scripts

### Workflow Optimization

**Optimal Workflow**:
1. Design → Validate → Refine (iterate until score ≥ 80)
2. Schema → Validate (iterate until score ≥ 80)
3. Generate → Review → Write
4. Run → Test → Deploy

**Time-Saving Tips**:
- Use prompts for guidance (avoid asking basic questions)
- Trust the validation (scores < 70 indicate real issues)
- Let Claude drive the workflow (it knows the steps)
- Preview before writing (catch issues early)

### Quality Thresholds

**Recommended Minimum Scores**:
- **Production**: Overall ≥ 85, all criteria ≥ 80
- **Internal Tools**: Overall ≥ 75, all criteria ≥ 70
- **Prototypes**: Overall ≥ 60, critical criteria ≥ 70

**Critical Criteria** (never compromise):
- Strategic Selection (avoid unnecessary tools)
- Parameter Design (prevent validation issues)

**Nice-to-Have Criteria** (can be lower for prototypes):
- Description Quality (can improve later)
- Efficiency (can optimize later)

### Iteration Strategies

**When Score < 70**:
1. Address all listed issues
2. Implement all improvements
3. Re-validate immediately

**When Score 70-84**:
1. Address critical issues
2. Consider improvements
3. Re-validate or proceed based on urgency

**When Score ≥ 85**:
1. Review suggestions
2. Proceed to next step
3. Note improvements for future iteration

---

## Troubleshooting

### Connection Issues

**Problem**: Claude can't connect to MCP Builder

**Solutions**:
```bash
# Verify server is running
npx simply-mcp run mcp-dev-complete.ts

# Check config file path is absolute
{
  "mcpServers": {
    "mcp-builder": {
      "command": "npx",
      "args": ["simply-mcp", "run", "/absolute/path/to/mcp-dev-complete.ts"]
    }
  }
}

# Test with simple command
npx simply-mcp run mcp-dev-complete.ts --http --port 3000
curl http://localhost:3000/v1/tools
```

### Validation Not Working

**Problem**: Claude isn't calling submit_* tools

**Cause**: Claude may not understand the interactive pattern

**Solution**:
```
You: "Analyze this tool design and call submit_tool_analysis with your scores"

Claude: [Calls analyze_tool_design_interactive, reads prompt, analyzes, calls submit_tool_analysis]
```

Be explicit that Claude should call both tools.

### Low Validation Scores

**Problem**: Consistently receiving low scores

**Common Issues**:
1. Using camelCase instead of snake_case
2. Missing .describe() on parameters
3. Vague descriptions
4. Tool trying to do too much

**Fix**:
```typescript
// Before (score: 45)
{
  tool_name: "processData",
  description: "Process data",
  parameters: [
    { name: "data", type: "any", description: "data" }
  ]
}

// After (score: 85)
{
  tool_name: "transform_csv_to_json",
  description: "Convert CSV data to JSON format with configurable delimiter and header handling",
  parameters: [
    { name: "csv_content", type: "string", description: "CSV file content as string" },
    { name: "delimiter", type: "string", description: "Column delimiter character (default: comma)", optional: true },
    { name: "has_headers", type: "boolean", description: "Whether first row contains headers (default: true)", optional: true }
  ]
}
```

### File Write Failures

**Problem**: write_file returns errors

**Common Issues**:
1. Trying to write outside current directory
2. File exists and overwrite=false
3. Invalid file path

**Solutions**:
```typescript
// Check with preview first
preview_file_write({
  file_path: "./my-server.ts",
  content: code
})

// If file exists, use overwrite
write_file({
  file_path: "./my-server.ts",
  content: code,
  overwrite: true
})

// Use relative paths from current directory
// Good: "./servers/my-server.ts"
// Bad: "/absolute/path/servers/my-server.ts"
```

### Schema Generation Issues

**Problem**: create_zod_schema generates incorrect schema

**Cause**: Ambiguous input format

**Solution**: Be explicit with format:
```typescript
// Explicit format
create_zod_schema({
  description: `
    - email (string): User email address
    - age (number): User age in years
    - active (boolean, optional): Account active status
  `,
  strict: true
})

// Or use TypeScript-style
create_zod_schema({
  description: "email: string\nage: number\nactive?: boolean",
  strict: true
})
```

---

## Comparison

### MCP Builder vs Manual Development

| Aspect | Manual | MCP Builder | Difference |
|--------|--------|-------------|------------|
| **Time** | 2+ hours | 2-5 minutes | **~97% faster** |
| **Design Quality** | Varies | AI-validated | **Consistent** |
| **Best Practices** | Must remember | Built-in validation | **Guaranteed** |
| **Schema Writing** | Manual Zod | Auto-generated | **Zero effort** |
| **Validation** | Manual testing | AI scoring 0-100 | **Objective** |
| **Learning Curve** | Steep | Guided workflow | **Gentle** |
| **Code Quality** | Varies | Production-ready | **High** |
| **Iteration** | Slow | Fast (re-validate) | **Rapid** |

### MCP Builder vs Code Generators

| Aspect | Generic Generator | MCP Builder |
|--------|------------------|-------------|
| **MCP-Specific** | No | Yes |
| **AI Validation** | No | Yes (scores 0-100) |
| **Anthropic Principles** | No | Built-in |
| **Interactive Refinement** | No | Yes (iterative) |
| **Uses Your LLM** | No | Yes (no extra cost) |
| **Conversational** | No | Yes |
| **Quality Guarantee** | No | Scored validation |

### When to Use Each Approach

**Use MCP Builder When**:
- Creating new tools
- Learning MCP development
- Want validated quality
- Need to follow best practices
- Rapid prototyping
- Team consistency

**Use Manual Development When**:
- Highly specialized patterns
- Complex existing codebase
- Custom validation requirements
- Offline development
- You're an MCP expert

**Use Generic Generators When**:
- Non-MCP projects
- Don't have LLM access
- Very simple boilerplate
- Prefer CLI-only tools

---

## Summary

MCP Builder represents a paradigm shift in tool development: **using MCP to build MCP**. This meta approach leverages AI-powered validation to ensure every tool follows Anthropic's best practices, reducing development time by ~97% while maintaining production-ready quality.

**Key Takeaways**:
1. **~98% automation** from idea to working server
2. **AI-validated** against Anthropic's 5 principles
3. **2-5 minute workflows** for complete tools
4. **Interactive validation** works with any MCP client
5. **Production-ready code** with comprehensive validation

**Next Steps**:
1. Install Simply MCP: `npm install simply-mcp`
2. Create a builder: Use `defineMCPBuilder` or `createMCPBuilder`
3. Run it: `npx simply-mcp run mcp-dev-complete.ts`
4. Connect Claude: Use Claude Code CLI or Claude Desktop
5. Create your first tool: "I want to create a tool that..."

**Resources**:
- [Simply MCP Repository](https://github.com/Clockwork-Innovations/simply-mcp-ts)
- [NPM Package](https://www.npmjs.com/package/simply-mcp)
- [Examples](https://github.com/Clockwork-Innovations/simply-mcp-ts/tree/main/examples)
- [API Documentation](../development/API_REFERENCE.md)

---

**Happy Building! Transform hours of work into minutes of conversation.** 🚀
