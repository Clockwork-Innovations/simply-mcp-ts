# MCP Test Findings

## Summary
- ✅ Dry-run validation succeeded using `node dist/src/cli/index.js run /tmp/mcp-test/server.ts --dry-run`.
- 📌 Identified documentation mismatch in Quick Start guide regarding tool parameter definitions.
- ⚠️ Prompt invocation from MCP clients remains unclear; Codex CLI could not enumerate or execute server prompts.

## Details

### 1. Quick Start guide contradicts CLI validation
- Location: `docs/guides/QUICK_START.md`, sections “Your First Server” and “Complete Server Example”.
- Issue: Examples define tool parameters directly as TypeScript primitives (e.g., `params: { name: string }`).
- Impact: Running those examples verbatim fails with `ERROR: Parameter 'name' in GreetTool uses a direct type instead of IParam.`
- Cause: CLI enforces `IParam`-based definitions, but Quick Start does not mention the requirement.
- Fix suggestion: Update the guide so every tool parameter is defined via `IParam` interfaces, or clarify that primitives are only allowed in earlier versions.

### 2. Prompt usage unclear with Codex CLI
- Steps: Configured inline MCP server via `codex exec` and successfully called the `greet` tool and resource.
- Observation: Requests to list or invoke prompts (e.g., `List the available prompt ids for the hello server`, `call_mcp_prompt` on `motivate`) did not execute through the MCP transport; Codex fell back to repository search or returned `Unknown resource: prompt://...`.
- Impact: Difficult to verify prompt functionality despite CLI dry-run reporting `1 prompt`.
- Hypothesis: Either prompts require a different invocation pattern that is not documented, or the CLI does not expose prompt metadata in a discoverable way.
- Action: Documentation should include concrete client-side examples (Codex/Claude CLI) for listing and invoking prompts, or address current limitations.

