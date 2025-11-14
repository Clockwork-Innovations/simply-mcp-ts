import type { IServer, ITool, IResource, IPrompt } from '../../src/index.js';

// Server without any hidden flags (backward compatibility test)
interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a user';
  params: {
    name: string;
  };
  result: {
    message: string;
  };
}

interface ConfigResource extends IResource {
  uri: 'config://app';
  name: 'App Configuration';
  description: 'Application configuration';
  mimeType: 'application/json';
  returns: string;
}

interface HelpPrompt extends IPrompt {
  name: 'help';
  description: 'Get help';
  arguments: [];
}

export default class BackwardCompatServer implements IServer {
  name = 'backward-compat-server';
  version = '1.0.0';
  description = 'Test server without hidden flags';

  greet: GreetTool = async (params) => {
    return { message: `Hello, ${params.name}!` };
  };

  'config://app': ConfigResource = async () => {
    return JSON.stringify({ version: '1.0.0' });
  };

  help: HelpPrompt = async () => {
    return 'How can I help you?';
  };
}
