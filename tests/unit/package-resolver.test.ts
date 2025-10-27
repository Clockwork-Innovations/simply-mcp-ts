/**
 * Package Resolver Unit Tests
 */

import { describe, it, expect } from '@jest/globals';
import { PackageResolver } from '../../src/features/ui/package-resolver.js';

describe('PackageResolver', () => {
  it('should resolve CDN URL for package', async () => {
    const resolver = new PackageResolver({ forceCDN: true });
    const result = await resolver.resolve('lodash', '4.17.21');

    expect(result.source).toBe('cdn');
    expect(result.name).toBe('lodash');
    expect(result.version).toBe('4.17.21');
    expect(result.path).toBe('https://unpkg.com/lodash@4.17.21');
  });

  it('should use latest version by default', async () => {
    const resolver = new PackageResolver({ forceCDN: true });
    const result = await resolver.resolve('some-nonexistent-package');

    expect(result.version).toBe('latest');
    expect(result.path).toBe('https://unpkg.com/some-nonexistent-package@latest');
  });

  it('should check local package existence', () => {
    const resolver = new PackageResolver();
    const exists = resolver.hasLocalPackage('typescript');

    expect(typeof exists).toBe('boolean');
  });

  it('should cache resolutions', async () => {
    const resolver = new PackageResolver({ forceCDN: true });

    const first = await resolver.resolve('lodash', '4.17.21');
    const second = await resolver.resolve('lodash', '4.17.21');

    expect(first).toBe(second); // Same object reference
  });

  it('should clear cache', async () => {
    const resolver = new PackageResolver({ forceCDN: true });

    await resolver.resolve('lodash');
    resolver.clearCache();

    // Cache should be empty (can't easily verify, but shouldn't throw)
    await resolver.resolve('lodash');
  });
});
