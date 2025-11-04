/**
 * Dependency Extractor Unit Tests
 *
 * Comprehensive tests for automatic dependency extraction from TypeScript/JavaScript code
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  extractDependencies,
  extractDependenciesFromCode,
  type ExtractedDependencies
} from '../../src/compiler/dependency-extractor.js';
import { writeFileSync, unlinkSync, mkdirSync, rmdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Dependency Extractor', () => {

  // Temporary test directory
  const testDir = resolve(__dirname, '__temp_test_deps__');

  beforeEach(() => {
    // Create temp directory for file-based tests
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up temp directory
    if (existsSync(testDir)) {
      try {
        const files = require('fs').readdirSync(testDir);
        files.forEach((file: string) => {
          unlinkSync(resolve(testDir, file));
        });
        rmdirSync(testDir);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  // ============================================================================
  // NPM Package Extraction Tests
  // ============================================================================

  describe('NPM Package Extraction', () => {
    it('should extract single NPM package', () => {
      const code = `import React from 'react';`;
      const result = extractDependenciesFromCode(code);

      expect(result.npmPackages).toEqual(['react']);
      expect(result.localFiles).toEqual([]);
      expect(result.stylesheets).toEqual([]);
    });

    it('should extract multiple NPM packages', () => {
      const code = `
        import React from 'react';
        import { Chart } from 'recharts';
        import { formatDate } from 'date-fns';
      `;
      const result = extractDependenciesFromCode(code);

      expect(result.npmPackages).toContain('react');
      expect(result.npmPackages).toContain('recharts');
      expect(result.npmPackages).toContain('date-fns');
      expect(result.npmPackages).toHaveLength(3);
    });

    it('should handle scoped packages (@org/package)', () => {
      const code = `
        import { Button } from '@mui/material';
        import theme from '@company/design-system';
      `;
      const result = extractDependenciesFromCode(code);

      expect(result.npmPackages).toContain('@mui/material');
      expect(result.npmPackages).toContain('@company/design-system');
    });

    it('should handle subpath imports (package/submodule)', () => {
      const code = `
        import get from 'lodash/get';
        import { createStore } from 'redux/toolkit';
      `;
      const result = extractDependenciesFromCode(code);

      expect(result.npmPackages).toContain('lodash');
      expect(result.npmPackages).toContain('redux');
    });

    it('should handle scoped packages with subpaths', () => {
      const code = `
        import { Button } from '@mui/material/Button';
        import utils from '@company/utils/helpers';
      `;
      const result = extractDependenciesFromCode(code);

      expect(result.npmPackages).toContain('@mui/material');
      expect(result.npmPackages).toContain('@company/utils');
    });

    it('should deduplicate packages', () => {
      const code = `
        import React from 'react';
        import { useState } from 'react';
        import { useEffect } from 'react';
      `;
      const result = extractDependenciesFromCode(code);

      expect(result.npmPackages).toEqual(['react']);
    });

    it('should extract from named imports', () => {
      const code = `import { useState, useEffect } from 'react';`;
      const result = extractDependenciesFromCode(code);

      expect(result.npmPackages).toContain('react');
    });

    it('should extract from namespace imports', () => {
      const code = `import * as React from 'react';`;
      const result = extractDependenciesFromCode(code);

      expect(result.npmPackages).toContain('react');
    });

    it('should extract from default imports', () => {
      const code = `import React from 'react';`;
      const result = extractDependenciesFromCode(code);

      expect(result.npmPackages).toContain('react');
    });

    it('should extract from side-effect imports', () => {
      const code = `import 'regenerator-runtime/runtime';`;
      const result = extractDependenciesFromCode(code);

      expect(result.npmPackages).toContain('regenerator-runtime');
    });
  });

  // ============================================================================
  // Local File Import Tests
  // ============================================================================

  describe('Local File Extraction', () => {
    it('should extract relative file imports', () => {
      const code = `import { Button } from './Button';`;
      const result = extractDependenciesFromCode(code);

      expect(result.localFiles).toContain('./Button');
      expect(result.npmPackages).toEqual([]);
    });

    it('should extract parent directory imports', () => {
      const code = `import { utils } from '../utils/helpers';`;
      const result = extractDependenciesFromCode(code);

      expect(result.localFiles).toContain('../utils/helpers');
    });

    it('should extract multiple local files', () => {
      const code = `
        import { Button } from './Button';
        import { Input } from './Input';
        import { Card } from '../components/Card';
      `;
      const result = extractDependenciesFromCode(code);

      expect(result.localFiles).toContain('./Button');
      expect(result.localFiles).toContain('./Input');
      expect(result.localFiles).toContain('../components/Card');
    });

    it('should handle .tsx extensions explicitly', () => {
      const code = `import { Button } from './Button.tsx';`;
      const result = extractDependenciesFromCode(code);

      expect(result.localFiles).toContain('./Button.tsx');
    });

    it('should handle .ts extensions', () => {
      const code = `import { utils } from './utils.ts';`;
      const result = extractDependenciesFromCode(code);

      expect(result.localFiles).toContain('./utils.ts');
    });

    it('should deduplicate local files', () => {
      const code = `
        import { Button } from './Button';
        import { ButtonProps } from './Button';
      `;
      const result = extractDependenciesFromCode(code);

      expect(result.localFiles).toEqual(['./Button']);
    });
  });

  // ============================================================================
  // CSS/Stylesheet Extraction Tests
  // ============================================================================

  describe('CSS/Stylesheet Extraction', () => {
    it('should extract CSS imports', () => {
      const code = `import './styles.css';`;
      const result = extractDependenciesFromCode(code);

      expect(result.stylesheets).toContain('./styles.css');
      expect(result.npmPackages).toEqual([]);
    });

    it('should extract SCSS imports', () => {
      const code = `import './theme.scss';`;
      const result = extractDependenciesFromCode(code);

      expect(result.stylesheets).toContain('./theme.scss');
    });

    it('should extract SASS imports', () => {
      const code = `import './main.sass';`;
      const result = extractDependenciesFromCode(code);

      expect(result.stylesheets).toContain('./main.sass');
    });

    it('should extract LESS imports', () => {
      const code = `import './variables.less';`;
      const result = extractDependenciesFromCode(code);

      expect(result.stylesheets).toContain('./variables.less');
    });

    it('should extract multiple stylesheets', () => {
      const code = `
        import './reset.css';
        import './theme.scss';
        import '../styles/global.css';
      `;
      const result = extractDependenciesFromCode(code);

      expect(result.stylesheets).toHaveLength(3);
      expect(result.stylesheets).toContain('./reset.css');
      expect(result.stylesheets).toContain('./theme.scss');
      expect(result.stylesheets).toContain('../styles/global.css');
    });
  });

  // ============================================================================
  // Script Extraction Tests
  // ============================================================================

  describe('Script Extraction', () => {
    it('should extract .js script imports', () => {
      const code = `import analytics from './analytics.js';`;
      const result = extractDependenciesFromCode(code);

      expect(result.scripts).toContain('./analytics.js');
    });

    it('should not classify .tsx/.jsx as scripts', () => {
      const code = `
        import Component from './Component.tsx';
        import Another from './Another.jsx';
      `;
      const result = extractDependenciesFromCode(code);

      expect(result.scripts).toEqual([]);
      expect(result.localFiles).toHaveLength(2);
    });

    it('should classify plain .js files as scripts', () => {
      const code = `import './config.js';`;
      const result = extractDependenciesFromCode(code);

      expect(result.scripts).toContain('./config.js');
    });
  });

  // ============================================================================
  // Dynamic Import Tests
  // ============================================================================

  describe('Dynamic Import Extraction', () => {
    it('should extract dynamic imports', () => {
      const code = `
        const module = import('dynamic-package');
      `;
      const result = extractDependenciesFromCode(code);

      expect(result.dynamicImports).toContain('dynamic-package');
    });

    it('should extract multiple dynamic imports', () => {
      const code = `
        const a = import('package-a');
        const b = import('package-b');
        const c = import('./Component');
      `;
      const result = extractDependenciesFromCode(code);

      expect(result.dynamicImports).toHaveLength(3);
      expect(result.dynamicImports).toContain('package-a');
      expect(result.dynamicImports).toContain('package-b');
      expect(result.dynamicImports).toContain('./Component');
    });

    it('should handle dynamic imports with then chains', () => {
      const code = `
        import('lodash').then(({ default: _ }) => {
          // Use lodash
        });
      `;
      const result = extractDependenciesFromCode(code);

      expect(result.dynamicImports).toContain('lodash');
    });
  });

  // ============================================================================
  // Export Re-export Tests
  // ============================================================================

  describe('Export Re-export Extraction', () => {
    it('should extract re-exports', () => {
      const code = `export { Button } from './Button';`;
      const result = extractDependenciesFromCode(code);

      expect(result.localFiles).toContain('./Button');
    });

    it('should extract re-exports from npm packages', () => {
      const code = `export { useState } from 'react';`;
      const result = extractDependenciesFromCode(code);

      expect(result.npmPackages).toContain('react');
    });

    it('should extract wildcard re-exports', () => {
      const code = `export * from './components';`;
      const result = extractDependenciesFromCode(code);

      expect(result.localFiles).toContain('./components');
    });

    it('should extract named re-exports', () => {
      const code = `export { Button, Input } from './ui';`;
      const result = extractDependenciesFromCode(code);

      expect(result.localFiles).toContain('./ui');
    });
  });

  // ============================================================================
  // Mixed Import Tests
  // ============================================================================

  describe('Mixed Import Scenarios', () => {
    it('should handle comprehensive component with all import types', () => {
      const code = `
        import React, { useState } from 'react';
        import { Chart } from 'recharts';
        import { formatDate } from 'date-fns';
        import { Button } from './components/Button';
        import { Input } from '../ui/Input';
        import './Dashboard.css';
        import './theme.scss';
        import analytics from './analytics.js';
        export { Header } from './Header';
      `;

      const result = extractDependenciesFromCode(code);

      // NPM packages
      expect(result.npmPackages).toContain('react');
      expect(result.npmPackages).toContain('recharts');
      expect(result.npmPackages).toContain('date-fns');

      // Local files
      expect(result.localFiles).toContain('./components/Button');
      expect(result.localFiles).toContain('../ui/Input');
      expect(result.localFiles).toContain('./Header');

      // Stylesheets
      expect(result.stylesheets).toContain('./Dashboard.css');
      expect(result.stylesheets).toContain('./theme.scss');

      // Scripts
      expect(result.scripts).toContain('./analytics.js');
    });

    it('should handle empty file', () => {
      const code = `// Empty file`;
      const result = extractDependenciesFromCode(code);

      expect(result.npmPackages).toEqual([]);
      expect(result.localFiles).toEqual([]);
      expect(result.stylesheets).toEqual([]);
      expect(result.scripts).toEqual([]);
    });

    it('should handle file with no imports', () => {
      const code = `
        const x = 5;
        function add(a, b) {
          return a + b;
        }
      `;
      const result = extractDependenciesFromCode(code);

      expect(result.npmPackages).toEqual([]);
      expect(result.localFiles).toEqual([]);
    });

    it('should handle comments in code', () => {
      const code = `
        // import { fake } from 'should-not-extract';
        import React from 'react'; // Real import
        /*
         * import { another } from 'also-fake';
         */
        import './styles.css';
      `;

      const result = extractDependenciesFromCode(code);

      expect(result.npmPackages).toEqual(['react']);
      expect(result.stylesheets).toEqual(['./styles.css']);
      expect(result.npmPackages).not.toContain('should-not-extract');
      expect(result.npmPackages).not.toContain('also-fake');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle whitespace variations', () => {
      const code = `
        import   React   from   'react'  ;
        import{useState}from'react';
      `;

      const result = extractDependenciesFromCode(code);

      expect(result.npmPackages).toEqual(['react']);
    });

    it('should handle multiline imports', () => {
      const code = `
        import {
          useState,
          useEffect,
          useCallback
        } from 'react';
      `;

      const result = extractDependenciesFromCode(code);

      expect(result.npmPackages).toContain('react');
    });

    it('should handle type-only imports', () => {
      const code = `
        import type { FC } from 'react';
        import { type ButtonProps } from './Button';
      `;

      const result = extractDependenciesFromCode(code);

      expect(result.npmPackages).toContain('react');
      expect(result.localFiles).toContain('./Button');
    });

    it('should handle imports with aliases', () => {
      const code = `
        import React, { useState as useStateHook } from 'react';
        import { default as lodash } from 'lodash';
      `;

      const result = extractDependenciesFromCode(code);

      expect(result.npmPackages).toContain('react');
      expect(result.npmPackages).toContain('lodash');
    });

    it('should handle very long import paths', () => {
      const longPath = './very/deep/nested/folder/structure/Component';
      const code = `import { Component } from '${longPath}';`;

      const result = extractDependenciesFromCode(code);

      expect(result.localFiles).toContain(longPath);
    });
  });

  // ============================================================================
  // File-based Extraction Tests
  // ============================================================================

  describe('File-based Extraction', () => {
    it('should extract dependencies from file', () => {
      const filePath = resolve(testDir, 'test-component.tsx');
      const code = `
        import React from 'react';
        import './styles.css';
      `;

      writeFileSync(filePath, code, 'utf-8');

      const result = extractDependencies({
        filePath,
        recursive: false
      });

      expect(result.npmPackages).toContain('react');
      expect(result.stylesheets).toContain('./styles.css');
    });

    it('should throw error for non-existent file', () => {
      const filePath = resolve(testDir, 'non-existent.tsx');

      expect(() => {
        extractDependencies({
          filePath,
          recursive: false
        });
      }).toThrow();
    });

    it('should prefer provided sourceCode over reading file', () => {
      const filePath = resolve(testDir, 'test.tsx');
      writeFileSync(filePath, `import 'wrong-package';`, 'utf-8');

      const result = extractDependencies({
        filePath,
        sourceCode: `import 'correct-package';`,
        recursive: false
      });

      expect(result.npmPackages).toContain('correct-package');
      expect(result.npmPackages).not.toContain('wrong-package');
    });
  });

  // ============================================================================
  // Categorization Logic Tests
  // ============================================================================

  describe('Categorization Logic', () => {
    it('should categorize based on path prefix', () => {
      const code = `
        import a from 'npm-package';      // NPM
        import b from './local-file';     // Local
        import c from '../parent-file';   // Local
        import d from '/absolute-file';   // Local
      `;

      const result = extractDependenciesFromCode(code);

      expect(result.npmPackages).toEqual(['npm-package']);
      expect(result.localFiles).toContain('./local-file');
      expect(result.localFiles).toContain('../parent-file');
      expect(result.localFiles).toContain('/absolute-file');
    });

    it('should categorize based on file extension', () => {
      const code = `
        import './component.tsx';  // Local (component)
        import './styles.css';     // Stylesheet
        import './script.js';      // Script
        import './helper.ts';      // Local
      `;

      const result = extractDependenciesFromCode(code);

      expect(result.localFiles).toContain('./component.tsx');
      expect(result.stylesheets).toContain('./styles.css');
      expect(result.scripts).toContain('./script.js');
      expect(result.localFiles).toContain('./helper.ts');
    });
  });

  // ============================================================================
  // Return Structure Tests
  // ============================================================================

  describe('Return Structure', () => {
    it('should always return all expected properties', () => {
      const result = extractDependenciesFromCode('// Test file');

      expect(result).toHaveProperty('npmPackages');
      expect(result).toHaveProperty('localFiles');
      expect(result).toHaveProperty('stylesheets');
      expect(result).toHaveProperty('scripts');
      expect(result).toHaveProperty('dynamicImports');
    });

    it('should return arrays for all properties', () => {
      const result = extractDependenciesFromCode('import React from "react";');

      expect(Array.isArray(result.npmPackages)).toBe(true);
      expect(Array.isArray(result.localFiles)).toBe(true);
      expect(Array.isArray(result.stylesheets)).toBe(true);
      expect(Array.isArray(result.scripts)).toBe(true);
      expect(Array.isArray(result.dynamicImports)).toBe(true);
    });

    it('should return unique values (no duplicates)', () => {
      const code = `
        import React from 'react';
        import { useState } from 'react';
      `;

      const result = extractDependenciesFromCode(code);

      expect(result.npmPackages).toEqual(['react']);
    });
  });

  // ============================================================================
  // Real-World Component Examples
  // ============================================================================

  describe('Real-World Components', () => {
    it('should handle typical React component', () => {
      const code = `
        import React, { useState, useEffect } from 'react';
        import { Card, CardContent, CardHeader } from '@mui/material';
        import { fetchData } from './api/client';
        import './Dashboard.css';

        export const Dashboard: React.FC = () => {
          const [data, setData] = useState(null);

          useEffect(() => {
            fetchData().then(setData);
          }, []);

          return <Card><CardHeader>Dashboard</CardHeader></Card>;
        };
      `;

      const result = extractDependenciesFromCode(code);

      expect(result.npmPackages).toContain('react');
      expect(result.npmPackages).toContain('@mui/material');
      expect(result.localFiles).toContain('./api/client');
      expect(result.stylesheets).toContain('./Dashboard.css');
    });

    it('should handle Next.js page component', () => {
      const code = `
        import { GetServerSideProps } from 'next';
        import Head from 'next/head';
        import Image from 'next/image';
        import styles from './index.module.css';

        export default function Home() {
          return <div>Hello</div>;
        }
      `;

      const result = extractDependenciesFromCode(code);

      expect(result.npmPackages).toEqual(['next']);
      expect(result.stylesheets).toContain('./index.module.css');
    });
  });
});
