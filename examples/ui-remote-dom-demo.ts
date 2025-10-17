/**
 * Remote DOM Demo - Layer 3 Implementation
 *
 * Demonstrates Remote DOM resources that execute JavaScript in a
 * Web Worker sandbox to create native-looking React components.
 *
 * This example shows:
 * - Remote DOM script execution in Web Worker
 * - Interactive UI components (counter, card, form)
 * - Event handlers through postMessage
 * - Host action calls (notifications)
 * - Security through sandboxing
 *
 * Run: npm run start -- examples/ui-remote-dom-demo.ts
 */

import { BuildMCPServer } from '../src/api/programmatic/index.js';
import { createRemoteDOMResource } from '../src/core/ui-resource.js';
import { z } from 'zod';

const server = new BuildMCPServer({
  name: 'ui-remote-dom-demo',
  version: '1.0.0',
  description: 'Layer 3: Remote DOM implementation with Web Worker sandbox',
});

/**
 * Tool 1: Simple Counter
 *
 * Shows basic Remote DOM with interactive button.
 */
server.addTool({
  name: 'show_counter',
  description: 'Display an interactive counter component',
  parameters: z.object({
    initialCount: z.number().optional().describe('Initial counter value'),
  }),
  execute: async ({ initialCount = 0 }) => {
    const script = `
// Create main card container
const card = remoteDOM.createElement('div', {
  style: {
    maxWidth: '400px',
    background: 'white',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  }
});

// Create title
const title = remoteDOM.createElement('h2', {
  style: {
    margin: '0 0 16px 0',
    fontSize: '20px',
    fontWeight: '600',
    color: '#333'
  }
});
remoteDOM.setTextContent(title, 'Remote DOM Counter');
remoteDOM.appendChild(card, title);

// Create counter display
let count = ${initialCount};
const display = remoteDOM.createElement('div', {
  id: 'counter-display',
  style: {
    fontSize: '48px',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: '24px 0',
    color: '#0066cc',
    fontFamily: 'monospace'
  }
});
remoteDOM.setTextContent(display, String(count));
remoteDOM.appendChild(card, display);

// Create button container
const buttonGroup = remoteDOM.createElement('div', {
  style: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center'
  }
});

// Decrement button
const decrBtn = remoteDOM.createElement('button', {
  style: {
    padding: '12px 24px',
    background: '#e0e0e0',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px'
  }
});
remoteDOM.setTextContent(decrBtn, '- Decrement');
remoteDOM.addEventListener(decrBtn, 'click', () => {
  count--;
  remoteDOM.setTextContent(display, String(count));
  remoteDOM.callHost('notify', {
    level: 'info',
    message: 'Decremented to ' + count
  });
});
remoteDOM.appendChild(buttonGroup, decrBtn);

// Increment button
const incrBtn = remoteDOM.createElement('button', {
  style: {
    padding: '12px 24px',
    background: '#0066cc',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px'
  }
});
remoteDOM.setTextContent(incrBtn, '+ Increment');
remoteDOM.addEventListener(incrBtn, 'click', () => {
  count++;
  remoteDOM.setTextContent(display, String(count));
  remoteDOM.callHost('notify', {
    level: 'info',
    message: 'Incremented to ' + count
  });
});
remoteDOM.appendChild(buttonGroup, incrBtn);

remoteDOM.appendChild(card, buttonGroup);

// Info text
const info = remoteDOM.createElement('p', {
  style: {
    marginTop: '16px',
    fontSize: '14px',
    color: '#666',
    textAlign: 'center'
  }
});
remoteDOM.setTextContent(info, 'Click buttons to interact with Remote DOM');
remoteDOM.appendChild(card, info);
`;

    const resource = createRemoteDOMResource(
      'ui://counter/interactive',
      script,
      'javascript'
    );

    return {
      content: [
        { type: 'text', text: 'Interactive counter loaded (Web Worker sandbox)' },
        resource,
      ],
    };
  },
});

/**
 * Tool 2: Product Card
 *
 * Shows more complex UI with multiple elements and styling.
 */
