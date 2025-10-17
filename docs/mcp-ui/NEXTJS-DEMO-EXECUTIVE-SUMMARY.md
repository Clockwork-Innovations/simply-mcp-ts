# MCP-UI Next.js Demo - Executive Summary

**Project**: MCP-UI Interactive Demo with Next.js 15
**Layer**: 1 (Foundation) - Basic HTML Resources
**Estimated Time**: 8-12 hours
**Complexity**: Medium
**Status**: Planning Complete ✅

---

## What We're Building

A **showcase application** that demonstrates MCP-UI capabilities using real components from `simple-mcp` with a mock MCP client. This is NOT a production MCP client - it's an interactive demo for developers.

### Key Features

**Layer 1 (Foundation)**:
- ✅ Render inline HTML resources in sandboxed iframes
- ✅ Display 3+ different demo resources (product card, stats, gallery)
- ✅ View HTML source code with syntax highlighting
- ✅ Browse all available resources
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Security: proper iframe sandboxing

**Future Layers** (not in initial scope):
- Layer 2: Interactive callbacks, tool execution, external URLs
- Layer 3: Remote DOM rendering
- Layer 5: Chrome DevTools integration

---

## Architecture at a Glance

```
Next.js 15 App
├── Mock MCP Client (simulates server)
│   └── Returns UIResource objects
├── Demo Pages (showcase features)
│   └── Use ResourceViewer wrapper
└── Real MCP-UI Components (from simple-mcp)
    ├── UIResourceRenderer (router)
    └── HTMLResourceRenderer (iframe rendering)
```

**Critical Design Decision**: We import real components directly from `simple-mcp/src/client`, not as npm package. This ensures we're testing actual production components.

---

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js | 15.1.0 |
| React | React | 19.x |
| TypeScript | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| MCP-UI Components | From simple-mcp | (already built) |

**Compatibility**: React 19 is backward compatible with React 18 patterns used in MCP-UI.

---

## File Structure Overview

```
demos/nextjs-mcp-ui/
├── app/                      # Next.js App Router
│   ├── page.tsx              # Home (overview)
│   ├── layout.tsx            # Root layout
│   └── foundation/           # Layer 1 demos
│       ├── simple-card/
│       ├── dynamic-stats/
│       └── feature-gallery/
├── components/               # Demo UI components
│   ├── demo/
│   │   ├── ResourceViewer.tsx    # Wraps UIResourceRenderer
│   │   ├── CodePreview.tsx       # Shows HTML source
│   │   └── DemoLayout.tsx        # Standard page layout
│   └── layout/
│       ├── Navigation.tsx        # Top nav
│       └── Footer.tsx
├── lib/                      # Library code
│   ├── mockMcpClient.ts      # Simulates MCP server
│   ├── demoResources.ts      # Catalog of HTML resources
│   └── types.ts
└── hooks/                    # React hooks
    └── useResource.ts        # Resource loading hook
```

**Total Files to Create**: ~25 files
**Total LOC**: ~1,500-2,000 lines

---

## Implementation Phases

### Phase 1: Project Setup (2 hours)
- Create Next.js project
- Configure TypeScript paths
- Install dependencies
- Verify imports from simple-mcp work

### Phase 2: Mock Client & Resources (2 hours)
- Build MockMcpClient class
- Create catalog of demo resources
- Implement useResource hook
- Test resource loading

### Phase 3: Demo Components (2 hours)
- Build ResourceViewer wrapper
- Build CodePreview (syntax highlighting)
- Build DemoLayout
- Build Navigation

### Phase 4: App Pages (2-3 hours)
- Create home page
- Create foundation demo pages
- Create resource browser
- Test navigation

### Phase 5: Styling & Polish (1-2 hours)
- Configure Tailwind
- Add responsive design
- Add loading states
- Polish UI

### Phase 6: Documentation (1 hour)
- Write README
- Add code comments
- Create .env.example

