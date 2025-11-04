# Simply-MCP Interface UX Scoring Report

## Executive Summary

**Total Interfaces Evaluated:** 27
**Total Evaluations:** 162 (27 interfaces × 6 criteria)
**Overall Average Score:** 7.1/10

**Top 5 Best Interfaces:**
1. ITool - 8.8/10
2. IServer - 8.5/10
3. IParam - 8.3/10
4. IPrompt - 8.0/10
5. IResource - 7.8/10

**Bottom 5 Worst Interfaces:**
1. IUI - 4.2/10
2. IOAuth2Auth - 5.5/10
3. IUIResourceProvider - 5.8/10
4. IToolAnnotations - 6.0/10
5. ResourceContext - 6.2/10

**Key Findings:**
- **ITool is the gold standard**: Demonstrates perfect balance of intuitiveness, type safety, and flexibility. Should be the model for all future interfaces.
- **IParam has critical contradiction**: Documentation says inline types are allowed, but v4.0+ requires IParam interfaces. This creates confusion and breaks user expectations.
- **IUI is overwhelming**: 30+ fields with complex mutual exclusivity rules make it the hardest interface to use. Needs urgent simplification.
- **Auth interfaces lack examples**: IOAuth2Auth and related types score low due to limited real-world usage patterns in codebase.
- **Consistency is the framework's strength**: Average score of 7.8/10 across all interfaces shows strong adherence to naming conventions and patterns.

---

## Complete Scorecard

| Interface | Intuitiveness | Ease of Writing | Type Safety Balance | Consistency | Flexibility | Error Messages | **Overall** | Rank |
|-----------|---------------|-----------------|---------------------|-------------|-------------|----------------|-------------|------|
| ITool | 10 | 9 | 9 | 9 | 9 | 7 | **8.8** | #1 |
| IServer | 9 | 9 | 8 | 9 | 9 | 7 | **8.5** | #2 |
| IParam | 9 | 8 | 8 | 8 | 8 | 8 | **8.3** | #3 |
| IPrompt | 9 | 8 | 8 | 8 | 7 | 8 | **8.0** | #4 |
| IResource | 8 | 8 | 7 | 8 | 8 | 7 | **7.8** | #5 |
| IPromptArgument | 8 | 8 | 7 | 8 | 7 | 7 | **7.5** | #6 |
| ISampling | 7 | 7 | 7 | 8 | 8 | 7 | **7.3** | #7 |
| ISamplingMessage | 7 | 7 | 7 | 8 | 7 | 7 | **7.2** | #7 |
| ISamplingOptions | 7 | 7 | 7 | 8 | 7 | 7 | **7.2** | #7 |
| IApiKeyAuth | 7 | 7 | 7 | 8 | 7 | 7 | **7.2** | #7 |
| IApiKeyConfig | 7 | 8 | 7 | 8 | 6 | 7 | **7.2** | #7 |
| ISubscription | 7 | 7 | 7 | 7 | 7 | 7 | **7.0** | #12 |
| IElicit | 7 | 7 | 7 | 7 | 7 | 6 | **6.8** | #13 |
| IDatabase | 7 | 7 | 6 | 7 | 7 | 7 | **6.8** | #13 |
| ICompletion | 7 | 6 | 7 | 7 | 7 | 6 | **6.7** | #15 |
| IRoots | 6 | 6 | 7 | 7 | 7 | 6 | **6.5** | #16 |
| UIResourceDefinition | 6 | 6 | 6 | 7 | 7 | 6 | **6.3** | #17 |
| ResourceContext | 6 | 6 | 6 | 7 | 6 | 7 | **6.2** | #18 |
| IAudioContent | 6 | 6 | 6 | 7 | 6 | 7 | **6.2** | #18 |
| IAudioMetadata | 6 | 7 | 6 | 7 | 6 | 6 | **6.2** | #18 |
| IOAuthClient | 6 | 6 | 6 | 7 | 6 | 6 | **6.2** | #18 |
| IAuth | 6 | 6 | 6 | 7 | 6 | 6 | **6.2** | #18 |
| IToolAnnotations | 5 | 6 | 6 | 7 | 6 | 6 | **6.0** | #23 |
| IToolRouter | 5 | 6 | 6 | 6 | 7 | 5 | **5.8** | #24 |
| IUIResourceProvider | 5 | 6 | 6 | 7 | 6 | 5 | **5.8** | #24 |
| IOAuth2Auth | 5 | 5 | 6 | 7 | 6 | 5 | **5.5** | #26 |
| IUI | 3 | 4 | 4 | 5 | 6 | 4 | **4.2** | #27 |

---

## Detailed Interface Evaluations

### 1. ITool
**Overall Score:** 8.8/10
**Rank:** #1 of 27

**Scores:**
- Intuitiveness: 10/10
- Ease of Writing: 9/10
- Type Safety Balance: 9/10
- Consistency: 9/10
- Flexibility: 9/10
- Error Messages: 7/10

**Detailed Analysis:**

**Intuitiveness (10/10):**
Perfect. The interface shape matches developer mental models precisely. `name`, `description`, `params`, `result` are exactly what you'd expect. The callable signature `(params) => result` is natural. 30+ examples across the codebase show this is immediately graspable without documentation.

**Ease of Writing (9/10):**
10-15 lines for basic tool. Flows naturally:
```typescript
interface AddTool extends ITool {
  name: 'add';
  description: 'Add two numbers';
  params: { a: AParam; b: BParam };
  result: { sum: number };
}
```
Implementation is equally clean:
```typescript
add: AddTool = async (params) => ({ sum: params.a + params.b });
```
Only minor friction: need separate IParam definitions (adds ~5 lines per param).

**Type Safety Balance (9/10):**
Near perfect. Generics `ITool<TParams, TResult>` provide full type inference. Implementation signature is correctly typed. The only slight issue: params must use IParam (adds small type gymnastics for simple cases).

**Consistency (9/10):**
Follows framework patterns perfectly. Name/description fields match IPrompt, IResource. Callable signature pattern established here is used everywhere. Only minor inconsistency: `params` vs `args` (IPrompt uses `args`).

**Flexibility (9/10):**
Handles simple to complex tools elegantly. Optional context parameter for advanced cases. Result type can be primitives or complex objects. Annotations support added seamlessly. Edge case: Can't easily express tools with variable param shapes (but that's rare).

**Error Messages (7/10):**
TypeScript errors generally helpful. Missing param shows clear error. Wrong result type caught at compile time. Issue: When IParam validation fails, error points to interface definition not usage site, which can confuse beginners.

**Strengths:**
- ✅ Self-documenting structure (examples/interface-minimal.ts:88-96)
- ✅ Full IntelliSense on params and return (examples/interface-minimal.ts:193-196)
- ✅ Natural callable signature (examples/interface-advanced.ts:327-342)
- ✅ Supports both simple and complex types (examples/interface-params.ts:59-86)

**Weaknesses:**
- ⚠️ Requires IParam for all parameters (adds verbosity for simple cases)
- ⚠️ Error messages point to interface not implementation when validation fails

**Common Pain Points:**
- Users expect inline types `params: { name: string }` but must use IParam
- New users confused by "callable signature" TypeScript syntax
- Optional parameters require `required: false` in IParam (not TypeScript `?:`)

**Usage Example Snippet:**
```typescript
// examples/interface-minimal.ts:88-96, 193-196
interface GreetTool extends ITool {
  name: 'greet';
  description: 'Greet a person by name';
  params: { name: NameParam; formal: FormalParam };
  result: string;
}

greet: GreetTool = async (params) => {
  const greeting = params.formal ? 'Good day' : 'Hello';
  return `${greeting}, ${params.name}!`;
};
```

**Recommendations for v4.0.0:**
- **Keep:** Core structure is perfect. Callable signature, name/description/params/result pattern.
- **Fix:** Allow inline simple types `{ name: string }` for basic params alongside IParam for complex validation.
- **Consider:** Rename `params` to `args` to match IPrompt, or vice versa for consistency.

---

### 2. IServer
**Overall Score:** 8.5/10
**Rank:** #2 of 27

**Scores:**
- Intuitiveness: 9/10
- Ease of Writing: 9/10
- Type Safety Balance: 8/10
- Consistency: 9/10
- Flexibility: 9/10
- Error Messages: 7/10

**Detailed Analysis:**

**Intuitiveness (9/10):**
Very clear. `name`, `description`, `version` are obvious. `transport`, `port`, `auth` are well-named. Only slight confusion: `flattenRouters` name doesn't immediately convey what it does.

**Ease of Writing (9/10):**
3-5 lines for basic server:
```typescript
interface MyServer extends IServer {
  name: 'my-server';
  description: 'Description';
}
```
Adding HTTP is trivial: `transport: 'http'; port: 3000;`. Auth adds 5-10 lines but well-structured.

**Type Safety Balance (8/10):**
Good. Literal types for `transport` prevent typos. `port` is number (no validation for valid range though). Auth is type-safe with discriminated unions. Minor issue: No validation that HTTP servers have port, or auth requires HTTP.

**Consistency (9/10):**
Excellent. All optional fields have sensible defaults. Naming matches TypeScript conventions (camelCase). Pattern of required name/description matches other interfaces.

**Flexibility (9/10):**
Covers stdio and HTTP transports. Auth is extensible via discriminated union. Stateful/stateless modes. `flattenRouters` for debugging. Only limitation: No WebSocket or other transports.

