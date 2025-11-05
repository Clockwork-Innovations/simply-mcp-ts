import { ITool, IServer } from 'simply-mcp';

class PingTool implements ITool {
  name = 'ping';
  description = 'Ping the server';

  execute() {
    return 'pong';
  }
}

class InfoTool implements ITool {
  name = 'info';
  description = 'Get server info';

  execute() {
    return {
      server: 'interface-test-server',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
  }
}

class InterfaceTestServer {
  name = 'interface-test-server';
  version = '1.0.0';
  description = 'Interface API HTTP Transport Test Server';

  tools = [new PingTool(), new InfoTool()];
}

export default InterfaceTestServer;
