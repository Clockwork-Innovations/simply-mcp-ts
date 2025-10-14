/**
 * MCP Builder Wizard Tools
 *
 * Five wizard tools that guide the LLM through server creation step-by-step.
 * Tools manage state and provide instructions, while the LLM does processing.
 */

import { z } from 'zod';
import type { MCPBuilderTool } from '../types.js';
import type { WizardState, ParamDef, CompletedTool } from './state.js';
import { WizardStateManager } from './state.js';
import {
  validateServerName,
  validateVersion,
  validateToolName,
  validateParameters
} from './validators.js';
import {
  generateServerCode,
  generateZodSchema
} from './generators.js';

// Global state manager
const stateManager = new WizardStateManager();

/**
 * TOOL 1: start_wizard
 *
 * Initialize a new wizard session and provide welcome instructions.
 */
export const startWizardTool: MCPBuilderTool = {
  name: 'start_wizard',
  description: 'Start a new MCP server wizard session. Returns welcome message and instructions for gathering server information.',
  category: 'design',
  parameters: z.object({
    // No parameters needed - just start fresh
  }),
  execute: async (args, context) => {
    // Create new state
    const sessionId = context?.metadata?.sessionId as string | undefined;
    const state = stateManager.createState(sessionId);

    const response = {
      success: true,
      message: `Welcome to the MCP Server Wizard!

I'll help you create a complete, production-ready MCP server step by step.

**Next Step**: Please tell me about your server:

1. **Server Name** - What would you like to call your server? (Use kebab-case, e.g., "my-awesome-server")
2. **Version** - What version should we start with? (Use semver, e.g., "1.0.0")
3. **Description** - What does your server do? (One sentence is fine)

Once you provide this information, I'll validate it and we can start adding tools!`,
      data: {
        wizard_started: true,
        session_id: state.sessionId,
        current_step: state.currentStep,
      },
      next_action: 'Call set_server_info with the server metadata',
      example: {
        name: 'weather-service',
        version: '1.0.0',
        description: 'Provides weather information for cities worldwide'
      }
    };

    return JSON.stringify(response, null, 2);
  }
};

/**
 * TOOL 2: set_server_info
 *
 * Collect and validate server metadata.
 */
export const setServerInfoTool: MCPBuilderTool = {
  name: 'set_server_info',
  description: 'Set server metadata (name, version, description). Validates format and stores configuration. Returns confirmation and instructions to describe first tool.',
  category: 'design',
  parameters: z.object({
    name: z.string().describe('Server name in kebab-case (e.g., "weather-api")'),
    version: z.string().describe('Semver version (e.g., "1.0.0")'),
    description: z.string().optional().describe('Server description (optional)')
  }),
  execute: async (args, context) => {
    const sessionId = context?.metadata?.sessionId as string | undefined;
    const state = stateManager.getState(sessionId);

    if (!state) {
      return JSON.stringify({
        success: false,
        error: 'No wizard session found. Please call start_wizard first.',
        next_action: 'Call start_wizard to begin'
      }, null, 2);
    }

    // Validate name
    const nameValidation = validateServerName(args.name);
    if (!nameValidation.valid) {
      return JSON.stringify({
        success: false,
        error: nameValidation.error,
        next_action: 'Call set_server_info again with corrected name',
        example: { name: 'my-server' }
      }, null, 2);
    }

    // Validate version
    const versionValidation = validateVersion(args.version);
    if (!versionValidation.valid) {
      return JSON.stringify({
        success: false,
        error: versionValidation.error,
        next_action: 'Call set_server_info again with corrected version',
        example: { version: '1.0.0' }
      }, null, 2);
    }

    // Update state
    state.serverConfig = {
      name: args.name,
      version: args.version,
      description: args.description
    };
    state.currentStep = 'server_info';
    stateManager.updateState(state, sessionId);

    const response = {
      success: true,
      message: `Great! Server "${args.name}" v${args.version} configured successfully!

${args.description ? `Description: "${args.description}"\n` : ''}
**Next Step**: Let's add your first tool!

Tell me about the tool you want to create:
- What should it do? (Be specific about its purpose)
- What inputs will it need? (Optional - I can help figure this out)

Example: "I want a tool that calculates the tip amount for a restaurant bill"`,
      data: {
        server_config: state.serverConfig,
        current_step: state.currentStep
      },
      next_action: 'Call add_tool with the tool purpose and expected inputs'
    };

    return JSON.stringify(response, null, 2);
  }
};

/**
 * TOOL 3: add_tool
 *
 * Start defining a new tool - capture purpose and prepare for parameter structuring.
 */
