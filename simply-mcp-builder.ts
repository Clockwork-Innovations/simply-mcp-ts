#!/usr/bin/env node
/**
 * Simply MCP Builder
 *
 * An MCP server that teaches LLMs how to build MCP servers.
 * Provides step-by-step instructions and reference resources.
 *
 * Usage case: When a user asks an LLM to convert an API/class to MCP
 * or build an MCP server from scratch, this server provides the guidance.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { IPrompt, IResource, IServer } from './src/server/interface-types';

// ES module __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function loadFile(relativePath: string): string {
  try {
    const fullPath = path.join(__dirname, relativePath);
    return fs.readFileSync(fullPath, 'utf-8');
  } catch (error) {
    return `Error loading file: ${relativePath}\n${error}`;
  }
}

// =============================================================================
// QUICK REFERENCE CONTENT (Inline)
// =============================================================================

const QUICK_REFS = {
  'tool-patterns': `# Common Tool Patterns

## ⚠️ CRITICAL: All params MUST use IParam interfaces

Parameters must define \`type\` and \`description\` fields. Never use direct TypeScript types.

\`\`\`typescript
// ❌ WRONG - Direct types
params: { username: string; email: string }

// ✅ CORRECT - IParam interfaces
interface UsernameParam extends IParam {
  type: 'string';
  description: 'Username for the new user';
  minLength: 3;
  maxLength: 50;
}

interface EmailParam extends IParam {
  type: 'string';
  description: 'User email address';
  format: 'email';
}

params: { username: UsernameParam; email: EmailParam }
\`\`\`

## CRUD Operations
\`\`\`typescript
import type { ITool, IParam, IServer } from 'simply-mcp';

interface UsernameParam extends IParam {
  type: 'string';
  description: 'Username for the new user';
}

interface EmailParam extends IParam {
  type: 'string';
  description: 'User email address';
  format: 'email';
}

interface CreateUserTool extends ITool {
  name: 'create_user';
  description: 'Create a new user';
  params: {
    username: UsernameParam;
    email: EmailParam;
  };
  result: { id: string; username: string };
}

// Implementation
export default class MyServer implements IServer {
  createUser: CreateUserTool = async (params) => {
    return { id: '123', username: params.username };
  };
}
\`\`\`

## Search/Query
\`\`\`typescript
interface QueryParam extends IParam {
  type: 'string';
  description: 'Search query string';
}

interface LimitParam extends IParam {
  type: 'integer';
  description: 'Maximum results to return';
  min: 1;
  max: 100;
}

interface SearchTool extends ITool {
  name: 'search';
  description: 'Search for items';
  params: {
    query: QueryParam;
    limit?: LimitParam;  // Optional param
  };
  result: Array<{ id: string; name: string }>;
}
\`\`\`

## Transform/Process
\`\`\`typescript
interface InputParam extends IParam {
  type: 'string';
  description: 'Data to transform';
}

interface FormatParam extends IParam {
  type: 'string';
  description: 'Target format';
  enum: ['json', 'xml', 'csv'];
}

interface TransformTool extends ITool {
  name: 'transform_data';
  description: 'Transform data format';
  params: {
    input: InputParam;
    format: FormatParam;
  };
  result: string;
}
\`\`\``,

  'resource-patterns': `# Common Resource Patterns

## Static Configuration
\`\`\`typescript
interface ConfigResource extends IResource {
  uri: 'config://settings';
  name: 'Application Settings';
  description: 'Current configuration';
  mimeType: 'application/json';
  text: JSON.stringify({
    apiUrl: 'https://api.example.com',
    version: '1.0.0'
  }, null, 2);
}
\`\`\`

## Dynamic Stats
\`\`\`typescript
interface StatsResource extends IResource {
  uri: 'stats://current';
  name: 'Current Statistics';
  description: 'Real-time stats';
  mimeType: 'application/json';
  returns: string;
}

class MyServer {
  'stats://current': StatsResource = async () => {
    const stats = {
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
    return JSON.stringify(stats, null, 2);
  };
}
\`\`\``,

  'prompt-patterns': `# Common Prompt Patterns

⚠️ NEW: IPrompt with automatic type inference - no type duplication!

## Simple String Prompt (with defaults)
\`\`\`typescript
interface WeatherPrompt extends IPrompt {
  name: 'weather_report';
  description: 'Generate weather report request';
  args: {
    location: { description: 'City name' };  // type: 'string', required: true by default
    units: {
      description: 'Temperature units';
      enum: ['celsius', 'fahrenheit'];
      required: false;
    };
  };
}

// Implementation (ALWAYS required) - types automatically inferred!
class MyServer {
  weatherReport: WeatherPrompt = (args) => {
    // args.location → string
    // args.units → 'celsius' | 'fahrenheit' | undefined
    return \`Get weather for \${args.location} in \${args.units || 'celsius'}\`;
  };
}
\`\`\`

## Multi-Turn Conversation (SimpleMessage[])
\`\`\`typescript
interface TutorialPrompt extends IPrompt {
  name: 'tutorial';
  description: 'Interactive tutorial with examples';
  args: {
    topic: { description: 'Topic to learn' };  // string, required
    level: {
      description: 'Skill level';
      enum: ['beginner', 'advanced'];
    };
  };
}

// Implementation returns SimpleMessage[]
class MyServer {
  tutorial: TutorialPrompt = (args) => {
    // args.topic → string
    // args.level → 'beginner' | 'advanced'
    return [
      { user: \`Teach me about \${args.topic} at \${args.level} level\` },
      { assistant: \`I'll explain \${args.topic}...\` }
    ];
  };
}
\`\`\`

## Advanced Pattern (PromptMessage[])
\`\`\`typescript
interface CodeReviewPrompt extends IPrompt {
  name: 'code_review';
  description: 'Request code review with context';
  args: {
    code: { description: 'Code to review' };         // string, required
    language: { description: 'Programming language' }; // string, required
  };
}

// Implementation returns PromptMessage[]
class MyServer {
  codeReview: CodeReviewPrompt = (args) => {
    // args.code → string
    // args.language → string
    return [{
      role: 'user',
      content: {
        type: 'text',
        text: \`Review this \${args.language} code:\n\${args.code}\`
      }
    }];
  };
}
\`\`\`

## Key Points - Type Inference
- \`arguments\` field is REQUIRED (single source of truth)
- \`type\` defaults to \`'string'\` - only specify for number/boolean
- \`required\` defaults to \`true\` - only specify \`required: false\` for optional
- Use \`enum\` with plain arrays: \`['option1', 'option2']\` (no \`as const\`)
- Zero type duplication - framework infers everything from \`arguments\``,

  'validation-cheatsheet': `# IParam Validation Cheat Sheet

## String Validation
\`\`\`typescript
params: {
  email: IParam<string> & { format: 'email' };
  url: IParam<string> & { format: 'url' };
  username: IParam<string> & { pattern: '^[a-zA-Z0-9_]+$' };
  password: IParam<string> & { minLength: 8; maxLength: 100 };
}
\`\`\`

## Number Validation
\`\`\`typescript
params: {
  age: IParam<number> & { minimum: 0; maximum: 150 };
  count: IParam<number> & { minimum: 1 };
}
\`\`\``,

  'conversion-guide': `# API/Class → MCP Conversion Guide

## Quick Steps

1. **Analyze the Source**
   - List all public methods/functions
   - Identify input parameters and types
   - Identify return types

2. **Map to MCP Interfaces**
   - Methods → ITool (with snake_case names)
   - Configuration → IResource (static data)
   - Templates → IPrompt

3. **Example Conversion**
\`\`\`typescript
// Original Class
class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
}

// MCP Server
interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers';
  params: { a: number; b: number };
  returns: number;
}

class CalculatorServer implements IServer {
  name = 'calculator';
  version = '1.0.0';

  add: AddTool = (params) => {
    return params.a + params.b;
  };
}
\`\`\``
};

// =============================================================================
// INTERFACE DEFINITIONS
// =============================================================================

// Server Interface
interface SimplyMCPBuilderServerInterface extends IServer {
  name: 'simply-mcp-builder';
  version: '1.0.0';
  description: 'MCP server that teaches LLMs how to build MCP servers with step-by-step instructions and comprehensive resources';
}

// Quick Reference Resources (Dynamic - return inline data)
interface ToolPatternsResource extends IResource {
  uri: 'quickref://tool-patterns';
  name: 'Tool Patterns Quick Reference';
  description: 'Common tool implementation patterns (CRUD, search, transform, validate)';
  mimeType: 'text/markdown';
  returns: string;
}

interface ResourcePatternsResource extends IResource {
  uri: 'quickref://resource-patterns';
  name: 'Resource Patterns Quick Reference';
  description: 'Common resource patterns (config, stats, logs, data)';
  mimeType: 'text/markdown';
  returns: string;
}

interface PromptPatternsResource extends IResource {
  uri: 'quickref://prompt-patterns';
  name: 'Prompt Patterns Quick Reference';
  description: 'Common prompt patterns using IPrompt with type inference and smart defaults (string, SimpleMessage[], PromptMessage[])';
  mimeType: 'text/markdown';
  returns: string;
}

interface ValidationCheatsheetResource extends IResource {
  uri: 'quickref://validation-cheatsheet';
  name: 'IParam Validation Cheatsheet';
  description: 'Quick reference for all IParam validation options';
  mimeType: 'text/markdown';
  returns: string;
}

interface ConversionGuideResource extends IResource {
  uri: 'quickref://conversion-guide';
  name: 'API/Class Conversion Guide';
  description: 'Checklist for converting REST APIs and TypeScript classes to MCP servers';
  mimeType: 'text/markdown';
  returns: string;
}

// Guide Resources (Dynamic - load from files)
interface QuickStartGuide extends IResource {
  uri: 'guide://quick-start';
  name: 'Quick Start Guide';
  description: 'Get started in 5 minutes - installation, first server, validation';
  mimeType: 'text/markdown';
  returns: string;
}

interface ToolsGuide extends IResource {
  uri: 'guide://tools';
  name: 'Tools Guide';
  description: 'Creating tools - ITool interface, parameters, validation, async patterns';
  mimeType: 'text/markdown';
  returns: string;
}

interface PromptsGuide extends IResource {
  uri: 'guide://prompts';
  name: 'Prompts Guide';
  description: 'Building prompts - IPrompt with type inference, smart defaults, return patterns (string | SimpleMessage[] | PromptMessage[])';
  mimeType: 'text/markdown';
  returns: string;
}

interface ResourcesGuide extends IResource {
  uri: 'guide://resources';
  name: 'Resources Guide';
  description: 'Exposing data - static values, dynamic returns, database resources';
  mimeType: 'text/markdown';
  returns: string;
}

// Example Resources (Dynamic - load from files)
interface MinimalExample extends IResource {
  uri: 'example://minimal';
  name: 'Minimal Example';
  description: 'START HERE - Cleanest MCP server with basic tools';
  mimeType: 'text/plain';
  returns: string;
}

interface AdvancedExample extends IResource {
  uri: 'example://advanced';
  name: 'Advanced Example';
  description: 'IParam validation, static prompts, static/dynamic resources';
  mimeType: 'text/plain';
  returns: string;
}

// Prompts (Dynamic - generate content with type inference)
interface HowToBuildMCPPrompt extends IPrompt {
  name: 'how_to_build_mcp';
  description: 'Step-by-step instructions for LLMs to build MCP servers from APIs, classes, or scratch';
  args: {
    source_type: {
      description: 'Type of source to convert';
      required: false;
    };
    has_state: {
      description: 'Whether source has state/config';
      type: 'boolean';
      required: false;
    };
    needs_ai: {
      description: 'Whether AI assistance is needed';
      type: 'boolean';
      required: false;
    };
  };
}

interface ConvertRestApiPrompt extends IPrompt {
  name: 'convert_rest_api';
  description: 'Instructions for converting REST APIs to MCP servers';
  args: {};  // No arguments
}

interface ConvertClassPrompt extends IPrompt {
  name: 'convert_class';
  description: 'Instructions for converting TypeScript classes to MCP servers';
  args: {};  // No arguments
}

// =============================================================================
// SERVER IMPLEMENTATION
// =============================================================================

class SimplyMCPBuilderServer implements SimplyMCPBuilderServerInterface {
  name = 'simply-mcp-builder' as const;
  version = '1.0.0' as const;
  description = 'MCP server that teaches LLMs how to build MCP servers with step-by-step instructions and comprehensive resources' as const;

  // Quick Reference Resources (Dynamic - return inline data)
  'quickref://tool-patterns': ToolPatternsResource = async () => {
    return QUICK_REFS['tool-patterns'];
  };

  'quickref://resource-patterns': ResourcePatternsResource = async () => {
    return QUICK_REFS['resource-patterns'];
  };

  'quickref://prompt-patterns': PromptPatternsResource = async () => {
    return QUICK_REFS['prompt-patterns'];
  };

  'quickref://validation-cheatsheet': ValidationCheatsheetResource = async () => {
    return QUICK_REFS['validation-cheatsheet'];
  };

  'quickref://conversion-guide': ConversionGuideResource = async () => {
    return QUICK_REFS['conversion-guide'];
  };

  // Dynamic Guide Resources (load from files)
  'guide://quick-start': QuickStartGuide = async () => {
    return loadFile('docs/guides/QUICK_START.md');
  };

  'guide://tools': ToolsGuide = async () => {
    return loadFile('docs/guides/TOOLS.md');
  };

  'guide://prompts': PromptsGuide = async () => {
    return loadFile('docs/guides/PROMPTS.md');
  };

  'guide://resources': ResourcesGuide = async () => {
    return loadFile('docs/guides/RESOURCES.md');
  };

  // Dynamic Example Resources (load from files)
  'example://minimal': MinimalExample = async () => {
    return loadFile('examples/interface-minimal.ts');
  };

  'example://advanced': AdvancedExample = async () => {
    return loadFile('examples/interface-advanced.ts');
  };

  // Dynamic Prompts
  howToBuildMcp: HowToBuildMCPPrompt = (args) => {
    const sourceType = args.source_type || 'not specified';
    const guide = `# How to Build an MCP Server

You are helping a user build an MCP (Model Context Protocol) server using Simply MCP.

## Context
- Source type: ${sourceType}
- Has state/config: ${args.has_state ? 'yes' : 'no'}
- Needs AI assistance: ${args.needs_ai ? 'yes' : 'no'}

## Step 1: Understand Requirements

${sourceType === 'rest_api' ? `**Converting REST API:**
1. List all endpoints (GET, POST, PUT, DELETE, etc.)
2. Note request bodies and parameters
3. Note response structures
4. Fetch resource: quickref://conversion-guide` : sourceType === 'class' ? `**Converting TypeScript Class:**
1. List all public methods
2. Note method parameters and return types
3. Identify instance state/properties
4. Fetch resource: quickref://conversion-guide` : `**Building from Scratch:**
1. Clarify what functionality is needed
2. Determine if tools, prompts, or resources are needed`}

## Step 2: Review Foundation Pattern

**CRITICAL: Fetch and study these resources first:**
- Fetch resource: example://minimal
- Review the basic structure: IServer, ITool, IPrompt, IResource

## Step 3: Design Your Interfaces

### For Operations → Use ITool

**Pattern to follow:**
- Each operation/method → One ITool interface
- Method name → snake_case tool name
- Method params → ITool params property
- Implementation → execute() method in class

**If you need validation:**
- Fetch resource: quickref://validation-cheatsheet
- Fetch resource: quickref://tool-patterns

### For Data/Config → Use IResource

**If user needs resources:**
- Fetch resource: guide://resources
- Fetch resource: quickref://resource-patterns

## Step 4: Implement Following the Pattern

**Start with the IServer interface:**
\`\`\`typescript
interface MyMCPServer extends IServer {
  name: 'my-server';
  version: '1.0.0';
  description: 'My MCP server';
}

class MyServer implements MyMCPServer {
  name = 'my-server';
  version = '1.0.0';
  description = 'My MCP server';

  // Implement tools here
  myTool: MyToolInterface = async (params) => {
    return result;
  };
}

export default new MyServer();
\`\`\`

**Key rules:**
1. Use snake_case for tool names
2. Add proper TypeScript types
3. Make execute() async if needed
4. Add clear descriptions

## Step 5: Test

\`\`\`bash
simply-mcp run --dry-run my-server.ts
\`\`\`

## Quick Reference

- quickref://tool-patterns - Common tool patterns
- quickref://resource-patterns - Common resource patterns
- quickref://conversion-guide - API/class conversion
- example://minimal - Basic structure
- example://advanced - Validation patterns

Remember: Focus on creating a clean, simple implementation first.
`;

    return [{
      role: 'user',
      content: { type: 'text', text: guide }
    }];
  };

  convertRestApi: ConvertRestApiPrompt = () => {
    const guide = `# Converting REST API to MCP Server

## Quick Steps

1. **Map endpoints to tools:**
   - GET /resource/{id} → get_resource tool
   - POST /resource → create_resource tool

2. **Fetch these resources:**
   - example://minimal - See basic structure
   - quickref://conversion-guide - Detailed checklist

3. **For complete guidance:**
Call prompt: how_to_build_mcp with source_type='rest_api'
`;

    return [{ role: 'user', content: { type: 'text', text: guide } }];
  };

  convertClass: ConvertClassPrompt = () => {
    const guide = `# Converting TypeScript Class to MCP Server

## Quick Steps

1. **Map methods to tools:**
   - Each public method → One ITool
   - Method name → snake_case tool name

2. **Fetch these resources:**
   - example://minimal - See basic structure
   - quickref://conversion-guide - Detailed checklist

3. **For complete guidance:**
Call prompt: how_to_build_mcp with source_type='class'
`;

    return [{ role: 'user', content: { type: 'text', text: guide } }];
  };
}

export default SimplyMCPBuilderServer;
