# Maintainer Action Checklist

**Based on**: Simply-MCP v3.2 Beta Testing
**Date**: October 23, 2025
**Status**: Pending Implementation

---

## 🔴 CRITICAL - Do Before Release

### [ ] Issue #2: Update README Documentation Links

**File**: `README.md`
**Effort**: 5 minutes
**Impact**: Fixes broken links for all npm users

**Task**: Find and replace 3 occurrences of local documentation paths with GitHub URLs

**Location 1**: Line ~565 (Interface API Deep Dive section)
```diff
- [Learn more →](docs/guides/INTERFACE_API_REFERENCE.md)
+ [Learn more →](https://github.com/Clockwork-Innovations/simply-mcp-ts/blob/main/docs/guides/INTERFACE_API_REFERENCE.md)
```

**Location 2**: Line ~683 (After code example)
```diff
- See the [Interface API Reference](./docs/guides/INTERFACE_API_REFERENCE.md) for complete documentation
+ See the [Interface API Reference](https://github.com/Clockwork-Innovations/simply-mcp-ts/blob/main/docs/guides/INTERFACE_API_REFERENCE.md) for complete documentation
```

**Location 3**: Line ~909 (Documentation Index)
```diff
- [Interface API Reference](./docs/guides/INTERFACE_API_REFERENCE.md) - Complete Interface API documentation
+ [Interface API Reference](https://github.com/Clockwork-Innovations/simply-mcp-ts/blob/main/docs/guides/INTERFACE_API_REFERENCE.md) - Complete Interface API documentation
```

**Verification**:
- [ ] All 3 links updated
- [ ] Links start with `https://github.com/...`
- [ ] Links include `/blob/main/docs/guides/...`
- [ ] No broken markdown syntax
- [ ] Test: Build/render README to verify formatting

**DO NOT**: Add `docs/` to `package.json` `files` field (that was considered but rejected - see analysis)

---

## 🟠 HIGH - Do This Sprint

### [ ] Issue #1: Fix False Positive Resource Warnings

**File**: `src/api/interface/parser.ts` or `src/api/interface/adapter.ts`
**Effort**: ~30 minutes
**Impact**: Cleaner dry-run output, less developer confusion

**Task**: Update detection logic to not warn about implemented resources

**Current Behavior**:
```
npx simply-mcp run pokedex.ts --dry-run
...
Warnings:
  - Resource 'pokemon://database/overview' is dynamic and requires implementation as property 'pokemon://database/overview'
```

**Expected Behavior**: No warning if resource is properly implemented

**Suggested Fix**:
1. Check if resource implementation exists before warning
2. Only warn if implementation is missing AND dynamic: true
3. Or change warning to info-level message

**Testing**:
- [ ] Run with Pokedex example (should have no warnings)
- [ ] Run with incomplete resource (should warn)
- [ ] Verify resources still work correctly

**Reference**: See `pokedex.ts` for working example with 4 resources

---

### [ ] Issue #3: Expand Interface API Documentation

**File**: `README.md` (Interface API section) or create `docs/guides/INTERFACE_API_GETTING_STARTED.md`
**Effort**: ~2 hours
**Impact**: Increased adoption of the cleanest API style

**Task**: Enhance Interface API section with examples and patterns

**Current Gap**:
- Only one tool example (calculator)
- No multi-tool examples
- No resource implementation patterns
- No prompt examples
- Missing naming conventions
- No static vs dynamic guide

**Suggested Content**:

#### 1. Multi-Tool Example
```typescript
// Show 2-3 tools with different parameter types
- Simple tool
- Optional parameters
- Typed unions
- Return types
```

#### 2. Resource Patterns
```typescript
// Show both static and dynamic
interface StaticResource extends IResource {
  uri: 'data://config';
  data: { ... };
}

class MyServer {
  ['data://config'] = async () => { ... };
}
```

#### 3. Prompt Patterns
```typescript
// Show static and dynamic
interface StaticPrompt extends IPrompt {
  template: 'Text with {placeholder}'
}

interface DynamicPrompt extends IPrompt {
  dynamic: true;
}

class MyServer {
  dynamicPrompt = (args) => { ... };
}
```

#### 4. Naming Conventions Table
```
Tool name (interface): snake_case → get_weather
Method name (class): camelCase → getWeather
Prompt name: snake_case → weather_report
Method name: camelCase → weatherReport
Resource URI: scheme://path → config://server
Method name: [uri] property notation
```

#### 5. Common Mistakes
- Wrong casing on tool names
- Mismatched method names
- Forgetting dynamic: true for runtime logic
- Confusion about static resource implementation

**Reference**: See `INTERFACE_API_QUICK_REFERENCE.md` (created during testing) as template

**Testing**:
- [ ] Examples compile without errors
- [ ] Examples run with `npx simply-mcp run`
- [ ] Type checking passes with strict mode
- [ ] Dry-run output is clean

---

### [ ] Issue #4: Document CLI Options

