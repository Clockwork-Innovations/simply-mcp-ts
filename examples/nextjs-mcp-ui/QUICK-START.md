# Quick Start Guide

Get the MCP-UI Next.js demo running in 3 minutes.

---

## Prerequisites

- Node.js 20.0.0 or higher
- npm (comes with Node.js)
- Terminal/command line access

---

## 3-Minute Setup

### Step 1: Navigate to Project (10 seconds)

```bash
cd /mnt/Shared/cs-projects/simple-mcp/examples/nextjs-mcp-ui
```

### Step 2: Install Dependencies (60-90 seconds)

```bash
npm install
```

This installs all required packages including Next.js, React, TypeScript, and test dependencies.

### Step 3: Start Development Server (10 seconds)

```bash
npm run dev
```

You should see:
```
> mcp-ui-nextjs-demo@1.0.0 dev
> next dev

   ▲ Next.js 15.5.5
   - Local:        http://localhost:3000

 ✓ Starting...
 ✓ Ready in 2.3s
```

### Step 4: Open Browser (5 seconds)

Navigate to: **http://localhost:3000**

---

## What You'll See

### Home Page
- Overview of MCP-UI Layer 1 (Foundation)
- Links to demo resources
- Documentation and getting started info

### Demo Page (`/demo`)
- Grid of 5 demo UI resources
- Each resource is rendered in a sandboxed iframe
- View source code for each resource

### Individual Resource Pages (`/demo/[resource]`)
- Full-page view of single resource
- Split view: rendered output + source code
- Examples:
  - `/demo/product-card` - Modern product card
  - `/demo/info-card` - Info card with icon
  - `/demo/feature-list` - Feature list
  - `/demo/statistics-display` - Statistics dashboard
  - `/demo/welcome-card` - Welcome message

---

## Quick Commands

### Development
```bash
npm run dev          # Start dev server (hot reload enabled)
npm run build        # Build for production
npm start            # Start production server
```

### Testing & Quality
```bash
npm test             # Run all tests (35 tests)
npm run test:watch   # Run tests in watch mode
npm run type-check   # TypeScript type checking
npm run lint         # ESLint code quality check
```

### Coverage
```bash
npm run test:coverage  # Run tests with coverage report
```

---

## Demo Resources

The demo includes 5 pre-built UI resources:

1. **product-card** - E-commerce product card with pricing and ratings
2. **info-card** - Information card with icon and hover effects
3. **feature-list** - Feature list with checkmarks
4. **statistics-display** - Real-time statistics dashboard
5. **welcome-card** - Welcome message with branding

All resources are:
- Self-contained HTML (no external dependencies)
- Rendered in sandboxed iframes
- Styled with inline CSS
- Layer 1 (Foundation) compliant

---

## Project Structure

```
nextjs-mcp-ui/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Home page
│   ├── layout.tsx         # Root layout
│   ├── demo/              # Demo pages
│   │   ├── page.tsx       # Demo grid
│   │   └── [resource]/    # Individual resource pages
│   └── globals.css        # Global styles
├── lib/                   # Core library
│   ├── mockMcpClient.ts   # Mock MCP client
│   ├── demoResources.ts   # Resource catalog
│   ├── types.ts           # Type definitions
│   ├── utils.ts           # Utilities
│   └── __tests__/         # Test suite
├── components/            # React components
│   ├── ResourceViewer.tsx # Resource renderer wrapper
│   ├── CodePreview.tsx    # Source code display
│   └── DemoLayout.tsx     # Demo page layout
├── hooks/                 # React hooks
│   └── useResourceLoader.ts  # Resource loading hook
└── public/                # Static assets
```

---

## Troubleshooting

### Port Already in Use

If port 3000 is already in use:

```bash
# Option 1: Use different port
PORT=3001 npm run dev

# Option 2: Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Module Not Found Errors

If you see module resolution errors:

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run dev
```

### TypeScript Errors

If TypeScript shows errors:

```bash
# Check if parent package is built
cd ../..
npm run build
cd examples/nextjs-mcp-ui

# Restart TypeScript server in your IDE
# VS Code: Cmd+Shift+P > "TypeScript: Restart TS Server"
```

### Test Failures

If tests fail:

```bash
# Clear Jest cache
npx jest --clearCache

# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- mockMcpClient.test.ts
```

### Build Errors

If build fails:

