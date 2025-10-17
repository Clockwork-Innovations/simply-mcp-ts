/**
 * Layer 4: API Integration Layer Demo
 *
 * This example demonstrates how to create UI resources using ALL FOUR API styles:
 * 1. Programmatic API - BuildMCPServer.addUIResource()
 * 2. Decorator API - @uiResource() decorator
 * 3. Functional API - defineUIResource() builder
 * 4. Interface API - IUIResourceProvider interface
 *
 * All four styles create IDENTICAL UI resources with the SAME behavior.
 * Choose the style that best fits your coding preferences.
 */

// ============================================================================
// STYLE 1: PROGRAMMATIC API
// ============================================================================
// Direct, imperative style with explicit method calls
// Best for: Dynamic server configuration, programmatic registration
// ============================================================================

import { BuildMCPServer } from '../src/api/programmatic/BuildMCPServer.js';

console.log('='.repeat(80));
console.log('STYLE 1: PROGRAMMATIC API');
console.log('='.repeat(80));

const programmaticServer = new BuildMCPServer({
  name: 'programmatic-ui-demo',
  version: '1.0.0',
  description: 'Programmatic API UI resources demo'
});

// Add static HTML UI resource
programmaticServer.addUIResource(
  'ui://form/feedback',
  'Feedback Form',
  'User feedback form',
  'text/html',
  '<form><h2>Feedback</h2><textarea placeholder="Your feedback"></textarea><button>Submit</button></form>'
);

// Add dynamic HTML UI resource
programmaticServer.addUIResource(
  'ui://dashboard/stats',
  'Stats Dashboard',
  'Live statistics dashboard',
  'text/html',
  () => {
    const stats = {
      users: 42,
      requests: 1337,
      uptime: Math.floor(process.uptime())
    };
    return `
      <div style="padding: 20px; font-family: sans-serif;">
        <h1>Server Statistics</h1>
        <p>Active Users: ${stats.users}</p>
        <p>Total Requests: ${stats.requests}</p>
        <p>Uptime: ${stats.uptime}s</p>
      </div>
    `;
  }
);

// Add external URL UI resource
programmaticServer.addUIResource(
  'ui://analytics/dashboard',
  'Analytics Dashboard',
  'External analytics dashboard',
  'text/uri-list',
  'https://analytics.example.com/dashboard'
);

// Add Remote DOM UI resource
programmaticServer.addUIResource(
  'ui://counter/v1',
  'Interactive Counter',
  'Counter component with Remote DOM',
  'application/vnd.mcp-ui.remote-dom+javascript',
  `
    // Create a card container
    const card = remoteDOM.createElement('div', {
      style: {
        padding: '20px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        maxWidth: '300px'
      }
    });

    // Add title
    const title = remoteDOM.createElement('h2');
    remoteDOM.setTextContent(title, 'Counter');
    remoteDOM.appendChild(card, title);

    // Add counter display
    const display = remoteDOM.createElement('div', {
      id: 'count',
      style: { fontSize: '24px', margin: '10px 0' }
    });
    remoteDOM.setTextContent(display, '0');
    remoteDOM.appendChild(card, display);

    // Add increment button
    const button = remoteDOM.createElement('button');
    remoteDOM.setTextContent(button, 'Increment');
    remoteDOM.addEventListener(button, 'click', () => {
      remoteDOM.callHost('notify', {
        level: 'info',
        message: 'Button clicked!'
      });
    });
    remoteDOM.appendChild(card, button);
  `
);

console.log('Programmatic API server configured with 4 UI resources');
console.log('Resources:', Array.from(programmaticServer.getResources().keys()));
console.log();

// ============================================================================
// STYLE 2: DECORATOR API
// ============================================================================
// Class-based with decorators for clean, declarative definitions
// Best for: Object-oriented codebases, TypeScript projects
// ============================================================================

console.log('='.repeat(80));
console.log('STYLE 2: DECORATOR API');
console.log('='.repeat(80));