**File**: `README.md` (add CLI Reference section)
**Effort**: ~1 hour
**Impact**: Better visibility of available features

**Task**: Add comprehensive CLI documentation

**Current Mentions** (not explained):
- `--watch`
- `--inspect`
- `--http`
- `--port`
- `--style`
- `--dry-run`
- `--config`

**Suggested Section**:

```markdown
## CLI Reference

### Running Servers

#### Basic Usage
npx simply-mcp run server.ts

#### Watch Mode (Auto-reload)
npx simply-mcp run server.ts --watch
- Auto-restarts server when files change
- Useful during development

#### Validation Only
npx simply-mcp run server.ts --dry-run
- Validates configuration without starting
- Shows tools, prompts, resources

#### HTTP Transport
npx simply-mcp run server.ts --http --port 3000
- Stateful HTTP server with SSE
- Default: stdio (stdin/stdout)

#### Debug Mode
npx simply-mcp run server.ts --inspect
- Enable Node.js inspector
- Connect with Chrome DevTools

#### Explicit API Style
npx simply-mcp run server.ts --style interface
- Force Interface API (usually auto-detected)
- Options: interface, decorator, functional
```

**Testing**:
- [ ] All documented flags work as described
- [ ] Examples are accurate
- [ ] Help output (`--help`) is consistent

---

## 🟡 MEDIUM - Next Sprint

### [ ] Issue #5: Create Configuration Guide

**File**: Create `docs/guides/CONFIGURATION.md` or section in README
**Effort**: ~1.5 hours
**Impact**: Clearer onboarding for Claude CLI integration

**Task**: Document MCP configuration options

**Topics to Cover**:

1. **Project-Scoped Configuration (.mcp.json)**
   - Location: project root
   - Usage: `claude --mcp-config .mcp.json`
   - Format example

2. **User Global Configuration (~/.claude.json)**
   - Location: home directory
   - Format example
   - Precedence notes

3. **Inline Configuration (--mcp-config flag)**
   - CLI syntax: `claude --mcp-config config.json`
   - JSON string format
   - Use cases

4. **Transport Types**
   - Stdio (default)
   - HTTP stateful
   - HTTP stateless (serverless)
   - Examples for each

5. **Configuration Priority**
   - Which config takes precedence
   - Order of evaluation
   - Conflict resolution

6. **Real Examples**
   ```json
   // stdio transport
   {
     "mcpServers": {
       "pokedex": {
         "command": "npx",
         "args": ["simply-mcp", "run", "pokedex.ts"]
       }
     }
   }

   // HTTP transport
   {
     "mcpServers": {
       "api": {
         "command": "npx",
         "args": ["simply-mcp", "run", "api.ts", "--http", "--port", "3000"]
       }
     }
   }
   ```

**Testing**:
- [ ] All examples work as documented
- [ ] Precedence rules are correct
- [ ] Tested with Claude CLI

---

## ✅ OPTIONAL - Nice to Have

### [ ] Add Link Checker to CI/CD
- Check all `[text](link)` references in markdown
- Verify they don't point to non-existent local files
- Tool suggestion: `markdown-link-check` or similar

### [ ] Create Quick Start Video
- Show Interface API example
- Demonstrate CLI usage
- Show Claude CLI integration

### [ ] Document Best Practices
- Error handling patterns
- Resource organization for 10+ tools
- Performance optimization tips

---

## Progress Tracking

### Pre-Release (Before v3.2 ships)
- [ ] Issue #2 - README links (5 min) - **CRITICAL**

### v3.2.1 Patch Release (1-2 weeks)
- [ ] Issue #1 - Warning fixes (30 min)
- [ ] Issue #3 - Expand docs (2 hours)
- [ ] Issue #4 - CLI reference (1 hour)

### v3.3 Minor Release (Next sprint)
- [ ] Issue #5 - Config guide (1.5 hours)
- [ ] Nice-to-have items

---

## Testing Artifacts Available

All testing work is documented in `/mnt/Shared/cs-projects/test-simp-ts/`:

- `pokedex.ts` - Complete working example (use as test case)
- `INTERFACE_API_QUICK_REFERENCE.md` - Template for docs expansion
- `ANALYSIS_INCLUDE_DOCS_OR_NOT.md` - Decision justification
- `FINAL_RECOMMENDATIONS.md` - Complete summary
- All other documentation in that directory

---

## Questions?

Refer to:
1. `FINAL_RECOMMENDATIONS.md` - High-level overview
2. `ISSUES_FOUND.md` - Detailed issue analysis
3. `TEST_REPORT.md` - Comprehensive test results
4. `CRITICAL_FINDING_MISSING_DOCS.md` - Issue #2 specifics

---

## Sign-Off

Beta testing completed: ✅
All issues documented: ✅
Solutions provided: ✅
Ready for implementation: ✅

**Estimated Total Effort**: 5 hours across all issues
**Estimated Quality Improvement**: Critical → 5-star

