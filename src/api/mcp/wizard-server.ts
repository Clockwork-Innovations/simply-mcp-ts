/**
 * MCP Builder Wizard Server
 *
 * Interactive wizard for building MCP servers through natural conversation.
 * The wizard uses the connected LLM to process natural language and guide
 * users through server creation step-by-step.
 */

import { defineMCPBuilder } from './builders.js';
import { wizardTools } from './wizard/tools.js';

export const WizardServer = defineMCPBuilder({
  name: 'mcp-wizard',
  version: '2.5.0',
  description: 'Interactive MCP server builder wizard - create servers through conversation',

  // Wizard tools (5 tools for foundation)
  customTools: wizardTools,

  // No presets needed - the wizard tools ARE the complete feature set
});

export default WizardServer;
