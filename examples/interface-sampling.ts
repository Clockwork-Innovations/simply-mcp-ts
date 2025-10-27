/**
 * Interface-Driven API - Sampling (LLM Completion) Example
 *
 * Demonstrates:
 * - LLM completion requests with createMessage/ISampling
 * - Multi-turn conversation flows
 * - Context management patterns
 * - Production-ready error handling
 * - Real-world use cases: code explanation, translation, content generation
 *
 * The sampling capability enables tools to request LLM completions from the MCP client.
 * This is useful for AI-assisted tools that need LLM reasoning or generation during
 * tool execution.
 *
 * Usage:
 *   npx simply-mcp run examples/interface-sampling.ts
 *
 * Test with HTTP mode:
 *   # Start server
 *   npx simply-mcp run examples/interface-sampling.ts --transport http --port 3000
 *
 *   # Initialize session
 *   curl -H "Content-Type: application/json" \
 *     http://localhost:3000/mcp \
 *     -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{"sampling":{}},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}'
 *
 *   # List tools
 *   curl -H "Content-Type: application/json" \
 *     http://localhost:3000/mcp \
 *     -d '{"jsonrpc":"2.0","method":"tools/list","id":2}'
 *
 *   # Call explain_code tool
 *   curl -H "Content-Type: application/json" \
 *     http://localhost:3000/mcp \
 *     -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"explain_code","arguments":{"code":"const x = 42;","language":"TypeScript"}},"id":3}'
 *
 * Note: Sampling requires a connected MCP client that supports the sampling capability.
 * The tools gracefully degrade if sampling is not available.
 */

import type { ITool, IPrompt, IResource, IServer, ISamplingMessage, ISamplingOptions } from 'simply-mcp';

// ============================================================================
// TOOL INTERFACES
// ============================================================================

/**
 * Explain code using AI assistance
 *
 * Uses sampling to request LLM analysis of code snippets.
 * Demonstrates basic sampling with error handling.
 */
interface ExplainCodeTool extends ITool {
  name: 'explain_code';
  description: 'Explain code using AI assistance with detailed analysis';
  params: {
    /** Code snippet to explain */
    code: string;
    /** Programming language for context */
    language?: string;
    /** Detail level: basic (brief), detailed (comprehensive), expert (advanced) */
    detailLevel?: 'basic' | 'detailed' | 'expert';
  };
  result: {
    /** AI-generated explanation */
    explanation: string;
    /** Suggested improvements (if any) */
    improvements?: string[];
    /** Whether sampling was available */
    samplingUsed: boolean;
  };
}

/**
 * Translate text using AI
 *
 * Demonstrates sampling with custom options for temperature control.
 * Lower temperature produces more deterministic translations.
 */
interface TranslateTextTool extends ITool {
  name: 'translate_text';
  description: 'Translate text between languages using AI';
  params: {
    /** Text to translate */
    text: string;
    /** Source language (auto-detect if not specified) */
    sourceLanguage?: string;
    /** Target language */
    targetLanguage: string;
    /** Formality level */
    formality?: 'casual' | 'neutral' | 'formal';
  };
  result: {
    /** Translated text */
    translation: string;
    /** Detected source language (if auto-detected) */
    detectedLanguage?: string;
    /** Confidence score (0-1) */
    confidence?: number;
    /** Whether sampling was available */
    samplingUsed: boolean;
  };
}

/**
 * Generate creative content with AI
 *
 * Demonstrates multi-turn conversation using sampling.
 * First generates an outline, then expands it into full content.
 */
interface GenerateContentTool extends ITool {
  name: 'generate_content';
  description: 'Generate creative content using multi-turn AI conversation';
  params: {
    /** Content theme or prompt */
    theme: string;
    /** Content type */
    contentType?: 'story' | 'article' | 'poem' | 'script';
    /** Length (short: 250 words, medium: 500 words, long: 1000+ words) */
    length?: 'short' | 'medium' | 'long';
    /** Writing style */
    style?: 'creative' | 'professional' | 'conversational' | 'academic';
  };
  result: {
    /** Generated content */
    content: string;
    /** Content outline (first turn result) */
    outline: string;
    /** Word count */
    wordCount: number;
    /** Whether sampling was available */
    samplingUsed: boolean;
  };
}

/**
 * Analyze sentiment of text using AI
 *
 * Demonstrates requesting structured output from sampling.
 */
