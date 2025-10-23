# Phase 1 Architecture Diagrams

**Version:** 1.0
**Date:** 2025-10-18
**Supplement to:** PHASE-1-ARCHITECTURE.md

---

## Diagram 1: Context Object Composition

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                         Context Object                                  │
│                      (Unified Interface)                                │
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     │
│  │   fastmcp        │  │   session        │  │ request_context  │     │
│  │  (Immutable)     │  │  (Stateful)      │  │  (Per-request)   │     │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘     │
│           │                     │                      │                │
│           │                     │                      │                │
└───────────┼─────────────────────┼──────────────────────┼────────────────┘
            │                     │                      │
            ▼                     ▼                      ▼

   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
   │  FastMCPInfo     │  │     Session      │  │ RequestContext   │
   ├──────────────────┤  ├──────────────────┤  ├──────────────────┤
   │ name: string     │  │ Properties:      │  │ request_id:      │
   │ version: string  │  │  client_params   │  │   string         │
   │ description?     │  │                  │  │ meta?:           │
   │                  │  │ Methods:         │  │   RequestMeta    │
   │ Phase 3+:        │  │  send_log_*()    │  │ lifespan_*?:     │
   │ instructions?    │  │  create_*()      │  │   any            │
   │ website_url?     │  │  send_*_*()      │  │                  │
   │ icons?           │  │                  │  │ Phase 1:         │
   │ settings?        │  │ All async!       │  │ Only request_id  │
   └──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## Diagram 2: Request Lifecycle Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    MCP Client                                  │
│                                                                │
│  Sends: tools/call OR prompts/get OR resources/read           │
└──────────────────┬─────────────────────────────────────────────┘
                   │
                   │ JSON-RPC Request
                   │
                   ▼
┌────────────────────────────────────────────────────────────────┐
│              MCP Server (BuildMCPServer)                       │
│                                                                │
│  Step 1: Request Handler Triggered                            │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ registerToolHandlers() / registerPromptHandlers()        │ │
│  │ / registerResourceHandlers()                             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                          │                                     │
│                          │                                     │
│  Step 2: Generate Request ID                                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ const request_id = generateRequestId()                   │ │
│  │ → "550e8400-e29b-41d4-a716-446655440000"                 │ │
│  └──────────────────────────────────────────────────────────┘ │
│                          │                                     │
│                          │                                     │
│  Step 3: Create Context Object                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ const context: Context = {                               │ │
│  │   fastmcp: this.fastmcpInfo,                             │ │
│  │   session: this.sessionObject,                           │ │
│  │   request_context: {                                     │ │
│  │     request_id: request_id,                              │ │
│  │     meta: undefined,                                     │ │
│  │     lifespan_context: undefined                          │ │
│  │   }                                                       │ │
│  │ }                                                         │ │
│  └──────────────────────────────────────────────────────────┘ │
│                          │                                     │
│                          │                                     │
│  Step 4: Execute Handler                                      │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Tool:     await tool.execute(args, context)              │ │
│  │ Prompt:   await template(args, context)                  │ │
│  │ Resource: await content(context)                         │ │
│  └──────────────────────────────────────────────────────────┘ │
│                          │                                     │
│                          │                                     │
└──────────────────────────┼─────────────────────────────────────┘
                           │
                           │ Handler Result
                           │
                           ▼
