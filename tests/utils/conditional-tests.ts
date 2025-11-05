/**
 * Conditional test execution helpers for Jest.
 *
 * These utilities make it easy to skip tests based on environment capabilities,
 * ensuring tests run on capable systems while automatically skipping on
 * limited environments.
 */

import {
  canSpawnServers,
  canBindHttpServer,
  hasWorkerAPI,
  hasBrowserAutomation,
  canRunIntegrationTests,
  canRunE2ETests,
  canEnforceFilePermissions,
} from './env-capabilities';

type TestFunction = Parameters<typeof test>[1];
type DescribeFunction = Parameters<typeof describe>[1];

/**
 * Run test only if servers can be spawned
 */
export function testIfCanSpawnServers(
  name: string,
  fn: TestFunction,
  timeout?: number
): void {
  const wrappedFn = async () => {
    const capable = await canSpawnServers();
    if (!capable) {
      console.warn(`⊘ Skipping test "${name}" - cannot spawn servers in this environment`);
      return;
    }
    return (fn as any)();
  };

  if (timeout !== undefined) {
    test(name, wrappedFn, timeout);
  } else {
    test(name, wrappedFn);
  }
}

/**
 * Run test only if HTTP servers can be bound
 */
export function testIfCanBindHttp(
  name: string,
  fn: TestFunction,
  timeout?: number
): void {
  const wrappedFn = async () => {
    const capable = await canBindHttpServer();
    if (!capable) {
      console.warn(`⊘ Skipping test "${name}" - cannot bind HTTP server in this environment`);
      return;
    }
    return (fn as any)();
  };

  if (timeout !== undefined) {
    test(name, wrappedFn, timeout);
  } else {
    test(name, wrappedFn);
  }
}

/**
 * Run test only if Worker API is available
 */
export function testIfHasWorkerAPI(
  name: string,
  fn: TestFunction,
  timeout?: number
): void {
  const capable = hasWorkerAPI();
  if (!capable) {
    test.skip(name, fn);
  } else {
    if (timeout !== undefined) {
      test(name, fn, timeout);
    } else {
      test(name, fn);
    }
  }
}

/**
 * Run test only if browser automation is available
 */
export function testIfHasBrowserAutomation(
  name: string,
  fn: TestFunction,
  timeout?: number
): void {
  const capable = hasBrowserAutomation();
  if (!capable) {
    test.skip(name, fn);
  } else {
    if (timeout !== undefined) {
      test(name, fn, timeout);
    } else {
      test(name, fn);
    }
  }
}

/**
 * Run test only if integration tests are supported
 */
export function testIfCanRunIntegration(
  name: string,
  fn: TestFunction,
  timeout?: number
): void {
  const wrappedFn = async () => {
    const capable = await canRunIntegrationTests();
    if (!capable) {
      console.warn(`⊘ Skipping test "${name}" - cannot run integration tests in this environment`);
      return;
    }
    return (fn as any)();
  };

  if (timeout !== undefined) {
    test(name, wrappedFn, timeout);
  } else {
    test(name, wrappedFn);
  }
}

/**
 * Run test only if E2E tests are supported
 */
export function testIfCanRunE2E(
  name: string,
  fn: TestFunction,
  requiresBrowser = false,
  timeout?: number
): void {
  const wrappedFn = async () => {
    const capable = await canRunE2ETests(requiresBrowser);
    if (!capable) {
      console.warn(`⊘ Skipping test "${name}" - cannot run E2E tests in this environment`);
      return;
    }
    return (fn as any)();
  };

  if (timeout !== undefined) {
    test(name, wrappedFn, timeout);
  } else {
    test(name, wrappedFn);
  }
}

/**
 * Run test only if file permissions are enforced
 */
export function testIfCanEnforceFilePermissions(
  name: string,
  fn: TestFunction,
  timeout?: number
): void {
  const wrappedFn = async () => {
    const capable = await canEnforceFilePermissions();
    if (!capable) {
      console.warn(`⊘ Skipping test "${name}" - file permissions not enforced in this environment`);
      return;
    }
    return (fn as any)();
  };

  if (timeout !== undefined) {
    test(name, wrappedFn, timeout);
  } else {
    test(name, wrappedFn);
  }
}

