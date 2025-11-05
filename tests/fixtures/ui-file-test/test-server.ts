
import type { IServer, IUI } from 'simply-mcp';

interface CalculatorUI extends IUI {
  uri: 'ui://calculator/v1';
  name: 'Calculator';
  description: 'Simple calculator interface';
  file: './ui/calculator.html';
  stylesheets: ['./styles/theme.css'];
  scripts: ['./scripts/calculator.js'];
  tools: ['add', 'subtract'];
  size: { width: 400, height: 600 };
}

interface ReactDashboard extends IUI {
  uri: 'ui://dashboard/v1';
  name: 'Dashboard';
  description: 'React-based dashboard';
  component: './components/Dashboard.tsx';
  dependencies: ['react', 'recharts'];
  tools: ['fetch_data'];
}

interface InlineUI extends IUI {
  uri: 'ui://simple/v1';
  name: 'Simple UI';
  description: 'Inline HTML UI';
  html: '<div>Hello World</div>';
}

interface MyServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServer {}