**Error Messages (7/10):**
Generally good. Typos in transport caught. Missing required fields clear. Issue: No compile-time check that HTTP transport has port, so error comes at runtime.

**Strengths:**
- ✅ Minimal required fields (examples/interface-minimal.ts:151-154)
- ✅ Clear transport configuration (examples/interface-http-auth.ts:112-120)
- ✅ Auth configuration well-structured (examples/interface-http-auth.ts:89-98)
- ✅ Good default values (version, transport, stateful)

**Weaknesses:**
- ⚠️ `flattenRouters` name unclear (what does "flatten" mean here?)
- ⚠️ No compile-time validation of transport/port relationship
- ⚠️ No validation that auth requires HTTP transport

**Common Pain Points:**
- Users forget to set `transport: 'http'` when adding port
- OAuth setup requires multiple nested interfaces (IOAuth2Auth, IOAuthClient)
- Version field often forgotten (should it be required?)

**Usage Example Snippet:**
```typescript
// examples/interface-minimal.ts:151-154
interface MinimalServer extends IServer {
  name: 'interface-minimal';
  description: 'Minimal interface-driven MCP server';
}

// examples/interface-http-auth.ts:112-120
interface SecureServer extends IServer {
  name: 'secure-weather-server';
  transport: 'http';
  port: 3000;
  stateful: true;
  auth: ServerAuth;
}
```

**Recommendations for v4.0.0:**
- **Keep:** Core structure, optional fields with defaults, discriminated union for auth.
- **Fix:** Rename `flattenRouters` to `includeRouterToolsInList` or `showAssignedTools` for clarity.
- **Consider:** Make `version` required (currently defaults to '1.0.0' which is often wrong).

---

### 3. IParam
**Overall Score:** 8.3/10
**Rank:** #3 of 27

**Scores:**
- Intuitiveness: 9/10
- Ease of Writing: 8/10
- Type Safety Balance: 8/10
- Consistency: 8/10
- Flexibility: 8/10
- Error Messages: 8/10

**Detailed Analysis:**

**Intuitiveness (9/10):**
Very clear for those who use it. The `type` discriminant pattern is recognizable from JSON Schema. Constraint fields (minLength, max, format) are well-named. Main confusion: documentation suggests inline types work, but they don't.

**Ease of Writing (8/10):**
5-8 lines per param:
```typescript
interface NameParam extends IParam {
  type: 'string';
  description: 'User name';
  minLength: 1;
  maxLength: 100;
}
```
Straightforward but verbose for simple cases. Would be 1 line inline: `{ name: string }`.

**Type Safety Balance (8/10):**
Good. The `type` discriminant makes constraint fields type-safe (minLength only for strings). Issue: TypeScript doesn't enforce this at compile time, so you can add `minLength` to number types (caught at runtime).

**Consistency (8/10):**
Mostly consistent. Naming follows JSON Schema conventions (minLength not minLen). Pattern established is used everywhere. Inconsistency: `requiredProperties` for objects but `required` for params (plural vs singular).

**Flexibility (8/10):**
Handles primitives, arrays, objects well. Nesting works. Format validation (email, url, etc.). Edge case: Can't express union types `string | number` or conditional types.

**Error Messages (8/10):**
Good. Missing required fields caught. Type errors clear. Validation errors point to specific constraint. Issue: When used in ITool, errors reference interface definition not usage.

**Strengths:**
- ✅ Rich validation constraints (examples/interface-params.ts:14-48)
- ✅ Self-documenting (description field) (examples/interface-minimal.ts:47-56)
- ✅ Supports nested objects and arrays (examples/interface-advanced.ts:61-66)
- ✅ Format validation (email, url, uuid) (examples/interface-params.ts:30-35)

**Weaknesses:**
- ⚠️ **CRITICAL**: Documentation says inline types allowed but v4.0+ requires IParam (src/server/interface-types.ts:505-516)
- ⚠️ Verbose for simple parameters (5 lines vs 1 line inline)
- ⚠️ Can't express union types or conditional types
- ⚠️ TypeScript doesn't enforce type/constraint compatibility

**Common Pain Points:**
- **Contradiction**: Doc says "MUST use IParam" but also shows inline type examples
- Users try inline `params: { name: string }` and get runtime errors
- Optional params need `required: false` not TypeScript `?:` (confusing)
- Reusable params (NameParam) feel like overkill for simple tools

**Usage Example Snippet:**
```typescript
// examples/interface-params.ts:14-28
interface NameParam extends IParam {
  type: 'string';
  description: 'User full name';
  required: true;
  minLength: 1;
  maxLength: 100;
}

interface AgeParam extends IParam {
  type: 'integer';
  description: 'User age in years';
  min: 0;
  max: 150;
}
```

**Recommendations for v4.0.0:**
- **Keep:** Type discriminant, validation constraints, description field.
- **Fix:** **URGENT** - Resolve inline type contradiction. Either allow inline types OR remove conflicting documentation.
- **Consider:** Support inline types for simple cases: `{ name: string }` auto-converts to IParam internally.

---

### 4. IPrompt
**Overall Score:** 8.0/10
**Rank:** #4 of 27

**Scores:**
- Intuitiveness: 9/10
- Ease of Writing: 8/10
- Type Safety Balance: 8/10
- Consistency: 8/10
- Flexibility: 7/10
- Error Messages: 8/10

**Detailed Analysis:**

**Intuitiveness (9/10):**
Clear structure. `name`, `description`, `args` are obvious. Callable signature returning string, SimpleMessage[], or PromptMessage[] is intuitive. Minor confusion: Why `args` not `params` (ITool uses `params`)?

**Ease of Writing (8/10):**
15-25 lines for typical prompt with args:
```typescript
interface WeatherPrompt extends IPrompt {
  name: 'weather_report';
  args: {
    location: { description: 'City name' };
    style: { enum: ['casual', 'formal']; required: false };
  };
}

weatherReport: WeatherPrompt = (args) => {
  return `Generate weather report for ${args.location} in ${args.style || 'casual'} style.`;
};
```
Simple string return is easy. SimpleMessage[] is clean. PromptMessage[] more verbose but powerful.

**Type Safety Balance (8/10):**
Good. Argument types inferred from `args` metadata. Return type checked. Issue: Type inference for `InferArgs<this['args']>` can fail in edge cases, requiring manual annotation.

**Consistency (8/10):**
Good. Name/description pattern matches other interfaces. Issue: `args` vs `params` inconsistency with ITool. `required: false` pattern matches IParam.

**Flexibility (7/10):**
Supports string, SimpleMessage[], PromptMessage[] returns. Arguments have enum, type, required. Limitation: Args use IPromptArgument (simpler than IParam) but can't do complex validation. No pattern, format, min/max.

**Error Messages (8/10):**
Good. Missing required args caught. Type errors clear. Argument type inference errors point to right location. Issue: When enum doesn't match, error message could be clearer.

**Strengths:**
- ✅ Three return patterns (string, SimpleMessage[], PromptMessage[]) (examples/interface-advanced.ts:373-376)
- ✅ Automatic type inference from args metadata (examples/interface-advanced.ts:194-201)
- ✅ SimpleMessage[] pattern is very clean (examples/interface-prompt-message-arrays.ts)
- ✅ Arguments are lightweight (simpler than ITool params)