export const addToolTool: MCPBuilderTool = {
  name: 'add_tool',
  description: 'Start defining a new tool. Provide the tool purpose and optionally describe expected parameters. Returns instructions for LLM to structure parameters as an array.',
  category: 'design',
  parameters: z.object({
    purpose: z.string().describe('What the tool should accomplish (clear, specific description)'),
    parameters_description: z.string().optional().describe('Natural language description of what parameters the tool needs')
  }),
  execute: async (args, context) => {
    const sessionId = context?.metadata?.sessionId as string | undefined;
    const state = stateManager.getState(sessionId);

    if (!state) {
      return JSON.stringify({
        success: false,
        error: 'No wizard session found. Please call start_wizard first.',
        next_action: 'Call start_wizard to begin'
      }, null, 2);
    }

    if (state.currentStep === 'init') {
      return JSON.stringify({
        success: false,
        error: 'Server info not set. Please call set_server_info first.',
        next_action: 'Call set_server_info with server metadata'
      }, null, 2);
    }

    // Store current tool being defined
    state.currentTool = {
      purpose: args.purpose,
      parameters_description: args.parameters_description
    };
    state.currentStep = 'adding_tools';
    stateManager.updateState(state, sessionId);

    // Generate suggested tool name from purpose
    const suggestedName = args.purpose
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');

    const response = {
      success: true,
      message: `Excellent! Let's define the parameters for this tool.

**Tool Purpose**: ${args.purpose}
**Suggested Name**: ${suggestedName}

${args.parameters_description ? `**Parameter Description**: ${args.parameters_description}\n` : ''}
**Next Step**: Please structure the parameters as an array of objects with this format:

\`\`\`typescript
[
  {
    name: "parameter_name",
    type: "string" | "number" | "boolean" | "array" | "object",
    description: "Clear description for AI agents",
    required: true | false,
    default: <optional default value>
  },
  // ... more parameters
]
\`\`\`

**Example** (for a tip calculator):
\`\`\`json
[
  {
    "name": "bill_amount",
    "type": "number",
    "description": "Total bill amount before tip",
    "required": true
  },
  {
    "name": "tip_percentage",
    "type": "number",
    "description": "Tip percentage (e.g., 15 for 15%)",
    "required": false,
    "default": 15
  }
]
\`\`\`

Now, please call \`confirm_tool_parameters\` with:
- \`tool_name\`: The name for this tool (kebab-case)
- \`parameters\`: Array of parameter objects as shown above`,
      data: {
        tool_in_progress: state.currentTool,
        suggested_name: suggestedName,
        current_step: state.currentStep
      },
      next_action: 'Call confirm_tool_parameters with structured parameter array',
      example: {
        tool_name: suggestedName,
        parameters: [
          {
            name: 'example_param',
            type: 'string',
            description: 'Example parameter description',
            required: true
          }
        ]
      }
    };

    return JSON.stringify(response, null, 2);
  }
};

/**
 * TOOL 4: confirm_tool_parameters
 *
 * Finalize tool definition with structured parameters from LLM.
 */
export const confirmToolParametersTool: MCPBuilderTool = {
  name: 'confirm_tool_parameters',
  description: 'Finalize tool definition with structured parameter array. Validates parameter structure and generates Zod schema. Returns preview and option to add another tool or finish.',
  category: 'design',
  parameters: z.object({
    tool_name: z.string().describe('Tool name in kebab-case'),
    parameters: z.array(z.object({
      name: z.string().describe('Parameter name (snake_case)'),
      type: z.enum(['string', 'number', 'boolean', 'array', 'object', 'any']).describe('Parameter type'),
      description: z.string().describe('Clear description for AI agents'),
      required: z.boolean().describe('Is this parameter required?'),
      default: z.any().optional().describe('Default value (optional)')
    })).describe('Array of parameter definitions'),
    implementation_notes: z.string().optional().describe('Optional notes on how to implement the tool logic')
  }),
  execute: async (args, context) => {
    const sessionId = context?.metadata?.sessionId as string | undefined;
    const state = stateManager.getState(sessionId);

    if (!state || !state.currentTool) {
      return JSON.stringify({
        success: false,
        error: 'No tool in progress. Please call add_tool first.',
        next_action: 'Call add_tool to start defining a tool'
      }, null, 2);
    }

    // Validate tool name
    const nameValidation = validateToolName(args.tool_name);
    if (!nameValidation.valid) {
      return JSON.stringify({
        success: false,
        error: nameValidation.error,
        next_action: 'Call confirm_tool_parameters again with corrected tool_name',
        example: { tool_name: 'calculate-tip' }
      }, null, 2);
    }

    // Validate parameters structure
    const paramsValidation = validateParameters(args.parameters);
    if (!paramsValidation.valid) {
      return JSON.stringify({
        success: false,
        error: paramsValidation.error,
        next_action: 'Call confirm_tool_parameters again with corrected parameters array',
        example: {
          parameters: [
            {
              name: 'example_param',
              type: 'string',
              description: 'Example parameter',
              required: true
            }
          ]
        }
      }, null, 2);
    }

    // Generate Zod schema from parameters
    const zodSchema = generateZodSchema(args.parameters);

    // Create completed tool
    const completedTool: CompletedTool = {
      name: args.tool_name,
      description: state.currentTool.purpose,
      parameters: args.parameters,
      zodSchemaCode: zodSchema,
      implementationNotes: args.implementation_notes
    };

    // Update state
    state.completedTools.push(completedTool);
    state.currentTool = undefined;
    stateManager.updateState(state, sessionId);

    const response = {
      success: true,
      message: `Perfect! Tool "${args.tool_name}" defined successfully!

**Generated Zod Schema Preview**:
\`\`\`typescript
${zodSchema}
\`\`\`

**What's next?**

You have ${state.completedTools.length} tool(s) defined so far.

**Option 1**: Add another tool
- Call \`add_tool\` with the next tool's purpose

**Option 2**: Finish and generate code
- Call \`finish_wizard\` to generate the complete server file
- You'll get production-ready TypeScript code`,
      data: {
        completed_tool: completedTool,
        total_tools: state.completedTools.length,
        schema_preview: zodSchema,
        current_step: state.currentStep
      },
      next_action: 'Call add_tool to add another tool, OR call finish_wizard to generate server code'
    };

    return JSON.stringify(response, null, 2);
  }
};

