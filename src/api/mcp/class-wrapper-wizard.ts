/**
 * MCP Class Wrapper Wizard
 *
 * Interactive wizard that transforms existing TypeScript classes
 * into MCP servers by adding decorators.
 */

import { defineMCPBuilder } from './builders.js';
import { classWrapperTools } from './class-wrapper/tools.js';

/**
 * Class Wrapper Wizard Server
 *
 * Provides 6 interactive tools for converting TypeScript classes
 * into MCP servers with decorators:
 *
 * 1. start_wizard - Initialize the wizard
 * 2. load_file - Load and analyze a TypeScript class
 * 3. confirm_server_metadata - Set server name, version, description
 * 4. add_tool_decorator - Mark methods to expose as tools (repeatable)
 * 5. preview_annotations - Preview the decorated code
 * 6. finish_and_write - Write {YourClass}.mcp.ts file
 *
 * The wizard preserves 100% of the original implementation and creates
 * a new file with decorators added.
 */
export const ClassWrapperWizard = defineMCPBuilder({
  name: 'mcp-class-wrapper-wizard',
  version: '2.5.0',
  description: 'Interactive wizard to convert TypeScript classes into MCP servers with decorators',
  customTools: classWrapperTools,
});

export default ClassWrapperWizard;
