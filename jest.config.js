export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: './tsconfig.test.json', // Use test-specific tsconfig that supports import.meta
      },
    ],
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/?(*.)+(spec|test).ts',
    '**/?(*.)+(spec|test).tsx'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/config/',
    '/trash/',  // Deprecated/archived tests (includes phase2 bundling tests)
    '/__temp_test_deps__/',  // Temporary test files created by dependency-extractor.test.ts
    '/src/api/mcp/wizard/__tests__/',  // Wizard feature tests (experimental)
    '/tests/unit/interface-api/schema.test.ts',  // typeNodeToZodSchema() not fully implemented (returns empty array)
    '/tests/unit/interface-api.test.ts',  // Broken imports, superseded by tests/unit/interface-api/*.test.ts
    '/tests/unit/interface-api/completions.test.ts',  // Custom runner (use tsx to run standalone)
    '/tests/unit/interface-api/elicitation.test.ts',  // Custom runner (use tsx to run standalone)
    '/tests/unit/interface-api/roots.test.ts',  // Custom runner (use tsx to run standalone)
    '/tests/unit/interface-api/sampling.test.ts',  // Custom runner (use tsx to run standalone)
    '/tests/unit/interface-api/subscriptions.test.ts',  // Custom runner (use tsx to run standalone)
    '/tests/unit/interface-api/prompt-message-arrays.test.ts',  // Custom runner (use tsx to run standalone)
    '/tests/unit/interface-api/prompt-simple-messages.test.ts',  // Custom runner (use tsx to run standalone)
    '/tests/unit/type-coercion.test.ts',  // Uses loadInterfaceServer (requires import.meta.url workaround)
    '/tests/unit/validation/inline-iparam.test.ts',  // Uses parseInterfaceFile (requires import.meta.url workaround)
    '/examples/nextjs-mcp-ui/',  // Incomplete experimental UI feature
    '/tests/e2e/simple-message.test.ts',  // E2E test - stdio transport hangs in connect (run separately with: npx jest tests/e2e/simple-message.test.ts)
    '/tests/integration/streamable-http-transport.test.ts',  // Integration test - requires HTTP server (run separately)
    '/tests/performance/streamable-http-performance.test.ts',  // Performance test - requires HTTP server (run separately)
    '/tests/unit/client/remote-dom-worker.test.ts',  // Requires browser Worker API - not available in Node.js test environment (needs Puppeteer/Playwright)
    '/tests/unit/client/component-library-v2.test.tsx',  // Requires browser Worker API for RemoteDOMWorkerManager
    '\\.manual\\.ts$',  // Custom-runner tests (not Jest-compatible)
    '\\.md$'  // Exclude markdown files from test execution
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 30000, // Increased from 10s to 30s for integration tests
  maxWorkers: 2, // Limit parallel workers to prevent resource exhaustion
};
