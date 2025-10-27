/**
 * Interface API - Sampling Foundation Example
 *
 * Demonstrates basic sampling (createMessage) protocol support in Simply-MCP.
 * This is a foundation layer example - minimal viable implementation.
 *
 * Sampling enables tools to request LLM completions from the MCP client.
 * This is useful for AI-assisted tools that need LLM reasoning or generation.
 *
 * Note: This example demonstrates the API structure. Actual sampling requires
 * a connected MCP client that supports the sampling capability.
 *
 * Usage:
 *   npm run build
 *   simply-mcp run examples/interface-sampling-foundation.ts
 *
 * Or programmatically:
 *   npx tsx examples/interface-sampling-foundation.ts
 */

import type { ITool, IServer, ISamplingMessage, ISamplingOptions } from '../src/index.js';

// ============================================================================
// TOOL USING SAMPLING
// ============================================================================

/**
 * Tool that uses sampling to generate code explanations
 * Demonstrates basic sampling usage in a tool
 */
interface ExplainCodeTool extends ITool {
  name: 'explain_code';
  description: 'Explain code using AI assistance';
  params: {
    /** Code snippet to explain */
    code: string;
    /** Programming language */
    language?: string;
  };
  result: {
    /** AI-generated explanation */
    explanation: string;
    /** Whether sampling was available */
    samplingUsed: boolean;
  };
}

/**
 * Tool that translates text using sampling
 * Demonstrates sampling with options
 */
interface TranslateTool extends ITool {
  name: 'translate_text';
  description: 'Translate text using AI';
  params: {
    /** Text to translate */
    text: string;
    /** Target language */
    targetLanguage: string;
  };
  result: {
    /** Translated text */
    translation: string;
    /** Whether sampling was available */
    samplingUsed: boolean;
  };
}

/**
 * Tool that generates creative content
 * Demonstrates multi-turn conversation with sampling
 */
interface GenerateStoryTool extends ITool {
  name: 'generate_story';
  description: 'Generate a story with AI';
  params: {
    /** Story theme or prompt */
    theme: string;
    /** Story length (short/medium/long) */
    length?: 'short' | 'medium' | 'long';
  };
  result: {
    /** Generated story */
    story: string;
    /** Whether sampling was available */
    samplingUsed: boolean;
  };
}

// ============================================================================
// SERVER INTERFACE
// ============================================================================

interface SamplingDemoServer extends IServer {
  name: 'sampling-demo';
  version: '1.0.0';
  description: 'Demonstrates sampling (createMessage) capability';
}

// ============================================================================
// SERVER IMPLEMENTATION
// ============================================================================

/**
 * Server implementation with sampling-enabled tools
 */
export default class SamplingDemo implements SamplingDemoServer {
  /**
   * Explain code tool - basic sampling usage
   */
  explainCode: ExplainCodeTool = async (params, context) => {
    // Check if sampling is available in the context
    if (!context?.sample) {
      return {
        explanation: 'Sampling capability not available. This tool requires an MCP client with sampling support.',
        samplingUsed: false,
      };
    }

    try {
      // Prepare messages for the LLM
      const messages: ISamplingMessage[] = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Explain this ${params.language || 'code'} code:\n\n${params.code}`,
          },
        },
      ];

      // Request sampling from the client
      const result = await context.sample(messages, {
        maxTokens: 500,
        temperature: 0.7,
      });

      // Extract the explanation from the result
      // Note: The exact structure depends on the MCP SDK version
      const explanation = result.content?.text || result.message?.content || 'No explanation received';

      return {
        explanation,
        samplingUsed: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        explanation: `Error during sampling: ${errorMessage}`,
        samplingUsed: false,
      };
    }
  };

  /**
   * Translate tool - sampling with custom options
   */
  translateText: TranslateTool = async (params, context) => {
    // Check if sampling is available
    if (!context?.sample) {
      return {
        translation: 'Sampling capability not available.',
        samplingUsed: false,
      };
    }

    try {
      // Prepare translation request
      const messages: ISamplingMessage[] = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Translate the following text to ${params.targetLanguage}:\n\n${params.text}`,
          },
        },
      ];

      // Use sampling with specific options for translation
      const options: ISamplingOptions = {
        maxTokens: 1000,
        temperature: 0.3, // Lower temperature for more deterministic translations
        topP: 0.9,
      };

      const result = await context.sample(messages, options);

      const translation = result.content?.text || result.message?.content || 'Translation failed';

      return {
        translation,
        samplingUsed: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        translation: `Error: ${errorMessage}`,
        samplingUsed: false,
      };
    }
  };

  /**
   * Generate story tool - multi-turn conversation
   */
  generateStory: GenerateStoryTool = async (params, context) => {
    // Check if sampling is available
    if (!context?.sample) {
      return {
        story: 'Sampling capability not available.',
        samplingUsed: false,
      };
    }

    try {
      // Determine max tokens based on length
      const maxTokens = params.length === 'long' ? 2000 : params.length === 'medium' ? 1000 : 500;

      // Multi-turn conversation example
      // First request: Generate story outline
      const outlineMessages: ISamplingMessage[] = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a brief outline for a ${params.length || 'short'} story about: ${params.theme}`,
          },
        },
      ];

      const outlineResult = await context.sample(outlineMessages, {
        maxTokens: 200,
        temperature: 0.8,
      });

      const outline = outlineResult.content?.text || outlineResult.message?.content || '';

      // Second request: Expand outline into full story
      const storyMessages: ISamplingMessage[] = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a brief outline for a ${params.length || 'short'} story about: ${params.theme}`,
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: outline,
          },
        },
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Now write the full story based on this outline.',
          },
        },
      ];

      const storyResult = await context.sample(storyMessages, {
        maxTokens,
        temperature: 0.9, // Higher temperature for more creative output
      });

      const story = storyResult.content?.text || storyResult.message?.content || 'Story generation failed';

      return {
        story,
        samplingUsed: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        story: `Error: ${errorMessage}`,
        samplingUsed: false,
      };
    }
  };
}

// ============================================================================
// MANUAL TEST (when running directly)
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Sampling Foundation Example');
  console.log('============================\n');

  console.log('This example demonstrates the Sampling (createMessage) API.');
  console.log('To test it properly, run it with an MCP client that supports sampling:\n');
  console.log('  simply-mcp run examples/interface-sampling-foundation.ts\n');

  console.log('Available tools:');
  console.log('  1. explain_code - Explain code using AI');
  console.log('  2. translate_text - Translate text using AI');
  console.log('  3. generate_story - Generate creative stories\n');

  console.log('Example usage (via MCP client):');
  console.log('  explainCode({ code: "const x = 42;", language: "JavaScript" })');
  console.log('  translateText({ text: "Hello world", targetLanguage: "Spanish" })');
  console.log('  generateStory({ theme: "space adventure", length: "short" })\n');

  console.log('Note: Sampling requires a connected MCP client with sampling capability.');
  console.log('The tools will gracefully degrade if sampling is not available.\n');
}
