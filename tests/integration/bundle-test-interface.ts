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
      server: 'bundle-test-interface',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
  }
}

class BundleTestInterfaceServer implements IServer {
  name = 'bundle-test-interface';
  version = '1.0.0';
  description = 'Minimal interface server for bundle smoke testing';

  tools = [new PingTool(), new InfoTool()];
}

export default BundleTestInterfaceServer;