### Phase 7: Final Testing (1 hour)
- Manual test all demos
- Browser compatibility testing
- Security verification
- Performance check

---

## Success Metrics

**Must Have** (Required for Layer 1 completion):
- [ ] At least 3 HTML resources render correctly
- [ ] All iframes have `sandbox="allow-scripts"` attribute
- [ ] Source view works with syntax highlighting
- [ ] Navigation between demos works
- [ ] No TypeScript errors
- [ ] No console errors/warnings
- [ ] Works on Chrome, Firefox, Safari
- [ ] Responsive on mobile, tablet, desktop

**Nice to Have** (Can be added later):
- Automated tests
- More demo resources
- Advanced styling
- Analytics

---

## Key Design Decisions

### 1. Use Real Components, Not Mocks
**Decision**: Import UIResourceRenderer directly from simple-mcp source
**Rationale**: Ensures demo shows actual production behavior
**Trade-off**: Tighter coupling, but worth it for accuracy

### 2. Mock Client vs Real MCP
**Decision**: Build a mock client that simulates MCP protocol
**Rationale**: Demo doesn't need real server, mock is simpler
**Trade-off**: Not testing real MCP client, but that's not the goal

### 3. TypeScript Path Aliases
**Decision**: Use `@mcp-ui/*` to import from simple-mcp
**Rationale**: Clean imports, easy to update path if needed
**Trade-off**: Requires configuration in tsconfig and next.config

### 4. Server vs Client Components
**Decision**: Use Server Components where possible, Client for interactivity
**Rationale**: Follows Next.js 15 best practices
**Trade-off**: UIResourceRenderer must be Client Component (React hooks)

### 5. Tailwind for Styling
**Decision**: Use Tailwind CSS 4.x
**Rationale**: Fast development, modern, consistent
**Trade-off**: Larger CSS bundle, but acceptable for demo

---

## Security Considerations

### iframe Sandboxing
- **Inline HTML**: `sandbox="allow-scripts"`
- **No same-origin** for Layer 1 (added in Layer 2 for external URLs)
- **No form submission** in Layer 1
- **No popups** allowed
- **No top-level navigation** allowed

### Content Security Policy
```
default-src 'self'
script-src 'self' 'unsafe-inline'  # For Next.js
style-src 'self' 'unsafe-inline'   # For Tailwind
frame-src 'self' data: blob:       # For iframes
```

### User Input Sanitization
For custom HTML demo (if implemented):
- Remove `<script>` tags
- Remove event handlers (onclick, onerror, etc.)
- **Defense in depth**: iframe sandbox still prevents execution

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Type compatibility issues | Medium | Medium | Import types directly from simple-mcp |
| React 19 breaks React 18 patterns | Low | High | Test early, React 19 is backward compatible |
| iframe sandbox issues | Medium | Medium | Test in multiple browsers early |
| Path resolution fails | Medium | High | Configure both tsconfig and next.config |
| Performance with multiple iframes | Low | Medium | Limit iframes per page, use lazy loading |
| Security vulnerabilities | Low | High | Follow security guide, test with XSS payloads |

**Highest Risk**: Path resolution and type compatibility
**Mitigation**: Test imports in Phase 1, before building components

---

## Dependencies

**Required npm Packages**:
```json
{
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "prismjs": "^1.29.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/react": "^19.0.0",
    "@types/node": "^20.10.0",
    "@types/prismjs": "^1.26.3"
  }
}
```

**From simple-mcp** (imported, not installed):
- UIResourceRenderer
- HTMLResourceRenderer
- ui-types.ts
- ui-utils.ts

---

## Testing Strategy

**Primary**: Manual testing (appropriate for demo app)

**Test Cases**:
1. ✅ Resources render in sandboxed iframes
2. ✅ Source view displays HTML with syntax highlighting
3. ✅ Navigation between demos works
4. ✅ Loading states appear during fetch
5. ✅ Error states display for missing resources
6. ✅ Responsive layout works on all screen sizes
7. ✅ Copy source button copies HTML to clipboard
8. ✅ Browser DevTools shows correct sandbox attributes

