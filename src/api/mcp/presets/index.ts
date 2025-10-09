/**
 * MCP Builder Presets
 *
 * Pre-built tool, prompt, and resource collections for MCP development.
 * Import and use these presets to quickly build MCP development servers.
 *
 * Layer 1 (Foundation): Basic design tools
 * Layer 2 (Feature): Sampling-based validation, workflow guidance
 *
 * @module api/mcp/presets
 */

// Layer 1: Foundation - Design Tools
export { DesignToolsPreset } from './design-tools.js';

// Layer 2: Feature - Validation Tools (sampling-based)
export { ValidationToolsPreset } from './validation-tools.js';

// Layer 2: Feature - Interactive Validation Tools (no sampling required - works with Claude Code CLI!)
export { InteractiveValidationToolsPreset } from './interactive-validation-tools.js';

// Layer 2: Feature - Code Generation Tools (complete the workflow!)
export { CodeGenerationToolsPreset } from './code-generation-tools.js';

// Layer 2: Feature - Workflow Prompts (guidance)
export { WorkflowPromptsPreset } from './workflow-prompts.js';

// Future presets (Layer 3 - Polish):
// - TestToolsPreset (test generation and execution)
// - ReferenceResourcesPreset (MCP protocol, Zod patterns, etc.)
