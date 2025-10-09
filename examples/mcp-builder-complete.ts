/**
 * MCP Builder - COMPLETE Workflow (Idea → Working MCP Server!)
 *
 * This server includes ALL tools needed to design, validate, generate,
 * and deploy a working MCP server using Claude Code CLI.
 *
 * 🎯 COMPLETE WORKFLOW: You can go from idea to running server!
 *
 * Tools: 11 total
 * - 3 Design tools
 * - 4 Interactive validation tools
 * - 4 Code generation tools
 * + 4 Workflow guidance prompts
 */

import {
  defineMCPBuilder,
  DesignToolsPreset,
  InteractiveValidationToolsPreset,
  CodeGenerationToolsPreset,
  WorkflowPromptsPreset
} from '../src/index.js';

export default defineMCPBuilder({
  name: 'mcp-builder-complete',
  version: '2.5.0',
  description: 'Complete MCP Builder - Design, validate, generate, and deploy MCP servers',

  toolPresets: [
    DesignToolsPreset,                  // Step 1-2: Design your tool
    InteractiveValidationToolsPreset,   // Step 3-4: Validate with AI
    CodeGenerationToolsPreset           // Step 5-6: Generate & write code
  ],

  promptPresets: [
    WorkflowPromptsPreset               // Guidance at every step
  ]
});