/**
 * TOOL 5: finish_wizard
 *
 * Generate complete server code from accumulated state.
 */
export const finishWizardTool: MCPBuilderTool = {
  name: 'finish_wizard',
  description: 'Generate complete MCP server file from accumulated configuration. Validates state and returns production-ready TypeScript code with run instructions.',
  category: 'generate',
  parameters: z.object({
    output_path: z.string().optional().describe('Optional file path where code should be written (relative to current directory)'),
    api_style: z.enum(['functional', 'decorator', 'programmatic']).optional().default('functional').describe('Which API style to use for generated code')
  }),
  execute: async (args, context) => {
    const sessionId = context?.metadata?.sessionId as string | undefined;
    const state = stateManager.getState(sessionId);

    if (!state) {
      return JSON.stringify({
        success: false,
        error: 'No wizard session found.',
        next_action: 'Start over with start_wizard'
      }, null, 2);
    }

    // Validate state has required data
    if (!state.serverConfig.name || !state.serverConfig.version) {
      return JSON.stringify({
        success: false,
        error: 'Server info not complete. Please call set_server_info first.',
        next_action: 'Call set_server_info with server metadata'
      }, null, 2);
    }

    if (state.completedTools.length === 0) {
      return JSON.stringify({
        success: false,
        error: 'No tools defined. Please add at least one tool.',
        next_action: 'Call add_tool to define a tool'
      }, null, 2);
    }

    // Generate complete server code
    const serverCode = generateServerCode({
      serverConfig: state.serverConfig,
      tools: state.completedTools,
      apiStyle: args.api_style || 'functional'
    });

    // Mark wizard as complete
    state.currentStep = 'complete';
    stateManager.updateState(state, sessionId);

    // Generate suggested filename
    const suggestedFilename = `${state.serverConfig.name}.ts`;

    const response = {
      success: true,
      message: `Your MCP server is ready!

**Generated**: ${state.serverConfig.name} v${state.serverConfig.version}
**Tools**: ${state.completedTools.length}
**API Style**: ${args.api_style || 'functional'}

${args.output_path ? `\n**Output Path**: ${args.output_path}\n` : ''}
**To save this file**:
1. Copy the code below
2. Save as \`${suggestedFilename}\`
3. Or specify output_path parameter to write automatically

**To run your server**:
\`\`\`bash
npx simply-mcp run ${args.output_path || suggestedFilename}
\`\`\`

**To bundle for distribution**:
\`\`\`bash
npx simply-mcp bundle ${args.output_path || suggestedFilename}
\`\`\`

**Server Code**:
\`\`\`typescript
${serverCode}
\`\`\`

Your server is production-ready!`,
      data: {
        server_name: state.serverConfig.name,
        server_version: state.serverConfig.version,
        tools_count: state.completedTools.length,
        suggested_filename: suggestedFilename,
        api_style: args.api_style || 'functional',
        wizard_complete: true
      },
      generated_code: serverCode,
      next_action: 'Save the code and run: npx simply-mcp run <filename>'
    };

    // Clean up state after completion (keep for 5 minutes)
    setTimeout(() => {
      stateManager.deleteState(sessionId);
    }, 5 * 60 * 1000);

    return JSON.stringify(response, null, 2);
  }
};

/**
 * Export all wizard tools
 */
export const wizardTools: MCPBuilderTool[] = [
  startWizardTool,
  setServerInfoTool,
  addToolTool,
  confirmToolParametersTool,
  finishWizardTool
];
