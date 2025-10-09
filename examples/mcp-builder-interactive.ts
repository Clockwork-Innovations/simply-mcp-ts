/**
 * MCP Builder - Interactive Validation (Works with Claude Code CLI!)
 *
 * This example demonstrates the interactive validation pattern that works
 * WITHOUT MCP sampling support. Perfect for Claude Code CLI!
 *
 * How it works:
 * 1. Call analyze_tool_design_interactive with your design
 * 2. Claude analyzes it in its context and calls submit_tool_analysis
 * 3. You get detailed feedback and next steps
 *
 * No sampling required - uses natural tool call flow!
 */

import {
  defineMCPBuilder,
  DesignToolsPreset,
  InteractiveValidationToolsPreset,
  WorkflowPromptsPreset
} from '../src/index.js';

export default defineMCPBuilder({
  name: 'mcp-dev-interactive',
  version: '2.5.0',
  description: 'MCP Development Server with Interactive AI Validation (works with Claude Code CLI)',

  // Layer 1: Foundation - Design tools
  toolPresets: [
    DesignToolsPreset,           // design_tool, create_zod_schema, validate_schema
    InteractiveValidationToolsPreset  // Interactive AI validation (no sampling!)
  ],

  // Layer 2: Workflow guidance prompts
  promptPresets: [
    WorkflowPromptsPreset        // Best practices, patterns, workflow guides
  ]
});

/**
 * USAGE INSTRUCTIONS
 * ==================
 *
 * Start the server:
 * ```bash
 * npx simply-mcp run examples/mcp-builder-interactive.ts
 * ```
 *
 * Or with Claude Code CLI:
 * ```bash
 * claude --mcp-config '{"mcpServers":{"mcp-dev":{"command":"npx","args":["simply-mcp","run","examples/mcp-builder-interactive.ts"]}}}' \
 *   "Help me create a tool to get weather information"
 * ```
 *
 * INTERACTIVE WORKFLOW EXAMPLE
 * ============================
 *
 * Step 1: Ask Claude to analyze a tool design
 * --------------------------------------------
 * User: "I want to create a tool called 'get_weather' that fetches weather for a city.
 *        Can you analyze this design?"
 *
 * Claude calls: analyze_tool_design_interactive({
 *   tool_name: "get_weather",
 *   description: "Fetch current weather data for a specified city",
 *   parameters: [{
 *     name: "city",
 *     type: "string",
 *     description: "City name to get weather for",
 *     optional: false
 *   }],
 *   purpose: "Retrieve current weather information for user queries"
 * })
 *
 * Returns: Detailed analysis prompt with evaluation criteria
 *
 * Step 2: Claude analyzes and responds
 * -------------------------------------
 * Claude reads the analysis prompt, evaluates the design, and calls:
 *
 * submit_tool_analysis({
 *   overall_score: 75,
 *   strategic_selection_score: 85,
 *   naming_score: 90,
 *   parameters_score: 65,
 *   description_score: 75,
 *   efficiency_score: 85,
 *   issues: [
 *     "Missing country/state parameter to disambiguate cities",
 *     "No units parameter for temperature format"
 *   ],
 *   improvements: [
 *     "Add optional 'country_code' parameter (ISO 3166)",
 *     "Add optional 'units' parameter (celsius/fahrenheit)",
 *     "Specify what weather data is returned in description"
 *   ],
 *   ready: true,
 *   reasoning: "Good basic design with clear purpose. Missing common parameters for real-world use."
 * })
 *
 * Returns: Detailed feedback and next steps
 *
 * Step 3: Iterate or proceed
 * ---------------------------
 * User: "Please refine the design based on those suggestions"
 *
 * Claude: Proposes improved design and analyzes again
 *
 * ADVANTAGES OVER SAMPLING
 * =========================
 *
 * 1. ✅ Works with Claude Code CLI (no sampling support required)
 * 2. ✅ Transparent - user sees Claude's reasoning
 * 3. ✅ Interactive - user can guide the process
 * 4. ✅ Multi-turn refinement is natural
 * 5. ✅ No additional API costs
 * 6. ✅ Uses Claude's full context and reasoning
 *
 * AVAILABLE TOOLS
 * ===============
 *
 * Layer 1 (Foundation):
 * - design_tool: Interactive tool designer
 * - create_zod_schema: Generate Zod schemas
 * - validate_schema: Basic schema validation
 *
 * Layer 2 (Interactive Validation):
 * - analyze_tool_design_interactive: Start tool analysis (returns analysis prompt)
 * - submit_tool_analysis: Submit Claude's analysis (Claude calls this)
 * - analyze_schema_interactive: Start schema analysis
 * - submit_schema_analysis: Submit Claude's schema analysis
 *
 * Prompts:
 * - mcp_builder_workflow: Complete workflow guide
 * - anthropic_best_practices: Detailed best practices
 * - how_to_use_sampling_tools: Sampling explanation
 * - zod_schema_patterns: Zod patterns and examples
 *
 * PATTERN EXPLANATION
 * ===================
 *
 * Traditional Sampling (not supported in Claude Code CLI):
 * ```
 * User → Tool → context.sample() → Client LLM → Response → Tool → User
 * ```
 *
 * Interactive Pattern (works everywhere!):
 * ```
 * User → analyze_* tool → Returns analysis prompt → Claude reads & thinks
 *      → Claude calls submit_* tool → Validates & provides feedback → User
 * ```
 *
 * The key insight: Instead of the *server* requesting LLM analysis via sampling,
 * we return a structured prompt that guides *Claude* to analyze in its context,
 * then submit its analysis back through a tool call.
 *
 * This is actually MORE powerful because:
 * - Claude's reasoning is visible to the user
 * - Multi-turn conversations are natural
 * - User can intervene and guide
 * - No special MCP features required
 *
 * COMPLETE EXAMPLE CONVERSATION
 * ==============================
 *
 * User: "Help me create an MCP tool to calculate tips"
 *
 * Claude: "I'll help you create a tip calculator tool. Let me start by
 *          designing it and then we'll analyze the design together."
 *
 * [Claude calls design_tool or directly calls analyze_tool_design_interactive]
 *
 * analyze_tool_design_interactive returns:
 * "# Tool Design Review Request
 *  Tool Name: calculate_tip
 *  Description: Calculate tip amount and total bill
 *  ...
 *  Your Task: Analyze Against Anthropic Principles
 *  ..."
 *
 * Claude (reading the prompt): "Let me analyze this design:
 *
 * Strategic Selection: 85/100 - Clear, focused purpose
 * Naming: 90/100 - Descriptive snake_case name
 * Parameters: 70/100 - Missing percentage customization
 * Description: 75/100 - Could be more specific
 * Efficiency: 90/100 - Well-scoped
 *
 * Let me submit this analysis..."
 *
 * [Claude calls submit_tool_analysis with scores and feedback]
 *
 * submit_tool_analysis returns:
 * "✅ Good! Design is solid with minor improvements needed.
 *  Improvements:
 *  - Add 'tip_percentage' parameter...
 *  Next: Refine design or proceed to create_zod_schema"
 *
 * Claude: "The design looks good overall! Here are the suggestions..."
 * User: "Great, let's proceed with the schema"
 * Claude: [Calls create_zod_schema...]
 *
 * END EXAMPLE
 * ===========
 */