server.addTool({
  name: 'show_product_card',
  description: 'Display a product card with Remote DOM',
  parameters: z.object({
    productName: z.string().describe('Product name'),
    price: z.number().describe('Product price'),
    description: z.string().describe('Product description'),
  }),
  execute: async ({ productName, price, description }) => {
    const script = `
// Create product card
const card = remoteDOM.createElement('div', {
  style: {
    maxWidth: '400px',
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  }
});

// Product image placeholder
const imagePlaceholder = remoteDOM.createElement('div', {
  style: {
    width: '100%',
    height: '200px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '8px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '48px',
    fontWeight: 'bold'
  }
});
remoteDOM.setTextContent(imagePlaceholder, '${productName.charAt(0)}');
remoteDOM.appendChild(card, imagePlaceholder);

// Product name
const name = remoteDOM.createElement('h2', {
  style: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: '600',
    color: '#333'
  }
});
remoteDOM.setTextContent(name, '${productName}');
remoteDOM.appendChild(card, name);

// Price
const priceElem = remoteDOM.createElement('div', {
  style: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: '12px'
  }
});
remoteDOM.setTextContent(priceElem, '$${price.toFixed(2)}');
remoteDOM.appendChild(card, priceElem);

// Description
const desc = remoteDOM.createElement('p', {
  style: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5'
  }
});
remoteDOM.setTextContent(desc, '${description}');
remoteDOM.appendChild(card, desc);

// Add to cart button
const addBtn = remoteDOM.createElement('button', {
  style: {
    width: '100%',
    padding: '14px',
    background: '#0066cc',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px'
  }
});
remoteDOM.setTextContent(addBtn, 'Add to Cart');
remoteDOM.addEventListener(addBtn, 'click', () => {
  remoteDOM.callHost('notify', {
    level: 'success',
    message: '${productName} added to cart!'
  });
});
remoteDOM.appendChild(card, addBtn);
`;

    const resource = createRemoteDOMResource(
      'ui://product/card',
      script,
      'javascript'
    );

    return {
      content: [
        { type: 'text', text: `Product card for "${productName}" rendered` },
        resource,
      ],
    };
  },
});

/**
 * Tool 3: Dashboard Widget
 *
 * Shows more advanced UI with multiple sections and interactions.
 */
server.addTool({
  name: 'show_dashboard',
  description: 'Display a dashboard widget with multiple stats',
  parameters: z.object({}),
  execute: async () => {
    const script = `
// Create dashboard container
const dashboard = remoteDOM.createElement('div', {
  style: {
    maxWidth: '600px',
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  }
});

// Title
const title = remoteDOM.createElement('h2', {
  style: {
    margin: '0 0 20px 0',
    fontSize: '24px',
    fontWeight: '600',
    color: '#333'
  }
});
remoteDOM.setTextContent(title, 'Dashboard Overview');
remoteDOM.appendChild(dashboard, title);

// Stats grid
const statsGrid = remoteDOM.createElement('div', {
  style: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '20px'
  }
});

// Create stat cards
const stats = [
  { label: 'Users', value: '1,234', color: '#0066cc' },
  { label: 'Revenue', value: '$45.6K', color: '#00a67e' },
  { label: 'Orders', value: '789', color: '#ff6b35' }
];

stats.forEach(stat => {
  const statCard = remoteDOM.createElement('div', {
    style: {
      background: '#f5f5f5',
      padding: '16px',
      borderRadius: '8px',
      textAlign: 'center'
    }
  });

  const value = remoteDOM.createElement('div', {
    style: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: stat.color,
      marginBottom: '4px'
    }
  });
  remoteDOM.setTextContent(value, stat.value);
  remoteDOM.appendChild(statCard, value);

  const label = remoteDOM.createElement('div', {
    style: {
      fontSize: '12px',
      color: '#666',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    }
  });
  remoteDOM.setTextContent(label, stat.label);
  remoteDOM.appendChild(statCard, label);

  remoteDOM.appendChild(statsGrid, statCard);
});

remoteDOM.appendChild(dashboard, statsGrid);

// Action buttons
const actions = remoteDOM.createElement('div', {
  style: {
    display: 'flex',
    gap: '12px'
  }
});

const refreshBtn = remoteDOM.createElement('button', {
  style: {
    flex: '1',
    padding: '12px',
    background: '#0066cc',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600'
  }
});
remoteDOM.setTextContent(refreshBtn, 'Refresh Data');
remoteDOM.addEventListener(refreshBtn, 'click', () => {
  remoteDOM.callHost('notify', {
    level: 'info',
    message: 'Dashboard data refreshed'
  });
});
remoteDOM.appendChild(actions, refreshBtn);

const exportBtn = remoteDOM.createElement('button', {
  style: {
    flex: '1',
    padding: '12px',
    background: '#f5f5f5',
    color: '#333',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600'
  }
});
remoteDOM.setTextContent(exportBtn, 'Export');
remoteDOM.addEventListener(exportBtn, 'click', () => {
  remoteDOM.callHost('notify', {
    level: 'success',
    message: 'Export started'
  });
});
remoteDOM.appendChild(actions, exportBtn);

remoteDOM.appendChild(dashboard, actions);
`;

    const resource = createRemoteDOMResource(
      'ui://dashboard/widget',
      script,
      'javascript'
    );

    return {
      content: [
        { type: 'text', text: 'Dashboard widget loaded' },
        resource,
      ],
    };
  },
});

// Export the server
export default server;
