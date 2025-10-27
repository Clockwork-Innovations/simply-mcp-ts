
import type { IServer, IUI } from 'simply-mcp';

interface ConflictingUI extends IUI {
  uri: 'ui://conflict/v1';
  name: 'Conflict';
  description: 'Has both html and file';
  html: '<div>Inline</div>';
  file: './ui/calculator.html';
}

interface MyServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServer implements MyServer {}