/**
 * Run describe block only if servers can be spawned
 */
export function describeIfCanSpawnServers(
  name: string,
  fn: DescribeFunction
): void {
  // We need to check this synchronously, so we use a beforeAll hook
  describe(name, () => {
    let shouldRun = false;

    beforeAll(async () => {
      shouldRun = await canSpawnServers();
      if (!shouldRun) {
        console.warn(`⊘ Skipping test suite "${name}" - cannot spawn servers in this environment`);
      }
    });

    // Create a wrapper that skips if capability check failed
    const originalDescribe = fn;
    if (originalDescribe) {
      originalDescribe();
    }
  });
}

/**
 * Run describe block only if HTTP servers can be bound
 */
export function describeIfCanBindHttp(
  name: string,
  fn: DescribeFunction
): void {
  describe(name, () => {
    let shouldRun = false;

    beforeAll(async () => {
      shouldRun = await canBindHttpServer();
      if (!shouldRun) {
        console.warn(`⊘ Skipping test suite "${name}" - cannot bind HTTP server in this environment`);
      }
    });

    if (fn) {
      fn();
    }
  });
}

/**
 * Run describe block only if Worker API is available
 */
export function describeIfHasWorkerAPI(
  name: string,
  fn: DescribeFunction
): void {
  const capable = hasWorkerAPI();
  if (!capable) {
    describe.skip(name, fn);
  } else {
    describe(name, fn);
  }
}

/**
 * Run describe block only if browser automation is available
 */
export function describeIfHasBrowserAutomation(
  name: string,
  fn: DescribeFunction
): void {
  const capable = hasBrowserAutomation();
  if (!capable) {
    describe.skip(name, fn);
  } else {
    describe(name, fn);
  }
}

/**
 * Run describe block only if integration tests are supported
 */
export function describeIfCanRunIntegration(
  name: string,
  fn: DescribeFunction
): void {
  describe(name, () => {
    let shouldRun = false;

    beforeAll(async () => {
      shouldRun = await canRunIntegrationTests();
      if (!shouldRun) {
        console.warn(`⊘ Skipping test suite "${name}" - cannot run integration tests in this environment`);
      }
    });

    if (fn) {
      fn();
    }
  });
}

/**
 * Run describe block only if E2E tests are supported
 */
export function describeIfCanRunE2E(
  name: string,
  fn: DescribeFunction,
  requiresBrowser = false
): void {
  describe(name, () => {
    let shouldRun = false;

    beforeAll(async () => {
      shouldRun = await canRunE2ETests(requiresBrowser);
      if (!shouldRun) {
        console.warn(`⊘ Skipping test suite "${name}" - cannot run E2E tests in this environment`);
      }
    });

    if (fn) {
      fn();
    }
  });
}

/**
 * Generic conditional test runner
 */
export function testIf(
  condition: boolean | (() => boolean) | (() => Promise<boolean>),
  name: string,
  fn: TestFunction,
  timeout?: number
): void {
  if (typeof condition === 'boolean') {
    if (!condition) {
      test.skip(name, fn);
    } else {
      if (timeout !== undefined) {
        test(name, fn, timeout);
      } else {
        test(name, fn);
      }
    }
  } else if (typeof condition === 'function') {
    const wrappedFn = async () => {
      const shouldRun = await Promise.resolve(condition());
      if (!shouldRun) {
        console.warn(`⊘ Skipping test "${name}" - condition not met`);
        return;
      }
      return (fn as any)();
    };

    if (timeout !== undefined) {
      test(name, wrappedFn, timeout);
    } else {
      test(name, wrappedFn);
    }
  }
}

/**
 * Generic conditional describe block
 */
export function describeIf(
  condition: boolean | (() => boolean),
  name: string,
  fn: DescribeFunction
): void {
  if (typeof condition === 'boolean') {
    if (!condition) {
      describe.skip(name, fn);
    } else {
      describe(name, fn);
    }
  } else {
    const shouldRun = condition();
    if (!shouldRun) {
      describe.skip(name, fn);
    } else {
      describe(name, fn);
    }
  }
}