**Security Testing**:
1. Verify sandbox attribute in DevTools
2. Test XSS payloads (should be blocked)
3. Check CSP headers in Network tab
4. Verify no console errors

**Browser Compatibility**:
- Chrome 120+ (primary)
- Firefox 120+
- Safari 17+
- Edge 120+

---

## Expansion to Layers 2 & 3

### Layer 2: Feature Layer (Future - 4-6 hours)
**Adds**:
- Interactive callbacks via postMessage
- Tool execution simulation
- External URL support (`text/uri-list`)
- Interactive forms with submission

**New Files**:
- `app/feature/interactive-form/page.tsx`
- `app/feature/external-widget/page.tsx`
- Enhanced mock client with tool handlers

### Layer 3: Remote DOM (Future - 6-8 hours)
**Adds**:
- RemoteDOMRenderer integration
- Advanced interactive components
- Shopping cart demo
- Data visualization demo

**New Files**:
- `app/remote-dom/counter/page.tsx`
- `app/remote-dom/shopping-cart/page.tsx`
- Remote DOM resource definitions

### Layer 5: DevTools Integration (Future - 12+ hours)
**Adds**:
- Chrome DevTools panel
- Live operation inspection
- Performance monitoring
- Security audit tool

---

## Quick Start for Implementers

1. **Read the full plan**: `NEXTJS-DEMO-LAYER1-PLAN.md`
2. **Start with Phase 1**: Project setup and configuration
3. **Follow checkpoints**: Validate at each phase
4. **Test continuously**: Don't wait until the end
5. **Ask questions**: If anything is unclear, refer to plan sections

**Key Files to Read First**:
- Section 6: Mock Client Specification
- Section 5: Component Breakdown
- Section 10: Implementation Sequence

---

## Questions & Answers

**Q: Why not use a real MCP server?**
A: This is a demo/showcase. A mock client is simpler and demonstrates the UI components without needing server infrastructure.

**Q: Why Next.js 15 specifically?**
A: Latest version with App Router, Server Components, and modern React patterns. Shows best practices.

**Q: Can we use the npm package instead of importing from source?**
A: The React components are commented out in the package exports. We need to import from source files directly.

**Q: How do we handle type definitions?**
A: Import all types from simple-mcp. Never redefine MCP-UI types in the demo.

**Q: What if React 19 breaks things?**
A: Very unlikely - React 19 is backward compatible. If issues arise, we can downgrade Next.js to 14.x (React 18).

**Q: How extensible is this for Layers 2-3?**
A: Very extensible. Architecture is designed for easy addition of new features. Mock client can be enhanced incrementally.

---

## Deliverables

After completing Layer 1, we will have:

✅ **Working Next.js 15 Application**
- Runs locally with `npm run dev`
- No TypeScript errors
- No console warnings

✅ **3+ Interactive Demos**
- Simple product card
- Dynamic stats dashboard
- Feature gallery

✅ **Full Demo Infrastructure**
- Mock MCP client
- Resource catalog
- React hooks
- Reusable components

✅ **Documentation**
- README with setup instructions
- Code comments
- Architecture diagrams

✅ **Security Validation**
- Proper iframe sandboxing
- CSP headers configured
- No XSS vulnerabilities

✅ **Foundation for Expansion**
- Clean architecture for Layer 2-3
- Documented extension points
- Reusable patterns

---

## Next Steps

1. **Review the full implementation plan**
2. **Set up development environment**
3. **Begin Phase 1: Project Setup**
4. **Follow checkpoints and validate progress**
5. **Test thoroughly at each phase**
6. **Document any deviations from plan**

**Estimated Completion**: 8-12 hours of focused work

**Ready to begin?** Open `NEXTJS-DEMO-LAYER1-PLAN.md` and start with Phase 1!

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-16
**Author**: Planning Agent
**Status**: Complete ✅