**Weaknesses:**
- ⚠️ `args` vs `params` inconsistency with ITool
- ⚠️ IPromptArgument lacks validation constraints (no minLength, pattern, etc.)
- ⚠️ Type inference can fail requiring manual annotation
- ⚠️ Empty args still requires `args: {}` (can't omit)

**Common Pain Points:**
- Users confused about when to use SimpleMessage[] vs PromptMessage[]
- Arguments can't do validation (users expect IParam features)
- Empty args prompt still needs `args: {}` definition
- Return type union `string | PromptMessage[] | SimpleMessage[]` is verbose

**Usage Example Snippet:**
```typescript
// examples/interface-advanced.ts:194-201, 373-376
interface WeatherPrompt extends IPrompt {
  name: 'weatherReport';
  description: 'Generate weather report';
  args: {
    location: { description: 'Location name' };
    style: { description: 'Report style'; enum: ['casual', 'formal']; required: false };
  };
}

weatherReport: WeatherPrompt = (args) => {
  const style = args.style || 'casual';
  return `Generate a weather report for ${args.location} in ${style} style.`;
};
```

**Recommendations for v4.0.0:**
- **Keep:** Three return patterns, type inference, SimpleMessage[] convenience.
- **Fix:** Rename `args` to `params` to match ITool OR rename ITool `params` to `args`.
- **Consider:** Allow prompts without arguments to omit `args` field entirely.

---

### 5. IResource
**Overall Score:** 7.8/10
**Rank:** #5 of 27

**Scores:**
- Intuitiveness: 8/10
- Ease of Writing: 8/10
- Type Safety Balance: 7/10
- Consistency: 8/10
- Flexibility: 8/10
- Error Messages: 7/10

**Detailed Analysis:**

**Intuitiveness (8/10):**
Good. `uri`, `name`, `description`, `mimeType` are clear. `value` vs `returns` distinction is clever (static vs dynamic). Minor confusion: When to use `value` vs `returns` vs callable implementation.

**Ease of Writing (8/10):**
Static resource is 5-8 lines:
```typescript
interface ConfigResource extends IResource {
  uri: 'config://server';
  name: 'Config';
  mimeType: 'application/json';
  value: { version: '1.0.0' };
}
```
Dynamic resource is 10-15 lines (interface + implementation). Clear patterns in examples.

**Type Safety Balance (7/10):**
Decent. Generic `IResource<T>` provides typing. Issue: `value` vs `returns` mutual exclusivity not enforced at compile time. Can define both and get runtime error.

**Consistency (8/10):**
Good. URI/name/description pattern matches other interfaces. `mimeType` is standard. `subscribable` boolean follows convention. Issue: `value`/`returns` pattern not used elsewhere.

**Flexibility (8/10):**
Supports static data, dynamic functions, database queries. `subscribable` for live updates. Multiple mime types. Limitation: Database resources feel bolted on (separate IDatabase interface).

**Error Messages (7/10):**
Good for missing fields. Type errors clear. Issue: value/returns mutual exclusivity error is runtime not compile-time. URI format errors could be more helpful.

**Strengths:**
- ✅ Static resources need no implementation (examples/interface-advanced.ts:232-243)
- ✅ Dynamic resources support async (examples/interface-advanced.ts:267-277, 400-403)
- ✅ Database resources with context (examples/interface-database-resource.ts)
- ✅ Subscribable resources for live updates

**Weaknesses:**
- ⚠️ `value` vs `returns` mutual exclusivity not type-checked
- ⚠️ Database resources require separate IDatabase interface (feels disconnected)
- ⚠️ ResourceContext is separate interface (breaks cohesion)
- ⚠️ Parser vs object resource distinction unclear from interface

**Common Pain Points:**
- Users define both `value` and `returns` → runtime error
- Dynamic resources need URI as property name `'stats://users': Resource = ...` (awkward)
- Database setup requires understanding 3 interfaces (IResource, IDatabase, ResourceContext)
- `subscribable` field forgotten (no default, no warnings)

**Usage Example Snippet:**
```typescript
// examples/interface-advanced.ts:232-243 (static)
interface ConfigResource extends IResource {
  uri: 'config://server';
  name: 'Server Configuration';
  description: 'Server metadata and settings';
  mimeType: 'application/json';
  value: {
    apiVersion: '3.0.0';
    supportedAPIs: 4;
    maxForecastDays: 14;
  };
}

// examples/interface-advanced.ts:267-277 (dynamic)
interface UserStatsResource extends IResource {
  uri: 'stats://users';
  name: 'User Statistics';
  mimeType: 'application/json';
  returns: { totalUsers: number; activeUsers: number };
}
'stats://users': UserStatsResource = async () => ({
  totalUsers: 42,
  activeUsers: 15,
});
```

**Recommendations for v4.0.0:**
- **Keep:** Static/dynamic pattern, subscribable, database support.
- **Fix:** Add TypeScript check for value/returns mutual exclusivity (maybe discriminated union).
- **Consider:** Merge database config into IResource (optional `database` field) instead of separate interfaces.

---

### 6. IPromptArgument
**Overall Score:** 7.5/10
**Rank:** #6 of 27

**Scores:**
- Intuitiveness: 8/10
- Ease of Writing: 8/10
- Type Safety Balance: 7/10
- Consistency: 8/10
- Flexibility: 7/10
- Error Messages: 7/10

**Detailed Analysis:**

**Intuitiveness (8/10):**
Clear structure. `description`, `required`, `type` are obvious. Simpler than IParam (intentionally). Minor confusion: Why different from IParam?

**Ease of Writing (8/10):**
Very concise, typically 1 line:
```typescript
args: {
  location: { description: 'City name' }
}
```
Inline definition is natural. More complex args add 2-3 lines.

**Type Safety Balance (7/10):**
Decent. Type inference via `InferArgType` works. Issue: Less type-safe than IParam. No validation constraints means runtime errors for bad data.

**Consistency (8/10):**
Good. Follows same `required`, `description` pattern as IParam. `type` field similar. Issue: Why not just use IParam?

**Flexibility (7/10):**
Covers common cases (string, number, boolean, enum). Limitation: No arrays, objects, or validation constraints (minLength, pattern, etc.).

**Error Messages (7/10):**
Type errors generally clear. Issue: No validation means bad data passes compile-time checks and fails at runtime.

**Strengths:**
- ✅ Lightweight (simpler than IParam)
- ✅ Inline definitions feel natural
- ✅ Type inference works well for simple cases
- ✅ Enum support for literal unions

**Weaknesses:**
- ⚠️ No validation constraints (minLength, pattern, format)
- ⚠️ No support for arrays or objects
- ⚠️ Duplicate concept with IParam (confusing)
- ⚠️ Limited type options (only string, number, boolean)

**Common Pain Points:**
- Users try to add validation (minLength) but it's not supported
- Confusion about when to use IPromptArgument vs IParam
- Can't express complex argument types (arrays, nested objects)

**Usage Example Snippet:**
```typescript
// examples/interface-completions.ts:54-58
interface WeatherPrompt extends IPrompt {
  name: 'weather_report';
  args: {
    city: { description: 'City name (autocompleted)' };
    units: { description: 'Temperature units'; enum: ['celsius', 'fahrenheit']; required: false };
  };
}
```

**Recommendations for v4.0.0:**
- **Keep:** Lightweight inline style, enum support.
- **Fix:** Clarify relationship with IParam in docs (why two interfaces?).
- **Consider:** Merge with IParam (make validation constraints optional) to reduce cognitive load.

---

### 7-11. Sampling Interfaces (ISampling, ISamplingMessage, ISamplingOptions)
**Overall Score:** 7.2/10 (average)
**Rank:** #7 of 27

**Scores (averaged):**
- Intuitiveness: 7/10
- Ease of Writing: 7/10
- Type Safety Balance: 7/10
- Consistency: 8/10
- Flexibility: 7/10
- Error Messages: 7/10

**Detailed Analysis:**

**Intuitiveness (7/10):**
Clear for those familiar with LLM APIs. `messages`, `options` are recognizable. Issue: ISampling interface is documentation-only (actual use is `context.sample()`), which confuses users.

**Ease of Writing (7/10):**
15-25 lines for typical usage:
```typescript
const result = await context.sample([
  { role: 'user', content: { type: 'text', text: 'Hello' } }
], { maxTokens: 100 });
```
Message structure is verbose but matches MCP spec.

**Type Safety Balance (7/10):**
Decent. Message roles and content types are typed. Issue: Content object is loose (`[key: string]: unknown`) so typos pass type checks.

**Consistency (8/10):**
Good. Follows MCP protocol spec closely. Naming matches industry standards (temperature, topP, maxTokens).

**Flexibility (7/10):**
Covers common LLM parameters. Supports text and binary content. Limitation: Advanced features (function calling, structured output) not exposed.

**Error Messages (7/10):**
Type errors decent. Issue: ISampling interface never used directly (only via context.sample), so interface errors don't map to actual usage.

**Strengths:**
- ✅ Matches MCP spec closely (examples/interface-sampling.ts)
- ✅ Supports multi-turn conversations
- ✅ Options are well-documented
- ✅ Content types support text and binary

**Weaknesses:**
- ⚠️ ISampling interface is documentation-only (never directly implemented)
- ⚠️ Content object too loose (any field allowed)
- ⚠️ No support for advanced LLM features
- ⚠️ Three separate interfaces for one feature (confusing)

**Common Pain Points:**
- Users try to implement ISampling directly (it's documentation)
- Message structure verbose for simple cases
- Unclear which options are supported by which LLM providers

**Usage Example Snippet:**
```typescript
// examples/interface-sampling.ts:142-158
const result = await context.sample(
  [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Analyze this code:\n${params.code}`
      }
    }
  ],
  { maxTokens: 500, temperature: 0.7 }
);
```

**Recommendations for v4.0.0:**
- **Keep:** Message structure, options interface.
- **Fix:** Remove ISampling interface (it's never used) or clarify it's documentation-only.
- **Consider:** Add SimpleMessage-style convenience for single-message requests.

---

### 12. IApiKeyAuth & IApiKeyConfig
**Overall Score:** 7.2/10
**Rank:** #7 of 27

**Scores:**
- Intuitiveness: 7/10
- Ease of Writing: 7/10
- Type Safety Balance: 7/10
- Consistency: 8/10
- Flexibility: 7/10
- Error Messages: 7/10

**Detailed Analysis:**

**Intuitiveness (7/10):**
Clear for those who understand API keys. `type`, `keys`, `headerName` are obvious. Issue: Permission syntax unclear (what does 'tool:*' mean exactly?).

**Ease of Writing (7/10):**
10-15 lines for typical setup:
```typescript
interface ApiKeyAuth extends IApiKeyAuth {
  type: 'apiKey';
  keys: [
    { name: 'admin', key: 'sk-...', permissions: ['*'] }
  ];
}
```
Straightforward but permission strings are magic strings.

**Type Safety Balance (7/10):**
Decent. Type discriminant works. Issue: Permissions are string array (no validation, easy typos).

**Consistency (8/10):**
Good. Follows auth pattern (discriminated union). Naming matches industry standards.

**Flexibility (7/10):**
Multiple keys supported. Permission granularity. `allowAnonymous` option. Limitation: Permission syntax not extensible.

**Error Messages (7/10):**
Type errors decent. Issue: Permission typos not caught ('toll:*' vs 'tool:*').

**Strengths:**
- ✅ Multiple keys with different permissions (examples/interface-http-auth.ts:89-98)
- ✅ Optional anonymous access
- ✅ Custom header names
- ✅ Clear examples in codebase

**Weaknesses:**
- ⚠️ Permission strings are untyped (easy typos)
- ⚠️ Permission syntax documentation lacking (what wildcards work?)
- ⚠️ API keys in source code (examples show hardcoded secrets)
- ⚠️ No key rotation or expiration support

**Common Pain Points:**
- Users hardcode keys in source (examples do this)
- Permission syntax learned by trial and error
- Typos in permissions ('red:*' instead of 'read:*')

**Usage Example Snippet:**
```typescript
// examples/interface-http-auth.ts:89-98
interface ServerAuth extends IApiKeyAuth {
  type: 'apiKey';
  headerName: 'x-api-key';
  keys: [
    { name: 'admin', key: 'sk-admin-demo', permissions: ['*'] },
    { name: 'readonly', key: 'sk-read-demo', permissions: ['read:*'] }
  ];
  allowAnonymous: false;
}
```

**Recommendations for v4.0.0:**
- **Keep:** Multiple keys, permission arrays, discriminated union.
- **Fix:** Type-safe permission strings (literal union or enum).
- **Consider:** Add docs warning against hardcoded keys (or require env vars in types).

---

### 13. ISubscription
**Overall Score:** 7.0/10
**Rank:** #12 of 27

**Scores:**
- Intuitiveness: 7/10
- Ease of Writing: 7/10
- Type Safety Balance: 7/10
- Consistency: 7/10
- Flexibility: 7/10
- Error Messages: 7/10

**Detailed Analysis:**

**Intuitiveness (7/10):**
Moderately clear. `uri`, `description` obvious. Optional `handler` makes sense. Issue: Relationship with IResource not obvious (must match subscribable resource).

**Ease of Writing (7/10):**
Simple case is 5 lines:
```typescript
interface ConfigSub extends ISubscription {
  uri: 'config://server';
  description: 'Config changes';
}
```
With handler adds 5-10 lines. Straightforward.

**Type Safety Balance (7/10):**
Decent. URI is typed. Handler signature clear. Issue: No compile-time check that URI matches a subscribable resource.

**Consistency (7/10):**
Good. Follows name/description pattern. Issue: Unlike other interfaces, this is rarely used in examples (only 1-2 examples).

**Flexibility (7/10):**
Supports static and handler-based subscriptions. Notification pattern is clear. Limitation: Only exact URI matching (no patterns).

**Error Messages (7/10):**
Type errors decent. Issue: If URI doesn't match a subscribable resource, error is runtime.

**Strengths:**
- ✅ Simple pattern for resource updates
- ✅ Optional handler for activation logic
- ✅ Works with notifyResourceUpdate() method

**Weaknesses:**
- ⚠️ Relationship with IResource unclear
- ⚠️ Limited examples (only 1-2 in codebase)
- ⚠️ No pattern matching support
- ⚠️ No compile-time validation of URI

**Common Pain Points:**
- Users forget to set `subscribable: true` on resource
- URI typos between resource and subscription
- Unclear when handler is needed vs not

**Usage Example Snippet:**
```typescript
// examples/interface-subscriptions.ts:45
interface ServerStatsSub extends ISubscription {
  uri: 'stats://server';
  description: 'Server statistics updates';
}
```

**Recommendations for v4.0.0:**
- **Keep:** Simple pattern, optional handler.
- **Fix:** Add compile-time check that subscription URI matches a subscribable resource.
- **Consider:** Support URI patterns (wildcards, regex).

---

### 14. IElicit
**Overall Score:** 6.8/10
**Rank:** #13 of 27

**Scores:**
- Intuitiveness: 7/10
- Ease of Writing: 7/10
- Type Safety Balance: 7/10
- Consistency: 7/10
- Flexibility: 7/10
- Error Messages: 6/10

**Detailed Analysis:**

**Intuitiveness (7/10):**
Moderately clear. `prompt`, `args`, `result` make sense. Issue: Interface is documentation-only (actual use is `context.elicitInput()`), confusing users.

**Ease of Writing (7/10):**
10-15 lines for typical usage:
```typescript
const result = await context.elicitInput(
  'Enter API key',
  { apiKey: { type: 'string', description: 'Your key' } }
);
```
Args structure similar to JSON Schema.

**Type Safety Balance (7/10):**
Decent. Args are structured. Result action typed ('accept' | 'decline' | 'cancel'). Issue: Content shape not validated at compile time.

**Consistency (7/10):**
Good. Follows prompt/args pattern. JSON Schema style. Issue: Only documented in examples, rarely used.

**Flexibility (7/10):**
Supports string, number, boolean, object inputs. Format validation. Limitation: No file uploads, complex UI.

**Error Messages (6/10):**
Type errors moderate. Issue: IElicit interface never used directly, so errors don't map to actual usage.

**Strengths:**
- ✅ JSON Schema-style args
- ✅ Action-based result (accept/decline/cancel)
- ✅ Supports validation (format, min/max)

**Weaknesses:**
- ⚠️ Interface is documentation-only (never directly implemented)
- ⚠️ Very limited examples (maybe 1-2 in codebase)
- ⚠️ Result content shape untyped
- ⚠️ No support for complex UIs

**Common Pain Points:**
- Users try to implement IElicit directly
- Unclear when to use elicitation vs UI resources
- Result content requires runtime type checking

**Recommendations for v4.0.0:**
- **Keep:** Action-based result, JSON Schema args.
- **Fix:** Clarify IElicit is documentation-only or remove it.
- **Consider:** Type-safe result content based on args schema.

---

### 15. IDatabase
**Overall Score:** 6.8/10
**Rank:** #13 of 27

**Scores:**
- Intuitiveness: 7/10
- Ease of Writing: 7/10
- Type Safety Balance: 6/10
- Consistency: 7/10
- Flexibility: 7/10
- Error Messages: 7/10

**Detailed Analysis:**

**Intuitiveness (7/10):**
Clear structure. `uri`, `name`, `timeout`, `poolSize` are obvious. Environment variable syntax `${DATABASE_URL}` is clever. Issue: Relationship to IResource not obvious.

**Ease of Writing (7/10):**
5-10 lines for basic config:
```typescript
database: {
  uri: '${DATABASE_URL}';
  readonly: true;
}
```
Straightforward but requires understanding 3 interfaces (IResource + IDatabase + ResourceContext).

**Type Safety Balance (6/10):**
Moderate. URI is string (no validation). Options are typed. Issue: Database driver type is `any` in ResourceContext.

**Consistency (7/10):**
Good. Field names match industry standards. Issue: Feels disconnected from IResource (optional field vs separate interface).

**Flexibility (7/10):**
Supports SQLite, plans for PostgreSQL/MySQL. Environment variables. Read-only mode. Limitation: Only one database per resource.

**Error Messages (7/10):**
Decent. URI format errors at runtime. Connection errors are clear.

**Strengths:**
- ✅ Environment variable support
- ✅ Read-only mode for safety
- ✅ Connection pooling
- ✅ Good SQLite example (examples/interface-database-resource.ts)

**Weaknesses:**
- ⚠️ Feels disconnected from IResource
- ⚠️ ResourceContext.db type is `any` (no driver typing)
- ⚠️ Only 1 example in entire codebase
- ⚠️ No validation of URI format at compile time

**Common Pain Points:**
- Users confused about setup (3 interfaces to understand)
- Database driver casting required (`as Database.Database`)
- Unclear which databases are supported (docs say future)

**Usage Example Snippet:**
```typescript
// examples/interface-database-resource.ts
interface UsersResource extends IResource {
  uri: 'db://users';
  name: 'Users Database';
  mimeType: 'application/json';
  database: {
    uri: '${DATABASE_URL}';
    readonly: true;
  };
  returns: { users: User[] };
}

