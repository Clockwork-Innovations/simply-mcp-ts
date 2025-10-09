# Development Examples

**⚠️ These examples are for internal/development use only.**

This folder contains examples that demonstrate internal APIs and development tools. These examples:
- Use internal/private APIs not exported from the main package
- Are designed for contributors and maintainers
- Require running from the repository (not from installed package)
- May change or be removed without notice

## Examples

### `performance-demo.ts`
Demonstrates the CLI performance cache and metrics for development/debugging.

**Usage (from repository root):**
```bash
npx tsx examples/dev/performance-demo.ts
```

**Note:** This uses internal CLI cache functions not available to end users.

---

## For Users

If you're looking for examples to use with the installed `simply-mcp` package, see the parent `examples/` directory instead. All examples there use only public APIs and work with the installed package.