interface AnalyzeSentimentTool extends ITool {
  name: 'analyze_sentiment';
  description: 'Analyze sentiment and tone of text using AI';
  params: {
    /** Text to analyze */
    text: string;
    /** Include detailed analysis */
    detailed?: boolean;
  };
  result: {
    /** Overall sentiment: positive, negative, neutral, mixed */
    sentiment: string;
    /** Confidence score (0-1) */
    confidence: number;
    /** Key emotions detected */
    emotions: string[];
    /** Detailed analysis (if requested) */
    analysis?: string;
    /** Whether sampling was available */
    samplingUsed: boolean;
  };
}

/**
 * Refactor code with AI suggestions
 *
 * Demonstrates context-aware sampling for code improvements.
 */
interface RefactorCodeTool extends ITool {
  name: 'refactor_code';
  description: 'Get AI-powered code refactoring suggestions';
  params: {
    /** Code to refactor */
    code: string;
    /** Programming language */
    language: string;
    /** Focus areas */
    focus?: Array<'readability' | 'performance' | 'maintainability' | 'security'>;
  };
  result: {
    /** Refactored code */
    refactoredCode: string;
    /** Explanation of changes */
    changes: string;
    /** Benefits of refactoring */
    benefits: string[];
    /** Whether sampling was available */
    samplingUsed: boolean;
  };
}

// ============================================================================
// PROMPT INTERFACES
// ============================================================================

/**
 * Generate code review prompt
 *
 * Static prompt for code reviews with AI.
 */
interface CodeReviewPrompt extends IPrompt {
  name: 'code_review';
  description: 'Generate code review prompt for AI analysis';
  args: {
    /** Code to review */
    code: string;
    /** Language context */
    language: string;
    /** Review depth */
    depth: 'quick' | 'thorough' | 'comprehensive';
  };
  template: `You are an expert code reviewer. Review the following {language} code with a {depth} analysis:

\`\`\`{language}
{code}
\`\`\`

Provide feedback on:
1. Code quality and style
2. Potential bugs or issues
3. Performance considerations
4. Security concerns
5. Best practices and improvements

Be constructive and specific in your feedback.`;
}

/**
 * Translation context prompt
 *
 * Provides context for high-quality translations.
 */
interface TranslationContextPrompt extends IPrompt {
  name: 'translation_context';
  description: 'Generate translation prompt with cultural context';
  args: {
    /** Text to translate */
    text: string;
    /** Target language */
    targetLanguage: string;
    /** Formality level */
    formality: string;
  };
  template: `Translate the following text to {targetLanguage} with {formality} formality:

"{text}"

Preserve the original tone and meaning. Consider cultural context and idioms. Provide a natural-sounding translation that a native speaker would use.`;
}

// ============================================================================
// RESOURCE INTERFACES
// ============================================================================

/**
 * Server capabilities resource
 *
 * Static resource documenting sampling features.
 */
interface CapabilitiesResource extends IResource {
  uri: 'config://capabilities';
  name: 'Server Capabilities';
  description: 'Sampling features and configuration';
  mimeType: 'application/json';
  data: {
    sampling: {
      enabled: boolean;
      supportedModels: string[];
      maxTokens: number;
      features: string[];
    };
    tools: string[];
    version: string;
  };
}

/**
 * Usage statistics resource
 *
 * Dynamic resource showing real-time sampling statistics.
 */
interface UsageStatsResource extends IResource {
  uri: 'stats://usage';
  name: 'Usage Statistics';
  description: 'Real-time sampling usage statistics';
  mimeType: 'application/json';
  dynamic: true;
  data: {
    totalSamplingCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageTokens: number;
    lastCallTime: string;
  };
}

/**
 * API documentation resource
 *
 * Static markdown documentation.
 */
