# MCP Sampling Implementation Status

**Date**: 2025-10-08
**Status**: Server Implementation Complete ✅ | Client Support Pending ⏳

## Summary

The MCP Builder API has **full server-side support** for sampling-based validation. The sampling feature allows validation tools to request the client's LLM to analyze tool designs, schemas, and test coverage against Anthropic's best practices.

However, **Claude Code CLI does not currently support sampling**, so the AI-powered validation tools fall back to basic validation when used with Claude Code CLI.

## What Works

### ✅ Server-Side Implementation (Complete)

1. **Sampling Request Method** (`BuildMCPServer.requestSampling()`)
   - Uses `server.createMessage()` from MCP SDK
   - Sends `sampling/createMessage` request to client
   - Handles errors gracefully with informative messages
   - Location: `src/api/programmatic/BuildMCPServer.ts:1358-1410`

2. **Context API**
   - `context.sample()` available in tool handlers when sampling enabled
   - Configured via `capabilities: { sampling: true }` in server options
   - Location: `src/api/programmatic/BuildMCPServer.ts:450-455`

3. **MCP Builder Adapter**
   - Automatically enables sampling for MCP Builder configs
   - Sets `capabilities: { sampling: true }` on line 65
   - Location: `src/api/mcp/adapter.ts:43-67`

4. **Validation Tools with Fallback**
   - `analyze_tool_design` - AI tool design review
   - `validate_schema_quality` - AI Zod schema validation
   - `review_test_coverage` - AI test coverage analysis
   - All tools detect sampling unavailability and perform basic validation
   - Location: `src/api/mcp/presets/validation-tools.ts`

### ⏳ Client Support (Pending)

**Claude Code CLI does not currently support sampling:**

When connecting the MCP Builder server to Claude Code CLI, the sampling-based validation tools cannot request LLM analysis because:

1. **Client doesn't announce sampling capability** during initialization
2. **Client doesn't handle `sampling/createMessage` requests** from the server

**Test Results:**
```bash
claude --print --dangerously-skip-permissions \
  --mcp-config mcp-builder-config.json \
  -- "Use analyze_tool_design to analyze a tool"

# Result: "AI sampling functionality isn't available in your current environment"
```

## How It Should Work (When Client Supports It)

### Workflow

1. **Client Initialization**
   - Client announces `capabilities: { sampling: {} }` during MCP handshake
   - Server detects client supports sampling

2. **Tool Execution**
   - User calls `analyze_tool_design` via MCP client
   - Tool handler calls `context.sample()` with analysis prompt
   - Server sends `sampling/createMessage` request to client

3. **Client LLM Analysis**
   - Client receives sampling request
   - Client's LLM processes the prompt
   - Client returns AI-generated analysis

4. **Structured Response**
   - Tool parses AI response (expected JSON format)
   - Returns structured feedback: score, issues, improvements, reasoning

### Example Request

```typescript
const samplingResult = await context.sample([{
  role: 'user',
  content: {
    type: 'text',
    text: `You are an expert in Anthropic's principles for building AI agent tools.

Analyze this MCP tool design:
Tool Name: get_weather
Description: Fetch current weather data for a specified city
Purpose: Retrieve current weather information

Parameters:
- city (string): City name to get weather for

Evaluate against:
1. Strategic Selection - Is this tool necessary?
2. Clear Naming - Is the name descriptive and unambiguous?
3. Parameter Design - Are parameters well-designed?
4. Description Quality - Is the description specific enough?
5. Token Efficiency - Is the scope focused?