/*
import { MCPServer, uiResource } from '../src/api/decorator/decorators.js';

@MCPServer({
  name: 'decorator-ui-demo',
  version: '1.0.0',
  description: 'Decorator API UI resources demo'
})
class DecoratorUIServer {
  // Static HTML UI resource
  @uiResource('ui://form/feedback', 'text/html', {
    name: 'Feedback Form',
    description: 'User feedback form'
  })
  getFeedbackForm() {
    return '<form><h2>Feedback</h2><textarea placeholder="Your feedback"></textarea><button>Submit</button></form>';
  }

  // Dynamic HTML UI resource
  @uiResource('ui://dashboard/stats', 'text/html', {
    name: 'Stats Dashboard',
    description: 'Live statistics dashboard'
  })
  async getStatsDashboard() {
    const stats = await this.getStats();
    return `
      <div style="padding: 20px; font-family: sans-serif;">
        <h1>Server Statistics</h1>
        <p>Active Users: ${stats.users}</p>
        <p>Total Requests: ${stats.requests}</p>
        <p>Uptime: ${stats.uptime}s</p>
      </div>
    `;
  }

  // External URL UI resource
  @uiResource('ui://analytics/dashboard', 'text/uri-list', {
    name: 'Analytics Dashboard',
    description: 'External analytics dashboard'
  })
  getAnalyticsDashboard() {
    return 'https://analytics.example.com/dashboard';
  }

  // Remote DOM UI resource
  @uiResource('ui://counter/v1', 'application/vnd.mcp-ui.remote-dom+javascript', {
    name: 'Interactive Counter',
    description: 'Counter component with Remote DOM'
  })
  getCounterUI() {
    return `
      const card = remoteDOM.createElement('div', {
        style: {
          padding: '20px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          maxWidth: '300px'
        }
      });

      const title = remoteDOM.createElement('h2');
      remoteDOM.setTextContent(title, 'Counter');
      remoteDOM.appendChild(card, title);

      const display = remoteDOM.createElement('div', {
        id: 'count',
        style: { fontSize: '24px', margin: '10px 0' }
      });
      remoteDOM.setTextContent(display, '0');
      remoteDOM.appendChild(card, display);

      const button = remoteDOM.createElement('button');
      remoteDOM.setTextContent(button, 'Increment');
      remoteDOM.addEventListener(button, 'click', () => {
        remoteDOM.callHost('notify', {
          level: 'info',
          message: 'Button clicked!'
        });
      });
      remoteDOM.appendChild(card, button);
    `;
  }

  private async getStats() {
    return {
      users: 42,
      requests: 1337,
      uptime: Math.floor(process.uptime())
    };
  }
}

// The decorator server would be instantiated and run like:
// const decoratorServer = new DecoratorUIServer();
// await buildFromDecorator(decoratorServer).start();
*/

console.log('Decorator API example (commented out - see source)');
console.log('Usage:');
console.log('  @uiResource(\'ui://form/feedback\', \'text/html\', { name: \'Form\' })');
console.log('  getFeedbackForm() { return \'<form>...</form>\'; }');
console.log();

// ============================================================================
// STYLE 3: FUNCTIONAL API
// ============================================================================
// Configuration-based with builder functions
// Best for: Single-file servers, configuration-driven setups
// ============================================================================

console.log('='.repeat(80));
console.log('STYLE 3: FUNCTIONAL API');
console.log('='.repeat(80));