interface ApiDocsResource extends IResource {
  uri: 'docs://api';
  name: 'API Documentation';
  description: 'Sampling API usage guide';
  mimeType: 'text/markdown';
  data: `# Sampling API Documentation

## Overview

This server provides AI-assisted tools using the MCP sampling capability.
All tools gracefully degrade if sampling is not available.

## Available Tools

### 1. explain_code
Explain code snippets with AI assistance.

**Parameters:**
- \`code\` (required): Code snippet to explain
- \`language\` (optional): Programming language
- \`detailLevel\` (optional): basic | detailed | expert

**Example:**
\`\`\`json
{
  "code": "const x = 42;",
  "language": "TypeScript",
  "detailLevel": "detailed"
}
\`\`\`

### 2. translate_text
Translate text between languages.

**Parameters:**
- \`text\` (required): Text to translate
- \`targetLanguage\` (required): Target language
- \`sourceLanguage\` (optional): Source language (auto-detect)
- \`formality\` (optional): casual | neutral | formal

### 3. generate_content
Generate creative content with multi-turn conversation.

**Parameters:**
- \`theme\` (required): Content theme or prompt
- \`contentType\` (optional): story | article | poem | script
- \`length\` (optional): short | medium | long
- \`style\` (optional): creative | professional | conversational | academic

### 4. analyze_sentiment
Analyze sentiment and tone of text.

**Parameters:**
- \`text\` (required): Text to analyze
- \`detailed\` (optional): Include detailed analysis

### 5. refactor_code
Get AI-powered code refactoring suggestions.

**Parameters:**
- \`code\` (required): Code to refactor
- \`language\` (required): Programming language
- \`focus\` (optional): Array of focus areas

## Requirements

- MCP client with sampling capability
- Client must include \`sampling: {}\` in initialize capabilities

## Error Handling

All tools check for sampling availability and return graceful errors if unavailable.
`;
}

// ============================================================================
// SERVER INTERFACE
// ============================================================================

interface SamplingDemoServer extends IServer {
  name: 'sampling-demo';
  version: '1.0.0';
  description: 'Production-ready sampling (LLM completion) demonstration';
}

// ============================================================================
// SERVER IMPLEMENTATION
// ============================================================================

/**
 * Sampling Demo Server Implementation
 *
 * All tools check for sampling availability and provide graceful degradation.
 * Demonstrates production-ready error handling and context management.
 */
export default class SamplingDemo implements SamplingDemoServer {
  // Track usage statistics
  private totalSamplingCalls = 0;
  private successfulCalls = 0;
  private failedCalls = 0;
  private totalTokensUsed = 0;
  private lastCallTime = new Date().toISOString();

  // ========================================================================
  // TOOL IMPLEMENTATIONS
  // ========================================================================

