/**
 * Type declarations for isolated-vm package
 *
 * Minimal type definitions for the isolated-vm library used in code execution.
 * Full types at: https://github.com/laverdet/isolated-vm
 */

declare module 'isolated-vm' {
  /**
   * Options for creating an Isolate
   */
  export interface IsolateOptions {
    /**
     * Memory limit in MB
     */
    memoryLimit?: number;

    /**
     * Snapshot blob to restore from
     */
    snapshot?: ExternalCopy<ArrayBuffer>;
  }

  /**
   * Options for running a script
   */
  export interface ScriptRunOptions {
    /**
     * Timeout in milliseconds
     */
    timeout?: number;

    /**
     * Whether to return a promise
     */
    promise?: boolean;

    /**
     * Whether to release the result
     */
    release?: boolean;
  }

  /**
   * Options for copying values
   */
  export interface CopyOptions {
    /**
     * Whether to create an external copy
     */
    externalCopy?: boolean;

    /**
     * Whether to transfer ArrayBuffers
     */
    transferList?: any[];
  }

  /**
   * A V8 Isolate - isolated execution environment
   */
  export class Isolate {
    constructor(options?: IsolateOptions);

    /**
     * Create a new context within this isolate
     */
    createContext(): Promise<Context>;

    /**
     * Compile a script in this isolate
     */
    compileScript(code: string): Promise<Script>;

    /**
     * Dispose of this isolate and free all memory
     */
    dispose(): void;

    /**
     * Get CPU time used by this isolate
     */
    cpuTime: [number, number];

    /**
     * Get wall time used by this isolate
     */
    wallTime: [number, number];

    /**
     * Create a snapshot of this isolate
     */
    createSnapshot(): Promise<ExternalCopy<ArrayBuffer>>;
  }

  /**
   * An execution context within an isolate
   */
  export class Context {
    /**
     * Reference to the global object in this context
     */
    global: Reference<any>;

    /**
     * Evaluate code in this context
     */
    eval(code: string, options?: ScriptRunOptions): Promise<any>;

    /**
     * Evaluate code synchronously in this context
     */
    evalSync(code: string, options?: Omit<ScriptRunOptions, 'promise'>): any;
  }

  /**
   * A compiled script ready to run
   */
  export class Script {
    /**
     * Run this script in a context
     */
    run(context: Context, options?: ScriptRunOptions): Promise<any>;

    /**
     * Run this script synchronously in a context
     */
    runSync(context: Context, options?: Omit<ScriptRunOptions, 'promise'>): any;
  }

  /**
   * A reference to a value inside the isolate
   */
  export class Reference<T = any> {
    constructor(value: T);

    /**
     * Copy this reference to a plain value
     */
    copy(options?: CopyOptions): Promise<T>;

    /**
     * Copy this reference synchronously
     */
    copySync(options?: CopyOptions): T;

    /**
     * Get the typeof this reference
     */
    typeof(): Promise<string>;

    /**
     * Get the typeof this reference synchronously
     */
    typeofSync(): string;

    /**
     * Dereference this value into the current isolate
     */
    derefInto(options?: CopyOptions): any;

    /**
     * Apply this reference as a function
     */
    apply(
      receiver: Reference | undefined,
      args: any[],
      options?: ScriptRunOptions
    ): Promise<any>;

    /**
     * Apply this reference as a function synchronously
     */
    applySync(
      receiver: Reference | undefined,
      args: any[],
      options?: Omit<ScriptRunOptions, 'promise'>
    ): any;

    /**
     * Get a property from this reference
     */
    get(property: string | number, options?: ScriptRunOptions): Promise<any>;

    /**
     * Get a property from this reference synchronously
     */
    getSync(property: string | number, options?: Omit<ScriptRunOptions, 'promise'>): any;

    /**
     * Set a property on this reference
     */
    set(property: string | number, value: any, options?: ScriptRunOptions): Promise<void>;

    /**
     * Set a property on this reference synchronously
     */
    setSync(property: string | number, value: any, options?: Omit<ScriptRunOptions, 'promise'>): void;

    /**
     * Release this reference
     */
    release(): void;
  }

  /**
   * An external copy of a value that can be transferred between isolates
   */
  export class ExternalCopy<T = any> {
    constructor(value: T, options?: CopyOptions);

    /**
     * Copy this value into the current isolate
     */
    copyInto(options?: CopyOptions): T;

    /**
     * Release this external copy
     */
    release(): void;

    /**
     * Convert to string
     */
    toString(): string;
  }

  /**
   * Default export of the module
   */
  const ivm: {
    Isolate: typeof Isolate;
    Context: typeof Context;
    Script: typeof Script;
    Reference: typeof Reference;
    ExternalCopy: typeof ExternalCopy;
  };

  export default ivm;
}
