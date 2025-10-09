/**
 * Validation Tools Preset - Layer 2 (Sampling-Based Validation)
 *
 * Tools that use MCP sampling to provide intelligent, AI-powered validation.
 * These tools send prompts to the client's LLM for expert analysis.
 *
 * @module api/mcp/presets/validation-tools
 */

import { z } from 'zod';
import type { ToolPreset } from '../types.js';

/**
 * Validation Tools Preset
 *
 * Provides sampling-based validation tools that use the client's LLM
 * for intelligent analysis and feedback.
 *
 * Layer 2 introduces sampling capability - tools can request the client's LLM
 * to analyze input and provide expert feedback.
 *
 * Tools included:
 * - analyze_tool_design (sampling) - AI review of tool design
 * - validate_schema_quality (sampling) - AI schema validation
 * - review_test_coverage (sampling) - AI test analysis
 */
export const ValidationToolsPreset: ToolPreset = {
  name: 'Validation Tools',
  description: 'AI-powered validation using sampling. Tools analyze your designs against Anthropic principles.',
  tools: [
    {
      name: 'analyze_tool_design',
      description: 'Analyze tool design quality using AI sampling. Submits your design to the LLM for expert review against Anthropic principles. The AI evaluates strategic selection, naming, parameter design, and overall quality.',
      category: 'analyze',
      parameters: z.object({
        tool_name: z.string().describe('Tool name (use snake_case)'),
        description: z.string().describe('Tool description'),
        parameters: z.array(z.object({
          name: z.string(),
          type: z.string(),
          description: z.string(),
          optional: z.boolean().optional()
        })).describe('Tool parameters'),
        purpose: z.string().describe('What the tool accomplishes')
      }),
      execute: async (args, context) => {
        // Basic validation first
        const basicIssues: string[] = [];
        if (args.tool_name.includes(' ')) basicIssues.push('Tool name should use snake_case (no spaces)');
        if (args.tool_name.includes('-')) basicIssues.push('Tool name should use snake_case (use _ not -)');
        if (args.description.length < 20) basicIssues.push('Description too brief (minimum 20 characters)');
        if (args.parameters.length === 0) basicIssues.push('Tool should have at least one parameter');

        // Check for missing descriptions
        for (const param of args.parameters) {
          if (!param.description || param.description.length < 5) {
            basicIssues.push(`Parameter "${param.name}" needs a clear description`);
          }
        }

        // Use sampling for intelligent analysis
        if (!context?.sample) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                basic_validation: {
                  passed: basicIssues.length === 0,
                  issues: basicIssues
                },
                error: 'Sampling not available. Cannot perform AI analysis.',
                next_step: 'Fix basic issues first'
              }, null, 2)
            }]
          };
        }

        const samplingResult = await context.sample([{
          role: 'user',
          content: {
            type: 'text',
            text: `You are an expert in Anthropic's principles for building AI agent tools. Analyze this MCP tool design:

Tool Name: ${args.tool_name}
Description: ${args.description}
Purpose: ${args.purpose}

Parameters:
${args.parameters.map(p => `- ${p.name} (${p.type}${p.optional ? ', optional' : ''}): ${p.description}`).join('\n')}

Evaluate against Anthropic's principles:
1. **Strategic Selection** - Is this tool necessary? Does it serve a clear, specific purpose? Could existing tools be combined instead?
2. **Clear Naming** - Is the name descriptive and unambiguous? Does it clearly indicate what the tool does?
3. **Parameter Design** - Are parameters well-designed with appropriate types? Are descriptions clear?
4. **Description Quality** - Is the description clear and specific enough for AI agents to understand exactly what this tool does?
5. **Token Efficiency** - Is the scope focused and not trying to do too much?

Provide a detailed analysis in JSON format:
{
  "score": <number 0-100>,
  "issues": ["issue 1", "issue 2", ...],
  "improvements": ["specific improvement 1", "specific improvement 2", ...],
  "ready": <boolean>,
  "reasoning": "brief explanation of the score and main concerns"
}

Be specific and actionable in your feedback.`
          }
        }], {
          maxTokens: 1000,
          temperature: 0.3
        });

        // Parse AI analysis
        let analysis;
        try {
          analysis = JSON.parse(samplingResult.content[0].text);
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                basic_validation: {
                  passed: basicIssues.length === 0,
                  issues: basicIssues
                },
                error: 'Failed to parse AI analysis',
                next_step: 'Fix basic issues and try again'
              }, null, 2)
            }]
          };
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              basic_validation: {
                passed: basicIssues.length === 0,
                issues: basicIssues
              },
              ai_analysis: {
                score: analysis.score,
                issues: analysis.issues,
                improvements: analysis.improvements,
                reasoning: analysis.reasoning
              },
              next_step: (basicIssues.length === 0 && analysis.ready)
                ? 'Design validated! Next: collect_schema_details or create Zod schema'
                : 'Address issues before proceeding',
              overall_ready: basicIssues.length === 0 && analysis.ready && analysis.score >= 70
            }, null, 2)
          }]
        };
      },
      examples: [
        {
          input: {
            tool_name: 'get_weather',
            description: 'Fetch current weather for a city',
            parameters: [
              { name: 'city', type: 'string', description: 'City name' },
              { name: 'units', type: 'celsius | fahrenheit', description: 'Temperature units', optional: true }
            ],
            purpose: 'Get weather data'
          },
          output: '{ basic_validation: {...}, ai_analysis: { score: 85, ... }, overall_ready: true }',
          description: 'Analyze a weather tool design'
        }
      ]
    },

    {
      name: 'validate_schema_quality',
      description: 'Validate Zod schema quality using AI sampling. The AI checks for completeness, validation rules, best practices, and Anthropic alignment. Provides specific suggestions for improvement.',
      category: 'analyze',
      parameters: z.object({
        schema_code: z.string().describe('Zod schema code to validate'),
        purpose: z.string().describe('What this schema is for (context)')
      }),
      execute: async (args, context) => {
        // Basic syntax check
        const basicIssues: string[] = [];
        if (!args.schema_code.includes('z.object')) basicIssues.push('Schema should use z.object()');
        if (!args.schema_code.includes('.describe(')) basicIssues.push('Schema should have .describe() on fields');

        if (!context?.sample) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                basic_validation: { passed: basicIssues.length === 0, issues: basicIssues },
                error: 'Sampling not available',
                next_step: 'Fix basic issues'
              }, null, 2)
            }]
          };
        }

        const samplingResult = await context.sample([{
          role: 'user',
          content: {
            type: 'text',
            text: `You are a Zod schema expert. Analyze this schema for MCP tool parameters:

\`\`\`typescript
${args.schema_code}
\`\`\`

Purpose: ${args.purpose}

Evaluate the schema quality:
1. **Field Descriptions** - Does every field have a .describe() call with a clear description?
2. **Validation Rules** - Are appropriate validation rules used (.min, .max, .email, .positive, etc.)?
3. **Optional Fields** - Are optional fields properly marked with .optional()?
4. **Type Safety** - Are types appropriate (not defaulting everything to string)?
5. **Strictness** - Should this use .strict() to reject unknown keys?
6. **Defaults** - Would sensible .default() values be helpful?

Provide analysis in JSON format:
{
  "score": <number 0-100>,
  "missing": ["what's missing or needs improvement"],
  "violations": ["best practice violations"],
  "improvements": ["specific actionable suggestions"],
  "ready": <boolean - is this production-ready?>
}

Be specific about what needs to change.`
          }
        }], {
          maxTokens: 800,
          temperature: 0.3
        });

        let analysis;
        try {
          analysis = JSON.parse(samplingResult.content[0].text);
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                basic_validation: { passed: basicIssues.length === 0, issues: basicIssues },
                error: 'Failed to parse AI analysis'
              }, null, 2)
            }]
          };
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              validated_schema: args.schema_code,
              basic_validation: { passed: basicIssues.length === 0, issues: basicIssues },
              ai_analysis: {
                score: analysis.score,
                missing: analysis.missing,
                violations: analysis.violations,
                improvements: analysis.improvements
              },
              next_step: (analysis.ready && analysis.score >= 80)
                ? 'Schema validated! Ready for implementation'
                : 'Improve schema based on suggestions',
              production_ready: basicIssues.length === 0 && analysis.score >= 80 && analysis.ready
            }, null, 2)
          }]
        };
      },
      examples: [
        {
          input: {
            schema_code: 'z.object({ name: z.string().describe("User name"), age: z.number().positive().describe("User age") }).strict()',
            purpose: 'User registration parameters'
          },
          output: '{ ai_analysis: { score: 90, ... }, production_ready: true }',
          description: 'Validate a user schema'
        }
      ]
    },

    {
      name: 'review_test_coverage',
      description: 'Review test scenario coverage using AI sampling. The AI identifies gaps, suggests additional test cases, and evaluates whether edge cases and error conditions are properly tested.',
      category: 'test',
      parameters: z.object({
        tool_design: z.object({
          name: z.string(),
          description: z.string(),
          parameters: z.any()
        }),
        test_scenarios: z.array(z.object({
          name: z.string(),
          input: z.any(),
          expected: z.any(),
          type: z.enum(['happy_path', 'edge_case', 'error_case'])
        }))
      }),
      execute: async (args, context) => {
        const basicIssues: string[] = [];
        const happyPaths = args.test_scenarios.filter(t => t.type === 'happy_path');
        const edgeCases = args.test_scenarios.filter(t => t.type === 'edge_case');
        const errorCases = args.test_scenarios.filter(t => t.type === 'error_case');

        if (happyPaths.length === 0) basicIssues.push('No happy path tests provided');
        if (edgeCases.length === 0) basicIssues.push('No edge case tests provided');
        if (errorCases.length === 0) basicIssues.push('No error case tests provided');

        if (!context?.sample) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                basic_validation: { passed: basicIssues.length === 0, issues: basicIssues },
                error: 'Sampling not available'
              }, null, 2)
            }]
          };
        }

        const samplingResult = await context.sample([{
          role: 'user',
          content: {
            type: 'text',
            text: `Review test coverage for this MCP tool:

Tool: ${args.tool_design.name}
Description: ${args.tool_design.description}

Current test scenarios:
${JSON.stringify(args.test_scenarios, null, 2)}

Evaluate test coverage:
1. **Happy Paths** - Are all normal use cases covered?
2. **Edge Cases** - Are boundary conditions tested (empty strings, zero, negative numbers, very large values)?
3. **Error Cases** - Are invalid inputs and error conditions tested?
4. **Missing Scenarios** - What important test cases are missing?

Provide analysis in JSON format:
{
  "coverage_score": <number 0-100>,
  "missing_scenarios": ["missing scenario 1", "missing scenario 2"],
  "gaps": ["gap 1", "gap 2"],
  "suggested_tests": [
    {
      "name": "test name",
      "type": "happy_path|edge_case|error_case",
      "input": { ... },
      "expected": "expected result or error",
      "why": "why this test matters"
    }
  ],
  "ready": <boolean - is coverage sufficient?>
}`
          }
        }], {
          maxTokens: 1000,
          temperature: 0.3
        });

        let analysis;
        try {
          analysis = JSON.parse(samplingResult.content[0].text);
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                basic_validation: { passed: basicIssues.length === 0, issues: basicIssues },
                error: 'Failed to parse AI analysis'
              }, null, 2)
            }]
          };
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              current_coverage: {
                score: analysis.coverage_score,
                happy_paths: happyPaths.length,
                edge_cases: edgeCases.length,
                error_cases: errorCases.length
              },
              basic_validation: { passed: basicIssues.length === 0, issues: basicIssues },
              ai_analysis: {
                missing_scenarios: analysis.missing_scenarios,
                gaps: analysis.gaps,
                suggested_tests: analysis.suggested_tests
              },
              next_step: (analysis.ready && analysis.coverage_score >= 70)
                ? 'Test coverage sufficient! Ready to implement'
                : 'Add suggested test scenarios',
              sufficient_coverage: basicIssues.length === 0 && analysis.coverage_score >= 70
            }, null, 2)
          }]
        };
      },
      examples: [
        {
          input: {
            tool_design: { name: 'add', description: 'Add two numbers', parameters: {} },
            test_scenarios: [
              { name: 'basic addition', input: {a: 2, b: 3}, expected: 5, type: 'happy_path' }
            ]
          },
          output: '{ current_coverage: {...}, ai_analysis: {...}, suggested_tests: [...] }',
          description: 'Review test coverage for add tool'
        }
      ]
    }
  ]
};
