# Beta Tester Checklist - Simply-MCP v3.2

This checklist guides beta testers through comprehensive testing of simply-mcp v3.2.

---

## Setup (5 minutes)

- [ ] Clone/download simply-mcp v3.2
- [ ] Install dependencies: `npm install`
- [ ] Verify Node.js version >= 20.0.0
- [ ] Check Claude CLI is installed: `which claude`
- [ ] Run `npm run test:unit` - all tests pass?

---

## Interface API Testing (20 minutes)

### Basic Tool
- [ ] Create simple tool (single parameter, string return)
- [ ] Tool appears in dry-run output
- [ ] Tool can be called via Claude CLI
- [ ] Parameter is correctly passed
- [ ] Return value is correctly formatted

### Multiple Tools
- [ ] Create 3+ tools with different parameter types
- [ ] Test optional parameters
- [ ] Test typed unions (string | number)
- [ ] Test array parameters
- [ ] Each tool shows in `--dry-run`

### Static Prompts
- [ ] Create prompt with `template` field
- [ ] Check dry-run shows template args
- [ ] Prompt template works with placeholders
- [ ] Optional args are handled correctly

### Dynamic Prompts
- [ ] Create prompt with `dynamic: true`
- [ ] Implement as method in server class
- [ ] Method receives arguments correctly
- [ ] Dynamic prompt works with Claude

### Static Resources
- [ ] Create resource with `data` field in interface
- [ ] Check if works without method implementation
- [ ] Check if warnings appear in dry-run
- [ ] Verify resource is accessible to Claude

### Dynamic Resources
- [ ] Create resource with `dynamic: true`
- [ ] Implement using `[uri]` property syntax
- [ ] Test with JSON response
- [ ] Test with HTML response
- [ ] Verify async/await works

---

## CLI Testing (15 minutes)

### Run Command
- [ ] `npx simply-mcp run server.ts` starts successfully
- [ ] Server auto-detects Interface API style
- [ ] Server listens on stdio
- [ ] CTRL+C stops gracefully

### Dry-Run
- [ ] `--dry-run` flag validates without running
- [ ] Output shows all tools
- [ ] Output shows all prompts
- [ ] Output shows all resources
- [ ] Output shows server version
- [ ] Warnings section appears (even if false positives)

### Watch Mode
- [ ] `--watch` starts server
- [ ] Modify source file
- [ ] Server reloads automatically
- [ ] Changes are available immediately

### HTTP Transport
- [ ] `--http --port 3000` starts HTTP server
- [ ] Server listens on `http://localhost:3000`
- [ ] Can be accessed from Claude CLI

### Configuration
- [ ] `--config simplymcp.config.json` loads config
- [ ] Config file format is correct
- [ ] Server respects configuration

---

## Claude CLI Integration (20 minutes)

### Setup
- [ ] Create `.mcp.json` config file
- [ ] Config format is valid JSON
- [ ] Server path is correct/absolute
- [ ] `--strict-mcp-config` is supported

### Tool Discovery
- [ ] `claude --mcp-config .mcp.json` starts
- [ ] Claude lists all available tools
- [ ] Claude lists all resources
- [ ] Tool descriptions are visible
- [ ] Parameter types are shown

### Tool Execution
- [ ] Call tool with simple parameters
- [ ] Tool receives parameters correctly
- [ ] Tool returns expected result
- [ ] Result is formatted by Claude
- [ ] Error messages are clear

### Permissions
- [ ] First tool call asks for permission
- [ ] `--permission-mode bypassPermissions` allows all tools
- [ ] `--dangerously-skip-permissions` flag works
- [ ] Default behavior is secure

### Multiple Servers
- [ ] Add 2+ servers to .mcp.json
- [ ] Both servers are discoverable
- [ ] Tools from each server are available
- [ ] No conflicts between servers

---

## Type Safety Testing (10 minutes)

### TypeScript Support
- [ ] IDE provides IntelliSense for tool params
- [ ] IDE shows return type suggestions
- [ ] Compile-time errors for wrong types
- [ ] No TypeScript errors with `strict: true`

### Parameter Validation
- [ ] Wrong parameter type shows error
- [ ] Missing required parameter shows error
- [ ] Optional parameter works when omitted
- [ ] Extra parameters are ignored

---

## Documentation Review (10 minutes)

### README
- [ ] Interface API section is clear
- [ ] Examples run without modification
- [ ] All CLI commands are documented
- [ ] Claude CLI integration explained

### Guides
- [ ] Interface API reference exists and is complete
- [ ] Decorator API guide is thorough
- [ ] Functional API guide is clear
- [ ] Builder API documentation is detailed

### Type Definitions
- [ ] ITool interface is documented
- [ ] IPrompt interface is documented
- [ ] IResource interface is documented
- [ ] IServer interface is documented

---

## Edge Cases (15 minutes)