┌────────────────────────────────────────────────────────────────┐
│                   Handler Function                             │
│                                                                │
│  function myTool(args: any, context: Context) {                │
│    // Access server info                                      │
│    console.log(context.fastmcp.name);                         │
│                                                                │
│    // Access request ID                                       │
│    console.log(context.request_context.request_id);           │
│                                                                │
│    // Use session methods (Phase 2+)                          │
│    // await context.session.send_progress_*(...);             │
│                                                                │
│    return "Result";                                           │
│  }                                                             │
└────────────────────────────────────────────────────────────────┘
```

---

## Diagram 3: Context Injection Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   BuildMCPServer                                │
│                                                                 │
│  Constructor:                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ constructor(options: BuildMCPServerOptions) {          │    │
│  │   // Initialize FastMCP info                          │    │
│  │   this.fastmcpInfo = {                                │    │
│  │     name: options.name,                               │    │
│  │     version: options.version,                         │    │
│  │     description: options.description                  │    │
│  │   };                                                   │    │
│  │                                                        │    │
│  │   // Initialize session object (singleton)            │    │
│  │   this.sessionObject = new SessionImpl();             │    │
│  │ }                                                      │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Instance Fields:                                               │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ private fastmcpInfo: FastMCPInfo;  ◄───────────┐      │    │
│  │ private sessionObject: Session;    ◄────────┐  │      │    │
│  │                                             │  │      │    │
│  │ private tools: Map<...>;                    │  │      │    │
│  │ private prompts: Map<...>;                  │  │      │    │
│  │ private resources: Map<...>;                │  │      │    │
│  └────────────────────────────────────────────│──│──────┘    │
│                                               │  │            │
│  Request Handlers:                            │  │            │
│  ┌───────────────────────────────────────────│──│──────────┐ │
│  │ registerToolHandlers() {                  │  │          │ │
│  │   server.setRequestHandler(              │  │          │ │
│  │     CallToolRequestSchema,               │  │          │ │
│  │     async (request) => {                 │  │          │ │
│  │                                           │  │          │ │
│  │       // Create context per request      │  │          │ │
│  │       const context: Context = {         │  │          │ │
│  │         fastmcp: this.fastmcpInfo, ──────┼──┘          │ │
│  │         session: this.sessionObject, ────┘             │ │
│  │         request_context: {                             │ │
│  │           request_id: generateRequestId()              │ │
│  │         }                                               │ │
│  │       };                                                │ │
│  │                                                         │ │
│  │       // Execute with context                          │ │
│  │       await tool.execute(args, context);               │ │
│  │     }                                                   │ │
│  │   );                                                    │ │
│  │ }                                                       │ │
│  │                                                         │ │
│  │ // Similar for registerPromptHandlers(),               │ │
│  │ // registerResourceHandlers()                          │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

Key Points:
• fastmcpInfo created once in constructor (immutable)
• sessionObject created once in constructor (shared)
• Context object created fresh per request
• request_context.request_id unique per request
```

---

## Diagram 4: Session Object Implementation

```
┌────────────────────────────────────────────────────────────────┐
│                     Session Interface                          │
│                     (Abstract Contract)                        │
├────────────────────────────────────────────────────────────────┤
│ Properties:                                                    │
│  + client_params?: ClientCapabilities                         │
│                                                                │
│ Methods (all async):                                          │
│  + send_log_message(level, data, logger?)                     │
│  + create_message(messages, options?)                         │
│  + send_progress_notification(token, progress, total?, msg?)  │
│  + send_resource_updated(uri)                                 │
│  + send_resource_list_changed()                               │
│  + send_tool_list_changed()                                   │
│  + send_prompt_list_changed()                                 │
└────────────────────────────────────────────────────────────────┘
                              ▲
                              │
                              │ implements
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                      SessionImpl                                │
│                   (Concrete Implementation)                     │
├─────────────────────────────────────────────────────────────────┤
│ Phase 1: All methods stubbed                                   │
│                                                                 │
│ async send_log_message(...) {                                  │
│   console.warn('[Session] Not implemented (Phase 2)');         │
│ }                                                               │
│                                                                 │
│ async create_message(...) {                                    │
│   throw new Error('Not implemented (Phase 2)');                │
│ }                                                               │
│                                                                 │
│ async send_progress_notification(...) {                        │
│   console.warn('[Session] Not implemented (Phase 2)');         │
│ }                                                               │
│                                                                 │
│ async send_resource_updated(...) {                             │
│   console.warn('[Session] Not implemented (Phase 2)');         │
│ }                                                               │
│                                                                 │
│ // ... other stubs ...                                         │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │            Phase 2 Implementation                       │   │
│ │                                                         │   │
│ │ async send_log_message(level, data, logger?) {         │   │
│ │   const notification = {                               │   │
│ │     method: 'notifications/message',                   │   │
│ │     params: { level, logger, data }                    │   │
│ │   };                                                    │   │
│ │   await this.server.notification(notification);        │   │
│ │ }                                                       │   │
│ │                                                         │   │
│ │ // ... Phase 2 implementations for all methods ...     │   │
│ └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

Timeline:
• Phase 1 (Week 1-2): Stubs with warnings
• Phase 2 (Week 3):   Functional implementations
• Phase 3 (Week 4):   Additional features (lifespan, etc.)
```

