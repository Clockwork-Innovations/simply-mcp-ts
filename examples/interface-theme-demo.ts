/**
 * Theme System Demo
 *
 * Demonstrates CSS variable theming in MCP-UI:
 * - Prebuilt light/dark themes
 * - Custom inline themes
 * - Theme-aware components
 *
 * Usage:
 *   npx simply-mcp run examples/interface-theme-demo.ts
 */

import type { IServer, IUI, ITool } from 'simply-mcp';

// Simple greeting tool
interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet the user';
  params: { name: string };
  result: string;
}

// Light theme UI
interface LightUI extends IUI {
  uri: 'ui://demo/light';
  name: 'Light Theme Demo';
  description: 'UI using prebuilt light theme';
  theme: 'light';
  html: `
    <div class="container">
      <h1>Light Theme</h1>
      <p>This UI uses the prebuilt light theme with CSS variables.</p>
      <input type="text" id="nameInput" placeholder="Your name" value="World" />
      <button onclick="greet()">Greet</button>
      <div id="result" class="result"></div>
    </div>
    <script>
      async function greet() {
        const name = document.getElementById('nameInput').value;
        const result = await callTool('greet', { name });
        document.getElementById('result').textContent = result;
      }
    </script>
  `;
  css: `
    .container { padding: 20px; background: var(--bg-primary); color: var(--text-primary); }
    input { padding: 8px; border: 1px solid var(--border-color); background: var(--bg-secondary); }
    button { padding: 8px 16px; background: var(--primary-color); color: white; border: none; cursor: pointer; }
    .result { margin-top: 16px; padding: 12px; background: var(--bg-secondary); color: var(--text-primary); }
  `;
  tools: ['greet'];
}

// Dark theme UI
interface DarkUI extends IUI {
  uri: 'ui://demo/dark';
  name: 'Dark Theme Demo';
  description: 'UI using prebuilt dark theme';
  theme: 'dark';
  html: `
    <div class="container">
      <h1>Dark Theme</h1>
      <p>This UI uses the prebuilt dark theme.</p>
      <input type="text" id="nameInput" placeholder="Your name" value="World" />
      <button onclick="greet()">Greet</button>
      <div id="result" class="result"></div>
    </div>
    <script>
      async function greet() {
        const name = document.getElementById('nameInput').value;
        const result = await callTool('greet', { name });
        document.getElementById('result').textContent = result;
      }
    </script>
  `;
  css: `
    .container { padding: 20px; background: var(--bg-primary); color: var(--text-primary); }
    input { padding: 8px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); }
    button { padding: 8px 16px; background: var(--primary-color); color: white; border: none; cursor: pointer; }
    .result { margin-top: 16px; padding: 12px; background: var(--bg-secondary); color: var(--text-primary); }
  `;
  tools: ['greet'];
}

// Custom theme UI
interface CustomUI extends IUI {
  uri: 'ui://demo/custom';
  name: 'Custom Theme Demo';
  description: 'UI with custom inline theme';
  theme: {
    name: 'ocean';
    variables: {
      '--bg-primary': '#e0f7fa';
      '--bg-secondary': '#b2ebf2';
      '--text-primary': '#006064';
      '--text-secondary': '#00838f';
      '--border-color': '#80deea';
      '--primary-color': '#0097a7';
      '--primary-hover': '#00838f';
    };
  };
  html: `
    <div class="container">
      <h1>Custom Ocean Theme</h1>
      <p>This UI uses a custom inline theme with ocean colors.</p>
      <input type="text" id="nameInput" placeholder="Your name" value="World" />
      <button onclick="greet()">Greet</button>
      <div id="result" class="result"></div>
    </div>
    <script>
      async function greet() {
        const name = document.getElementById('nameInput').value;
        const result = await callTool('greet', { name });
        document.getElementById('result').textContent = result;
      }
    </script>
  `;
  css: `
    .container { padding: 20px; background: var(--bg-primary); color: var(--text-primary); }
    input { padding: 8px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); }
    button { padding: 8px 16px; background: var(--primary-color); color: white; border: none; cursor: pointer; }
    button:hover { background: var(--primary-hover); }
    .result { margin-top: 16px; padding: 12px; background: var(--bg-secondary); color: var(--text-primary); }
  `;
  tools: ['greet'];
}

// Server interface
interface ThemeServer extends IServer {
  name: 'theme-demo';
  version: '1.0.0';
  description: 'Theme system demonstration server';
}

// Implementation
export default class ThemeDemoServer implements ThemeServer {
  greet: GreetTool = async (params) => {
    return `Hello, ${params.name}!`;
  };
}