```bash
# Type check first
npm run type-check

# Check for linting errors
npm run lint

# Clean build
rm -rf .next
npm run build
```

---

## Development Tips

### Hot Reload
- Save any file and the browser auto-refreshes
- Changes to components update instantly
- No need to restart the dev server

### View Source Code
- Every demo page includes a "View Source" section
- Shows the HTML source of the rendered resource
- Syntax highlighted with Prism.js

### Testing During Development
```bash
# Terminal 1: Development server
npm run dev

# Terminal 2: Watch tests
npm run test:watch
```

### Type Safety
- TypeScript strict mode enabled
- Hover over any variable in your IDE to see types
- Auto-completion for all MCP-UI types

---

## Next Steps

### Explore the Code

1. **Start with types**: Read `lib/types.ts` to understand data structures
2. **Check resources**: Look at `lib/demoResources.ts` for resource examples
3. **Mock client**: Review `lib/mockMcpClient.ts` to see how it works
4. **Components**: Examine `components/` for React component patterns

### Modify a Resource

1. Open `lib/demoResources.ts`
2. Find `PRODUCT_CARD_RESOURCE`
3. Modify the HTML in the `text` field
4. Save and refresh browser - changes appear instantly

### Add a New Resource

1. Create resource in `lib/demoResources.ts`:
```typescript
const MY_RESOURCE: UIResourceContent = {
  uri: 'ui://my-resource/layer1',
  mimeType: 'text/html',
  text: `<!DOCTYPE html>
    <html>
      <head>
        <style>
          /* Your styles */
        </style>
      </head>
      <body>
        <!-- Your content -->
      </body>
    </html>`,
  _meta: {},
};
```

2. Add to `DEMO_RESOURCES` object:
```typescript
export const DEMO_RESOURCES = {
  // ... existing resources
  'my-resource': {
    id: 'my-resource',
    displayName: 'My Resource',
    description: 'My custom resource',
    category: 'foundation',
    tags: ['custom'],
    resource: MY_RESOURCE,
  },
};
```

3. Update test count in tests (from 5 to 6)
4. Refresh browser - new resource appears in demo grid

### Run Production Build

```bash
# Build
npm run build

# Start production server
npm start

# Visit http://localhost:3000
```

---

## Resources

### Documentation
- Main README: `README.md`
- Layer 1 Plan: `/docs/mcp-ui/NEXTJS-DEMO-LAYER1-PLAN.md`
- Completion Checklist: `LAYER1-COMPLETION-CHECKLIST.md`

### MCP-UI Specification
- UI Types: `../../src/client/ui-types.ts`
- HTML Renderer: `../../src/client/HTMLResourceRenderer.tsx`
- UI Resource Renderer: `../../src/client/UIResourceRenderer.tsx`

### External Links
- Next.js Docs: https://nextjs.org/docs
- React Docs: https://react.dev
- TypeScript Docs: https://www.typescriptlang.org/docs
- Tailwind CSS: https://tailwindcss.com/docs

---

## Support

### Common Questions

**Q: Can I use this in production?**
A: Yes! Layer 1 is production-ready. All tests pass, TypeScript is strict, and build succeeds.

**Q: How do I connect to a real MCP server?**
A: Layer 1 uses a mock client. Layer 2+ will add real MCP server connection capabilities.

**Q: Can I add interactive features?**
A: Layer 1 is static HTML only. Layer 2 will add interactive callbacks with postMessage.

**Q: How do I customize the styling?**
A: Modify `app/globals.css` for global styles. Use Tailwind classes in components.

**Q: Where are tests located?**
A: `lib/__tests__/mockMcpClient.test.ts` - 35 comprehensive tests covering all functionality.

---

## Success Checklist

After completing setup, verify everything works:

- [ ] Server starts without errors
- [ ] Home page loads at http://localhost:3000
- [ ] Demo page shows 5 resources
- [ ] Individual resource pages work
- [ ] All tests pass (`npm test`)
- [ ] Type check passes (`npm run type-check`)
- [ ] Build succeeds (`npm run build`)

If all items are checked, you're ready to develop!

---

**Happy Coding!**

For questions or issues, refer to:
- `LAYER1-COMPLETION-CHECKLIST.md` - Detailed verification steps
- `README.md` - Full project documentation
- `lib/__tests__/mockMcpClient.test.ts` - Usage examples in tests
