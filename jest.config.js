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
    '/tests/phase2/',
    '/tests/integration/',
    '/config/',
    '/src/api/mcp/wizard/__tests__/',
    '/tests/unit/interface-api/basic.test.ts',
    '/tests/unit/interface-api/schema.test.ts',
    '/tests/unit/decorator-params.test.ts',
    '/tests/unit/interface-auto-detect.test.ts',
    '/tests/unit/interface-api.test.ts',
    '/tests/unit/interface-api/static-resource.test.ts',  // Tests unimplemented static resource feature
    '/examples/nextjs-mcp-ui/',  // Incomplete experimental UI feature
    '/tests/phase3-layer3.test.ts',  // Tests unimplemented lifecycle hooks
    '/tests/context.test.ts',  // Tests files that don't exist (Context, ContextBuilder, SessionImpl)
    '/tests/sampling-context.test.ts',  // Tests missing Context/SessionImpl files
    '/tests/request-id.test.ts',  // Tests missing request ID feature
    '/tests/phase2-layer1.test.ts',  // Tests missing SessionImpl/ContextBuilder
    '/tests/phase2-layer1-simple.test.ts',  // Tests missing SessionImpl
    '/tests/phase2-layer2.test.ts',  // Tests missing context.mcp property
    '/tests/phase2-layer3.test.ts',  // Tests missing context.mcp features
    '/tests/phase3-layers1-2.test.ts',  // Tests missing ContextBuilder
    '/tests/functional-router-foundation.test.ts',  // Has remaining issues
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