/*
import { defineMCP, defineUIResource } from '../src/api/functional/builders.js';

const functionalServerConfig = defineMCP({
  name: 'functional-ui-demo',
  version: '1.0.0',
  description: 'Functional API UI resources demo',
  uiResources: [
    // Static HTML UI resource
    defineUIResource({
      uri: 'ui://form/feedback',
      name: 'Feedback Form',
      description: 'User feedback form',
      mimeType: 'text/html',
      content: '<form><h2>Feedback</h2><textarea placeholder="Your feedback"></textarea><button>Submit</button></form>'
    }),

    // Dynamic HTML UI resource
    defineUIResource({
      uri: 'ui://dashboard/stats',
      name: 'Stats Dashboard',
      description: 'Live statistics dashboard',
      mimeType: 'text/html',
      content: async () => {
        const stats = {
          users: 42,
          requests: 1337,
          uptime: Math.floor(process.uptime())
        };
        return `
          <div style="padding: 20px; font-family: sans-serif;">
            <h1>Server Statistics</h1>
            <p>Active Users: ${stats.users}</p>
            <p>Total Requests: ${stats.requests}</p>
            <p>Uptime: ${stats.uptime}s</p>
          </div>
        `;
      }
    }),

    // External URL UI resource
    defineUIResource({
      uri: 'ui://analytics/dashboard',
      name: 'Analytics Dashboard',
      description: 'External analytics dashboard',
      mimeType: 'text/uri-list',
      content: 'https://analytics.example.com/dashboard'
    }),

    // Remote DOM UI resource
    defineUIResource({
      uri: 'ui://counter/v1',
      name: 'Interactive Counter',
      description: 'Counter component with Remote DOM',
      mimeType: 'application/vnd.mcp-ui.remote-dom+javascript',
      content: `
        const card = remoteDOM.createElement('div', {
          style: {
            padding: '20px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            maxWidth: '300px'
          }
        });

        const title = remoteDOM.createElement('h2');
        remoteDOM.setTextContent(title, 'Counter');
        remoteDOM.appendChild(card, title);

        const display = remoteDOM.createElement('div', {
          id: 'count',
          style: { fontSize: '24px', margin: '10px 0' }
        });
        remoteDOM.setTextContent(display, '0');
        remoteDOM.appendChild(card, display);

        const button = remoteDOM.createElement('button');
        remoteDOM.setTextContent(button, 'Increment');
        remoteDOM.addEventListener(button, 'click', () => {
          remoteDOM.callHost('notify', {
            level: 'info',
            message: 'Button clicked!'
          });
        });
        remoteDOM.appendChild(card, button);
      `
    })
  ]
});

// The functional server would be run like:
// await runFromConfig(functionalServerConfig);
*/

console.log('Functional API example (commented out - see source)');
console.log('Usage:');
console.log('  defineUIResource({ uri: \'ui://form/feedback\', mimeType: \'text/html\', ... })');
console.log();

// ============================================================================
// STYLE 4: INTERFACE API
// ============================================================================
// Pure TypeScript interfaces with implementation classes
// Best for: Type-safe APIs, interface-driven design
// ============================================================================

console.log('='.repeat(80));
console.log('STYLE 4: INTERFACE API');
console.log('='.repeat(80));

