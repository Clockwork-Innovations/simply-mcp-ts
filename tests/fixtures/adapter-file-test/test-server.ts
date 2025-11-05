
import type { IServer, IUI, ITool } from 'simply-mcp';

interface ContactFormUI extends IUI {
  uri: 'ui://contact/form';
  name: 'Contact Form';
  description: 'User contact form with validation';
  file: './ui/form.html';
  stylesheets: ['./styles/reset.css', './styles/theme.css'];
  scripts: ['./scripts/validation.js', './scripts/form.js'];
  tools: ['submit_contact'];
  size: { width: 500, height: 400 };
}

interface InlineUI extends IUI {
  uri: 'ui://simple/inline';
  name: 'Simple Inline';
  description: 'Inline HTML for backward compatibility';
  html: '<div id="simple">Inline Content</div>';
  css: '.simple { color: blue; }';
  tools: ['test_tool'];
}

interface SubmitContactTool extends ITool {
  name: 'submit_contact';
  description: 'Submit contact form';
  params: { name: string; email: string };
  result: { success: boolean };
}

interface TestTool extends ITool {
  name: 'test_tool';
  description: 'Test tool';
  params: {};
  result: string;
}

interface MyServer extends IServer {
  name: 'test-server';
  version: '1.0.0';
}

export default class TestServer {
  submitContact: SubmitContactTool = async (params) => {
    return { success: true };
  };

  testTool: TestTool = async () => {
    return 'ok';
  };
}