---

## Diagram 5: Handler Backward Compatibility

```
┌────────────────────────────────────────────────────────────────┐
│              Handler Function Signatures                       │
│                                                                │
│  TypeScript Optional Parameter Pattern:                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ type ExecuteFunction<T> = (                              │ │
│  │   args: T,                                               │ │
│  │   context?: Context   // ← Optional!                     │ │
│  │ ) => Promise<HandlerResult> | HandlerResult;             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Python Optional Parameter Pattern:                           │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ async def handler(                                        │ │
│  │   args: dict,                                            │ │
│  │   context: Optional[Context] = None  # ← Optional!       │ │
│  │ ) -> str | dict:                                         │ │
│  │   ...                                                     │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
                              │
                              │
              ┌───────────────┴────────────────┐
              │                                │
              ▼                                ▼
┌──────────────────────────┐     ┌───────────────────────────┐
│   Old Style Handler      │     │   New Style Handler       │
│   (No Context Param)     │     │   (With Context Param)    │
├──────────────────────────┤     ├───────────────────────────┤
│                          │     │                           │
│ async function oldTool(  │     │ async function newTool(   │
│   args: any              │     │   args: any,              │
│ ) {                      │     │   context: Context        │
│   return "Hello";        │     │ ) {                       │
│ }                        │     │   const reqId =           │
│                          │     │     context.request_*     │
│                          │     │       .request_id;        │
│ ✅ Still Works!          │     │   return `${reqId}:       │
│ Context not passed       │     │     Hello`;               │
│                          │     │ }                         │
│                          │     │                           │
│                          │     │ ✅ Gets Context!          │
└──────────────────────────┘     └───────────────────────────┘
              │                                │
              │                                │
              └───────────────┬────────────────┘
                              │
                              ▼
              ┌─────────────────────────────────┐
              │   Both Patterns Supported       │
              │   Zero Breaking Changes         │
              └─────────────────────────────────┘

How It Works:
• TypeScript: Optional parameter `context?` makes it automatic
• Python: Default value `context: Optional[Context] = None`
• Old handlers: Called with 1 argument
• New handlers: Called with 2 arguments
• No runtime detection needed (type system handles it)
```

---

## Diagram 6: Request ID Uniqueness

```
┌────────────────────────────────────────────────────────────────┐
│              Concurrent Request Handling                       │
│                                                                │
│  Request A                Request B                Request C   │
│  (tools/call)             (prompts/get)           (tools/call) │
│      │                        │                       │        │
│      ▼                        ▼                       ▼        │
│  ┌────────┐              ┌────────┐             ┌────────┐    │
│  │ Gen ID │              │ Gen ID │             │ Gen ID │    │
│  └───┬────┘              └───┬────┘             └───┬────┘    │
│      │                       │                      │         │
│      ▼                       ▼                      ▼         │
│  550e8400-...           3f4a9b2c-...           7c8e1d5f-...   │
│      │                       │                      │         │
│      ▼                       ▼                      ▼         │
│  ┌──────────┐           ┌──────────┐          ┌──────────┐   │
│  │ Context  │           │ Context  │          │ Context  │   │
│  │ A        │           │ B        │          │ C        │   │
│  └──────────┘           └──────────┘          └──────────┘   │
│      │                       │                      │         │
│      ▼                       ▼                      ▼         │
│  Execute Tool           Execute Prompt        Execute Tool    │
│      │                       │                      │         │
│      ▼                       ▼                      ▼         │
│  [Log: 550e8400...]     [Log: 3f4a9b2c...]    [Log: 7c8e1d5f]│
│      │                       │                      │         │
│      ▼                       ▼                      ▼         │
│  Return Result          Return Result         Return Result   │
│                                                                │
└────────────────────────────────────────────────────────────────┘

Key Properties:
• Each request gets unique UUID v4
• Parallel requests have different IDs
• IDs can be used for tracing/logging
• Thread-safe (TS: single-threaded, PY: immutable contexts)
• Format: "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
```

---

## Diagram 7: Property Group Responsibilities

