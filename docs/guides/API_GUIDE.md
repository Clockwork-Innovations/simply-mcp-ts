# API Styles Guide

Simply MCP supports 4 API styles. Choose the one that fits your needs.

## Quick Comparison

| Aspect | Functional | Decorator | Interface | MCPBuilder |
|--------|-----------|-----------|-----------|-----------|
| **Best for** | Simple scripts | Class-based code | Type-strict teams | Complex builds |
| **Setup** | 3 lines | 2 decorators | Full types | Builder calls |
| **Example file** | `single-file-basic.ts` | `class-basic.ts` | `interface-minimal.ts` | `mcp-builder-foundation.ts` |
| **Verbosity** | ⭐ Minimal | ⭐⭐ Low | ⭐⭐⭐⭐ High | ⭐⭐ Low |
| **Type safety** | ⭐⭐⭐ Good | ⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐ Good |

## 1. Functional API

**Best for:** Quick prototypes, simple scripts, JavaScript developers.

```bash
# See the working example
npx tsx examples/single-file-basic.ts
cat examples/single-file-basic.ts
```

**Pros:**
- Minimal boilerplate
- Easy to learn
- Good TypeScript support

**Cons:**
- No type safety for schema

**When to use:**
- Small, single-file servers
- Learning MCP for the first time
- Prototyping features

---

## 2. Decorator API

**Best for:** OOP developers, organized code structures, class-based architecture.

```bash
# See the working example
npx tsx examples/class-basic.ts
cat examples/class-basic.ts
```

**Pros:**
- Clean, readable syntax
- Organized by class
- Good IDE support

**Cons:**
- Requires decorators (needs TypeScript)
- Slightly more boilerplate than functional

**When to use:**
- Medium to large servers
- Team projects with OOP conventions
- When you prefer organizing code by class

---

## 3. Interface API

**Best for:** Type-safety conscious teams, strict development environments.

```bash
# See the working example
npx tsx examples/interface-minimal.ts
cat examples/interface-minimal.ts
```

**Pros:**
- Strictest type checking
- Best for catching errors at compile time
- Excellent IDE autocomplete

**Cons:**
- Most verbose
- Steepest learning curve
- More configuration required

**When to use:**
- Critical applications requiring high reliability
- Teams with strict TypeScript standards
- Large enterprise projects

---

## 4. MCPBuilder

**Best for:** Dynamic server construction, programmatic builds, builder patterns.

```bash
# See the working example
npx tsx examples/mcp-builder-foundation.ts
cat examples/mcp-builder-foundation.ts
```

**Pros:**
- Fluent, readable API
- Great for programmatic generation
- Good type safety

**Cons:**
- More method calls than functional
- Slightly verbose

**When to use:**
- Dynamically generating tools
- Complex conditional logic for defining tools
- When you prefer method chaining

---

## Detailed Examples

### See All API Styles Side-by-Side

```bash
# Functional
cat examples/single-file-basic.ts

# Decorator
cat examples/class-basic.ts

# Interface
cat examples/interface-minimal.ts

# MCPBuilder
cat examples/mcp-builder-foundation.ts
```

### Adding Tools (Same Across All APIs)

- **Functional**: [examples/single-file-advanced.ts](../examples/single-file-advanced.ts)
- **Decorator**: [examples/class-advanced.ts](../examples/class-advanced.ts)
- **Interface**: [examples/interface-advanced.ts](../examples/interface-advanced.ts)
- **MCPBuilder**: [examples/mcp-builder-complete.ts](../examples/mcp-builder-complete.ts)

### Adding Prompts & Resources

All APIs support:
- **Prompts**: Dynamic templates for LLMs
- **Resources**: Shared data (files, config, etc.)

See examples directory for implementations in each style.

---

## Choosing Your API

### Decision Tree

**"I want to learn MCP quickly"**
→ Use **Functional API** (`single-file-basic.ts`)

**"I'm building a large server with many tools"**
→ Use **Decorator API** (`class-basic.ts`)

**"My team requires strict TypeScript"**
→ Use **Interface API** (`interface-minimal.ts`)

**"I'm generating tools dynamically"**
→ Use **MCPBuilder** (`mcp-builder-foundation.ts`)

---

## Common Questions

### Can I mix APIs?
Not in a single server, but you can create separate servers with different APIs.

### Can I switch APIs later?
Yes! The core logic (tools, prompts, resources) is the same. Only the wrapper changes.

### Which is fastest?
All are equally fast at runtime. Performance differences are negligible.

### Do I need TypeScript?
No, all examples work with JavaScript. TypeScript support is optional.

---

## Next Steps

1. **Pick one API** from the comparison above
2. **Run its example**: `npx tsx examples/[api-style].ts`
3. **Read the code**: Understand the structure
4. **Modify the example**: Add your own tool
5. **Read the full API docs** when you need advanced features

Start with [QUICK_START.md](./QUICK_START.md) if you haven't already!
