/**
 * MCP Builder - Layer 2 (Feature Layer) Example
 *
 * Demonstrates the complete MCP Builder workflow with:
 * - Sampling-based validation tools (analyze_tool_design, validate_schema_quality, review_test_coverage)
 * - Workflow guidance prompts (mcp_builder_workflow, anthropic_best_practices, etc.)
 * - Builder pattern for composing configurations
 *
 * ## What is Layer 2?
 *
 * Layer 2 adds **sampling capability** - tools can request your LLM to perform
 * intelligent analysis and provide expert feedback.
 *
 * ## How Sampling Works
 *
 * 1. You call a validation tool (e.g., analyze_tool_design)
 * 2. The tool sends a prompt to your LLM via sampling
 * 3. Your LLM analyzes the input and generates a response
 * 4. The tool receives the analysis and returns structured feedback
 * 5. You get specific, actionable suggestions for improvement
 *
 * ## Usage with Claude Code CLI
 *
 * ```bash
 * # Start the MCP Builder server
 * npx simply-mcp run examples/mcp-builder-layer2.ts
 *
 * # In Claude Code CLI, the server will appear as "mcp-dev-complete"
 * # Use the tools to design and validate MCP tools:
 *
 * # 1. Get workflow guidance
 * get_prompt mcp_builder_workflow
 *
 * # 2. Design a tool (basic validation)
 * design_tool --purpose "Get weather for a city"
 *
 * # 3. Analyze design with AI (sampling-based)
 * analyze_tool_design \
 *   --tool_name "get_weather" \
 *   --description "Fetch current weather data for a specified city" \
 *   --parameters '[{"name":"city","type":"string","description":"City name"},{"name":"units","type":"celsius|fahrenheit","description":"Temperature units","optional":true}]' \
 *   --purpose "Retrieve weather information for user queries"
 *
 * # 4. Validate Zod schema with AI (sampling-based)
 * validate_schema_quality \
 *   --schema_code "z.object({ city: z.string().min(1).describe('City name'), units: z.enum(['celsius','fahrenheit']).optional().default('celsius').describe('Temperature units') }).strict()" \
 *   --purpose "Weather tool parameters"
 *
 * # 5. Review test coverage with AI (sampling-based)
 * review_test_coverage \
 *   --tool_design '{"name":"get_weather","description":"...","parameters":{}}' \
 *   --test_scenarios '[{"name":"valid city","input":{"city":"London"},"expected":"success","type":"happy_path"}]'
 * ```
 *
 * ## The Complete Workflow
 *
 * ### Step 1: Start with Design Tools (Layer 1)
 * - design_tool - Interactive tool design
 * - create_zod_schema - Generate Zod schemas
 *
 * ### Step 2: Validate with AI (Layer 2)
 * - analyze_tool_design - AI reviews your design against Anthropic principles
 *   - Returns: quality score (0-100), issues, improvements, readiness
 * - validate_schema_quality - AI checks your Zod schema
 *   - Returns: score, missing elements, violations, suggestions
 * - review_test_coverage - AI evaluates test scenarios
 *   - Returns: coverage score, gaps, suggested additional tests
 *
 * ### Step 3: Iterate Based on Feedback
 * - Fix issues identified by AI
 * - Re-validate until scores are 80+
 * - Refine descriptions, add validation rules, improve naming
 *
 * ### Step 4: Implement
 * - Generate final implementation code
 * - Use validated schemas
 * - Include comprehensive tests
 * - Deploy with confidence
 *
 * ## Anthropic Principles (Built into Validation)
 *
 * The AI validation tools check against these principles:
 *
 * 1. **Strategic Selection**
 *    - Is this tool necessary?
 *    - Does it serve a clear, specific purpose?
 *    - Could existing tools be combined instead?
 *
 * 2. **Thoughtful Implementation**
 *    - Clear, descriptive naming (snake_case for tools)
 *    - Comprehensive descriptions for AI agents
 *    - Appropriate parameter types with validation
 *    - Every field has .describe() in Zod schemas
 *
 * 3. **Token Efficiency**
 *    - Focused scope (don't try to do too much)
 *    - Return only relevant information
 *    - Structured, parseable data
 *
 * ## Prompt Resources Available
 *
 * Use `get_prompt <name>` to access guidance:
 * - **mcp_builder_workflow** - Complete workflow explanation
 * - **anthropic_best_practices** - Detailed quality guidelines
 * - **how_to_use_sampling_tools** - Understanding sampling
 * - **zod_schema_patterns** - Common Zod patterns and best practices
 *
 * ## Why This Approach Works
 *
 * Traditional approaches to tool validation require complex rule engines
 * and heuristics. By using **sampling**, we leverage your LLM's:
 * - Deep understanding of best practices
 * - Contextual awareness
 * - Ability to provide nuanced, specific feedback
 * - Knowledge of edge cases and common mistakes
 *
 * This creates a **self-improving development workflow** where your AI
 * helps you build better tools for AI agents.
 */

