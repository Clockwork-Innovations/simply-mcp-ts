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
    'node_modules',  // Exclude any node_modules subdirectories (e.g., tests/integration/node_modules)
    '/config/',
    '/trash/',  // Deprecated/archived tests
    '/__temp_test_deps__/',  // Temporary test files
    '/tests/e2e/',  // Playwright E2E tests (run separately with test:e2e)
    '/tests/performance/',  // Performance tests (run separately with test:perf)
    '/src/api/mcp/wizard/__tests__/',  // Wizard feature tests (experimental)
    '/examples/nextjs-mcp-ui/',  // Incomplete experimental UI feature
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
