/**
 * Hello World Skill Test Server
 *
 * Demonstrates MCP-native skills with Anthropic parity:
 * 1. Manual skill with explicit skill content (like SKILL.md)
 * 2. Auto-generated skill from component arrays
 * 3. Intelligence-based model selection (0-9 scale)
 * 4. Flat structure: tools, resources, prompts (not nested components)
 *
 * @example Usage with Claude CLI
 * ```bash
 * # List resources (skills are resources)
 * claude --print --model haiku --mcp-config config.json "List all available resources"
 *
 * # Read greeting skill (manual content)
 * claude --print --model haiku --mcp-config config.json "Read the skill://greeting resource"
 *
 * # Read quick_math skill (auto-generated from tools array)
 * claude --print --model haiku --mcp-config config.json "Read the skill://quick_math resource"
 *
 * # Call say_hello tool (referenced in greeting skill)
 * claude --print --model haiku --mcp-config config.json "Call the say_hello tool with name 'Alice'"
 *
 * # Call add tool (referenced in quick_math skill)
 * claude --print --model haiku --mcp-config config.json "Call the add tool with a=10 and b=32"
 * ```
 */

import {
  ITool,
  ISkill,
  ToolHelper,
  SkillHelper,
} from '../src/index.js';

// ============================================
// MANUAL SKILL: Greeting
// ============================================
interface GreetingSkill extends ISkill {
  name: 'greeting';
  description: 'Greet users with friendly, personalized messages';
  skill: string;
  sampling: {
    intelligencePriority: 2;  // Haiku - simple task
    temperature: 0.7;
    maxTokens: 200;
  };
}

// ============================================
// AUTO-GENERATED SKILL: Quick Math
// ============================================
interface QuickMathSkill extends ISkill {
  name: 'quick_math';
  description: 'Perform quick mathematical calculations';
  tools: ['add', 'multiply'];  // Flat array - auto-generates skill documentation
  sampling: {
    intelligencePriority: 1;  // Haiku - very fast
    speedPriority: 1.0;
    maxTokens: 100;
  };
}

// ============================================
// TOOLS
// ============================================
interface SayHelloTool extends ITool {
  name: 'say_hello';
  description: 'Generate a personalized greeting message';
  params: {
    name: { type: 'string'; description: 'Name to greet' };
    style?: { type: 'string'; description: 'Greeting style: friendly, enthusiastic, formal, casual' };
  };
  result: string;
}

interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers together';
  params: {
    a: { type: 'number'; description: 'First number' };
    b: { type: 'number'; description: 'Second number' };
  };
  result: string;
}

interface MultiplyTool extends ITool {
  name: 'multiply';
  description: 'Multiply two numbers';
  params: {
    a: { type: 'number'; description: 'First number' };
    b: { type: 'number'; description: 'Second number' };
  };
  result: string;
}

// ============================================
// SERVER IMPLEMENTATION
// ============================================
export default class HelloWorldSkillServer {
  name = 'hello-world-skill-server';
  version = '1.0.0';

  // Tool: Say Hello
  sayHello: ToolHelper<SayHelloTool> = async ({ name, style = 'friendly' }) => {
    const greetings: Record<string, string> = {
      friendly: `Hello, ${name}! Welcome!`,
      enthusiastic: `Hello, ${name}! Welcome! We're so glad you're here!`,
      formal: `Good day, ${name}. Welcome to our service.`,
      casual: `Hey ${name}! What's up?`,
    };

    return greetings[style] || greetings.friendly;
  };

  // Tool: Add
  add: ToolHelper<AddTool> = async ({ a, b }) => {
    return `${a} + ${b} = ${a + b}`;
  };

  // Tool: Multiply
  multiply: ToolHelper<MultiplyTool> = async ({ a, b }) => {
    return `${a} × ${b} = ${a * b}`;
  };

  // Skill: Greeting (Manual content)
  greeting: SkillHelper<GreetingSkill> = async () => {
    return `# Greeting Skill

## Purpose
Generate friendly, personalized greeting messages.

## Usage
Use this skill when you need to:
- Welcome a user
- Say hello in a friendly way
- Create a warm introduction

## Available Tools
This skill provides access to the following tools:
- **say_hello**: Generate a personalized greeting message

## Examples

### Simple greeting
\`\`\`typescript
await say_hello({ name: "Alice" });
// Result: "Hello, Alice! Welcome!"
\`\`\`

### Enthusiastic greeting
\`\`\`typescript
await say_hello({ name: "Bob", style: "enthusiastic" });
// Result: "Hello, Bob! Welcome! We're so glad you're here!"
\`\`\`

## Model Settings
- **Intelligence**: Haiku (fast, simple task)
- **Temperature**: 0.7 (slightly creative)
- **Max Tokens**: 200
`;
  };

  // Skill: Quick Math (Auto-generated from tools array)
  quickMath: SkillHelper<QuickMathSkill> = async () => {
    // Empty - content will be auto-generated from tools array
    return '';
  };
}