/**
 * ============================================================================
 * COMPLETE WORKFLOW: FROM IDEA TO WORKING MCP SERVER
 * ============================================================================
 *
 * This example shows how to use Claude Code CLI to create a complete,
 * working MCP server from scratch.
 *
 * SETUP
 * =====
 *
 * 1. Start this server:
 *    ```bash
 *    npx simply-mcp run examples/mcp-builder-complete.ts
 *    ```
 *
 * 2. Connect Claude Code CLI:
 *    ```bash
 *    claude --mcp-config '{"mcpServers":{"mcp-builder":{"command":"npx","args":["simply-mcp","run","examples/mcp-builder-complete.ts"]}}}'
 *    ```
 *
 * COMPLETE EXAMPLE: Creating a Tip Calculator Tool
 * ==================================================
 *
 * User: "I want to create an MCP server with a tool to calculate tips."
 *
 * ─────────────────────────────────────────────────────────────────────────
 * STEP 1: DESIGN THE TOOL
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Claude: "Let me help you design a tip calculator tool. I'll use the
 *          design tools to create a well-structured design."
 *
 * [Claude calls design_tool]
 *
 * design_tool({
 *   purpose: "Calculate tip amount and total bill"
 * })
 *
 * Returns:
 * {
 *   "tool_name": "calculate_tip",
 *   "description": "Calculate tip amount and total bill based on bill amount and tip percentage",
 *   "parameters": [
 *     {
 *       "name": "bill_amount",
 *       "type": "number",
 *       "description": "Total bill amount before tip",
 *       "optional": false
 *     },
 *     {
 *       "name": "tip_percentage",
 *       "type": "number",
 *       "description": "Tip percentage (e.g., 15 for 15%)",
 *       "optional": false
 *     }
 *   ],
 *   "next_steps": [
 *     "Call analyze_tool_design_interactive to validate design",
 *     "Then call create_zod_schema to generate schema"
 *   ]
 * }
 *
 * ─────────────────────────────────────────────────────────────────────────
 * STEP 2: ANALYZE THE DESIGN
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Claude: "Let me analyze this design against Anthropic's best practices."
 *
 * [Claude calls analyze_tool_design_interactive with the design]
 *
 * Returns analysis prompt with evaluation criteria.
 *
 * Claude (reading prompt): "Let me evaluate:
 * - Strategic Selection: 90/100 - Clear, focused purpose
 * - Naming: 95/100 - Excellent snake_case, descriptive
 * - Parameters: 85/100 - Could add optional round_to_cents parameter
 * - Description: 90/100 - Clear and specific
 * - Efficiency: 95/100 - Very focused scope
 *
 * Overall score: 91/100"
 *
 * [Claude calls submit_tool_analysis with scores and feedback]
 *
 * Returns:
 * {
 *   "analysis_received": { "overall_score": 91, ... },
 *   "feedback": ["✅ Excellent! High quality design."],
 *   "next_steps": [
 *     "**Next**: Call `create_zod_schema` to generate parameter schema"
 *   ]
 * }
 *
 * ─────────────────────────────────────────────────────────────────────────
 * STEP 3: GENERATE SCHEMA
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Claude: "Great! Now let me generate the Zod schema."
 *
 * [Claude calls create_zod_schema]
 *
 * create_zod_schema({
 *   description: "bill_amount: number\ntip_percentage: number",
 *   strict: true
 * })
 *
 * Returns:
 * {
 *   "schema_code": "z.object({\n  bill_amount: z.number().positive().describe('Total bill amount before tip'),\n  tip_percentage: z.number().min(0).max(100).describe('Tip percentage (0-100)')\n}).strict()",
 *   "next_steps": ["Use analyze_schema_interactive to validate schema quality"]
 * }
 *
 * ─────────────────────────────────────────────────────────────────────────
 * STEP 4: VALIDATE SCHEMA (Optional but recommended)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * [Claude analyzes schema and submits analysis - similar to step 2]
 *
 * ─────────────────────────────────────────────────────────────────────────
 * STEP 5: GENERATE TOOL CODE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Claude: "Now I'll generate the complete TypeScript code for your tool."
 *
 * [Claude calls generate_tool_code]
 *
 * generate_tool_code({
 *   tool_name: "calculate_tip",
 *   description: "Calculate tip amount and total bill",
 *   schema_code: "<the schema from step 3>",
 *   purpose: "Help users calculate tips",
 *   implementation_notes: "Multiply bill by percentage/100 to get tip, add to bill for total"
 * })
 *
 * Returns:
 * {
 *   "generated_code": "import { z } from 'zod';\n\nexport const calculate_tipSchema = z.object({ ... });\n\nexport async function calculate_tip(params, context) {\n  // TODO: Implement\n}",
 *   "file_name": "calculate_tip.ts",
 *   "next_steps": [
 *     "Review the generated code",
 *     "Implement the TODO section",
 *     "Call generate_server_file to create complete server"
 *   ]
 * }
 *
 * ─────────────────────────────────────────────────────────────────────────
 * STEP 6: GENERATE COMPLETE SERVER
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Claude: "Let me create a complete server file with your tool."
 *
 * [Claude calls generate_server_file]
 *
 * generate_server_file({
 *   server_name: "tip-calculator",
 *   server_version: "1.0.0",
 *   tools: [{
 *     name: "calculate_tip",
 *     description: "Calculate tip amount and total",
 *     schema_code: "<schema from step 3>",
 *     implementation: "const tip = params.bill_amount * (params.tip_percentage / 100);\nconst total = params.bill_amount + tip;\nreturn `Tip: $${tip.toFixed(2)}, Total: $${total.toFixed(2)}`;"
 *   }],
 *   api_style: "functional"
 * })
 *
 * Returns:
 * {
 *   "generated_code": "<complete server code>",
 *   "file_name": "tip-calculator.ts",
 *   "tools_count": 1,
 *   "ready_to_run": true,
 *   "next_steps": [
 *     "Call write_file to save to filesystem",
 *     "Run: npx simply-mcp run ./tip-calculator.ts"
 *   ]
 * }
 *
 * ─────────────────────────────────────────────────────────────────────────
 * STEP 7: WRITE TO FILE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Claude: "Let me save this server to a file."
 *
 * First, preview:
 * [Claude calls preview_file_write to check if safe]
 *
 * Then write:
 * [Claude calls write_file]
 *
 * write_file({
 *   file_path: "./tip-calculator.ts",
 *   content: "<complete server code from step 6>",
 *   overwrite: false
 * })
 *
 * Returns:
 * {
 *   "success": true,
 *   "file_path": "/path/to/tip-calculator.ts",
 *   "file_size": 1234,
 *   "message": "Successfully wrote 1234 bytes to ./tip-calculator.ts",
 *   "next_steps": [
 *     "Run: npx simply-mcp run ./tip-calculator.ts"
 *   ]
 * }
 *
 * ─────────────────────────────────────────────────────────────────────────
 * STEP 8: RUN YOUR SERVER! 🎉
 * ─────────────────────────────────────────────────────────────────────────
 *
 * User runs:
 * ```bash
 * npx simply-mcp run ./tip-calculator.ts
 * ```
 *
 * Server starts! ✅
 *
 * Now you can use it:
 * - Connect to Claude Desktop
 * - Or call tools directly
 * - Or use HTTP transport
 *
 * ============================================================================
 * WHAT YOU GET
 * ============================================================================
 *
 * Starting from "I want to create a tip calculator", Claude Code helped you:
 *
 * ✅ Design a well-structured tool (following Anthropic principles)
 * ✅ Validate the design with AI analysis
 * ✅ Generate proper Zod schemas
 * ✅ Validate schema quality
 * ✅ Generate complete, production-ready TypeScript code
 * ✅ Write the code to a file
 * ✅ Get a WORKING MCP server ready to run!
 *
 * TIME: ~2-3 minutes of conversation
 * RESULT: Production-ready MCP server with validated design
 *
 * ============================================================================
 * HOW CLOSE TO COMPLETE?
 * ============================================================================
 *
 * With ALL presets loaded, you can achieve:
 *
 * ✅ 100% Complete Design (design_tool, analyze_tool_design_interactive)
 * ✅ 100% Complete Schema (create_zod_schema, analyze_schema_interactive)
 * ✅ 95% Complete Code (generate_tool_code, generate_server_file)
 *   - Claude can provide implementation in conversation
 *   - You just need to copy/paste or let Claude use write_file
 * ✅ 100% Complete File Creation (write_file, preview_file_write)
 *
 * Total: ~98% automated! The only manual step is reviewing/approving
 *
 * What you still need to do manually:
 * - Review generated code (good practice anyway!)
 * - Run `npx simply-mcp run <file>` to start
 * - Test the tool with real inputs
 *
 * ============================================================================
 * AVAILABLE TOOLS (11 total)
 * ============================================================================
 *
 * Design Phase (3 tools):
 * 1. design_tool - Interactive tool designer
 * 2. create_zod_schema - Generate Zod schemas
 * 3. validate_schema - Basic schema validation
 *
 * Validation Phase (4 tools):
 * 4. analyze_tool_design_interactive - Start AI tool analysis
 * 5. submit_tool_analysis - Submit Claude's analysis
 * 6. analyze_schema_interactive - Start AI schema analysis
 * 7. submit_schema_analysis - Submit Claude's schema analysis
 *
 * Generation Phase (4 tools):
 * 8. generate_tool_code - Generate complete tool implementation
 * 9. generate_server_file - Generate complete server file
 * 10. write_file - Write code to filesystem
 * 11. preview_file_write - Preview before writing
 *
 * Guidance (4 prompts):
 * - mcp_builder_workflow
 * - anthropic_best_practices
 * - how_to_use_sampling_tools
 * - zod_schema_patterns
 *
 * ============================================================================
 * GETTING STARTED
 * ============================================================================
 *
 * Just tell Claude what tool you want to create:
 *
 * "I want to create a tool that [does X]"
 *
 * Claude will guide you through:
 * 1. Designing it well
 * 2. Validating it against best practices
 * 3. Generating production-ready code
 * 4. Writing it to a file
 * 5. Running it!
 *
 * The entire process is conversational, iterative, and produces
 * high-quality, validated MCP servers. 🚀
 */