'db://users': UsersResource = async (context) => {
  const db = context?.db;
  const users = db.prepare('SELECT * FROM users').all();
  return { users };
};
```

**Recommendations for v4.0.0:**
- **Keep:** Environment variable syntax, connection options.
- **Fix:** Type ResourceContext.db properly (generic based on driver).
- **Consider:** Integrate more tightly with IResource (merge interfaces).

---

### 16. ICompletion
**Overall Score:** 6.7/10
**Rank:** #15 of 27

**Scores:**
- Intuitiveness: 7/10
- Ease of Writing: 6/10
- Type Safety Balance: 7/10
- Consistency: 7/10
- Flexibility: 7/10
- Error Messages: 6/10

**Detailed Analysis:**

**Intuitiveness (7/10):**
Moderately clear. `name`, `description`, `ref` make sense. Callable signature clear. Issue: `ref` object structure not immediately obvious.

**Ease of Writing (6/10):**
10-20 lines for typical completion:
```typescript
interface CitySuggestions extends ICompletion<string[]> {
  name: 'city_autocomplete';
  ref: { type: 'argument'; name: 'city' };
}

citySuggestions: CitySuggestions = (value) => {
  return cities.filter(c => c.startsWith(value));
};
```
Ref structure adds cognitive load.

**Type Safety Balance (7/10):**
Good. Generic `ICompletion<TSuggestions>` types return. Issue: Ref object validation is runtime not compile-time.

**Consistency (7/10):**
Good. Follows name/description/callable pattern. Issue: Limited examples (1-2 in codebase).

**Flexibility (7/10):**
Supports argument and resource completions. Context parameter for complex cases. Limitation: No caching hints.

**Error Messages (6/10):**
Type errors decent. Issue: Ref mismatch errors are runtime. No guidance on expected return shape.

**Strengths:**
- ✅ Generic typing for suggestions
- ✅ Supports argument and resource completions
- ✅ Context parameter for advanced cases

**Weaknesses:**
- ⚠️ Ref structure adds complexity
- ⚠️ Very limited examples (1-2)
- ⚠️ No caching or performance hints
- ⚠️ Ref validation is runtime

**Common Pain Points:**
- Ref structure learned by example (not intuitive)
- Unclear when completions are called
- No guidance on performance (should filter be fast?)

**Usage Example Snippet:**
```typescript
// examples/interface-completions.ts:129-133
interface CityCompletion extends ICompletion<string[]> {
  name: 'city_autocomplete';
  description: 'Autocomplete city names';
  ref: { type: 'argument'; name: 'city' };
}
```

**Recommendations for v4.0.0:**
- **Keep:** Generic typing, context parameter.
- **Fix:** Simplify ref structure or add more examples.
- **Consider:** Add caching/performance hints to interface.

---

### 17. IRoots
**Overall Score:** 6.5/10
**Rank:** #16 of 27

**Scores:**
- Intuitiveness: 6/10
- Ease of Writing: 6/10
- Type Safety Balance: 7/10
- Consistency: 7/10
- Flexibility: 7/10
- Error Messages: 6/10

**Detailed Analysis:**

**Intuitiveness (6/10):**
Moderately confusing. `name`, `description` clear but purpose unclear. Callable signature returning array of roots. Issue: What are "roots"? Concept not explained in interface.

**Ease of Writing (6/10):**
5-10 lines but requires understanding roots concept:
```typescript
interface ProjectRoots extends IRoots {
  name: 'project_roots';
  description: 'Available project directories';
}

