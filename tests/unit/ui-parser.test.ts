/**
 * UI Parser Unit Tests
 *
 * Tests parseUIInterface() function from parser.ts
 * Validates extraction of IUI interface metadata
 */

import { describe, it, expect } from '@jest/globals';
import { parseInterfaceFile, type ParseResult, type ParsedUI } from '../../src/server/parser.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('UI Parser', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-parser-test-'));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Static UI Parsing', () => {
    it('should parse static UI with html and css', () => {
      const testFile = path.join(tempDir, 'static-ui.ts');
      fs.writeFileSync(testFile, `
        import type { IServer, IUI } from 'simply-mcp';

        interface ProductUI extends IUI {
          uri: 'ui://products/selector';
          name: 'Product Selector';
          description: 'Select a product from list';
          html: '<div><h1>Products</h1></div>';
          css: '.product { padding: 10px; }';
          tools: ['select_product', 'filter_products'];
          size: { width: 800; height: 600 };
          subscribable: true;
        }

        interface TestServer extends IServer {
          name: 'test-server';
          version: '1.0.0';
        }

        export default class TestServerImpl implements TestServer {}
      `);

      const result = parseInterfaceFile(testFile);

      expect(result.uis).toHaveLength(1);

      const ui = result.uis[0];
      expect(ui.interfaceName).toBe('ProductUI');
      expect(ui.uri).toBe('ui://products/selector');
      expect(ui.name).toBe('Product Selector');
      expect(ui.description).toBe('Select a product from list');
      expect(ui.html).toBe('<div><h1>Products</h1></div>');
      expect(ui.css).toBe('.product { padding: 10px; }');
      expect(ui.tools).toEqual(['select_product', 'filter_products']);
      expect(ui.size).toEqual({ width: 800, height: 600 });
      expect(ui.subscribable).toBe(true);
      expect(ui.dynamic).toBe(false); // Static because html is provided
      expect(ui.methodName).toBeUndefined(); // No method for static
    });

    it('should parse static UI with minimal fields', () => {
      const testFile = path.join(tempDir, 'minimal-ui.ts');
      fs.writeFileSync(testFile, `
        import type { IUI } from 'simply-mcp';

        interface MinimalUI extends IUI {
          uri: 'ui://minimal';
          name: 'Minimal UI';
          description: 'A minimal UI';
          html: '<div>Minimal</div>';
        }
      `);

      const result = parseInterfaceFile(testFile);

      expect(result.uis).toHaveLength(1);

      const ui = result.uis[0];
      expect(ui.uri).toBe('ui://minimal');
      expect(ui.name).toBe('Minimal UI');
      expect(ui.description).toBe('A minimal UI');
      expect(ui.html).toBe('<div>Minimal</div>');
      expect(ui.css).toBeUndefined();
      expect(ui.tools).toBeUndefined();
      expect(ui.size).toBeUndefined();
      expect(ui.subscribable).toBeUndefined();
      expect(ui.dynamic).toBe(false);
    });

    it('should parse static UI with template literal HTML', () => {
      const testFile = path.join(tempDir, 'template-ui.ts');
      fs.writeFileSync(testFile, `
        import type { IUI } from 'simply-mcp';

        interface TemplateUI extends IUI {
          uri: 'ui://template';
          name: 'Template UI';
          description: 'Uses template literal';
          html: \`
            <div>
              <h1>Template</h1>
              <p>Multi-line</p>
            </div>
          \`;
        }
      `);

      const result = parseInterfaceFile(testFile);

      expect(result.uis).toHaveLength(1);

      const ui = result.uis[0];
      expect(ui.html).toContain('<h1>Template</h1>');
      expect(ui.html).toContain('<p>Multi-line</p>');
    });

    it('should parse UI with empty tools array', () => {
      const testFile = path.join(tempDir, 'no-tools-ui.ts');
      fs.writeFileSync(testFile, `
        import type { IUI } from 'simply-mcp';

        interface NoToolsUI extends IUI {
          uri: 'ui://no-tools';
          name: 'No Tools';
          description: 'UI without tools';
          html: '<div>No tools</div>';
          tools: [];
        }
      `);

      const result = parseInterfaceFile(testFile);

      expect(result.uis).toHaveLength(1);

      const ui = result.uis[0];
      // Parser doesn't extract empty arrays, so tools will be undefined
      expect(ui.tools).toBeUndefined();
    });

    it('should parse UI with subscribable false', () => {
      const testFile = path.join(tempDir, 'not-subscribable-ui.ts');
      fs.writeFileSync(testFile, `
        import type { IUI } from 'simply-mcp';

        interface NotSubscribableUI extends IUI {
          uri: 'ui://not-sub';
          name: 'Not Subscribable';
          description: 'Cannot subscribe';
          html: '<div>Static</div>';
          subscribable: false;
        }
      `);

      const result = parseInterfaceFile(testFile);

      expect(result.uis).toHaveLength(1);
      expect(result.uis[0].subscribable).toBe(false);
    });

    it('should parse UI with only width in size', () => {
      const testFile = path.join(tempDir, 'width-only-ui.ts');
      fs.writeFileSync(testFile, `
        import type { IUI } from 'simply-mcp';

        interface WidthOnlyUI extends IUI {
          uri: 'ui://width-only';
          name: 'Width Only';
          description: 'Has only width';
          html: '<div>Width</div>';
          size: { width: 1024 };
        }
      `);

      const result = parseInterfaceFile(testFile);

      expect(result.uis).toHaveLength(1);
      expect(result.uis[0].size).toEqual({ width: 1024 });
    });

    it('should parse UI with only height in size', () => {
      const testFile = path.join(tempDir, 'height-only-ui.ts');
      fs.writeFileSync(testFile, `
        import type { IUI } from 'simply-mcp';

        interface HeightOnlyUI extends IUI {
          uri: 'ui://height-only';
          name: 'Height Only';
          description: 'Has only height';
          html: '<div>Height</div>';
          size: { height: 768 };
        }
      `);

      const result = parseInterfaceFile(testFile);

      expect(result.uis).toHaveLength(1);
      expect(result.uis[0].size).toEqual({ height: 768 });
    });
  });

  describe('Dynamic UI Parsing', () => {
    it('should parse dynamic UI with explicit dynamic flag', () => {
      const testFile = path.join(tempDir, 'dynamic-ui.ts');
      fs.writeFileSync(testFile, `
        import type { IUI } from 'simply-mcp';

        interface DynamicUI extends IUI {
          uri: 'ui://stats/live';
          name: 'Live Stats';
          description: 'Real-time statistics';
          dynamic: true;
          html: string;
        }
      `);

      const result = parseInterfaceFile(testFile);

      expect(result.uis).toHaveLength(1);

      const ui = result.uis[0];
      expect(ui.uri).toBe('ui://stats/live');
      expect(ui.name).toBe('Live Stats');
      expect(ui.description).toBe('Real-time statistics');
      expect(ui.dynamic).toBe(true);
      expect(ui.html).toBeUndefined(); // No static HTML for dynamic UIs
      expect(ui.methodName).toBe('ui://stats/live'); // URI used as method name
    });

    it('should infer dynamic when html is not a literal', () => {
      const testFile = path.join(tempDir, 'inferred-dynamic-ui.ts');
      fs.writeFileSync(testFile, `
        import type { IUI } from 'simply-mcp';

        interface InferredDynamicUI extends IUI {
          uri: 'ui://inferred';
          name: 'Inferred Dynamic';
          description: 'Inferred as dynamic';
          html: string; // Not a literal, so dynamic
        }
      `);

      const result = parseInterfaceFile(testFile);

      expect(result.uis).toHaveLength(1);

      const ui = result.uis[0];
      expect(ui.dynamic).toBe(true);
      expect(ui.html).toBeUndefined();
      expect(ui.methodName).toBe('ui://inferred');
    });

    it('should parse dynamic UI with tools and css type annotations', () => {
      const testFile = path.join(tempDir, 'dynamic-typed-ui.ts');
      fs.writeFileSync(testFile, `
        import type { IUI } from 'simply-mcp';

        interface DynamicTypedUI extends IUI {
          uri: 'ui://dynamic/typed';
          name: 'Dynamic Typed';
          description: 'Dynamic with types';
          dynamic: true;
          html: string;
          css?: string;
          tools: ['tool1', 'tool2'];
        }
      `);

      const result = parseInterfaceFile(testFile);

      expect(result.uis).toHaveLength(1);

      const ui = result.uis[0];
      expect(ui.dynamic).toBe(true);
      expect(ui.tools).toEqual(['tool1', 'tool2']);
    });
  });

  describe('Multiple UIs in File', () => {
    it('should parse multiple UI interfaces', () => {
      const testFile = path.join(tempDir, 'multi-ui.ts');
      fs.writeFileSync(testFile, `
        import type { IServer, IUI } from 'simply-mcp';

        interface DashboardUI extends IUI {
          uri: 'ui://dashboard';
          name: 'Dashboard';
          description: 'Main dashboard';
          html: '<div>Dashboard</div>';
        }

        interface SettingsUI extends IUI {
          uri: 'ui://settings';
          name: 'Settings';
          description: 'Settings panel';
          html: '<div>Settings</div>';
        }

        interface StatsUI extends IUI {
          uri: 'ui://stats';
          name: 'Statistics';
          description: 'Live stats';
          dynamic: true;
          html: string;
        }

        interface TestServer extends IServer {
          name: 'multi-ui-server';
          version: '1.0.0';
        }

        export default class TestServerImpl implements TestServer {}
      `);

      const result = parseInterfaceFile(testFile);

      expect(result.uis).toHaveLength(3);

      expect(result.uis[0].uri).toBe('ui://dashboard');
      expect(result.uis[0].dynamic).toBe(false);

      expect(result.uis[1].uri).toBe('ui://settings');
      expect(result.uis[1].dynamic).toBe(false);

      expect(result.uis[2].uri).toBe('ui://stats');
      expect(result.uis[2].dynamic).toBe(true);
    });
  });

  describe('Integration with Other Interface Types', () => {
    it('should parse UIs alongside tools and resources', () => {
      const testFile = path.join(tempDir, 'mixed-types.ts');
      fs.writeFileSync(testFile, `
        import type { IServer, IUI, ITool, IResource } from 'simply-mcp';

        interface CalculatorUI extends IUI {
          uri: 'ui://calculator';
          name: 'Calculator';
          description: 'Calculator interface';
          html: '<div>Calculator</div>';
          tools: ['add', 'subtract'];
        }

        interface AddTool extends ITool {
          name: 'add';
          description: 'Add two numbers';
          params: { a: number; b: number };
          result: number;
        }

        interface ConfigResource extends IResource {
          uri: 'config://settings';
          name: 'Settings';
          description: 'Configuration';
          mimeType: 'application/json';
          data: { theme: 'dark' };
        }

        interface TestServer extends IServer {
          name: 'mixed-server';
          version: '1.0.0';
        }

        export default class TestServerImpl implements TestServer {
          add: AddTool = async ({ a, b }) => a + b;
        }
      `);

      const result = parseInterfaceFile(testFile);

      expect(result.uis).toHaveLength(1);
      expect(result.tools).toHaveLength(1);
      expect(result.resources).toHaveLength(1);

      expect(result.uis[0].uri).toBe('ui://calculator');
      expect(result.tools[0].name).toBe('add');
      expect(result.resources[0].uri).toBe('config://settings');
    });
  });

  describe('Error Cases and Edge Cases', () => {
    it('should return null for UI missing uri', () => {
      const testFile = path.join(tempDir, 'missing-uri.ts');
      fs.writeFileSync(testFile, `
        import type { IUI } from 'simply-mcp';

        interface MissingURIUI extends IUI {
          name: 'Missing URI';
          description: 'No URI specified';
          html: '<div>No URI</div>';
        }
      `);

      const result = parseInterfaceFile(testFile);

      // Parser should warn and skip this UI
      expect(result.uis).toHaveLength(0);
    });

    it('should return null for UI missing name', () => {
      const testFile = path.join(tempDir, 'missing-name.ts');
      fs.writeFileSync(testFile, `
        import type { IUI } from 'simply-mcp';

        interface MissingNameUI extends IUI {
          uri: 'ui://no-name';
          description: 'No name specified';
          html: '<div>No name</div>';
        }
      `);

      const result = parseInterfaceFile(testFile);

      // Parser should warn and skip this UI
      expect(result.uis).toHaveLength(0);
    });

    it('should return null for UI missing description', () => {
      const testFile = path.join(tempDir, 'missing-description.ts');
      fs.writeFileSync(testFile, `
        import type { IUI } from 'simply-mcp';

        interface MissingDescUI extends IUI {
          uri: 'ui://no-desc';
          name: 'No Description';
          html: '<div>No description</div>';
        }
      `);

      const result = parseInterfaceFile(testFile);

      // Parser should warn and skip this UI
      expect(result.uis).toHaveLength(0);
    });

    it('should handle UI with complex HTML', () => {
      const testFile = path.join(tempDir, 'complex-html.ts');
      fs.writeFileSync(testFile, `
        import type { IUI } from 'simply-mcp';

        interface ComplexUI extends IUI {
          uri: 'ui://complex';
          name: 'Complex HTML';
          description: 'Complex markup';
          html: \`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>Complex</title>
              </head>
              <body>
                <div class="container">
                  <h1>Hello World</h1>
                  <p>Paragraph with "quotes" and 'single quotes'</p>
                </div>
              </body>
            </html>
          \`;
        }
      `);

      const result = parseInterfaceFile(testFile);

      expect(result.uis).toHaveLength(1);
      expect(result.uis[0].html).toContain('<!DOCTYPE html>');
      expect(result.uis[0].html).toContain('"quotes"');
    });

    it('should handle UI with special characters in CSS', () => {
      const testFile = path.join(tempDir, 'special-css.ts');
      fs.writeFileSync(testFile, `
        import type { IUI } from 'simply-mcp';

        interface SpecialCSSUI extends IUI {
          uri: 'ui://special-css';
          name: 'Special CSS';
          description: 'CSS with special chars';
          html: '<div>Content</div>';
          css: \`
            .container {
              content: "→";
              font-family: 'Arial', sans-serif;
            }
            @media (max-width: 768px) {
              .container { width: 100%; }
            }
          \`;
        }
      `);

      const result = parseInterfaceFile(testFile);

      expect(result.uis).toHaveLength(1);
      expect(result.uis[0].css).toContain('→');
      expect(result.uis[0].css).toContain('@media');
    });

    it('should handle empty file with no UIs', () => {
      const testFile = path.join(tempDir, 'no-uis.ts');
      fs.writeFileSync(testFile, `
        import type { IServer } from 'simply-mcp';

        interface TestServer extends IServer {
          name: 'empty-server';
          version: '1.0.0';
        }

        export default class TestServerImpl implements TestServer {}
      `);

      const result = parseInterfaceFile(testFile);

      expect(result.uis).toHaveLength(0);
    });
  });

  describe('Data Type Extraction', () => {
    it('should extract dataType for dynamic UI', () => {
      const testFile = path.join(tempDir, 'data-type-ui.ts');
      fs.writeFileSync(testFile, `
        import type { IUI } from 'simply-mcp';

        interface DataTypeUI extends IUI {
          uri: 'ui://data-type';
          name: 'Data Type';
          description: 'Has data type';
          dynamic: true;
          html: string;
          data: { content: string; timestamp: number };
        }
      `);

      const result = parseInterfaceFile(testFile);

      expect(result.uis).toHaveLength(1);
      expect(result.uis[0].dataType).toBeTruthy();
    });
  });
});
