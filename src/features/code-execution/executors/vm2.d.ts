/**
 * Type declarations for vm2 package
 *
 * Minimal type definitions for the VM2 library used in code execution.
 * Full types at: https://github.com/patriksimek/vm2
 */

declare module 'vm2' {
  export interface VMOptions {
    /**
     * Timeout in milliseconds
     */
    timeout?: number;

    /**
     * Sandbox object to be used as global
     */
    sandbox?: any;

    /**
     * Whether to allow eval
     */
    eval?: boolean;

    /**
     * Whether to allow WebAssembly
     */
    wasm?: boolean;
  }

  export class VM {
    constructor(options?: VMOptions);

    /**
     * Run code in the VM
     */
    run(code: string): any;
  }
}