import {
  createMCPBuilder,
  DesignToolsPreset,
  ValidationToolsPreset,
  WorkflowPromptsPreset,
} from '../src/index.js';

/**
 * MCP Dev Complete - Full-featured MCP development assistant
 *
 * Includes:
 * - Layer 1: Basic design tools (design_tool, create_zod_schema, validate_schema)
 * - Layer 2: Sampling-based validation (analyze_tool_design, validate_schema_quality, review_test_coverage)
 * - Layer 2: Workflow guidance prompts (4 comprehensive guides)
 *
 * This server uses **sampling** to provide AI-powered validation and feedback.
 */
export default createMCPBuilder({
  name: 'mcp-dev-complete',
  version: '2.5.0',
  description: 'Complete MCP development assistant with AI-powered validation (Layer 2)',
})
  // Layer 1: Foundation - Basic design tools
  .useToolPreset(DesignToolsPreset)

  // Layer 2: Feature - Sampling-based validation
  .useToolPreset(ValidationToolsPreset)

  // Layer 2: Feature - Workflow guidance
  .usePromptPreset(WorkflowPromptsPreset)

  .build();

/**
 * Example: Building a Weather Tool with MCP Builder
 *
 * This example shows the complete workflow of building a high-quality
 * MCP tool using the MCP Builder with AI validation.
 *
 * ## Step-by-Step Process
 *
 * ### 1. Get Guidance
 * ```
 * get_prompt mcp_builder_workflow
 * ```
 * Returns: Complete workflow explanation
 *
 * ### 2. Design the Tool
 * ```
 * design_tool --purpose "Get current weather for a city"
 * ```
 * Returns: Initial tool structure with basic validation
 *
 * ### 3. Analyze Design with AI
 * ```
 * analyze_tool_design \
 *   --tool_name "get_weather" \
 *   --description "Fetch current weather data for a specified city. Returns temperature and conditions in the requested units." \
 *   --parameters '[
 *     {
 *       "name": "city",
 *       "type": "string",
 *       "description": "Name of the city to get weather for",
 *       "optional": false
 *     },
 *     {
 *       "name": "units",
 *       "type": "celsius | fahrenheit",
 *       "description": "Temperature units (default: celsius)",
 *       "optional": true
 *     }
 *   ]' \
 *   --purpose "Retrieve current weather information for user location queries"
 * ```
 *
 * AI Response (via sampling):
 * ```json
 * {
 *   "basic_validation": {
 *     "passed": true,
 *     "issues": []
 *   },
 *   "ai_analysis": {
 *     "score": 85,
 *     "issues": [
 *       "Consider adding a country parameter to disambiguate cities with the same name"
 *     ],
 *     "improvements": [
 *       "Add .email() validation if accepting location by email",
 *       "Consider returning structured data (temp, conditions, humidity, etc.)",
 *       "Document the expected return format in the description"
 *     ],
 *     "reasoning": "Good naming and clear purpose. Parameters are well-described. Minor improvements for disambiguation and return format clarity."
 *   },
 *   "next_step": "Design validated! Next: collect_schema_details or create Zod schema",
 *   "overall_ready": true
 * }
 * ```
 *
 * ### 4. Create and Validate Zod Schema
 * ```
 * create_zod_schema --parameters '...'
 * ```
 * Then validate:
 * ```
 * validate_schema_quality \
 *   --schema_code "z.object({
 *     city: z.string().min(1).describe('Name of the city to get weather for'),
 *     units: z.enum(['celsius', 'fahrenheit']).optional().default('celsius').describe('Temperature units (default: celsius)')
 *   }).strict()" \
 *   --purpose "Weather tool parameters"
 * ```
 *
 * AI Response:
 * ```json
 * {
 *   "validated_schema": "z.object({...}).strict()",
 *   "basic_validation": {
 *     "passed": true,
 *     "issues": []
 *   },
 *   "ai_analysis": {
 *     "score": 95,
 *     "missing": [],
 *     "violations": [],
 *     "improvements": [
 *       "Consider adding .max() to city name to prevent extremely long inputs"
 *     ]
 *   },
 *   "next_step": "Schema validated! Ready for implementation",
 *   "production_ready": true
 * }
 * ```
 *
 * ### 5. Review Test Coverage
 * ```
 * review_test_coverage \
 *   --tool_design '{"name":"get_weather","description":"...","parameters":{}}' \
 *   --test_scenarios '[
 *     {"name":"valid city","input":{"city":"London"},"expected":"weather data","type":"happy_path"},
 *     {"name":"with units","input":{"city":"Paris","units":"fahrenheit"},"expected":"weather in F","type":"happy_path"},
 *     {"name":"empty city","input":{"city":""},"expected":"validation error","type":"error_case"}
 *   ]'
 * ```
 *
 * AI Response:
 * ```json
 * {
 *   "current_coverage": {
 *     "score": 70,
 *     "happy_paths": 2,
 *     "edge_cases": 0,
 *     "error_cases": 1
 *   },
 *   "ai_analysis": {
 *     "missing_scenarios": [
 *       "Test with non-existent city name",
 *       "Test with special characters in city name",
 *       "Test with very long city name"
 *     ],
 *     "gaps": [
 *       "No edge case tests",
 *       "No tests for API failures or network errors"
 *     ],
 *     "suggested_tests": [
 *       {
 *         "name": "invalid city name",
 *         "type": "error_case",
 *         "input": {"city": "NonExistentCity12345"},
 *         "expected": "error: city not found",
 *         "why": "Validates handling of API errors for invalid locations"
 *       },
 *       {
 *         "name": "special characters",
 *         "type": "edge_case",
 *         "input": {"city": "São Paulo"},
 *         "expected": "weather data",
 *         "why": "Ensures international city names with accents work correctly"
 *       }
 *     ]
 *   },
 *   "next_step": "Add suggested test scenarios",
 *   "sufficient_coverage": false
 * }
 * ```
 *
 * ### 6. Implement with Confidence
 * After all validations pass with scores 80+:
 * - Generate implementation code
 * - Include validated Zod schema
 * - Add comprehensive tests
 * - Deploy
 *
 * ## Key Takeaways
 *
 * 1. **Sampling enables intelligent validation** - Your LLM provides expert feedback
 * 2. **Iterative refinement** - Use AI suggestions to improve design
 * 3. **Quality scores** - Aim for 80+ on all validation tools
 * 4. **Anthropic principles** - Built into every validation check
 * 5. **Comprehensive testing** - AI identifies missing test cases
 *
 * This workflow ensures you build high-quality MCP tools that work
 * seamlessly with AI agents.
 */
