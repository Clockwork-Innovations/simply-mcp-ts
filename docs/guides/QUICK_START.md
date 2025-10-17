# Quick Start Guide

Get started with Simply MCP in 5 minutes with runnable examples.

## Installation

```bash
npm install simply-mcp
```

## Your First Server (Choose Your Style)

### Option 1: Functional API (Simplest)

```bash
# Run the example
npx tsx examples/single-file-basic.ts

# View the code
cat examples/single-file-basic.ts
```

**Start here if:** You prefer simple JavaScript/TypeScript functions.

### Option 2: Decorator API (Best for Classes)

```bash
# Run the example
npx tsx examples/class-basic.ts

# View the code
cat examples/class-basic.ts
```

**Start here if:** You prefer object-oriented programming.

### Option 3: Interface API (Type-Safe)

```bash
# Run the example
npx tsx examples/interface-minimal.ts

# View the code
cat examples/interface-minimal.ts
```

**Start here if:** You want strict TypeScript types.

### Option 4: MCPBuilder (Fluent API)

```bash
# Run the example
npx tsx examples/mcp-builder-foundation.ts

# View the code
cat examples/mcp-builder-foundation.ts
```

**Start here if:** You prefer a builder pattern approach.

## API Comparison

| Feature | Functional | Decorator | Interface | MCPBuilder |
|---------|-----------|-----------|-----------|-----------|
| Learning curve | Easiest | Moderate | Strict | Fluent |
| Lines of code | Minimal | Concise | Verbose | Moderate |
| Type safety | Good | Good | Excellent | Good |
| Setup time | Instant | Quick | Requires types | Quick |

See [API_GUIDE.md](./API_GUIDE.md) for detailed comparison.

## What's Next?

- **Add Tools**: See `examples/single-file-advanced.ts` (add capabilities)
- **Add Prompts**: Check how prompts work in different examples
- **Bundle for Distribution**: Read [BUNDLING.md](./BUNDLING.md)
- **HTTP Transport**: See [TRANSPORT_GUIDE.md](./TRANSPORT_GUIDE.md)
- **Deployment**: Read [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## Common Tasks

### Create a tool (add a capability)

See `examples/01-hello-world.ts` for the simplest example, then `examples/02-with-tools.ts` for adding tools.

### Add configuration via environment variables

```typescript
const apiKey = process.env.API_KEY;
```

### Run with HTTP (not just stdio)

```bash
npx simply-mcp run ./my-server --http --port 3000
```

### Bundle for sharing

```bash
npx simplymcp bundle server.ts -f single-file -o my-server.js
```

See [BUNDLING.md](./BUNDLING.md) for more formats.

## Need Help?

- **API Reference**: [CLI_REFERENCE.md](./CLI_REFERENCE.md)
- **API Details**: [API_GUIDE.md](./API_GUIDE.md)
- **Transport Options**: [TRANSPORT_GUIDE.md](./TRANSPORT_GUIDE.md)
- **Deployment**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **More Examples**: Run `ls examples/` to see all 50+ examples
- **GitHub Issues**: Report bugs or ask questions

## Troubleshooting

**"Cannot find module 'simply-mcp'"**
```bash
npm install simply-mcp
npm link  # for development
```

**Example doesn't run**
```bash
# Install dependencies
npm install

# Run with tsx (TypeScript execution)
npx tsx examples/single-file-basic.ts
```

**Want to see how X works?**

Search in the `examples/` directory - there's likely an example for it!

---

**Next Step**: Pick your favorite API style above and run the example. That's your starting point!