### Error Handling
- [ ] Tool throws error correctly
- [ ] Error message propagates to Claude
- [ ] Tool crashes don't crash server
- [ ] Missing required parameter shows error

### Performance
- [ ] Tool with 100 parameters works
- [ ] Tool returning large JSON (1MB) works
- [ ] Multiple concurrent tool calls work
- [ ] No memory leaks after 100 calls

### Special Cases
- [ ] Tool returning `null` is handled
- [ ] Tool returning empty array is handled
- [ ] Tool returning nested objects works
- [ ] Tool with setTimeout/promises works

### Unicode & Encoding
- [ ] Tool parameters with Unicode work
- [ ] Resources with non-ASCII chars work
- [ ] Emoji in descriptions handled
- [ ] HTML with special chars handled

---

## Security Testing (10 minutes)

### Input Validation
- [ ] Tool validates parameters before use
- [ ] SQL injection attempts are handled
- [ ] Command injection is prevented
- [ ] Large inputs don't cause issues

### Permissions
- [ ] Tools require permission by default
- [ ] Permissions can be granted selectively
- [ ] Permission lists work with wildcards
- [ ] MCP server runs in isolated process

### Configuration
- [ ] .mcp.json doesn't expose credentials
- [ ] Environment variables can be used
- [ ] Sensitive data not logged
- [ ] Error messages don't leak info

---

## Compatibility Testing (10 minutes)

### Node.js Versions
- [ ] Works with Node 20.x
- [ ] Works with Node 21.x
- [ ] Works with Node 22.x
- [ ] Graceful error on Node <20

### OS Compatibility
- [ ] Works on macOS
- [ ] Works on Linux
- [ ] Works on Windows
- [ ] Path handling is OS-agnostic

### Dependencies
- [ ] No dependency conflicts
- [ ] Works with npm 10+
- [ ] Works with pnpm 8+
- [ ] Works with yarn 4+

---

## Reporting Issues

For each issue found, create a report including:

### Required
- [ ] Severity level (Critical/High/Medium/Low)
- [ ] Short title
- [ ] Detailed description
- [ ] Steps to reproduce
- [ ] Expected behavior
- [ ] Actual behavior
- [ ] Environment (OS, Node version, npm version)

### Optional
- [ ] Screenshots or error logs
- [ ] Minimal reproducible example
- [ ] Suggested fix
- [ ] Workaround (if available)

---

## Testing Summary Template

```markdown
# Simply-MCP v3.2 Beta Test Report

**Tester**: [Your Name]
**Date**: [Date]
**Environment**: Node [version], [OS], npm [version]
**Test Duration**: [hours/minutes]

## Features Tested
- [ ] Interface API
- [ ] Decorator API
- [ ] Functional API
- [ ] MCP Builder API
- [ ] CLI Tools
- [ ] Claude CLI Integration
- [ ] Documentation

## Overall Assessment
[Your rating: 1-5 stars]

## What Works Well
1. ...
2. ...
3. ...

## Issues Found
| # | Title | Severity |
|---|-------|----------|
| 1 | ... | Medium |

## Recommendations
1. ...
2. ...

## Additional Notes
...
```

---

## Success Criteria

✅ **All** of the following should be true:

- [ ] All tools can be created and executed
- [ ] All prompts work (static and dynamic)
- [ ] All resources are accessible
- [ ] CLI commands work as documented
- [ ] Claude CLI integration is seamless
- [ ] No critical bugs found
- [ ] Performance is acceptable (< 1s startup)
- [ ] Type safety is enforced
- [ ] Documentation is clear
- [ ] No security vulnerabilities identified

---

## Time Allocation

**Total Testing Time**: ~95 minutes

- Setup: 5 min
- Interface API: 20 min
- CLI Testing: 15 min
- Claude Integration: 20 min
- Type Safety: 10 min
- Edge Cases: 15 min
- Security: 10 min
- Compatibility: 10 min
- Reporting: 10 min

---

## Advanced Testing (Optional)

For beta testers with extra time:

- [ ] Test with VS Code/IDE IntelliSense
- [ ] Test with WebStorm/JetBrains IDE
- [ ] Test with Vim/Neovim + LSP
- [ ] Test with ESLint/Prettier integration
- [ ] Test with GitHub Copilot
- [ ] Create server with 50+ tools
- [ ] Test in Docker container
- [ ] Test with continuous deployment
- [ ] Test in serverless environment (AWS Lambda)
- [ ] Load test with 1000+ concurrent requests

---

## Resources

- **GitHub**: https://github.com/Clockwork-Innovations/simply-mcp-ts
- **NPM**: https://www.npmjs.com/package/simply-mcp
- **Docs**: [See README for links]
- **Examples**: 27+ production examples in repo
- **Discussions**: GitHub Discussions for questions

---

## Thank You!

Your testing helps make simply-mcp better for everyone.

**Report issues here**: [GitHub Issues URL]

**Share feedback here**: [GitHub Discussions URL]

