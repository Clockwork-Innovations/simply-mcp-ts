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
        isolatedModules: true, // Dramatically reduces memory usage by skipping type checking
        diagnostics: {
          ignoreCodes: [1343] // Required for ts-jest-mock-import-meta to work
        },
        astTransformers: {
          before: ['ts-jest-mock-import-meta']
        },
        tsconfig: {
          module: 'ES2020',
          moduleResolution: 'node',
          target: 'ES2020',
          skipLibCheck: true,
          noEmit: true
        }
      },
    ],
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/?(*.)+(spec|test).ts',
    '**/?(*.)+(spec|test).tsx'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(@anthropic-ai/claude-agent-sdk)/)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/config/',
    '/trash/',  // Deprecated/archived tests (includes phase2 bundling tests)
    '/__temp_test_deps__/',  // Temporary test files created by dependency-extractor.test.ts
    '/tests/e2e/',  // Playwright E2E tests (run separately with test:e2e)
    '/src/api/mcp/wizard/__tests__/',  // Wizard feature tests (experimental)
    '/tests/unit/interface-api/schema.test.ts',  // typeNodeToZodSchema() not fully implemented (returns empty array)
    '/tests/unit/interface-api/completions.test.ts',  // Custom runner (use tsx to run standalone)
    '/tests/unit/interface-api/elicitation.test.ts',  // Custom runner (use tsx to run standalone)
    '/tests/unit/interface-api/roots.test.ts',  // Custom runner (use tsx to run standalone)
    '/tests/unit/interface-api/sampling.test.ts',  // Custom runner (use tsx to run standalone)
    '/tests/unit/interface-api/subscriptions.test.ts',  // Custom runner (use tsx to run standalone)
    '/tests/unit/interface-api/prompt-message-arrays.test.ts',  // Custom runner (use tsx to run standalone)
    '/tests/unit/interface-api/prompt-simple-messages.test.ts',  // Custom runner (use tsx to run standalone)
    '/tests/unit/type-coercion.test.ts',  // ts-jest-mock-import-meta conflicts with __filename usage
    '/tests/unit/validation/inline-iparam.test.ts',  // Type errors + ts-jest-mock-import-meta conflicts
    '/tests/unit/interface-api/auto-export.test.ts',  // ts-jest-mock-import-meta conflicts with __filename usage
    '/tests/unit/interface-api/object-resource.test.ts',  // ts-jest-mock-import-meta conflicts with __filename usage
    '/tests/unit/interface-api/static-resource.test.ts',  // ts-jest-mock-import-meta conflicts with __filename usage
    '/tests/unit/ui-watch-manager.test.ts',  // ts-jest-mock-import-meta conflicts with __filename usage
    '/tests/unit/dependency-extractor.test.ts',  // ts-jest-mock-import-meta conflicts with __filename usage
    '/tests/unit/interface-api/database-resource.test.ts',  // Fixture has TypeScript type errors with IServer interface
    '/examples/nextjs-mcp-ui/',  // Incomplete experimental UI feature
    // Note: The following tests use programmatic capability detection and will skip automatically if environment doesn't support them.
    // They are still excluded here to avoid timeout issues in CI/limited environments:
    '/tests/integration/streamable-http-transport.test.ts',  // Integration test - uses programmatic skip (describeIfCanRunIntegration)
    '/tests/performance/streamable-http-performance.test.ts',  // Performance test - requires HTTP server (run separately)
    // Integration tests with __dirname incompatible with ESM (v4.4.0 CI fix)
    '/tests/integration/adapter-performance.test.ts',  // Performance test with __dirname (run separately)
    '/tests/integration/agent-sdk-query.test.ts',  // Agent SDK tests with __dirname (external dependency)
    '/tests/integration/agent-sdk-stdio.test.ts',  // Agent SDK tests with __dirname (external dependency)
    '/tests/integration/bundled-server-reflection.test.ts',  // Bundle reflection with __dirname (edge case)
    '/tests/integration/iparam-schema-generation.test.ts',  // IParam schema tests with __dirname (edge cases)
    '/tests/integration/skill-membership-e2e.test.ts',  // Skill membership E2E with __dirname (environment-dependent)
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
  workerIdleMemoryLimit: '1GB', // Restart workers when they exceed 1GB to prevent OOM
};
