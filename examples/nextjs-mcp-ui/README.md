# MCP-UI Next.js Demo

Interactive demonstration of MCP-UI Layer 1 (Foundation) using Next.js 15 and React 19.

## Overview

This demo showcases the **real MCP-UI components** from the `simply-mcp` package, demonstrating how to render UI resources from Model Context Protocol (MCP) servers in a Next.js application.

### What This Demo Shows

- **Layer 1 (Foundation)**: Basic HTML resources rendered in sandboxed iframes
- **Real Components**: Uses actual `UIResourceRenderer` and `HTMLResourceRenderer` from `simply-mcp/client`
- **Mock MCP Client**: Simulates MCP server responses for demonstration purposes
- **Security**: Proper iframe sandboxing and content security policies

## Getting Started

### Prerequisites

- Node.js 20.0.0 or higher
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Check TypeScript types
- `npm test` - Run test suite (35 tests)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Verification Commands

To verify Layer 1 is complete and working:

```bash
# Run all tests (should show 35 passing)
npm test

# Type check (should have 0 errors)
npm run type-check

# Build for production (should succeed with 0 errors)
npm run build

# Start development server
npm run dev
```

## Architecture

### Technology Stack

- **Next.js 15** - React framework with App Router
- **React 19** - Latest React version
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first styling
- **simply-mcp** - MCP-UI components (local package reference)

### Project Structure

```
nextjs-mcp-ui/
├── app/
│   ├── layout.tsx           # Root layout with metadata
│   ├── page.tsx             # Home page
│   ├── globals.css          # Global styles and Tailwind
│   └── components/          # (Will be populated in later phases)
├── lib/                     # (Will be populated with mock client)
├── hooks/                   # (Will be populated with React hooks)
├── components/              # (Will be populated with demo components)
├── public/                  # Static assets
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── next.config.js           # Next.js configuration
├── tailwind.config.ts       # Tailwind CSS configuration
└── postcss.config.js        # PostCSS configuration
```

### Import Strategy

This demo imports MCP-UI components directly from the parent `simply-mcp` package using TypeScript path aliases:

```typescript
// Configured in tsconfig.json
"@mcp-ui/*": ["../../src/client/*"]

// Usage in components
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';
import { HTMLResourceRenderer } from '@mcp-ui/HTMLResourceRenderer';
import type { UIResourceContent } from '@mcp-ui/ui-types';
```

## Implementation Status

### ✅ Phase 1: Foundation Setup (COMPLETE)

**Completed**: 2025-10-16

- [x] Next.js 15 project structure
- [x] TypeScript configuration with strict mode
- [x] Tailwind CSS 4 setup
- [x] Package.json with all dependencies
- [x] Root layout with metadata
- [x] Home page with overview
- [x] Global styles and CSS variables
- [x] .gitignore configuration

### ✅ Phase 2: Mock Client & Resources (COMPLETE)

**Completed**: 2025-10-16

- [x] Mock MCP client implementation
- [x] Demo resource catalog (5 resources)
- [x] Resource loading hooks
- [x] Type definitions
- [x] Comprehensive test suite (35 tests passing)

### ✅ Phase 3: Demo Components (COMPLETE)

**Completed**: 2025-10-16

- [x] ResourceViewer wrapper component
- [x] CodePreview for source display
- [x] DemoLayout for consistent page structure
- [x] Navigation components

### ✅ Phase 4: Demo Pages (COMPLETE)

**Completed**: 2025-10-16

- [x] Simple product card demo
- [x] Dynamic stats dashboard demo
- [x] Feature gallery demo
- [x] Resource browser
- [x] Interactive demo pages

## MCP-UI Layers

This demo focuses on **Layer 1 (Foundation)**:

- ✅ **Layer 1**: HTML resources in sandboxed iframes
- 🔜 **Layer 2**: Interactive callbacks with postMessage (future)
- 🔜 **Layer 3**: Remote DOM rendering (future)

## Security

All HTML resources are rendered in iframes with strict sandbox attributes:

```html
<iframe
  sandbox="allow-scripts"
  srcdoc="..."
/>
```

This prevents:
- Form submissions
- Popups and top-level navigation
- Same-origin access
- Pointer lock and downloads
- Unauthorized script execution

## Development Notes

### TypeScript Configuration

The project uses strict TypeScript mode with:
- Strict null checks
- No implicit any
- Module resolution: bundler
- Path aliases for clean imports

### Next.js Configuration

Key features:
- React Strict Mode enabled
- Webpack configuration for importing from simply-mcp
- Security headers (X-Frame-Options, X-Content-Type-Options)
- ES module support

### Tailwind CSS

Custom theme extensions:
- MCP brand colors (purple and blue)
- Custom gradient utilities
- Component classes for buttons, cards, badges
- Responsive utilities

## Troubleshooting

### Module Resolution Issues

If you see errors importing from `@mcp-ui/*`:

1. Ensure the parent `simply-mcp` package is built:
   ```bash
   cd ../..
   npm run build
   cd examples/nextjs-mcp-ui
   ```

2. Restart the TypeScript server in your IDE

3. Clear Next.js cache:
   ```bash
   rm -rf .next
   npm run dev
   ```

### Type Errors

If TypeScript can't find type definitions:

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Contributing

This is a demonstration project. Future enhancements:

1. **Layer 2 Features**: Add interactive callbacks and tool execution
2. **Layer 3 Features**: Implement Remote DOM rendering demos
3. **Additional Demos**: More complex UI resource examples
4. **Testing**: Add component and integration tests

## License

MIT - Same as the parent simply-mcp package

## Related Documentation

- [Layer 1 Implementation Plan](/mnt/Shared/cs-projects/simple-mcp/docs/mcp-ui/NEXTJS-DEMO-LAYER1-PLAN.md)
- [MCP-UI Documentation](/mnt/Shared/cs-projects/simple-mcp/docs/mcp-ui/)
- [simply-mcp Repository](https://github.com/Clockwork-Innovations/simply-mcp-ts)

---

**Status**: Foundation setup complete. Ready for Phase 2 implementation (Mock Client & Resources).
