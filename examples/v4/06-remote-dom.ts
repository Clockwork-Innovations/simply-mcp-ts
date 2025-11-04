/**
 * IUI v4.0 Example: Remote DOM
 *
 * Use Remote DOM JSON for declarative UI definitions.
 * Perfect for simple UIs, tool-generated interfaces, or cross-platform rendering.
 */

import { InterfaceServer, IUI } from '../../src/index.js';

const server = new InterfaceServer({
  name: 'remote-dom-server',
  version: '1.0.0',
});

/**
 * Simple Remote DOM UI
 *
 * JSON structure that describes the UI declaratively
 */
interface SimpleRemoteDomUI extends IUI {
  uri: 'ui://remote-dom';
  name: 'Remote DOM Example';
  description: 'Declarative UI using Remote DOM JSON';

  // Remote DOM JSON - auto-detected by JSON structure with "type" field
  source: JSON.stringify({
    type: 'div',
    properties: {
      style: {
        fontFamily: 'system-ui',
        padding: '2rem',
        textAlign: 'center',
      },
    },
    children: [
      {
        type: 'h1',
        properties: {
          style: { color: '#0066cc' },
        },
        children: ['Remote DOM Example'],
      },
      {
        type: 'p',
        properties: {
          style: { color: '#666' },
        },
        children: ['Declarative UI definition using JSON'],
      },
      {
        type: 'button',
        properties: {
          onclick: () => alert('Button clicked!'),
          style: {
            padding: '0.5rem 1rem',
            background: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          },
        },
        children: ['Click Me'],
      },
    ],
  });
}

/**
 * Form UI with Remote DOM
 *
 * More complex example with form elements
 */
interface FormUI extends IUI {
  uri: 'ui://form';
  name: 'Remote DOM Form';
  description: 'Form built with Remote DOM';

  source: JSON.stringify({
    type: 'div',
    properties: {
      style: {
        maxWidth: '400px',
        margin: '0 auto',
        padding: '2rem',
      },
    },
    children: [
      {
        type: 'h2',
        children: ['Contact Form'],
      },
      {
        type: 'form',
        children: [
          {
            type: 'div',
            properties: { style: { marginBottom: '1rem' } },
            children: [
              {
                type: 'label',
                properties: { htmlFor: 'name' },
                children: ['Name:'],
              },
              {
                type: 'input',
                properties: {
                  type: 'text',
                  id: 'name',
                  name: 'name',
                  style: {
                    width: '100%',
                    padding: '0.5rem',
                    marginTop: '0.25rem',
                  },
                },
              },
            ],
          },
          {
            type: 'div',
            properties: { style: { marginBottom: '1rem' } },
            children: [
              {
                type: 'label',
                properties: { htmlFor: 'email' },
                children: ['Email:'],
              },
              {
                type: 'input',
                properties: {
                  type: 'email',
                  id: 'email',
                  name: 'email',
                  style: {
                    width: '100%',
                    padding: '0.5rem',
                    marginTop: '0.25rem',
                  },
                },
              },
            ],
          },
          {
            type: 'button',
            properties: {
              type: 'submit',
              style: {
                padding: '0.5rem 1rem',
                background: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
              },
            },
            children: ['Submit'],
          },
        ],
      },
    ],
  });
}

export default server;
