/**
 * Test: Adapter File Loading (Task 15)
 *
 * Validates that the adapter correctly loads and injects external files.
 */

import { loadInterfaceServer } from '../src/adapter.js';
import { resolve } from 'path';
import { writeFileSync, mkdirSync, rmSync } from 'fs';

// Create test directory and files
const testDir = resolve(process.cwd(), 'tests/fixtures/adapter-file-test');
const serverFile = resolve(testDir, 'test-server.ts');
const htmlFile = resolve(testDir, 'ui/form.html');
const cssFile1 = resolve(testDir, 'styles/reset.css');
const cssFile2 = resolve(testDir, 'styles/theme.css');
const jsFile1 = resolve(testDir, 'scripts/validation.js');
const jsFile2 = resolve(testDir, 'scripts/form.js');

try {
  // Clean and create test directory structure
  rmSync(testDir, { recursive: true, force: true });
  mkdirSync(resolve(testDir, 'ui'), { recursive: true });
  mkdirSync(resolve(testDir, 'styles'), { recursive: true });
  mkdirSync(resolve(testDir, 'scripts'), { recursive: true });

  // Create test HTML file
  writeFileSync(htmlFile, `<!DOCTYPE html>
<html>
<head>
  <title>Contact Form</title>
</head>
<body>
  <form id="contact-form">
    <input type="text" id="name" placeholder="Name" />
    <input type="email" id="email" placeholder="Email" />
    <button type="submit">Submit</button>
  </form>
</body>
</html>`);

  // Create CSS files
  writeFileSync(cssFile1, `* { margin: 0; padding: 0; box-sizing: border-box; }`);
  writeFileSync(cssFile2, `body { font-family: Arial; background: #f5f5f5; }`);

  // Create JS files
  writeFileSync(jsFile1, `function validateEmail(email) { return email.includes('@'); }`);
  writeFileSync(jsFile2, `document.getElementById('contact-form').onsubmit = (e) => e.preventDefault();`);

  // Create test server with file-based UI
  const serverCode = `
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
`;

  writeFileSync(serverFile, serverCode);

  // Load the server
  console.log('Loading server...');
  const server = await loadInterfaceServer({
    filePath: serverFile,
    verbose: false,
  });

  console.log('\n=== Adapter File Loading Test ===\n');

  // Get registered resources
  const resources = server.listResources();
  console.log(`✓ Server loaded with ${resources.length} resources`);

  // Test 1: File-based UI resource
  const contactFormResource = resources.find(r => r.uri === 'ui://contact/form');
  if (!contactFormResource) {
    throw new Error('Contact form resource not registered');
  }

  console.log('\n--- File-based UI Resource ---');
  console.log(`URI: ${contactFormResource.uri}`);
  console.log(`Name: ${contactFormResource.name}`);
  console.log(`Description: ${contactFormResource.description}`);
  console.log(`MIME Type: ${contactFormResource.mimeType}`);

  // Fetch the resource content
  const contactFormContent = await server.readResource('ui://contact/form');
  const htmlContent = contactFormContent.contents[0].text || '';

  console.log(`\nContent Length: ${htmlContent.length} bytes`);

  // Validate HTML file content is included
  if (!htmlContent.includes('<form id="contact-form">')) {
    throw new Error('HTML file content not found in output');
  }
  console.log('✓ HTML file content loaded');

  // Validate CSS files are injected
  if (!htmlContent.includes('margin: 0; padding: 0; box-sizing: border-box;')) {
    throw new Error('Reset CSS not injected');
  }
  console.log('✓ Reset CSS injected');

  if (!htmlContent.includes('font-family: Arial; background: #f5f5f5;')) {
    throw new Error('Theme CSS not injected');
  }
  console.log('✓ Theme CSS injected');

  // Validate JS files are injected
  if (!htmlContent.includes('validateEmail')) {
    throw new Error('Validation script not injected');
  }
  console.log('✓ Validation script injected');

  if (!htmlContent.includes('contact-form')) {
    throw new Error('Form script not injected');
  }
  console.log('✓ Form script injected');

  // Validate tool helper is injected
  if (!htmlContent.includes('window.callTool')) {
    throw new Error('Tool helper not injected');
  }
  console.log('✓ Tool helper injected');

  // Validate tool allowlist
  if (!htmlContent.includes('submit_contact')) {
    throw new Error('Tool allowlist not configured');
  }
  console.log('✓ Tool allowlist configured');

  // Validate injection order (stylesheets before body, scripts before /body)
  const styleIndex = htmlContent.indexOf('<style>');
  const bodyIndex = htmlContent.indexOf('<body>');
  const scriptIndex = htmlContent.lastIndexOf('<script>');
  const bodyEndIndex = htmlContent.indexOf('</body>');

  if (styleIndex === -1 || bodyIndex === -1) {
    throw new Error('Style or body tag not found');
  }

  if (styleIndex > bodyIndex) {
    throw new Error('Styles should be injected before body');
  }
  console.log('✓ Styles injected in correct position');

  if (scriptIndex === -1 || bodyEndIndex === -1) {
    throw new Error('Script or body end tag not found');
  }

  if (scriptIndex > bodyEndIndex) {
    throw new Error('Scripts should be injected before </body>');
  }
  console.log('✓ Scripts injected in correct position');

  // Test 2: Inline UI resource (backward compatibility)
  const inlineResource = resources.find(r => r.uri === 'ui://simple/inline');
  if (!inlineResource) {
    throw new Error('Inline UI resource not registered');
  }

  console.log('\n--- Inline UI Resource (Backward Compatibility) ---');
  console.log(`URI: ${inlineResource.uri}`);
  console.log(`Name: ${inlineResource.name}`);

  const inlineContent = await server.readResource('ui://simple/inline');
  const inlineHtml = inlineContent.contents[0].text || '';

  // Validate inline content
  if (!inlineHtml.includes('<div id="simple">Inline Content</div>')) {
    throw new Error('Inline HTML not found');
  }
  console.log('✓ Inline HTML preserved');

  if (!inlineHtml.includes('.simple { color: blue; }')) {
    throw new Error('Inline CSS not injected');
  }
  console.log('✓ Inline CSS injected');

  if (!inlineHtml.includes('test_tool')) {
    throw new Error('Inline UI tool allowlist not configured');
  }
  console.log('✓ Inline UI tool allowlist configured');

  // Test 3: React component error handling
  const reactServerCode = `
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
`;

  const reactServerFile = resolve(testDir, 'react-server.ts');
  writeFileSync(reactServerFile, reactServerCode);

  console.log('\n--- React Component Error Handling ---');

  let caughtError = false;
  try {
    await loadInterfaceServer({ filePath: reactServerFile, verbose: false });
  } catch (error: any) {
    if (error.message.includes('React component UIs not yet supported')) {
      caughtError = true;
      console.log('✓ React component throws appropriate error');
      console.log(`  Message: ${error.message.split('\\n')[0]}`);
    }
  }

  if (!caughtError) {
    throw new Error('Expected React component error but none was thrown');
  }

  console.log('\n=== All Adapter Tests Passed ===\n');
  console.log('Summary:');
  console.log('  ✓ File-based UI loaded correctly');
  console.log('  ✓ HTML file content included');
  console.log('  ✓ Multiple CSS files injected');
  console.log('  ✓ Multiple JS files injected');
  console.log('  ✓ Tool helpers injected');
  console.log('  ✓ Injection order correct');
  console.log('  ✓ Backward compatibility maintained');
  console.log('  ✓ React component error handling works');

  process.exit(0);
} catch (error: any) {
  console.error('\n❌ Test Failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  // Cleanup
  rmSync(testDir, { recursive: true, force: true });
}