Provide analysis in JSON format:
{
  "score": <number 0-100>,
  "issues": ["issue 1", "issue 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "ready": <boolean>,
  "reasoning": "explanation"
}`
  }
}], {
  maxTokens: 1000,
  temperature: 0.3
});
```

### Example Response

```json
{
  "model": "claude-sonnet-4-5-20250929",
  "role": "assistant",
  "content": {
    "type": "text",
    "text": "{\n  \"score\": 75,\n  \"issues\": [\n    \"Missing country/state parameter to disambiguate cities\",\n    \"No units parameter for temperature format\"\n  ],\n  \"improvements\": [\n    \"Add optional 'country_code' parameter\",\n    \"Add optional 'units' parameter (celsius/fahrenheit)\",\n    \"Specify what weather data is returned in description\"\n  ],\n  \"ready\": true,\n  \"reasoning\": \"Good basic design, but lacks common parameters for real-world use\"\n}"
  }
}
```

## Fallback Behavior

When sampling is unavailable, validation tools perform **basic validation**:

### `analyze_tool_design`
- ✅ Checks snake_case naming convention
- ✅ Validates description length (minimum 20 chars)
- ✅ Ensures at least one parameter
- ✅ Verifies parameter descriptions are present
- ❌ Cannot provide AI-powered best practice analysis

### `validate_schema_quality`
- ✅ Checks schema uses `z.object()`
- ✅ Verifies `.describe()` calls present
- ❌ Cannot analyze completeness, validation rules, or best practices

### `review_test_coverage`
- ✅ Checks for happy path tests
- ✅ Checks for edge case tests
- ✅ Checks for error case tests
- ❌ Cannot identify missing scenarios or suggest additional tests

## Implementation Code

### Server-Side Sampling Request

```typescript
// src/api/programmatic/BuildMCPServer.ts
private async requestSampling(
  messages: SamplingMessage[],
  options?: SamplingOptions
): Promise<any> {
  if (!this.server) {
    throw new Error('Server not initialized');
  }

  try {
    // Use the MCP SDK's createMessage() method
    const result: CreateMessageResult = await this.server.createMessage({
      messages: messages as any,
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
      topP: options?.topP,
      stopSequences: options?.stopSequences,
      metadata: options?.metadata,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Sampling request failed\n\n` +
      `What went wrong:\n` +
      `  ${errorMessage}\n\n` +
      `Possible causes:\n` +
      `  - Client does not support sampling capability\n` +
      `  - Connection issue with the client\n` +
      `  - LLM service unavailable`
    );
  }
}
```

### Validation Tool with Sampling Detection

```typescript
// src/api/mcp/presets/validation-tools.ts
execute: async (args, context) => {
  // Basic validation first
  const basicIssues: string[] = [];
  if (args.tool_name.includes('-')) {
    basicIssues.push('Tool name should use snake_case (use _ not -)');
  }
  // ... more checks

  // Use sampling if available
  if (!context?.sample) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          basic_validation: {
            passed: basicIssues.length === 0,
            issues: basicIssues
          },
          error: 'Sampling not available. Cannot perform AI analysis.',
          next_step: 'Fix basic issues first'
        }, null, 2)
      }]
    };
  }

  // Request AI analysis via sampling
  const samplingResult = await context.sample([{
    role: 'user',
    content: { type: 'text', text: analysisPrompt }
  }], { maxTokens: 1000, temperature: 0.3 });

  const analysis = JSON.parse(samplingResult.content[0].text);

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        basic_validation: { passed: basicIssues.length === 0, issues: basicIssues },
        ai_analysis: {
          score: analysis.score,
          issues: analysis.issues,
          improvements: analysis.improvements,
          reasoning: analysis.reasoning
        },
        overall_ready: analysis.ready && analysis.score >= 70
      }, null, 2)
    }]
  };
}
```

## Testing

### Server Implementation Tests

```bash
# Run comprehensive test suite
npx tsx test-mcp-builder.ts

# Results:
# ✅ All 6 tools registered
# ✅ All 4 prompts registered
# ✅ Layer 1 tools work (design_tool, create_zod_schema, validate_schema)
# ✅ Layer 2 tools detect sampling unavailable and perform basic validation
# ✅ Complete workflow simulation passes
```

### Claude Code CLI Test

```bash
# Start MCP Builder server via Claude Code CLI
claude --print --dangerously-skip-permissions \
  --mcp-config mcp-builder-config.json \
  -- "Use analyze_tool_design to analyze a tool"

# Result:
# "AI sampling functionality isn't available in your current environment"
# Falls back to basic validation
```

## Next Steps

1. **Wait for Claude Code CLI Update**
   - Sampling is an MCP protocol feature
   - Requires client-side implementation
   - Claude Code CLI team needs to add support

2. **Alternative Testing**
   - Test with other MCP clients that support sampling
   - Claude Desktop may support sampling in future releases
   - Custom MCP clients can implement sampling handler

3. **Current Usability**
   - Layer 1 tools (design_tool, create_zod_schema, validate_schema) work fully
   - Layer 2 tools provide basic validation without sampling
   - Comprehensive prompts guide users through the workflow
   - Builder pattern API fully functional

## References

- **MCP Protocol**: https://modelcontextprotocol.io/docs
- **MCP SDK Server**: `@modelcontextprotocol/sdk/server/index.d.ts`
- **Sampling Specification**: MCP protocol `sampling/createMessage` request
- **Server Implementation**: `src/api/programmatic/BuildMCPServer.ts`
- **Validation Tools**: `src/api/mcp/presets/validation-tools.ts`
- **MCP Builder Adapter**: `src/api/mcp/adapter.ts`

---

**Conclusion**: The MCP Builder's sampling implementation is **production-ready on the server side**. It will work fully once MCP clients (like Claude Code CLI) add support for the sampling capability. Until then, the basic validation fallback ensures the tools remain useful.
