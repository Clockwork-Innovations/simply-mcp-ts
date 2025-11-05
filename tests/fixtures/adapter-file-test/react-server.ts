
import type { IServer, IUI } from 'simply-mcp';

interface ReactUI extends IUI {
  uri: 'ui://react/dashboard';
  name: 'React Dashboard';
  description: 'React component UI';
  component: './components/Dashboard.tsx';
  dependencies: ['react'];
}

interface MyServer extends IServer {
  name: 'react-server';
  version: '1.0.0';
}

export default class ReactServer {}