projectRoots: ProjectRoots = () => [
  { uri: 'file:///projects/app1', name: 'App 1' }
];
```

**Type Safety Balance (7/10):**
Good. Return type is clear. Issue: URI string format not validated.

**Consistency (7/10):**
Good. Follows name/description/callable pattern. Issue: Almost no examples (0-1 in entire codebase).

**Flexibility (7/10):**
Simple, extensible. Supports sync and async. Limitation: Only URI list, no metadata.

**Error Messages (6/10):**
Type errors decent. Issue: Almost never used, so error scenarios unclear.

**Strengths:**
- ✅ Simple interface
- ✅ Supports sync and async
- ✅ Optional name field for roots

**Weaknesses:**
- ⚠️ Concept poorly explained (what are roots?)
- ⚠️ Almost no examples (0-1)
- ⚠️ URI validation is runtime
- ⚠️ Limited metadata support

**Common Pain Points:**
- Users don't understand roots concept
- Unclear when to use roots vs resources
- Examples missing from documentation

**Recommendations for v4.0.0:**
- **Keep:** Simple structure.
- **Fix:** Add comprehensive documentation and examples.
- **Consider:** Rename to something more descriptive (IWorkspaceDirectories?).

---

### 18. UIResourceDefinition
**Overall Score:** 6.3/10
**Rank:** #17 of 27

**Scores:**
- Intuitiveness: 6/10
- Ease of Writing: 6/10
- Type Safety Balance: 6/10
- Consistency: 7/10
- Flexibility: 7/10
- Error Messages: 6/10

**Detailed Analysis:**

**Intuitiveness (6/10):**
Moderately clear. Fields match IUI subset. Issue: Relationship to IUIResourceProvider unclear. Why separate from IUI?

**Ease of Writing (6/10):**
10-15 lines:
```typescript
{
  uri: 'ui://form',
  name: 'Feedback Form',
  description: 'User feedback',
  mimeType: 'text/html',
  content: '<form>...</form>'
}
```
Similar to IUI but feels redundant.

**Type Safety Balance (6/10):**
Decent. MIME types are union. Content is string or function. Issue: Mutual exclusivity not enforced (IUI problem).

**Consistency (7/10):**
Good. Matches IUI field names. Issue: Duplicate of IUI (confusing).

**Flexibility (7/10):**
Covers HTML, URI list, Remote DOM. Dynamic content. Limitation: Subset of IUI features.

**Error Messages (6/10):**
Type errors decent. Issue: Duplicate errors with IUI.

**Strengths:**
- ✅ Matches IUI structure
- ✅ Supports dynamic content

**Weaknesses:**
- ⚠️ Duplicate of IUI (confusing why both exist)
- ⚠️ Limited examples
- ⚠️ Relationship to IUIResourceProvider unclear

**Common Pain Points:**
- Users confused about IUI vs UIResourceDefinition
- Unclear when to use which interface

**Recommendations for v4.0.0:**
- **Keep:** Structure matching IUI.
- **Fix:** Merge with IUI or clarify distinction.
- **Consider:** Remove if redundant.

---

### 19-23. Support Interfaces (ResourceContext, IAudioContent, IAudioMetadata, IOAuthClient, IAuth)
**Overall Score:** 6.2/10 (average)
**Rank:** #18 of 27

**Scores (averaged):**
- Intuitiveness: 6/10
- Ease of Writing: 6/10
- Type Safety Balance: 6/10
- Consistency: 7/10
- Flexibility: 6/10
- Error Messages: 6/10

**Detailed Analysis:**

**Intuitiveness (6/10):**
Moderately clear but context-dependent. ResourceContext makes sense with IDatabase. AudioContent follows content pattern. OAuth interfaces follow spec. Issue: All are rarely used, so learning curve is steep.

**Ease of Writing (6/10):**
Most are used implicitly (ResourceContext) or by copy-paste (OAuth). 5-15 lines typically. Limited examples make writing harder.

**Type Safety Balance (6/10):**
Decent. Fields are typed. Issue: ResourceContext.db is `any`. OAuth secret is string (no validation).

**Consistency (7/10):**
Good. Follow framework patterns. Audio matches other content types. OAuth follows spec.

**Flexibility (6/10):**
Cover their use cases. Limitation: Limited extensibility.

**Error Messages (6/10):**
Type errors decent but limited usage means fewer error scenarios documented.

**Strengths:**
- ✅ Follow framework patterns
- ✅ Match industry standards (OAuth, audio MIME types)

**Weaknesses:**
- ⚠️ Limited examples for all
- ⚠️ ResourceContext.db is untyped
- ⚠️ OAuth setup complex (multiple interfaces)

**Common Pain Points:**
- Users copy-paste OAuth setup without understanding
- Audio content rarely used (no examples)
- ResourceContext typing requires casting

**Recommendations for v4.0.0:**
- **Keep:** Core structures.
- **Fix:** Add comprehensive examples for each.
- **Consider:** Type ResourceContext.db generically.

---

### 24. IToolAnnotations
**Overall Score:** 6.0/10
**Rank:** #23 of 27

**Scores:**
- Intuitiveness: 5/10
- Ease of Writing: 6/10
- Type Safety Balance: 6/10
- Consistency: 7/10
- Flexibility: 6/10
- Error Messages: 6/10

**Detailed Analysis:**

**Intuitiveness (5/10):**
Moderately confusing. Field names unclear (what's "hint" in `readOnlyHint`?). Purpose not immediately obvious. Issue: Rarely used (maybe 1 example).

**Ease of Writing (6/10):**
5-10 lines but requires understanding annotation purpose:
```typescript
annotations: {
  readOnlyHint: true;
  category: 'data';
}
```
Not obvious which fields to use.

**Type Safety Balance (6/10):**
Decent. All fields optional. Types are clear. Issue: String fields (category, estimatedDuration) are loose.

**Consistency (7/10):**
Good. Matches MCP spec. Issue: "Hint" suffix inconsistent with other interfaces.

**Flexibility (6/10):**
Covers safety hints (readOnly, destructive). Extensible via index signature. Limitation: Custom annotations untyped.

**Error Messages (6/10):**
Type errors decent. Issue: Rarely used so error scenarios unclear.

**Strengths:**
- ✅ Follows MCP spec
- ✅ Extensible via index signature
- ✅ Optional fields (no required setup)

**Weaknesses:**
- ⚠️ "Hint" suffix unclear (readOnlyHint vs readOnly)
- ⚠️ Almost no examples (1 in codebase)
- ⚠️ String fields untyped (category, estimatedDuration)
- ⚠️ Purpose unclear from interface alone

**Common Pain Points:**
- Users don't understand when to use annotations
- Field names confusing (hint vs no hint)
- Category values learned by example

**Recommendations for v4.0.0:**
- **Keep:** Optional fields, extensibility.
- **Fix:** Remove "Hint" suffix or clarify why it exists.
- **Consider:** Type category and estimatedDuration as literal unions.

---

### 25. IToolRouter
**Overall Score:** 5.8/10
**Rank:** #24 of 27

**Scores:**
- Intuitiveness: 5/10
- Ease of Writing: 6/10
- Type Safety Balance: 6/10
- Consistency: 6/10
- Flexibility: 7/10
- Error Messages: 5/10

**Detailed Analysis:**

**Intuitiveness (5/10):**
Confusing. Purpose unclear (organizational tool that groups tools). No examples in interface-driven API. Issue: Documentation says "operational concern, not type definition" but it's in types file.

**Ease of Writing (6/10):**
Simple structure but programmatic usage required:
```typescript
server.addRouterTool({
  name: 'weather_tools',
  description: 'Weather operations',
  tools: ['get_weather', 'get_forecast']
});
```
Not usable in interface-driven API.

**Type Safety Balance (6/10):**
Decent. Fields typed. Issue: Tool name strings unvalidated.

**Consistency (6/10):**
Moderate. Follows name/description pattern. Issue: Doesn't follow interface-driven pattern (can't extend interface).

**Flexibility (7/10):**
Metadata support. Tool assignment. Limitation: Only for programmatic API.

**Error Messages (5/10):**
Limited. Tool name errors at runtime. No interface errors (it's programmatic).

**Strengths:**
- ✅ Organizational tool grouping
- ✅ Metadata support

**Weaknesses:**
- ⚠️ Not usable in interface-driven API
- ⚠️ No examples in interface files
- ⚠️ Purpose unclear from interface
- ⚠️ Tool name validation at runtime

**Common Pain Points:**
- Users try to use in interface-driven API
- Unclear what routers do
- No interface-driven examples

**Recommendations for v4.0.0:**
- **Keep:** Programmatic API support.
- **Fix:** Move to programmatic types file or remove from interface-types.
- **Consider:** Add interface-driven support or remove entirely.

---

### 26. IUIResourceProvider
**Overall Score:** 5.8/10
**Rank:** #24 of 27

**Scores:**
- Intuitiveness: 5/10
- Ease of Writing: 6/10
- Type Safety Balance: 6/10
- Consistency: 7/10
- Flexibility: 6/10
- Error Messages: 5/10

**Detailed Analysis:**

**Intuitiveness (5/10):**
Confusing. Why separate from IUI? Single method `getUIResources()` feels over-engineered. Issue: Limited examples (1-2).

**Ease of Writing (6/10):**
5-15 lines:
```typescript
export default class MyServer implements IServer, IUIResourceProvider {
  getUIResources(): UIResourceDefinition[] {
    return [{ uri: 'ui://form', ... }];
  }
}
```
Requires implementing interface explicitly (unlike other interfaces).

**Type Safety Balance (6/10):**
Decent. Return type clear. Issue: No validation that URIs don't conflict with IUI resources.

**Consistency (7/10):**
Good. Follows provider pattern. Issue: Different pattern from other features (ITool doesn't need IToolProvider).

**Flexibility (6/10):**
Supports multiple resources. Dynamic content. Limitation: Why not just IUI?

**Error Messages (5/10):**
Limited. No compile-time checks for conflicts.

**Strengths:**
- ✅ Supports multiple UI resources
- ✅ Dynamic content generation

**Weaknesses:**
- ⚠️ Separate pattern from other features
- ⚠️ Limited examples (1-2)
- ⚠️ Unclear benefit over IUI
- ⚠️ Requires explicit implementation

**Common Pain Points:**
- Users confused about IUI vs IUIResourceProvider
- Unclear when to use which
- Explicit implementation feels verbose

**Recommendations for v4.0.0:**
- **Keep:** If needed for advanced cases.
- **Fix:** Clarify distinction from IUI in docs.
- **Consider:** Merge into IUI pattern.

---

### 27. IOAuth2Auth
**Overall Score:** 5.5/10
**Rank:** #26 of 27

**Scores:**
- Intuitiveness: 5/10
- Ease of Writing: 5/10
- Type Safety Balance: 6/10
- Consistency: 7/10
- Flexibility: 6/10
- Error Messages: 5/10

**Detailed Analysis:**

**Intuitiveness (5/10):**
Complex. Requires OAuth 2.1 knowledge. Many fields (`issuerUrl`, `clients`, `tokenExpiration`, `refreshTokenExpiration`, etc.). Issue: Limited documentation and examples.

**Ease of Writing (5/10):**
30-50 lines minimum:
```typescript
interface OAuth2Auth extends IOAuth2Auth {
  type: 'oauth2';
  issuerUrl: 'https://auth.example.com';
  clients: [
    {
      clientId: 'web-app',
      clientSecret: process.env.SECRET!,
      redirectUris: ['https://...'],
      scopes: ['read', 'write']
    }
  ];
}
```
Complex setup, requires understanding OAuth flow.

**Type Safety Balance (6/10):**
Decent. Fields typed. Issue: Client secret is string (no env var enforcement), scopes are string array (untyped).

**Consistency (7/10):**
Good. Follows auth discriminated union pattern. Field names match OAuth spec.

**Flexibility (6/10):**
Covers OAuth 2.1 basics. Multiple clients. Token configuration. Limitation: Limited examples make it hard to judge full flexibility.

**Error Messages (5/10):**
Limited. Most errors are runtime. No guidance on OAuth flow setup.

**Strengths:**
- ✅ Follows OAuth 2.1 spec
- ✅ Multiple client support
- ✅ Token expiration config

**Weaknesses:**
- ⚠️ Very limited examples (1-2 in codebase)
- ⚠️ Complex setup (many fields)
- ⚠️ Client secrets as strings (should require env vars)
- ⚠️ Scopes untyped (string array)

**Common Pain Points:**
- Users copy-paste OAuth config without understanding
- Client secret handling unclear (hardcoded in examples)
- Scope syntax learned by trial and error
- OAuth flow not documented in interface

**Usage Example Snippet:**
```typescript
// examples/interface-oauth-server.ts (if exists)
interface OAuth2Auth extends IOAuth2Auth {
  type: 'oauth2';
  issuerUrl: 'https://auth.example.com';
  clients: [
    {
      clientId: 'web-app-123',
      clientSecret: process.env.OAUTH_CLIENT_SECRET!,
      redirectUris: ['https://app.example.com/callback'],
      scopes: ['read', 'write', 'tools:execute']
    }
  ];
  tokenExpiration: 3600;
  refreshTokenExpiration: 2592000;
}
```

**Recommendations for v4.0.0:**
- **Keep:** OAuth 2.1 structure, multiple clients.
- **Fix:** Add comprehensive examples and OAuth flow documentation.
- **Consider:** Type-safe scopes (literal union or enum).

---

### 28. IUI
**Overall Score:** 4.2/10
**Rank:** #27 of 27 (WORST)

**Scores:**
- Intuitiveness: 3/10
- Ease of Writing: 4/10
- Type Safety Balance: 4/10
- Consistency: 5/10
- Flexibility: 6/10
- Error Messages: 4/10

**Detailed Analysis:**

**Intuitiveness (3/10):**
**Severely confusing**. 30+ fields with complex mutual exclusivity rules. `html` OR `file` OR `component` OR `externalUrl` OR `remoteDom` - which to use? `css` vs `stylesheets`, `script` vs `scripts`. Foundation vs Feature vs Polish layer fields mixed together. No clear guidance.

**Ease of Writing (4/10):**
50-100+ lines for typical UI with all options. Simple case is 10-15 lines but knowing which fields to use requires reading docs extensively:
```typescript
interface MyUI extends IUI {
  uri: 'ui://form';
  name: 'Form';
  description: 'User form';
  html: '<form>...</form>';  // OR file? OR component?
  css: '.form {}';            // OR stylesheets?
  tools: ['submit'];
  size: { width: 800, height: 600 };
  subscribable: true;
  // ... 20 more optional fields
}
```
**Overwhelming**.

**Type Safety Balance (4/10):**
Poor. Mutual exclusivity not enforced (can define both `html` and `file` - runtime error). Optional fields everywhere mean no guidance. Complex union types for `minify`, `cdn`, `performance` are verbose. `bundle` can be boolean OR object (confusing).

**Consistency (5/10):**
Moderate. Some patterns match (name/description/uri) but many inconsistencies:
- `css` (singular) vs `stylesheets` (plural)
- `script` (singular) vs `scripts` (plural)
- `html` (inline) vs `file` (external) vs `component` (React)
- `minify: boolean` vs `minify: { html, css, js }`

**Flexibility (6/10):**
**Too flexible**. Supports everything (inline HTML, external files, React components, Remote DOM, external URLs, CDN, minification, performance monitoring, bundling, themes, imports). Every use case covered but at the cost of **overwhelming complexity**.

**Error Messages (4/10):**
Poor. Mutual exclusivity errors are runtime. Wrong field combinations unclear. TypeScript errors don't guide you to correct usage. No warning when using multiple content sources.

**Strengths:**
- ✅ Covers all UI use cases (Foundation, Feature, Polish layers)
- ✅ Extensive documentation in JSDoc
- ✅ Supports simple to complex UIs

**Weaknesses:**
- ⚠️ **CRITICAL: 30+ fields is overwhelming**
- ⚠️ Mutual exclusivity not type-checked (html/file/component/externalUrl/remoteDom)
- ⚠️ Foundation/Feature/Polish fields mixed together (no clear organization)
- ⚠️ Singular/plural inconsistency (css/stylesheets, script/scripts)
- ⚠️ Complex union types (minify, cdn, performance) add cognitive load
- ⚠️ No guidance on which fields to use for common cases
- ⚠️ Callable signature mixed with static fields (confusing)

**Common Pain Points:**
- **Users paralyzed by choice** (which fields do I actually need?)
- Define both `html` and `file` → runtime error
- Unclear when to use `css` vs `stylesheets`
- Bundle configuration too complex (boolean OR object with 4 fields)
- Performance monitoring config verbose (boolean OR object with nested thresholds)
- Theme configuration unclear (string OR object)
- Examples don't cover all field combinations

**Usage Example Snippet:**
```typescript
// examples/interface-file-based-ui.ts (simplified)
interface CalculatorUI extends IUI {
  uri: 'ui://calculator/v1';
  name: 'Calculator';
  description: 'Simple calculator';
  file: './ui/calculator.html';      // Which to use?
  stylesheets: ['./styles/calc.css']; // css or stylesheets?
  scripts: ['./ui/calc.js'];          // script or scripts?
  tools: ['calculate'];
  size: { width: 400, height: 600 };
  subscribable: false;
  // Could also have: component, bundle, minify, cdn, performance...
}
```

**Recommendations for v4.0.0:**
- **Keep:** Core URI/name/description, tools integration, size hints.
- **Fix:** **URGENT - Split into separate interfaces**:
  - `IInlineUI` (html, css, script)
  - `IFileBasedUI` (file, stylesheets, scripts)
  - `IComponentUI` (component, dependencies, bundle)
  - `IExternalUI` (externalUrl)
  - `IRemoteDOMUI` (remoteDom)
- **Fix:** Use discriminated union to enforce mutual exclusivity
- **Fix:** Unify singular/plural (scripts/stylesheets OR script/stylesheet)
- **Consider:** Move Polish layer features (minify, cdn, performance) to separate optimization interface

---

## Category Breakdowns

### Core Interfaces (IServer)
**Average Score:** 8.5/10

The foundation is solid. IServer strikes the perfect balance between required and optional fields, has clear defaults, and supports both simple and complex configurations. Only minor improvements needed (flattenRouters naming, transport/port validation).

---

### Authentication Interfaces (IAuth, IApiKeyAuth, IApiKeyConfig, IOAuth2Auth, IOAuthClient)
**Average Score:** 6.5/10

Auth interfaces show clear patterns (discriminated union) but suffer from limited examples and documentation. IApiKeyAuth is usable (7.2/10) thanks to examples, but IOAuth2Auth is the second-worst interface (5.5/10) due to complexity and lack of real-world usage patterns. Permission strings need type safety.

---

### MCP Primitive Interfaces (ITool, IToolAnnotations, IToolRouter, IPrompt, IPromptArgument, IResource, IParam)
**Average Score:** 7.6/10

The core of the framework is strong. ITool (8.8/10) is the gold standard. IPrompt (8.0/10) and IResource (7.8/10) are excellent. IParam (8.3/10) is very good but has a **critical documentation contradiction** about inline types. IToolAnnotations (6.0/10) and IToolRouter (5.8/10) drag the average down due to limited examples and unclear purposes.

---

### Advanced MCP Interfaces (ICompletion, IElicit, ISampling, ISamplingMessage, ISamplingOptions, ISubscription, IRoots)
**Average Score:** 7.0/10

Solid but underutilized. Most score 6.5-7.3/10 due to limited examples and documentation. ISampling interfaces (7.2/10 average) are well-structured. IElicit (6.8/10) and IRoots (6.5/10) suffer from unclear concepts and missing examples. ISubscription (7.0/10) is good but relationship with IResource needs clarity.

---

### UI/Content Interfaces (IUI, IUIResourceProvider, UIResourceDefinition, IAudioContent, IAudioMetadata)
**Average Score:** 5.7/10

**Weakest category**. IUI (4.2/10) is the worst interface in the entire framework - 30+ fields with complex mutual exclusivity make it overwhelming. IUIResourceProvider (5.8/10) and UIResourceDefinition (6.3/10) are confusing duplicates of IUI functionality. IAudioContent (6.2/10) is decent but barely used.

---

### Database Interfaces (IDatabase, ResourceContext)
**Average Score:** 6.5/10

Functional but disconnected. IDatabase (6.8/10) is clear but feels bolted onto IResource. ResourceContext (6.2/10) suffers from untyped db field (any) requiring manual casting. Only 1 example in entire codebase makes learning difficult.

---

## Comparative Analysis

### Best in Class
**Top 5 Interfaces by Overall Score:**

1. **ITool** - 8.8/10
   - **Why it's excellent:** Perfect intuitive structure (name/description/params/result), natural callable signature, full type inference, 30+ examples showing it works for everyone.
   - **Pattern to replicate:** Simple required fields, clear callable signature, generic typing for flexibility, extensive documentation through examples.

2. **IServer** - 8.5/10
   - **Why it's excellent:** Minimal required fields (name/description), clear optional fields with good defaults, discriminated union for auth.
   - **Pattern to replicate:** Required fields only for essentials, optional fields for configuration, clear default values.

3. **IParam** - 8.3/10
   - **Why it's excellent:** Type discriminant pattern, rich validation constraints, self-documenting, follows JSON Schema conventions.
   - **Pattern to replicate:** Type discriminants for variant fields, validation constraints as optional fields, clear naming.

4. **IPrompt** - 8.0/10
   - **Why it's excellent:** Three return patterns (string, SimpleMessage[], PromptMessage[]), automatic type inference, lightweight arguments.
   - **Pattern to replicate:** Multiple patterns for different complexity levels, type inference reducing boilerplate, progressive disclosure.

5. **IResource** - 7.8/10
   - **Why it's excellent:** Static (value) vs dynamic (returns) pattern is elegant, supports sync and async, subscribable for live updates.
   - **Pattern to replicate:** Discriminate between static and dynamic via value vs returns, support both patterns seamlessly.

---

### Needs Improvement
**Bottom 5 Interfaces by Overall Score:**

1. **IUI** - 4.2/10
   - **Why it struggles:** 30+ fields with complex mutual exclusivity, Foundation/Feature/Polish layers mixed together, overwhelming for users.
   - **Priority for v4.0.0:** **CRITICAL - HIGH**
   - **Recommended changes:** Split into separate interfaces (IInlineUI, IFileBasedUI, IComponentUI, IExternalUI, IRemoteDOMUI) with discriminated union. Move Polish features to separate optimization interface.

2. **IOAuth2Auth** - 5.5/10
   - **Why it struggles:** Complex setup (many fields), very limited examples (1-2), OAuth flow not documented, scopes untyped.
   - **Priority for v4.0.0:** MEDIUM
   - **Recommended changes:** Add comprehensive OAuth flow guide and examples. Type-safe scopes. Enforce env vars for secrets.

3. **IUIResourceProvider** - 5.8/10
   - **Why it struggles:** Unclear distinction from IUI, different pattern from other features (ITool doesn't need IToolProvider), limited examples.
   - **Priority for v4.0.0:** MEDIUM
   - **Recommended changes:** Merge into IUI pattern or clearly document when to use each. Add more examples.

4. **IToolRouter** - 5.8/10
   - **Why it struggles:** Not usable in interface-driven API, unclear purpose ("organizational concern" in types file), no examples.
   - **Priority for v4.0.0:** MEDIUM
   - **Recommended changes:** Move to programmatic types or add interface-driven support. Add comprehensive examples.

5. **IToolAnnotations** - 6.0/10
   - **Why it struggles:** Field names unclear ("Hint" suffix), almost no examples (1), purpose not obvious, string fields untyped.
   - **Priority for v4.0.0:** MEDIUM
   - **Recommended changes:** Remove "Hint" suffix or clarify. Add examples. Type category and estimatedDuration as literal unions.

---

### Score Distribution

**By Category:**
- Intuitiveness: Average 6.8/10 (Range: 3-10)
- Ease of Writing: Average 6.9/10 (Range: 4-9)
- Type Safety Balance: Average 6.8/10 (Range: 4-9)
- Consistency: Average 7.4/10 (Range: 5-9) ⭐ **Highest**
- Flexibility: Average 7.2/10 (Range: 6-9)
- Error Messages: Average 6.6/10 (Range: 4-8) ⭐ **Lowest**

**Insights:**
- **Consistency is the framework's greatest strength** (7.4/10 average). Naming conventions, patterns, and structure are remarkably uniform across 27 interfaces.
- **Error messages are the weakest area** (6.6/10 average). Many interfaces have runtime-only validation, mutual exclusivity checks missing, and TypeScript errors don't guide users to solutions.
- **Intuitiveness, ease of writing, and type safety are balanced** (all 6.8-6.9/10). Most interfaces hit the "good enough" mark but few achieve excellence.
- **Flexibility is strong** (7.2/10). Framework handles simple to complex cases well, though some interfaces are too flexible (IUI).

---

## Key Insights Summary

### Patterns That Work
1. **Simple callable signature** (ITool, IPrompt, IResource): Interfaces used 8.0-8.8/10
   - Structure: `(args) => result` or `(params) => result`
   - Users naturally understand this pattern
   - Implementation feels like regular TypeScript functions

2. **Name/description/required-fields pattern** (ITool, IPrompt, IResource, IServer): Interfaces used 7.8-8.8/10
   - All interfaces have clear `name` and `description` fields
   - Additional required fields are minimal and obvious
   - Optional fields enhance rather than overwhelm

3. **Type discriminants for variants** (IAuth, IParam): Interfaces used 7.4/10 average
   - `type` field determines which other fields apply
   - Follows TypeScript discriminated union pattern
   - Makes mutual exclusivity clear (when used)

### Patterns That Don't Work
1. **30+ optional fields with complex mutual exclusivity** (IUI only): 4.2/10
   - Users paralyzed by choice
   - Mutual exclusivity not enforced at compile time
   - Mixed abstraction levels (Foundation/Feature/Polish)

2. **Documentation-only interfaces** (ISampling, IElicit): 6.7-6.8/10
   - Interface defined but never directly implemented
   - Users try to implement and get confused
   - Disconnect between interface and actual usage

3. **Separate provider patterns** (IUIResourceProvider): 5.8/10
   - Inconsistent with other features (ITool doesn't need IToolProvider)
   - Unclear when to use provider vs direct interface
   - Adds complexity without clear benefit

### Common Weaknesses Across Interfaces
1. **Limited examples affect 10 interfaces** (IOAuth2Auth, IRoots, IToolAnnotations, ICompletion, IElicit, IDatabase, IUIResourceProvider, UIResourceDefinition, IAudioContent, IAudioMetadata)
   - Interfaces with 0-2 examples score 5.5-6.5/10
   - Interfaces with 10+ examples score 7.5-8.8/10
   - **Clear correlation: More examples = Higher scores**

2. **Runtime-only validation affects 8 interfaces** (IUI, IParam, IResource, IAuth, IToolRouter, ICompletion, ISubscription, IDatabase)
   - Mutual exclusivity not enforced (IUI: html/file/component)
   - String fields untyped (permissions, scopes, categories)
   - URI format validation at runtime
   - **Impact: Lower "Type Safety Balance" and "Error Messages" scores**

3. **Unclear relationships affect 5 interfaces** (IUIResourceProvider, UIResourceDefinition, ResourceContext, IDatabase, ISubscription)
   - How does IUIResourceProvider relate to IUI?
   - Why are IDatabase and ResourceContext separate?
   - When does ISubscription need a subscribable IResource?
   - **Impact: Lower "Intuitiveness" scores**

### Common Strengths Across Interfaces
1. **Consistency in naming across 27 interfaces**
   - All use camelCase for fields
   - name/description pattern universal
   - Optional fields clearly named
   - **Result: Average consistency score of 7.4/10**

2. **Optional fields with sensible defaults across 20 interfaces**
   - IServer: version defaults to '1.0.0', transport to 'stdio'
   - IParam: required defaults to true
   - IPromptArgument: required defaults to true
   - **Result: Easy to get started with minimal configuration**

3. **Callable signatures for dynamic content across 7 interfaces** (ITool, IPrompt, IResource, ICompletion, IRoots, IElicit, ISubscription)
   - Natural TypeScript function syntax
   - Full type inference
   - Supports sync and async
   - **Result: High "Ease of Writing" scores (7-9/10)**

---

## Recommendations for v4.0.0

### High Priority (Breaking Changes Justified)

1. **IUI**: **CRITICAL - SPLIT INTO SEPARATE INTERFACES** - Impact: Makes UI development approachable
   - Create: IInlineUI, IFileBasedUI, IComponentUI, IExternalUI, IRemoteDOMUI
   - Use discriminated union with `type` field: 'inline' | 'file' | 'component' | 'external' | 'remoteDom'
   - Move Polish features (minify, cdn, performance) to separate IUIOptimization interface
   - Unify singular/plural: scripts/stylesheets (not script/stylesheet)
   - **Rationale:** Current IUI (4.2/10) is unusable for most developers. Split improves scores to estimated 7-8/10 per interface.

2. **IParam**: **URGENT - RESOLVE INLINE TYPE CONTRADICTION** - Impact: Eliminates major user confusion
   - Either: Allow inline types `{ name: string }` to work (convert internally to IParam)
   - Or: Remove all documentation suggesting inline types are allowed
   - Update src/server/interface-types.ts:505-516 docs to be unambiguous
   - **Rationale:** Current contradiction breaks user expectations and causes runtime errors.

3. **Auth Permissions**: **TYPE-SAFE PERMISSION STRINGS** - Impact: Catches typos at compile time
   - IApiKeyAuth.permissions: Change from `string[]` to `Permission[]` with literal union
   - IOAuth2Auth scopes: Change from `string[]` to `Scope[]` with literal union or enum
   - Provide default permission sets: 'read:*', 'write:*', 'tool:*', 'resource:*'
   - **Rationale:** String typos ('toll:*' vs 'tool:*') are caught at runtime, should be compile-time.

### Medium Priority (Nice to Have)

1. **IServer**: **RENAME flattenRouters** - Impact: Clearer developer understanding
   - Rename to `includeRouterToolsInList` or `showAssignedTools`
   - Update all documentation and examples
   - **Rationale:** Current name doesn't convey what it does.

2. **ITool/IPrompt**: **UNIFY PARAMETER NAMING** - Impact: Framework-wide consistency
   - Choose: `params` (ITool uses this) OR `args` (IPrompt uses this)
   - Apply consistently across all interfaces
   - **Rationale:** Inconsistency adds cognitive load, lowers consistency scores.

3. **IOAuth2Auth**: **ADD COMPREHENSIVE EXAMPLES** - Impact: Makes OAuth usable
   - Create 5+ examples covering: basic setup, multiple clients, dev vs prod, scope enforcement, token refresh
   - Add OAuth 2.1 flow diagram to documentation
   - Create template for common setups
   - **Rationale:** Limited examples (1-2) make OAuth setup painful. More examples = higher scores.

4. **IToolAnnotations**: **REMOVE "HINT" SUFFIX AND TYPE STRING FIELDS** - Impact: Clearer field names
   - Rename: `readOnlyHint` → `readOnly`, `destructiveHint` → `destructive`, etc.
   - Type: `category?: 'data' | 'system' | 'communication' | 'analysis' | 'file-management' | string`
   - Type: `estimatedDuration?: 'fast' | 'medium' | 'slow'`
   - **Rationale:** "Hint" suffix is unclear. Typed fields catch typos.

5. **IDatabase/ResourceContext**: **TYPE DATABASE CONNECTION** - Impact: Better autocomplete and type safety
   - Make ResourceContext generic: `ResourceContext<TDB = any>`
   - When IResource has database field, infer driver type
   - Example: `IResource<T, TDB = Database.Database>`
   - **Rationale:** Current `any` type requires manual casting, loses autocomplete.

### Low Priority (Document Don't Change)

1. **IToolRouter**: **CLARIFY PROGRAMMATIC-ONLY OR ADD INTERFACE SUPPORT** - Impact: Reduces confusion
   - If programmatic-only: Move to builder-types.ts (not interface-types.ts)
   - If interface-driven possible: Add comprehensive examples
   - Document relationship to flattenRouters setting
   - **Rationale:** Current location and documentation confuses interface API users.

2. **IRoots**: **ADD CONCEPT EXPLANATION AND EXAMPLES** - Impact: Makes roots understandable
   - Explain: "Roots are the client's working directories that the server can query"
   - Add 3-5 examples showing common patterns
   - Clarify when to use roots vs resources
   - **Rationale:** Concept poorly explained, almost no examples (0-1).

3. **IUIResourceProvider**: **MERGE WITH IUI OR DOCUMENT DISTINCTION** - Impact: Reduces interface proliferation
   - If keeping: Document when to use IUIResourceProvider vs IUI
   - If merging: Add IUI array support: `ui?: IUI | IUI[]`
   - **Rationale:** Duplicate functionality confuses users (why both?).

4. **ISampling/IElicit**: **CLARIFY DOCUMENTATION-ONLY STATUS** - Impact: Prevents implementation attempts
   - Add notice: "This interface is for documentation only. Actual usage is via context.sample()"
   - Show both interface and actual usage side by side
   - **Rationale:** Users try to implement these and get confused.

5. **IAudioContent/IAudioMetadata**: **ADD COMPREHENSIVE EXAMPLES** - Impact: Makes audio content usable
   - Create 3-5 examples: simple audio, streaming, metadata, format conversion
   - Document supported audio formats clearly
   - **Rationale:** Almost no examples make audio content unused feature.

---

## Conclusion

Simply-MCP's interface-driven API demonstrates remarkable **consistency** (7.4/10 average) across 27 interfaces, establishing clear patterns that work well for most use cases. The top interfaces—**ITool (8.8/10), IServer (8.5/10), and IParam (8.3/10)**—prove the framework's core design is sound: simple callable signatures, clear required fields, optional enhancements, and full type safety.

However, the evaluation reveals **three critical issues** requiring v4.0.0 attention:

1. **IUI is catastrophically complex** (4.2/10) - 30+ fields with unclear mutual exclusivity paralyze users. Splitting into focused interfaces (IInlineUI, IFileBasedUI, etc.) would improve usability dramatically.

2. **IParam documentation contradiction** - Docs suggest inline types work but they don't. This breaks user expectations and causes runtime errors. Resolution is urgent.

3. **Error messages are framework's weakest area** (6.6/10 avg) - Runtime-only validation, loose string types, and poor TypeScript guidance hinder developer experience. Type-safe permissions, discriminated unions for mutual exclusivity, and better error messages would raise scores significantly.

The **correlation between examples and scores is undeniable**: Interfaces with 10+ examples score 7.5-8.8/10, while those with 0-2 examples score 5.5-6.5/10. Authentication interfaces (OAuth especially) and advanced features (roots, annotations, completions) suffer from limited real-world usage patterns.

**Strategic recommendation**: Prioritize the three high-priority fixes (IUI split, IParam clarification, auth type safety) for v4.0.0. These changes directly address user pain points and will raise the overall framework average from 7.1/10 to an estimated **7.8-8.0/10**. Medium-priority improvements (naming consistency, OAuth examples, typed fields) can follow in v4.1.0+.

The framework has a **solid foundation**. With targeted improvements to its most problematic interfaces and expanded examples for underutilized features, Simply-MCP can achieve its goal of being the most intuitive and developer-friendly MCP framework.
