import type { IServer, ITool, IResource, IPrompt } from '../../src/index.js';

// PUBLIC TOOLS (visible: true or undefined)
interface PublicGreetTool extends ITool {
  name: 'public_greet';
  description: 'Public greeting tool';
  hidden?: false;
  params: {
    name: string;
  };
  result: {
    message: string;
  };
}

interface PublicCalculateTool extends ITool {
  name: 'public_calculate';
  description: 'Public calculation tool';
  // hidden omitted = visible
  params: {
    a: number;
    b: number;
  };
  result: {
    sum: number;
  };
}

// HIDDEN TOOLS
interface InternalDebugTool extends ITool {
  name: 'internal_debug';
  description: 'Internal debugging tool';
  hidden: true;
  params: {
    level: string;
  };
  result: {
    debug: string;
  };
}

interface InternalAdminTool extends ITool {
  name: 'internal_admin';
  description: 'Internal admin tool';
  hidden: true;
  params: {
    action: string;
  };
  result: {
    status: string;
  };
}

// PUBLIC RESOURCES
interface PublicConfigResource extends IResource {
  uri: 'config://public';
  name: 'Public Configuration';
  description: 'Public configuration data';
  hidden?: false;
  mimeType: 'application/json';
  returns: string;
}

// HIDDEN RESOURCES
interface InternalConfigResource extends IResource {
  uri: 'config://internal';
  name: 'Internal Configuration';
  description: 'Internal configuration data';
  hidden: true;
  mimeType: 'application/json';
  returns: string;
}

// PUBLIC PROMPTS
interface HelpPrompt extends IPrompt {
  name: 'help_prompt';
  description: 'Public help prompt';
  hidden?: false;
  arguments: [];
}

// HIDDEN PROMPTS
interface DebugPrompt extends IPrompt {
  name: 'debug_prompt';
  description: 'Internal debug prompt';
  hidden: true;
  arguments: [];
}

// Server class implementing all tools, resources, and prompts
export default class TestHiddenFlagServer implements IServer {
  name = 'test-hidden-flag-server';
  version = '1.0.0';
  description = 'Test server with hidden flags';

  // Tool implementations
  public_greet: PublicGreetTool = async (params) => {
    return { message: `Hello, ${params.name}!` };
  };

  public_calculate: PublicCalculateTool = async (params) => {
    return { sum: params.a + params.b };
  };

  internal_debug: InternalDebugTool = async (params) => {
    return { debug: `Debug level: ${params.level}` };
  };

  internal_admin: InternalAdminTool = async (params) => {
    return { status: `Admin action: ${params.action} executed` };
  };

  // Resource implementations
  'config://public': PublicConfigResource = async () => {
    return JSON.stringify({ version: '1.0.0', public: true });
  };

  'config://internal': InternalConfigResource = async () => {
    return JSON.stringify({ apiKey: 'secret-key', internal: true });
  };

  // Prompt implementations
  help_prompt: HelpPrompt = async () => {
    return 'How can I help you today?';
  };

  debug_prompt: DebugPrompt = async () => {
    return 'Debug mode activated. Enter commands:';
  };
}