```
┌─────────────────────────────────────────────────────────────────┐
│                         Context                                 │
│                                                                 │
│  Three Distinct Responsibilities:                              │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   fastmcp       │  │   session       │  │ request_context │
│  (WHO AM I?)    │  │ (WHAT CAN I DO?)│  │  (WHICH ONE?)   │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ Server          │  │ Client          │  │ Request         │
│ Identity        │  │ Interaction     │  │ Tracking        │
│                 │  │                 │  │                 │
│ Properties:     │  │ Properties:     │  │ Properties:     │
│ • name          │  │ • client_params │  │ • request_id    │
│ • version       │  │                 │  │ • meta          │
│ • description   │  │ Methods:        │  │ • lifespan_*    │
│ • instructions  │  │ • send_log_*()  │  │                 │
│ • website_url   │  │ • create_*()    │  │ Lifecycle:      │
│ • icons         │  │ • send_*_*()    │  │ • Per-request   │
│ • settings      │  │                 │  │ • Immutable     │
│                 │  │ Lifecycle:      │  │ • Unique ID     │
│ Lifecycle:      │  │ • Per session   │  │                 │
│ • Set once at   │  │ • Mutable state │  │ Use Cases:      │
│   startup       │  │ • Shared across │  │ • Logging       │
│ • Immutable     │  │   requests      │  │ • Tracing       │
│ • Read-only     │  │                 │  │ • Debugging     │
│                 │  │ Use Cases:      │  │ • Correlation   │
│ Use Cases:      │  │ • Notifications │  │                 │
│ • Branding      │  │ • Progress      │  │                 │
│ • Documentation │  │ • LLM sampling  │  │                 │
│ • Self-describe │  │ • List changes  │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘

Design Rationale:
• Separation of Concerns: Each group has distinct purpose
• Immutability: fastmcp and request_context are read-only
• Lifecycle Alignment: Groups match their data lifecycle
• FastMCP Compatibility: Matches official SDK structure
```

---

## Diagram 8: Phase Progression

```
┌─────────────────────────────────────────────────────────────────┐
│                   Implementation Phases                         │
└─────────────────────────────────────────────────────────────────┘

Phase 1 (Week 1-2): Foundation
┌─────────────────────────────────────────────────────────────────┐
│ Context Object                                                  │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│ │ fastmcp      │  │ session      │  │ request_*    │          │
│ ├──────────────┤  ├──────────────┤  ├──────────────┤          │
│ │ ✅ name      │  │ ❌ client_*  │  │ ✅ request_id│          │
│ │ ✅ version   │  │ ⚠️ send_*    │  │ ❌ meta      │          │
│ │ ✅ desc*     │  │    (stubbed) │  │ ❌ lifespan* │          │
│ │ ❌ instr*    │  │              │  │              │          │
│ │ ❌ website*  │  │              │  │              │          │
│ └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
Phase 2 (Week 3): Notifications & Capabilities
┌─────────────────────────────────────────────────────────────────┐
│ Context Object                                                  │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│ │ fastmcp      │  │ session      │  │ request_*    │          │
│ ├──────────────┤  ├──────────────┤  ├──────────────┤          │
│ │ ✅ name      │  │ ✅ client_*  │  │ ✅ request_id│          │
│ │ ✅ version   │  │ ✅ send_*    │  │ ✅ meta      │          │
│ │ ✅ desc*     │  │    (impl)    │  │ ❌ lifespan* │          │
│ │ ❌ instr*    │  │              │  │              │          │
│ │ ❌ website*  │  │              │  │              │          │
│ └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
Phase 3 (Week 4): Metadata & Lifecycle
┌─────────────────────────────────────────────────────────────────┐
│ Context Object                                                  │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│ │ fastmcp      │  │ session      │  │ request_*    │          │
│ ├──────────────┤  ├──────────────┤  ├──────────────┤          │
│ │ ✅ name      │  │ ✅ client_*  │  │ ✅ request_id│          │
│ │ ✅ version   │  │ ✅ send_*    │  │ ✅ meta      │          │
│ │ ✅ desc*     │  │    (impl)    │  │ ✅ lifespan* │          │
│ │ ✅ instr*    │  │              │  │              │          │
│ │ ✅ website*  │  │              │  │              │          │
│ │ ✅ icons     │  │              │  │              │          │
│ │ ✅ settings  │  │              │  │              │          │
│ └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘

Legend:
✅ Implemented
⚠️ Stubbed (placeholder)
❌ Not yet implemented

Key Insight: Incremental feature addition without breaking changes
```

