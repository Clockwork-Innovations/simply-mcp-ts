#!/usr/bin/env node
/**
 * Simply-MCP Sampling Demo
 *
 * This example demonstrates LLM sampling (completion requests) with different context modes:
 * 1. Fresh Context - Start new conversations without conversation history
 * 2. Current Context - Include conversation history from this server
 * 3. System Prompts - Customize LLM behavior
 * 4. Model Preferences - Request specific models or priorities
 *
 * Key Concepts:
 * - includeContext: 'thisServer' - Uses current conversation context
 * - includeContext: omitted - Starts fresh conversation
 * - systemPrompt - Sets LLM role and behavior
 * - modelPreferences - Requests specific model characteristics
 *
 * Usage:
 *   npx simply-mcp run examples/sampling-demo.ts
 *
 * Note: Sampling requires a client that supports the MCP sampling capability
 *       (e.g., Claude Desktop, MCP Inspector)
 */

import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'sampling-demo-server',
  version: '1.0.0',
  description: 'Demonstrates LLM sampling with different context modes',
  instructions: 'This server shows how to request LLM completions with and without conversation context.',
});

/**
 * Tool 1: Fresh Analysis (New Context)
 *
 * Uses sampling WITHOUT includeContext to get independent analysis.
 * The LLM won't see previous conversation history.
 *
 * Use cases:
 * - Independent analysis without bias from conversation
 * - Fresh perspective on a topic
 * - One-off completions
 */
