/**
 * UI React Compiler Tests
 *
 * Comprehensive tests for Babel-based React/JSX compilation
 */

import { describe, it, expect } from '@jest/globals';
import {
  compileReactComponent,
  validateComponentCode,
} from '../../src/features/ui/ui-react-compiler.js';

describe('UI React Compiler', () => {
  describe('Component Name Extraction', () => {
    it('should extract name from export default function', async () => {
      const code = `
        export default function MyComponent() {
          return <div>Hello</div>;
        }
      `;

      const result = await compileReactComponent({
        componentPath: './MyComponent.tsx',
        componentCode: code,
        sourceMaps: false,
        verbose: false,
      });

      expect(result.componentName).toBe('MyComponent');
    });

    it('should extract name from const arrow function', async () => {
      const code = `
        const Counter = () => {
          return <div>Count: 0</div>;
        };
        export default Counter;
      `;

      const result = await compileReactComponent({
        componentPath: './Counter.tsx',
        componentCode: code,
        sourceMaps: false,
      });

      expect(result.componentName).toBe('Counter');
    });

    it('should use fallback name when no pattern matches', async () => {
      const code = `
        export default () => <div>Anonymous</div>;
      `;

      const result = await compileReactComponent({
        componentPath: './Anonymous.tsx',
        componentCode: code,
        sourceMaps: false,
      });

      expect(result.componentName).toBe('App');
    });
  });

  describe('JSX Compilation', () => {
    it('should compile simple JSX component', async () => {
      const code = `
        export default function Button() {
          return <button>Click me</button>;
        }
      `;

      const result = await compileReactComponent({
        componentPath: './Button.tsx',
        componentCode: code,
        sourceMaps: false,
      });

      expect(result.javascript).toBeDefined();
      expect(result.javascript).toContain('Button');
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('React.createElement(Button)');
    });

    it('should compile TSX with TypeScript types', async () => {
      const code = `
        interface Props {
          title: string;
          count: number;
        }

        export default function Card({ title, count }: Props) {
          return (
            <div>
              <h2>{title}</h2>
              <p>Count: {count}</p>
            </div>
          );
        }
      `;

      const result = await compileReactComponent({
        componentPath: './Card.tsx',
        componentCode: code,
        sourceMaps: false,
      });

      expect(result.javascript).toBeDefined();
      // Types should be stripped
      expect(result.javascript).not.toContain('interface Props');
      expect(result.componentName).toBe('Card');
    });

    it('should handle hooks and state', async () => {
      const code = `
        import { useState } from 'react';

        export default function Counter() {
          const [count, setCount] = useState(0);
          return (
            <div>
              <p>Count: {count}</p>
              <button onClick={() => setCount(count + 1)}>Increment</button>
            </div>
          );
        }
      `;

      const result = await compileReactComponent({
        componentPath: './Counter.tsx',
        componentCode: code,
        sourceMaps: false,
      });

      expect(result.javascript).toBeDefined();
      expect(result.componentName).toBe('Counter');
    });
  });

  describe('HTML Wrapper Generation', () => {
    it('should generate complete HTML document', async () => {
      const code = `
        export default function App() {
          return <div>Hello World</div>;
        }
      `;

      const result = await compileReactComponent({
        componentPath: './App.tsx',
        componentCode: code,
        sourceMaps: false,
      });

      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<html lang="en">');
      expect(result.html).toContain('<div id="root">');
      expect(result.html).toContain('ReactDOM.createRoot');
    });

    it('should inject React runtime from CDN', async () => {
      const code = `
        export default function App() {
          return <div>Test</div>;
        }
      `;

      const result = await compileReactComponent({
        componentPath: './App.tsx',
        componentCode: code,
        sourceMaps: false,
      });

      expect(result.html).toContain('https://unpkg.com/react@');
      expect(result.html).toContain('https://unpkg.com/react-dom@');
      expect(result.html).toContain('18.2.0');
    });

    it('should include external dependencies', async () => {
      const code = `
        export default function Chart() {
          return <div>Chart</div>;
        }
      `;

      const result = await compileReactComponent({
        componentPath: './Chart.tsx',
        componentCode: code,
        dependencies: ['recharts@2.5.0', 'lodash@4.17.21'],
        sourceMaps: false,
      });

      expect(result.html).toContain('recharts@2.5.0');
      expect(result.html).toContain('lodash@4.17.21');
    });

    it('should include source maps when enabled', async () => {
      const code = `
        export default function App() {
          return <div>Test</div>;
        }
      `;

      const result = await compileReactComponent({
        componentPath: './App.tsx',
        componentCode: code,
        sourceMaps: true,
      });

      expect(result.sourceMap).toBeDefined();
      expect(result.html).toContain('<!-- Source Map -->');
    });

    it('should not include source maps when disabled', async () => {
      const code = `
        export default function App() {
          return <div>Test</div>;
        }
      `;

      const result = await compileReactComponent({
        componentPath: './App.tsx',
        componentCode: code,
        sourceMaps: false,
      });

      expect(result.sourceMap).toBeUndefined();
      expect(result.html).not.toContain('<!-- Source Map -->');
    });
  });

  describe('Component Validation', () => {
    it('should validate component with JSX and export', () => {
      const code = `
        export default function App() {
          return <div>Valid</div>;
        }
      `;

      expect(() => {
        validateComponentCode(code, './App.tsx');
      }).not.toThrow();
    });

    it('should throw error for missing export', () => {
      const code = `
        function App() {
          return <div>No export</div>;
        }
      `;

      expect(() => {
        validateComponentCode(code, './App.tsx');
      }).toThrow(/must have a default export/);
    });

    it('should warn for missing JSX (but not throw)', () => {
      const code = `
        export default function App() {
          return null;
        }
      `;

      // Should not throw, just warn
      expect(() => {
        validateComponentCode(code, './App.tsx');
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should provide helpful error for syntax errors', async () => {
      const code = `
        export default function Broken() {
          return <div>Unclosed div
        }
      `;

      await expect(
        compileReactComponent({
          componentPath: './Broken.tsx',
          componentCode: code,
          sourceMaps: false,
        })
      ).rejects.toThrow(/Failed to compile React component/);
    });

    it('should handle complex JSX expressions', async () => {
      const code = `
        export default function Complex() {
          const items = [1, 2, 3];
          return (
            <div>
              {items.map(item => (
                <span key={item}>{item}</span>
              ))}
            </div>
          );
        }
      `;

      const result = await compileReactComponent({
        componentPath: './Complex.tsx',
        componentCode: code,
        sourceMaps: false,
      });

      expect(result.javascript).toBeDefined();
      expect(result.componentName).toBe('Complex');
    });
  });

  describe('Real-World Components', () => {
    it('should compile calculator component', async () => {
      const code = `
        import { useState } from 'react';

        export default function Calculator() {
          const [display, setDisplay] = useState('0');
          const [operation, setOperation] = useState<string | null>(null);

          const handleNumber = (num: number) => {
            setDisplay(display === '0' ? String(num) : display + num);
          };

          return (
            <div className="calculator">
              <div className="display">{display}</div>
              <div className="buttons">
                <button onClick={() => handleNumber(1)}>1</button>
                <button onClick={() => handleNumber(2)}>2</button>
                <button onClick={() => handleNumber(3)}>3</button>
              </div>
            </div>
          );
        }
      `;

      const result = await compileReactComponent({
        componentPath: './Calculator.tsx',
        componentCode: code,
        sourceMaps: true,
      });

      expect(result.componentName).toBe('Calculator');
      expect(result.javascript).toBeDefined();
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.sourceMap).toBeDefined();
    });

    it('should compile form component with multiple inputs', async () => {
      const code = `
        import { useState } from 'react';

        export default function ContactForm() {
          const [name, setName] = useState('');
          const [email, setEmail] = useState('');

          const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            console.log({ name, email });
          };

          return (
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
              />
              <button type="submit">Submit</button>
            </form>
          );
        }
      `;

      const result = await compileReactComponent({
        componentPath: './ContactForm.tsx',
        componentCode: code,
        sourceMaps: false,
      });

      expect(result.componentName).toBe('ContactForm');
      expect(result.javascript).toBeDefined();
    });
  });
});