---

## Diagram 9: Cross-Repository Consistency

```
┌─────────────────────────────────────────────────────────────────┐
│          TypeScript Repository (simply-mcp)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  interface Context {                                           │
│    readonly fastmcp: FastMCPInfo;                              │
│    readonly session: Session;                                  │
│    readonly request_context: RequestContext;                   │
│  }                                                              │
│                                                                 │
│  interface Session {                                            │
│    send_log_message(...): Promise<void>;                       │
│    create_message(...): Promise<CreateMessageResult>;          │
│    send_progress_notification(...): Promise<void>;             │
│    // ... other methods                                        │
│  }                                                              │
│                                                                 │
│  function generateRequestId(): string {                        │
│    return randomUUID();  // UUID v4                            │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ API Parity
                              │ (Same semantics, syntax)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          Python Repository (simply-mcp-py)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  @dataclass(frozen=True)                                        │
│  class Context:                                                 │
│      fastmcp: FastMCPInfo                                       │
│      session: Session                                           │
│      request_context: RequestContext                            │
│                                                                 │
│  class Session(ABC):                                            │
│      async def send_log_message(...) -> None: ...              │
│      async def create_message(...) -> dict: ...                │
│      async def send_progress_notification(...) -> None: ...    │
│      # ... other methods                                       │
│                                                                 │
│  def generate_request_id() -> str:                             │
│      return str(uuid.uuid4())  # UUID v4                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Alignment Guarantees:
┌─────────────────────────────────────────────────────────────────┐
│ Property Names:      snake_case in both (request_id, not req*)  │
│ Method Names:        snake_case in both (send_log_message)     │
│ Async Patterns:      async/await in both                       │
│ Request ID Format:   UUID v4 in both                           │
│ Error Messages:      Identical text in both                    │
│ Type Safety:         Strong typing in both                     │
│ Immutability:        readonly/frozen in both                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Diagram 10: Testing Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                      Test Pyramid                               │
│                                                                 │
│                         ┌────────┐                              │
│                         │  E2E   │                              │
│                         │ Tests  │                              │
│                         └────────┘                              │
│                    ┌──────────────────┐                         │
│                    │   Integration    │                         │
│                    │      Tests       │                         │
│                    └──────────────────┘                         │
│              ┌────────────────────────────────┐                 │
│              │        Unit Tests              │                 │
│              │                                │                 │
│              └────────────────────────────────┘                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Unit Tests (tests/context.test.ts, tests/test_context.py):
┌─────────────────────────────────────────────────────────────────┐
│ ✓ Context object creation                                      │
│ ✓ Property access (fastmcp.name, etc.)                         │
│ ✓ Immutability enforcement (readonly/frozen)                   │
│ ✓ Request ID uniqueness (1000+ IDs, no collisions)            │
│ ✓ Request ID format (UUID v4 regex match)                     │
│ ✓ Session method signatures                                    │
│ ✓ Stubbed methods log warnings                                 │
└─────────────────────────────────────────────────────────────────┘

Integration Tests (tests/integration/context-injection.test.ts):
┌─────────────────────────────────────────────────────────────────┐
│ ✓ Tool handler with context parameter receives valid context   │
│ ✓ Tool handler without context parameter still works           │
│ ✓ Prompt handler with context parameter receives valid context │
│ ✓ Prompt handler without context parameter still works         │
│ ✓ Resource handler with context parameter receives valid context│
│ ✓ Resource handler without context parameter still works       │
│ ✓ Context properties accessible in handlers                    │
│ ✓ Request IDs are unique across concurrent requests            │
└─────────────────────────────────────────────────────────────────┘

E2E Tests (tests/e2e/):
┌─────────────────────────────────────────────────────────────────┐
│ ✓ Full server lifecycle with context system                    │
│ ✓ Multiple concurrent requests with different request IDs      │
│ ✓ Cross-repo parity verification (TS vs PY)                    │
└─────────────────────────────────────────────────────────────────┘

Coverage Target: > 90%
```

---

**End of Diagrams Document**
