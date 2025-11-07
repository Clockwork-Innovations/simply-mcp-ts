/**
 * Test fixture: Static resource WITHOUT literal data
 * This should trigger an improved error message explaining compile-time vs runtime distinction
 */

import type { IResource } from '../../src/server/interface-types.js';

// This const simulates user trying to reference a variable in a static resource
const MY_CONFIG = {
  version: '1.0.0',
  environment: 'production',
  features: ['feature1', 'feature2']
};

/**
 * This static resource interface has NO 'value' field with literal data.
 * It will fail at compile time and should provide helpful error guidance.
 */
interface ConfigResource extends IResource {
  uri: 'config://app';
  description: 'Application configuration';
  // Missing: value field with literal data
  // User likely wanted to do: value: typeof MY_CONFIG (which doesn't work)
}

/**
 * Minimal server to test static resource error handling
 */
export default class TestServer {
  name = 'test-static-error';
  version = '1.0.0';

  // Static resource - should fail because ConfigResource has no literal data
  config: ConfigResource;
}
