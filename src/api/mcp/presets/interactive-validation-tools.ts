/**
 * Interactive Validation Tools Preset - Layer 2 Alternative (No Sampling Required)
 *
 * These tools use a "guided analysis" pattern where the LLM analyzes designs
 * through tool responses instead of sampling. This works with ANY MCP client!
 *
 * Pattern:
 * 1. analyze_* tool returns design + analysis prompt
 * 2. LLM processes prompt and calls submit_* tool with its analysis
 * 3. submit_* tool validates analysis and provides feedback
 *
 * @module api/mcp/presets/interactive-validation-tools
 */

import { z } from 'zod';
import type { ToolPreset } from '../types.js';

/**
 * Interactive Validation Tools Preset
 *
 * Provides AI-powered validation through guided tool responses.
 * Works without MCP sampling by leveraging the LLM's context.
 *
 * Tools included:
 * - analyze_tool_design_interactive - Start tool design analysis
 * - submit_tool_analysis - Submit LLM's analysis of tool design
 * - analyze_schema_interactive - Start schema quality analysis
 * - submit_schema_analysis - Submit LLM's schema analysis
 * - analyze_tests_interactive - Start test coverage analysis
 * - submit_test_analysis - Submit LLM's test analysis
 */
export const InteractiveValidationToolsPreset: ToolPreset = {
  name: 'Interactive Validation Tools',
  description: 'AI-powered validation using guided analysis (works with any MCP client, no sampling required)',
  tools: [
    {
      name: 'analyze_tool_design_interactive',
      description: 'Analyze a tool design interactively. Returns the design and asks you to evaluate it against Anthropic principles, then call submit_tool_analysis with your evaluation.',
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
      execute: async (args) => {
        // Basic validation
        const basicIssues: string[] = [];
        if (args.tool_name.includes(' ')) basicIssues.push('Tool name should use snake_case (no spaces)');
        if (args.tool_name.includes('-')) basicIssues.push('Tool name should use snake_case (use _ not -)');
        if (args.description.length < 20) basicIssues.push('Description too brief (minimum 20 characters)');
        if (args.parameters.length === 0) basicIssues.push('Tool should have at least one parameter');

        for (const param of args.parameters) {
          if (!param.description || param.description.length < 5) {
            basicIssues.push(`Parameter "${param.name}" needs a clear description`);
          }
        }

        const designSummary = {
          tool_name: args.tool_name,
          description: args.description,
          purpose: args.purpose,
          parameters: args.parameters.map(p =>
            `- ${p.name} (${p.type}${p.optional ? ', optional' : ''}): ${p.description}`
          ).join('\n')
        };

        return {
          content: [{
            type: 'text',
            text: `# Tool Design Review Request

## Design to Analyze

**Tool Name**: ${designSummary.tool_name}
**Description**: ${designSummary.description}
**Purpose**: ${designSummary.purpose}

**Parameters**:
${designSummary.parameters}

${basicIssues.length > 0 ? `## ⚠️ Basic Issues Detected
${basicIssues.map(i => `- ${i}`).join('\n')}

` : ''}## Your Task: Analyze Against Anthropic Principles

Evaluate this tool design against these criteria:

### 1. Strategic Selection (0-100)
- Is this tool necessary and well-scoped?
- Does it serve a clear, specific purpose?
- Could existing tools be combined instead?

### 2. Clear Naming (0-100)
- Is the name descriptive and unambiguous?
- Does it use snake_case convention?
- Does it clearly indicate what the tool does?

### 3. Parameter Design (0-100)
- Are parameters well-designed with appropriate types?
- Are descriptions clear and specific?
- Are required vs optional parameters appropriate?
- Are there missing parameters that would be useful?

### 4. Description Quality (0-100)
- Is the description clear and specific enough for AI agents?
- Does it explain exactly what the tool does?
- Does it mention key behaviors or constraints?

### 5. Token Efficiency (0-100)
- Is the scope focused and not trying to do too much?
- Would this tool require excessive context?

## Instructions

Analyze the design above, then **call the \`submit_tool_analysis\` tool** with:
- \`overall_score\`: Average of the 5 criteria scores (0-100)
- \`strategic_selection_score\`: Score for criterion 1
- \`naming_score\`: Score for criterion 2
- \`parameters_score\`: Score for criterion 3
- \`description_score\`: Score for criterion 4
- \`efficiency_score\`: Score for criterion 5
- \`issues\`: List of specific problems found
- \`improvements\`: List of specific, actionable improvements
- \`ready\`: Boolean - is this ready to implement?
- \`reasoning\`: Brief explanation of your evaluation

Be specific and actionable in your feedback!`
          }]
        };
      },
      examples: [
        {
          input: {
            tool_name: 'get_weather',
            description: 'Fetch current weather for a city',
            parameters: [
              { name: 'city', type: 'string', description: 'City name' }
            ],
            purpose: 'Get weather data'
          },
          output: 'Returns analysis prompt asking you to evaluate and call submit_tool_analysis',
          description: 'Start analysis of weather tool'
        }
      ]
    },

    {
      name: 'submit_tool_analysis',
      description: 'Submit your analysis of a tool design. Provide scores, issues, improvements, and overall assessment.',
      category: 'analyze',
      parameters: z.object({
        overall_score: z.number().min(0).max(100).describe('Overall quality score (0-100)'),
        strategic_selection_score: z.number().min(0).max(100).describe('Strategic selection score'),
        naming_score: z.number().min(0).max(100).describe('Naming quality score'),
        parameters_score: z.number().min(0).max(100).describe('Parameter design score'),
        description_score: z.number().min(0).max(100).describe('Description quality score'),
        efficiency_score: z.number().min(0).max(100).describe('Token efficiency score'),
        issues: z.array(z.string()).describe('Specific issues found'),
        improvements: z.array(z.string()).describe('Specific, actionable improvements'),
        ready: z.boolean().describe('Is this design ready to implement?'),
        reasoning: z.string().describe('Brief explanation of your evaluation')
      }),
      execute: async (args) => {
        const feedback: string[] = [];
        const scores = [
          args.strategic_selection_score,
          args.naming_score,
          args.parameters_score,
          args.description_score,
          args.efficiency_score
        ];

        // Validate score consistency
        const calculatedAverage = scores.reduce((a, b) => a + b, 0) / scores.length;
        const scoreDiff = Math.abs(calculatedAverage - args.overall_score);

        if (scoreDiff > 5) {
          feedback.push(`⚠️  Note: Overall score (${args.overall_score}) differs from calculated average (${calculatedAverage.toFixed(1)})`);
        }

        // Provide feedback based on scores
        if (args.overall_score >= 85) {
          feedback.push('✅ **Excellent!** This design meets high quality standards.');
        } else if (args.overall_score >= 70) {
          feedback.push('✅ **Good!** Design is solid with minor improvements needed.');
        } else if (args.overall_score >= 50) {
          feedback.push('⚠️  **Needs Work**: Address the identified issues before implementing.');
        } else {
          feedback.push('❌ **Significant Issues**: Major improvements required.');
        }

        // Specific criterion feedback
        if (args.strategic_selection_score < 60) {
          feedback.push('🔍 **Strategic Selection**: Reconsider if this tool is necessary or if scope can be refined.');
        }
        if (args.naming_score < 60) {
          feedback.push('📛 **Naming**: Tool name needs improvement for clarity.');
        }
        if (args.parameters_score < 60) {
          feedback.push('⚙️  **Parameters**: Parameter design needs refinement.');
        }
        if (args.description_score < 60) {
          feedback.push('📝 **Description**: Improve description clarity and specificity.');
        }
        if (args.efficiency_score < 60) {
          feedback.push('⚡ **Efficiency**: Consider narrowing scope or reducing complexity.');
        }

        // Next steps
        const nextSteps: string[] = [];
        if (args.ready && args.overall_score >= 70) {
          nextSteps.push('**Next**: Call `create_zod_schema` to generate parameter schema');
        } else {
          nextSteps.push('**Next**: Refine the design based on improvements listed above');
          nextSteps.push('**Then**: Run this analysis again to validate improvements');
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              analysis_received: {
                overall_score: args.overall_score,
                breakdown: {
                  strategic_selection: args.strategic_selection_score,
                  naming: args.naming_score,
                  parameters: args.parameters_score,
                  description: args.description_score,
                  efficiency: args.efficiency_score
                },
                issues_count: args.issues.length,
                improvements_count: args.improvements.length,
                ready: args.ready
              },
              detailed_analysis: {
                issues: args.issues,
                improvements: args.improvements,
                reasoning: args.reasoning
              },
              feedback: feedback,
              next_steps: nextSteps,
              summary: args.ready
                ? `✅ Design validated with score ${args.overall_score}/100 - Ready to proceed!`
                : `⚠️  Score ${args.overall_score}/100 - Address ${args.issues.length} issues before proceeding`
            }, null, 2)
          }]
        };
      },
      examples: [
        {
          input: {
            overall_score: 85,
            strategic_selection_score: 90,
            naming_score: 85,
            parameters_score: 80,
            description_score: 85,
            efficiency_score: 85,
            issues: [],
            improvements: ['Add optional country_code parameter', 'Add units parameter'],
            ready: true,
            reasoning: 'Well-designed tool with clear purpose. Minor enhancements would improve usability.'
          },
          output: '{ analysis_received: {...}, feedback: [...], next_steps: [...] }',
          description: 'Submit positive analysis'
        }
      ]
    },

    {
      name: 'analyze_schema_interactive',
      description: 'Analyze a Zod schema interactively. Returns the schema and asks you to evaluate it for completeness and best practices, then call submit_schema_analysis.',
      category: 'analyze',
      parameters: z.object({
        schema_code: z.string().describe('Zod schema code to validate'),
        purpose: z.string().describe('What this schema is for (context)')
      }),
      execute: async (args) => {
        const basicIssues: string[] = [];
        if (!args.schema_code.includes('z.object')) basicIssues.push('Schema should use z.object()');
        if (!args.schema_code.includes('.describe(')) basicIssues.push('Schema should have .describe() on fields');

        return {
          content: [{
            type: 'text',
            text: `# Schema Quality Review Request

## Schema to Analyze

\`\`\`typescript
${args.schema_code}
\`\`\`

**Purpose**: ${args.purpose}

${basicIssues.length > 0 ? `## ⚠️ Basic Issues
${basicIssues.map(i => `- ${i}`).join('\n')}

` : ''}## Your Task: Evaluate Schema Quality

Analyze this Zod schema against these criteria:

### 1. Field Descriptions (0-100)
- Does every field have a \`.describe()\` call?
- Are descriptions clear and specific?

### 2. Validation Rules (0-100)
- Are appropriate validation rules used (\`.min()\`, \`.max()\`, \`.email()\`, \`.positive()\`, etc.)?
- Are constraints appropriate for the data?

### 3. Optional Fields (0-100)
- Are optional fields properly marked with \`.optional()\`?
- Are defaults sensible where used (\`.default()\`)?

### 4. Type Safety (0-100)
- Are types appropriate (not defaulting everything to string)?
- Are enums used where appropriate?

### 5. Strictness (0-100)
- Should this use \`.strict()\` to reject unknown keys?
- Is the schema appropriately permissive/restrictive?

## Instructions

Analyze the schema, then **call \`submit_schema_analysis\`** with:
- \`overall_score\`: Average of criteria scores (0-100)
- \`descriptions_score\`: Score for criterion 1
- \`validation_score\`: Score for criterion 2
- \`optional_fields_score\`: Score for criterion 3
- \`type_safety_score\`: Score for criterion 4
- \`strictness_score\`: Score for criterion 5
- \`missing\`: What's missing or needs improvement
- \`violations\`: Best practice violations found
- \`improvements\`: Specific actionable suggestions
- \`ready\`: Is this schema production-ready?

Be specific about what needs to change!`
          }]
        };
      },
      examples: [
        {
          input: {
            schema_code: 'z.object({ city: z.string().describe("City name") })',
            purpose: 'Weather tool parameters'
          },
          output: 'Returns analysis prompt asking you to evaluate and call submit_schema_analysis',
          description: 'Start schema analysis'
        }
      ]
    },

    {
      name: 'submit_schema_analysis',
      description: 'Submit your analysis of a Zod schema. Provide scores, missing elements, violations, and improvements.',
      category: 'analyze',
      parameters: z.object({
        overall_score: z.number().min(0).max(100).describe('Overall schema quality (0-100)'),
        descriptions_score: z.number().min(0).max(100).describe('Field descriptions quality'),
        validation_score: z.number().min(0).max(100).describe('Validation rules quality'),
        optional_fields_score: z.number().min(0).max(100).describe('Optional field handling'),
        type_safety_score: z.number().min(0).max(100).describe('Type safety quality'),
        strictness_score: z.number().min(0).max(100).describe('Strictness appropriateness'),
        missing: z.array(z.string()).describe('Missing or needs improvement'),
        violations: z.array(z.string()).describe('Best practice violations'),
        improvements: z.array(z.string()).describe('Specific suggestions'),
        ready: z.boolean().describe('Is this production-ready?')
      }),
      execute: async (args) => {
        const feedback: string[] = [];

        if (args.overall_score >= 80) {
          feedback.push('✅ **Excellent Schema!** Production-ready quality.');
        } else if (args.overall_score >= 60) {
          feedback.push('✅ **Good Schema**: Minor improvements recommended.');
        } else {
          feedback.push('⚠️  **Needs Improvement**: Address issues before using in production.');
        }

        if (args.descriptions_score < 70) {
          feedback.push('📝 Add `.describe()` to all fields with clear descriptions');
        }
        if (args.validation_score < 70) {
          feedback.push('✓ Add validation rules (`.min()`, `.max()`, `.email()`, etc.)');
        }
        if (args.optional_fields_score < 70) {
          feedback.push('🔧 Review optional field handling and defaults');
        }
        if (args.type_safety_score < 70) {
          feedback.push('🛡️  Improve type safety (use enums, specific types)');
        }
        if (args.strictness_score < 70) {
          feedback.push('🔒 Consider using `.strict()` to prevent unknown keys');
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              analysis_received: {
                overall_score: args.overall_score,
                breakdown: {
                  descriptions: args.descriptions_score,
                  validation: args.validation_score,
                  optional_fields: args.optional_fields_score,
                  type_safety: args.type_safety_score,
                  strictness: args.strictness_score
                },
                issues_count: args.missing.length + args.violations.length,
                ready: args.ready
              },
              detailed_analysis: {
                missing: args.missing,
                violations: args.violations,
                improvements: args.improvements
              },
              feedback: feedback,
              next_step: args.ready && args.overall_score >= 80
                ? 'Schema validated! Ready for implementation'
                : 'Improve schema based on suggestions, then validate again',
              production_ready: args.ready && args.overall_score >= 80
            }, null, 2)
          }]
        };
      },
      examples: [
        {
          input: {
            overall_score: 90,
            descriptions_score: 95,
            validation_score: 90,
            optional_fields_score: 85,
            type_safety_score: 90,
            strictness_score: 90,
            missing: [],
            violations: [],
            improvements: ['Consider adding email validation'],
            ready: true
          },
          output: '{ analysis_received: {...}, feedback: [...], production_ready: true }',
          description: 'Submit high-quality schema analysis'
        }
      ]
    }
  ]
};
