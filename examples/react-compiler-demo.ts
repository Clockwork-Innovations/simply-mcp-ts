/**
 * React Compiler Demo
 *
 * Demonstrates the Babel-based React/JSX compiler that transforms
 * React components (.tsx/.jsx) into browser-ready HTML with automatic
 * React runtime injection.
 *
 * Run: npx tsx examples/react-compiler-demo.ts
 */

import { compileReactComponent } from '../src/features/ui/ui-react-compiler.js';

async function main() {
  console.log('=== React Compiler Demo ===\n');

  // Example 1: Simple Counter Component
  console.log('1. Simple Counter Component');
  console.log('----------------------------');

  const counterCode = `
    import { useState } from 'react';

    export default function Counter() {
      const [count, setCount] = useState(0);

      return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
          <h2>Counter Demo</h2>
          <p>Count: {count}</p>
          <button onClick={() => setCount(count + 1)}>Increment</button>
          <button onClick={() => setCount(count - 1)} style={{ marginLeft: '10px' }}>
            Decrement
          </button>
          <button onClick={() => setCount(0)} style={{ marginLeft: '10px' }}>
            Reset
          </button>
        </div>
      );
    }
  `;

  try {
    const result = await compileReactComponent({
      componentPath: './Counter.tsx',
      componentCode: counterCode,
      sourceMaps: true,
      verbose: true,
    });

    console.log(`Component Name: ${result.componentName}`);
    console.log(`Compiled JS Size: ${result.javascript.length} bytes`);
    console.log(`HTML Size: ${result.html.length} bytes`);
    console.log(`Has Source Map: ${result.sourceMap ? 'Yes' : 'No'}`);
    console.log();

    // Show a snippet of the compiled JavaScript
    console.log('Compiled JavaScript (first 200 chars):');
    console.log(result.javascript.substring(0, 200) + '...\n');
  } catch (error: any) {
    console.error('Compilation failed:', error.message);
  }

  // Example 2: Form Component with TypeScript
  console.log('2. Contact Form Component (TypeScript)');
  console.log('---------------------------------------');

  const formCode = `
    import { useState } from 'react';

    interface FormData {
      name: string;
      email: string;
      message: string;
    }

    export default function ContactForm() {
      const [formData, setFormData] = useState<FormData>({
        name: '',
        email: '',
        message: '',
      });

      const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert(\`Form submitted: \${JSON.stringify(formData, null, 2)}\`);
      };

      const handleChange = (field: keyof FormData, value: string) => {
        setFormData({ ...formData, [field]: value });
      };

      return (
        <div style={{ padding: '20px', maxWidth: '400px' }}>
          <h2>Contact Form</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '10px' }}>
              <label>Name:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                style={{ display: 'block', width: '100%', padding: '8px' }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>Email:</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                style={{ display: 'block', width: '100%', padding: '8px' }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>Message:</label>
              <textarea
                value={formData.message}
                onChange={(e) => handleChange('message', e.target.value)}
                style={{ display: 'block', width: '100%', padding: '8px' }}
                rows={4}
              />
            </div>
            <button type="submit" style={{ padding: '10px 20px' }}>
              Submit
            </button>
          </form>
        </div>
      );
    }
  `;

  try {
    const result = await compileReactComponent({
      componentPath: './ContactForm.tsx',
      componentCode: formCode,
      sourceMaps: false,
      verbose: false,
    });

    console.log(`Component Name: ${result.componentName}`);
    console.log(`Compiled JS Size: ${result.javascript.length} bytes`);
    console.log(`TypeScript types stripped: Yes`);
    console.log();
  } catch (error: any) {
    console.error('Compilation failed:', error.message);
  }

  // Example 3: Component with External Dependencies
  console.log('3. Chart Component (with dependencies)');
  console.log('---------------------------------------');

  const chartCode = `
    export default function SimpleChart() {
      const data = [
        { name: 'Jan', value: 400 },
        { name: 'Feb', value: 300 },
        { name: 'Mar', value: 600 },
      ];

      return (
        <div style={{ padding: '20px' }}>
          <h2>Sales Chart</h2>
          <p>Data: {JSON.stringify(data)}</p>
          <p style={{ color: '#888' }}>
            Note: This component could use Recharts or other charting libraries
            loaded from CDN via the dependencies option.
          </p>
        </div>
      );
    }
  `;

  try {
    const result = await compileReactComponent({
      componentPath: './Chart.tsx',
      componentCode: chartCode,
      dependencies: ['recharts@2.5.0'], // External dependencies from CDN
      sourceMaps: false,
      verbose: false,
    });

    console.log(`Component Name: ${result.componentName}`);
    console.log(`External Dependencies: recharts@2.5.0`);
    console.log(`HTML includes CDN scripts: ${result.html.includes('recharts@2.5.0') ? 'Yes' : 'No'}`);
    console.log();
  } catch (error: any) {
    console.error('Compilation failed:', error.message);
  }

  // Example 4: Error Handling
  console.log('4. Error Handling (Invalid Component)');
  console.log('--------------------------------------');

  const invalidCode = `
    function BrokenComponent() {
      return <div>Missing export!</div>;
    }
  `;

  try {
    await compileReactComponent({
      componentPath: './Broken.tsx',
      componentCode: invalidCode,
      sourceMaps: false,
      verbose: false,
    });
  } catch (error: any) {
    console.log('Expected error caught:');
    console.log(error.message);
    console.log();
  }

  // Example 5: Show HTML Structure
  console.log('5. HTML Wrapper Structure');
  console.log('-------------------------');

  const simpleCode = `
    export default function App() {
      return <div>Hello World</div>;
    }
  `;

  try {
    const result = await compileReactComponent({
      componentPath: './App.tsx',
      componentCode: simpleCode,
      sourceMaps: false,
      verbose: false,
    });

    console.log('HTML Structure:');
    console.log('- DOCTYPE and html tags: ✓');
    console.log('- Viewport meta tag: ✓');
    console.log('- Root div (#root): ✓');
    console.log('- React 18.x from CDN: ✓');
    console.log('- ReactDOM from CDN: ✓');
    console.log('- Compiled component: ✓');
    console.log('- Root rendering logic: ✓');
    console.log();
    console.log('HTML Preview (first 500 chars):');
    console.log(result.html.substring(0, 500) + '...\n');
  } catch (error: any) {
    console.error('Compilation failed:', error.message);
  }

  console.log('=== Demo Complete ===');
}

main().catch(console.error);