server.addTool({
  name: 'fresh_analysis',
  description: 'Analyze text with fresh context (no conversation history)',
  parameters: z.object({
    text: z.string().describe('Text to analyze'),
    analysis_type: z.enum(['sentiment', 'summary', 'key_points']).describe('Type of analysis'),
  }),
  execute: async (args, context) => {
    // Check if sampling is available
    if (!context?.session.create_message) {
      return 'Sampling not available. This tool requires a client that supports LLM sampling.';
    }

    // Build prompt based on analysis type
    const prompts = {
      sentiment: 'Analyze the sentiment of this text. Respond with POSITIVE, NEGATIVE, or NEUTRAL and a brief explanation.',
      summary: 'Summarize this text in 2-3 sentences.',
      key_points: 'Extract the key points from this text as a bulleted list.',
    };

    try {
      // Request LLM completion WITHOUT includeContext
      // This creates a fresh conversation independent of any previous context
      const result = await context.session.create_message(
        [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `${prompts[args.analysis_type]}\n\nText: ${args.text}`,
            },
          },
        ],
        {
          maxTokens: 500,
          temperature: 0.3, // Low temperature for consistent analysis
          // NOTE: includeContext is NOT specified - this is a fresh conversation
        }
      );

      return {
        content: [
          {
            type: 'text',
            text: `Fresh Analysis (${args.analysis_type}):\n\n${result.content.text}\n\n` +
                  `[Context Mode: Fresh - No conversation history included]\n` +
                  `[Model: ${result.model || 'unknown'}]`,
          },
        ],
      };
    } catch (error) {
      return `Error during fresh analysis: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

/**
 * Tool 2: Context-Aware Response (Current Context)
 *
 * Uses sampling WITH includeContext: 'thisServer' to leverage conversation history.
 * The LLM can reference previous messages and maintain context.
 *
 * Use cases:
 * - Follow-up questions
 * - Conversation continuity
 * - Reference previous topics
 */
server.addTool({
  name: 'context_aware_response',
  description: 'Generate response using current conversation context',
  parameters: z.object({
    question: z.string().describe('Question or prompt'),
  }),
  execute: async (args, context) => {
    if (!context?.session.create_message) {
      return 'Sampling not available. This tool requires a client that supports LLM sampling.';
    }

    try {
      // Request LLM completion WITH includeContext
      // This allows the LLM to see and reference the current conversation
      const result = await context.session.create_message(
        [
          {
            role: 'user',
            content: {
              type: 'text',
              text: args.question,
            },
          },
        ],
        {
          maxTokens: 1000,
          temperature: 0.7,
          // Include conversation context from this server
          includeContext: 'thisServer',
        }
      );

      return {
        content: [
          {
            type: 'text',
            text: `Context-Aware Response:\n\n${result.content.text}\n\n` +
                  `[Context Mode: Current conversation included]\n` +
                  `[Model: ${result.model || 'unknown'}]\n` +
                  `[Stop Reason: ${result.stopReason || 'unknown'}]`,
          },
        ],
      };
    } catch (error) {
      return `Error during context-aware response: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

/**
 * Tool 3: Custom System Prompt
 *
 * Demonstrates using systemPrompt to customize LLM behavior.
 * System prompts set the role and personality of the LLM.
 */
server.addTool({
  name: 'custom_system_prompt',
  description: 'Generate response with custom system prompt',
  parameters: z.object({
    prompt: z.string().describe('User prompt'),
    persona: z.enum(['concise', 'detailed', 'technical', 'creative']).describe('LLM persona'),
  }),
  execute: async (args, context) => {
    if (!context?.session.create_message) {
      return 'Sampling not available. This tool requires a client that supports LLM sampling.';
    }

    // Define system prompts for different personas
    const systemPrompts = {
      concise: 'You are a concise assistant. Always respond in 1-2 sentences maximum. Be direct and to the point.',
      detailed: 'You are a detailed assistant. Provide comprehensive, thorough explanations with examples and context.',
      technical: 'You are a technical expert. Use precise terminology, include implementation details, and cite best practices.',
      creative: 'You are a creative assistant. Use vivid language, metaphors, and engaging storytelling in your responses.',
    };

    try {
      const result = await context.session.create_message(
        [
          {
            role: 'user',
            content: {
              type: 'text',
              text: args.prompt,
            },
          },
        ],
        {
          systemPrompt: systemPrompts[args.persona],
          maxTokens: 800,
          temperature: args.persona === 'creative' ? 0.9 : 0.5,
        }
      );

      return {
        content: [
          {
            type: 'text',
            text: `Response (${args.persona} persona):\n\n${result.content.text}\n\n` +
                  `[System Prompt: "${systemPrompts[args.persona]}"]\n` +
                  `[Model: ${result.model || 'unknown'}]`,
          },
        ],
      };
    } catch (error) {
      return `Error with custom system prompt: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

/**
 * Tool 4: Model Preferences
 *
 * Demonstrates requesting specific models or optimization priorities.
 * Note: Client controls final model selection, these are hints/preferences.
 */
server.addTool({
  name: 'model_preferences_demo',
  description: 'Request completion with model preferences',
  parameters: z.object({
    prompt: z.string().describe('Prompt for LLM'),
    priority: z.enum(['cost', 'speed', 'intelligence']).describe('Optimization priority'),
  }),
  execute: async (args, context) => {
    if (!context?.session.create_message) {
      return 'Sampling not available. This tool requires a client that supports LLM sampling.';
    }

    // Configure model preferences based on priority
    const preferences = {
      cost: {
        costPriority: 1.0,
        speedPriority: 0.5,
        intelligencePriority: 0.3,
      },
      speed: {
        costPriority: 0.3,
        speedPriority: 1.0,
        intelligencePriority: 0.5,
      },
      intelligence: {
        costPriority: 0.3,
        speedPriority: 0.5,
        intelligencePriority: 1.0,
        hints: [{ name: 'claude-3-5-sonnet' }],
      },
    };

    try {
      const result = await context.session.create_message(
        [
          {
            role: 'user',
            content: {
              type: 'text',
              text: args.prompt,
            },
          },
        ],
        {
          modelPreferences: preferences[args.priority],
          maxTokens: 500,
          temperature: 0.7,
        }
      );

      return {
        content: [
          {
            type: 'text',
            text: `Response (${args.priority} priority):\n\n${result.content.text}\n\n` +
                  `[Model Preferences: ${JSON.stringify(preferences[args.priority])}]\n` +
                  `[Actual Model Used: ${result.model || 'unknown'}]`,
          },
        ],
      };
    } catch (error) {
      return `Error with model preferences: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

/**
 * Tool 5: Compare Context Modes
 *
 * Demonstrates the difference between fresh and context-aware sampling
 * by calling both modes with the same prompt.
 */
server.addTool({
  name: 'compare_context_modes',
  description: 'Compare fresh vs context-aware responses side-by-side',
  parameters: z.object({
    prompt: z.string().describe('Prompt to test with both modes'),
  }),
  execute: async (args, context) => {
    if (!context?.session.create_message) {
      return 'Sampling not available. This tool requires a client that supports LLM sampling.';
    }

    try {
      // Get fresh response (no context)
      const freshResult = await context.session.create_message(
        [
          {
            role: 'user',
            content: {
              type: 'text',
              text: args.prompt,
            },
          },
        ],
        {
          maxTokens: 500,
          temperature: 0.7,
          // No includeContext - fresh conversation
        }
      );

      // Get context-aware response
      const contextResult = await context.session.create_message(
        [
          {
            role: 'user',
            content: {
              type: 'text',
              text: args.prompt,
            },
          },
        ],
        {
          maxTokens: 500,
          temperature: 0.7,
          includeContext: 'thisServer', // Include conversation context
        }
      );

      return {
        content: [
          {
            type: 'text',
            text:
              `=== COMPARISON: Fresh vs Context-Aware ===\n\n` +
              `Prompt: "${args.prompt}"\n\n` +
              `--- FRESH CONTEXT (No history) ---\n${freshResult.content.text}\n\n` +
              `--- CONTEXT-AWARE (With history) ---\n${contextResult.content.text}\n\n` +
              `--- Analysis ---\n` +
              `Fresh Model: ${freshResult.model || 'unknown'}\n` +
              `Context Model: ${contextResult.model || 'unknown'}\n\n` +
              `Notice: The context-aware response may reference previous conversation, ` +
              `while the fresh response treats this as an independent query.`,
          },
        ],
      };
    } catch (error) {
      return `Error during comparison: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

/**
 * Tool 6: Multi-Turn Conversation
 *
 * Demonstrates building a multi-turn conversation by including
 * message history in the sampling request.
 */
server.addTool({
  name: 'multi_turn_conversation',
  description: 'Simulate multi-turn conversation with message history',
  parameters: z.object({
    history: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      message: z.string(),
    })).describe('Conversation history'),
    new_message: z.string().describe('New user message'),
  }),
  execute: async (args, context) => {
    if (!context?.session.create_message) {
      return 'Sampling not available. This tool requires a client that supports LLM sampling.';
    }

    try {
      // Build messages array from history
      const messages = [
        ...args.history.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: {
            type: 'text' as const,
            text: msg.message,
          },
        })),
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: args.new_message,
          },
        },
      ];

      const result = await context.session.create_message(messages, {
        maxTokens: 800,
        temperature: 0.7,
      });

      return {
        content: [
          {
            type: 'text',
            text:
              `Multi-Turn Conversation:\n\n` +
              `${args.history.map(msg => `${msg.role.toUpperCase()}: ${msg.message}`).join('\n')}\n` +
              `USER: ${args.new_message}\n` +
              `ASSISTANT: ${result.content.text}\n\n` +
              `[History length: ${args.history.length} messages]\n` +
              `[Model: ${result.model || 'unknown'}]`,
          },
        ],
      };
    } catch (error) {
      return `Error in multi-turn conversation: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

// Add a resource explaining sampling concepts
server.addResource({
  uri: 'doc://sampling-guide',
  name: 'Sampling Guide',
  description: 'Guide to using LLM sampling in Simply-MCP',
  mimeType: 'text/markdown',
  content: `# LLM Sampling Guide

## Overview

Sampling allows MCP servers to request LLM completions from connected clients.
This enables AI-assisted tools without requiring server-side API keys.

## Context Modes

### Fresh Context (No \`includeContext\`)

\`\`\`typescript
const result = await context.session.create_message(messages, {
  maxTokens: 500,
  // No includeContext - fresh conversation
});
\`\`\`

**When to use:**
- Independent analysis
- One-off completions
- When conversation history might bias results

### Current Context (\`includeContext: 'thisServer'\`)

\`\`\`typescript
const result = await context.session.create_message(messages, {
  maxTokens: 500,
  includeContext: 'thisServer', // Include conversation history
});
\`\`\`

**When to use:**
- Follow-up questions
- Maintaining conversation continuity
- When LLM should reference previous discussion

## System Prompts

Customize LLM behavior with system prompts:

\`\`\`typescript
const result = await context.session.create_message(messages, {
  systemPrompt: 'You are a helpful coding assistant. Be concise and accurate.',
  maxTokens: 800,
});
\`\`\`

## Model Preferences

Request specific models or optimization priorities:

\`\`\`typescript
const result = await context.session.create_message(messages, {
  modelPreferences: {
    hints: [{ name: 'claude-3-5-sonnet' }],
    intelligencePriority: 1.0,
  },
});
\`\`\`

## Best Practices

1. **Always check availability**: Verify \`context.session.create_message\` exists
2. **Handle errors**: Sampling can fail if client doesn't support it
3. **Set appropriate temperatures**:
   - 0.0-0.3: Deterministic (classification, extraction)
   - 0.4-0.7: Balanced (summarization, Q&A)
   - 0.8-2.0: Creative (brainstorming, writing)
4. **Use reasonable token limits**: Balance completeness with cost
5. **Consider context**: Fresh for independence, current for continuity

## Example Use Cases

- **Text Analysis**: Sentiment, classification, extraction
- **Summarization**: Document summaries, key points
- **Code Tools**: Generation, review, explanation
- **Agentic Workflows**: Multi-step reasoning, planning
`,
});

// Start the server
(async () => {
  try {
    await server.start({
      transport: 'stdio',
    });

    const info = server.getInfo();
    const stats = server.getStats();

    console.error(`[SamplingDemo] Server "${info.name}" v${info.version} started`);
    console.error(`[SamplingDemo] Tools: ${stats.tools}, Resources: ${stats.resources}`);
    console.error(`[SamplingDemo] Ready to demonstrate sampling with context modes`);
    console.error(`\n[SamplingDemo] Available Tools:`);
    console.error(`  - fresh_analysis: Independent analysis without conversation context`);
    console.error(`  - context_aware_response: Response including conversation history`);
    console.error(`  - custom_system_prompt: Customize LLM behavior with system prompts`);
    console.error(`  - model_preferences_demo: Request specific model characteristics`);
    console.error(`  - compare_context_modes: Side-by-side comparison of context modes`);
    console.error(`  - multi_turn_conversation: Multi-turn conversation with history`);
  } catch (error) {
    console.error('[SamplingDemo] Failed to start server:', error);
    process.exit(1);
  }
})();
