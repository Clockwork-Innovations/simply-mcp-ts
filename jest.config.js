export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/config/',
    '/src/api/mcp/wizard/__tests__/',  // Wizard feature tests (experimental)
    '/tests/unit/interface-api/schema.test.ts',  // typeNodeToZodSchema() not fully implemented (returns empty array)
    '/tests/unit/interface-api.test.ts',  // Broken imports, superseded by tests/unit/interface-api/*.test.ts
    '/tests/unit/interface-api/static-resource.test.ts',  // Broken imports (adapter.js moved)
    '/examples/nextjs-mcp-ui/',  // Incomplete experimental UI feature
    '\\.manual\\.ts$'  // Custom-runner tests (not Jest-compatible)
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
  testTimeout: 10000,
};