/*
import type {
  IServer,
  IUIResourceProvider,
  UIResourceDefinition
} from '../src/api/interface/types.js';

interface UIServerInterface extends IServer {
  name: 'interface-ui-demo';
  version: '1.0.0';
  description: 'Interface API UI resources demo';
}

class InterfaceUIServer implements UIServerInterface, IUIResourceProvider {
  name = 'interface-ui-demo' as const;
  version = '1.0.0' as const;
  description = 'Interface API UI resources demo' as const;

  getUIResources(): UIResourceDefinition[] {
    return [
      // Static HTML UI resource
      {
        uri: 'ui://form/feedback',
        name: 'Feedback Form',
        description: 'User feedback form',
        mimeType: 'text/html',
        content: '<form><h2>Feedback</h2><textarea placeholder="Your feedback"></textarea><button>Submit</button></form>'
      },

      // Dynamic HTML UI resource
      {
        uri: 'ui://dashboard/stats',
        name: 'Stats Dashboard',
        description: 'Live statistics dashboard',
        mimeType: 'text/html',
        content: async () => {
          const stats = await this.getStats();
          return `
            <div style="padding: 20px; font-family: sans-serif;">
              <h1>Server Statistics</h1>
              <p>Active Users: ${stats.users}</p>
              <p>Total Requests: ${stats.requests}</p>
              <p>Uptime: ${stats.uptime}s</p>
            </div>
          `;
        }
      },

      // External URL UI resource
      {
        uri: 'ui://analytics/dashboard',
        name: 'Analytics Dashboard',
        description: 'External analytics dashboard',
        mimeType: 'text/uri-list',
        content: 'https://analytics.example.com/dashboard'
      },

      // Remote DOM UI resource
      {
        uri: 'ui://counter/v1',
        name: 'Interactive Counter',
        description: 'Counter component with Remote DOM',
        mimeType: 'application/vnd.mcp-ui.remote-dom+javascript',
        content: `
          const card = remoteDOM.createElement('div', {
            style: {
              padding: '20px',
              border: '1px solid #ccc',
              borderRadius: '8px',
              maxWidth: '300px'
            }
          });

          const title = remoteDOM.createElement('h2');
          remoteDOM.setTextContent(title, 'Counter');
          remoteDOM.appendChild(card, title);

          const display = remoteDOM.createElement('div', {
            id: 'count',
            style: { fontSize: '24px', margin: '10px 0' }
          });
          remoteDOM.setTextContent(display, '0');
          remoteDOM.appendChild(card, display);

          const button = remoteDOM.createElement('button');
          remoteDOM.setTextContent(button, 'Increment');
          remoteDOM.addEventListener(button, 'click', () => {
            remoteDOM.callHost('notify', {
              level: 'info',
              message: 'Button clicked!'
            });
          });
          remoteDOM.appendChild(card, button);
        `
      }
    ];
  }

  private async getStats() {
    return {
      users: 42,
      requests: 1337,
      uptime: Math.floor(process.uptime())
    };
  }
}

// The interface server would be instantiated and run like:
// const interfaceServer = new InterfaceUIServer();
// await buildFromInterface(interfaceServer).start();
*/

console.log('Interface API example (commented out - see source)');
console.log('Usage:');
console.log('  class MyServer implements IUIResourceProvider {');
console.log('    getUIResources(): UIResourceDefinition[] { ... }');
console.log('  }');
console.log();

// ============================================================================
// COMPARISON SUMMARY
// ============================================================================

console.log('='.repeat(80));
console.log('API STYLE COMPARISON');
console.log('='.repeat(80));
console.log();
console.log('All four styles create IDENTICAL UI resources:');
console.log();
console.log('1. PROGRAMMATIC API');
console.log('   • Direct method calls: server.addUIResource(...)');
console.log('   • Most explicit and flexible');
console.log('   • Best for: Dynamic configuration, programmatic control');
console.log();
console.log('2. DECORATOR API');
console.log('   • Class-based with @uiResource() decorator');
console.log('   • Clean, declarative syntax');
console.log('   • Best for: OOP codebases, TypeScript projects');
console.log();
console.log('3. FUNCTIONAL API');
console.log('   • Configuration objects with defineUIResource()');
console.log('   • Single-file, configuration-driven');
console.log('   • Best for: Simple servers, config-based setup');
console.log();
console.log('4. INTERFACE API');
console.log('   • Pure TypeScript interfaces with IUIResourceProvider');
console.log('   • Type-safe, interface-driven design');
console.log('   • Best for: Type safety, contract-first design');
console.log();
console.log('All styles support:');
console.log('  ✓ Static HTML (text/html)');
console.log('  ✓ Dynamic HTML (text/html with functions)');
console.log('  ✓ External URLs (text/uri-list)');
console.log('  ✓ Remote DOM (application/vnd.mcp-ui.remote-dom+javascript)');
console.log();
console.log('Choose the style that matches your coding preferences!');
console.log('='.repeat(80));