  /**
   * Explain code with AI assistance
   */
  explainCode: ExplainCodeTool = async (params, context) => {
    // Check if sampling is available
    if (!context?.sample) {
      return {
        explanation: 'Sampling capability not available. This tool requires an MCP client with sampling support.',
        samplingUsed: false,
      };
    }

    try {
      this.totalSamplingCalls++;
      this.lastCallTime = new Date().toISOString();

      // Determine prompt based on detail level
      const detailLevel = params.detailLevel || 'detailed';
      const promptMap = {
        basic: 'Provide a brief, clear explanation of what this code does.',
        detailed: 'Provide a detailed explanation of this code, including what it does, how it works, and any important concepts.',
        expert: 'Provide an expert-level analysis of this code, including design patterns, performance considerations, edge cases, and potential improvements.',
      };

      const prompt = promptMap[detailLevel];
      const language = params.language || 'code';

      // Prepare sampling messages
      const messages: ISamplingMessage[] = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `${prompt}\n\nLanguage: ${language}\n\nCode:\n\`\`\`${language}\n${params.code}\n\`\`\``,
          },
        },
      ];

      // Sampling options
      const options: ISamplingOptions = {
        maxTokens: detailLevel === 'expert' ? 1000 : detailLevel === 'detailed' ? 500 : 250,
        temperature: 0.7,
      };

      // Request sampling
      const result = await context.sample(messages, options);

      // Extract explanation from result
      const explanation = result.content?.text || result.message?.content || 'No explanation received';

      this.successfulCalls++;
      this.totalTokensUsed += options.maxTokens || 500;

      // Parse improvements if in expert mode
      let improvements: string[] | undefined;
      if (detailLevel === 'expert' && explanation.includes('improvement')) {
        improvements = ['Consider the suggestions in the explanation above'];
      }

      return {
        explanation,
        improvements,
        samplingUsed: true,
      };
    } catch (error) {
      this.failedCalls++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        explanation: `Error during sampling: ${errorMessage}`,
        samplingUsed: false,
      };
    }
  };

  /**
   * Translate text using AI
   */
  translateText: TranslateTextTool = async (params, context) => {
    // Check if sampling is available
    if (!context?.sample) {
      return {
        translation: 'Sampling capability not available.',
        samplingUsed: false,
      };
    }

    try {
      this.totalSamplingCalls++;
      this.lastCallTime = new Date().toISOString();

      // Build translation prompt
      const sourceInfo = params.sourceLanguage ? ` from ${params.sourceLanguage}` : '';
      const formalityNote = params.formality ? ` Use ${params.formality} language.` : '';

      const messages: ISamplingMessage[] = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Translate the following text${sourceInfo} to ${params.targetLanguage}.${formalityNote}\n\nText: "${params.text}"\n\nProvide only the translation, without explanations.`,
          },
        },
      ];

      // Use lower temperature for more deterministic translations
      const options: ISamplingOptions = {
        maxTokens: Math.max(500, params.text.length * 2),
        temperature: 0.3,
        topP: 0.9,
      };

      const result = await context.sample(messages, options);
      const translation = result.content?.text || result.message?.content || 'Translation failed';

      this.successfulCalls++;
      this.totalTokensUsed += options.maxTokens || 500;

      return {
        translation: translation.trim(),
        detectedLanguage: params.sourceLanguage,
        confidence: 0.95,
        samplingUsed: true,
      };
    } catch (error) {
      this.failedCalls++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        translation: `Error: ${errorMessage}`,
        samplingUsed: false,
      };
    }
  };

  /**
   * Generate creative content with multi-turn conversation
   */
  generateContent: GenerateContentTool = async (params, context) => {
    // Check if sampling is available
    if (!context?.sample) {
      return {
        content: 'Sampling capability not available.',
        outline: '',
        wordCount: 0,
        samplingUsed: false,
      };
    }

    try {
      this.totalSamplingCalls += 2; // Two sampling calls
      this.lastCallTime = new Date().toISOString();

      // Determine parameters
      const contentType = params.contentType || 'article';
      const length = params.length || 'medium';
      const style = params.style || 'professional';

      const wordCountMap = { short: 250, medium: 500, long: 1000 };
      const targetWords = wordCountMap[length];

      // First turn: Generate outline
      const outlineMessages: ISamplingMessage[] = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a detailed outline for a ${length} ${contentType} about: ${params.theme}\n\nThe ${contentType} should be in a ${style} style and approximately ${targetWords} words. Provide a structured outline with main points.`,
          },
        },
      ];

      const outlineResult = await context.sample(outlineMessages, {
        maxTokens: 300,
        temperature: 0.8,
      });

      const outline = outlineResult.content?.text || outlineResult.message?.content || '';

      // Second turn: Expand outline into full content
      const contentMessages: ISamplingMessage[] = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a detailed outline for a ${length} ${contentType} about: ${params.theme}\n\nThe ${contentType} should be in a ${style} style and approximately ${targetWords} words. Provide a structured outline with main points.`,
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
            text: `Now write the full ${contentType} based on this outline. Make it engaging, well-structured, and approximately ${targetWords} words. Use the ${style} style.`,
          },
        },
      ];

      const maxTokensMap = { short: 500, medium: 1000, long: 2000 };
      const contentResult = await context.sample(contentMessages, {
        maxTokens: maxTokensMap[length],
        temperature: 0.9,
      });

      const content = contentResult.content?.text || contentResult.message?.content || 'Content generation failed';

      this.successfulCalls += 2;
      this.totalTokensUsed += maxTokensMap[length] + 300;

      // Estimate word count
      const wordCount = content.split(/\s+/).length;

      return {
        content,
        outline,
        wordCount,
        samplingUsed: true,
      };
    } catch (error) {
      this.failedCalls++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: `Error: ${errorMessage}`,
        outline: '',
        wordCount: 0,
        samplingUsed: false,
      };
    }
  };

  /**
   * Analyze sentiment of text
   */
  analyzeSentiment: AnalyzeSentimentTool = async (params, context) => {
    // Check if sampling is available
    if (!context?.sample) {
      return {
        sentiment: 'unknown',
        confidence: 0,
        emotions: [],
        samplingUsed: false,
      };
    }

    try {
      this.totalSamplingCalls++;
      this.lastCallTime = new Date().toISOString();

      const detailedRequest = params.detailed
        ? '\n\nAlso provide a detailed analysis of the tone, context, and nuances.'
        : '';

      const messages: ISamplingMessage[] = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analyze the sentiment and emotions in the following text. Respond with:\n1. Overall sentiment (positive, negative, neutral, or mixed)\n2. Confidence score (0.0 to 1.0)\n3. Key emotions detected (list)${detailedRequest}\n\nText: "${params.text}"`,
          },
        },
      ];

      const result = await context.sample(messages, {
        maxTokens: params.detailed ? 500 : 250,
        temperature: 0.5,
      });

      const response = result.content?.text || result.message?.content || '';

      // Parse the response (simplified parsing)
      const sentimentMatch = response.match(/sentiment[:\s]+(\w+)/i);
      const confidenceMatch = response.match(/confidence[:\s]+([\d.]+)/i);

      const sentiment = sentimentMatch?.[1]?.toLowerCase() || 'neutral';
      const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.75;

      // Extract emotions (look for common emotion words)
      const emotionWords = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'trust', 'anticipation', 'happy', 'sad', 'angry', 'excited', 'worried'];
      const emotions = emotionWords.filter(emotion =>
        response.toLowerCase().includes(emotion)
      );

      this.successfulCalls++;
      this.totalTokensUsed += params.detailed ? 500 : 250;

      return {
        sentiment,
        confidence,
        emotions: emotions.length > 0 ? emotions : ['neutral'],
        analysis: params.detailed ? response : undefined,
        samplingUsed: true,
      };
    } catch (error) {
      this.failedCalls++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        sentiment: 'error',
        confidence: 0,
        emotions: [],
        analysis: `Error: ${errorMessage}`,
        samplingUsed: false,
      };
    }
  };

  /**
   * Refactor code with AI suggestions
   */
  refactorCode: RefactorCodeTool = async (params, context) => {
    // Check if sampling is available
    if (!context?.sample) {
      return {
        refactoredCode: params.code,
        changes: 'Sampling capability not available.',
        benefits: [],
        samplingUsed: false,
      };
    }

    try {
      this.totalSamplingCalls++;
      this.lastCallTime = new Date().toISOString();

      const focusAreas = params.focus || ['readability', 'maintainability'];
      const focusText = focusAreas.join(', ');

      const messages: ISamplingMessage[] = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Refactor the following ${params.language} code, focusing on: ${focusText}.\n\nProvide:\n1. The refactored code\n2. Explanation of changes made\n3. Benefits of the refactoring\n\nOriginal code:\n\`\`\`${params.language}\n${params.code}\n\`\`\``,
          },
        },
      ];

      const result = await context.sample(messages, {
        maxTokens: 1000,
        temperature: 0.6,
      });

      const response = result.content?.text || result.message?.content || '';

      // Extract refactored code (look for code blocks)
      const codeMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
      const refactoredCode = codeMatch ? codeMatch[1] : params.code;

      // Extract benefits
      const benefits: string[] = [];
      const benefitMatches = response.matchAll(/[•\-*]\s*(.+)/g);
      for (const match of benefitMatches) {
        benefits.push(match[1].trim());
      }

      this.successfulCalls++;
      this.totalTokensUsed += 1000;

      return {
        refactoredCode,
        changes: response,
        benefits: benefits.length > 0 ? benefits : ['Improved code structure'],
        samplingUsed: true,
      };
    } catch (error) {
      this.failedCalls++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        refactoredCode: params.code,
        changes: `Error: ${errorMessage}`,
        benefits: [],
        samplingUsed: false,
      };
    }
  };

  // ========================================================================
  // STATIC PROMPTS - No implementation needed
  // ========================================================================

  // CodeReviewPrompt - template auto-interpolated
  // TranslationContextPrompt - template auto-interpolated

  // ========================================================================
  // STATIC RESOURCES - No implementation needed
  // ========================================================================

  // CapabilitiesResource - data served as-is
  // ApiDocsResource - markdown documentation served as-is

  // ========================================================================
  // DYNAMIC RESOURCES - Require implementation
  // ========================================================================

  /**
   * Usage statistics resource
   */
  'stats://usage': UsageStatsResource = async () => {
    const averageTokens = this.successfulCalls > 0
      ? Math.round(this.totalTokensUsed / this.successfulCalls)
      : 0;

    return {
      totalSamplingCalls: this.totalSamplingCalls,
      successfulCalls: this.successfulCalls,
      failedCalls: this.failedCalls,
      averageTokens,
      lastCallTime: this.lastCallTime,
    };
  };
}
