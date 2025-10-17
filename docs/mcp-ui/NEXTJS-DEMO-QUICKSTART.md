# MCP-UI Next.js Demo - Quick Start for Implementation Agents

**Target Audience**: Implementation agents building the Layer 1 demo
**Reading Time**: 5 minutes
**Prerequisites**: Basic Next.js, React, and TypeScript knowledge

---

## Overview in 30 Seconds

You're building a **showcase application** that demonstrates MCP-UI rendering capabilities. The goal is to use **real components** from `simple-mcp/src/client` with a **mock MCP client** to create an interactive demo.

**Not Included**: Building MCP-UI components (already done), real MCP server, production client

**Estimated Time**: 8-12 hours

---

## Critical Success Factors

### 1. Use Real Components ✅
```typescript
// ✅ Correct - Import from simple-mcp source
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';

// ❌ Wrong - Don't rebuild or mock
const UIResourceRenderer = () => { /* fake implementation */ };
```

### 2. Import Types Correctly ✅
```typescript
// ✅ Correct - Import types from simple-mcp
import type { UIResourceContent } from '@mcp-ui/ui-types';

// ❌ Wrong - Don't redefine types
interface UIResourceContent { /* redefinition */ }
```

### 3. Configure Paths Early ✅
```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@mcp-ui/*": ["../../simple-mcp/src/client/*"],
      "@/*": ["./*"]
    }
  }
}
```

---

## Essential File Locations

**Read These First**:
1. `/mnt/Shared/cs-projects/simple-mcp/docs/mcp-ui/NEXTJS-DEMO-LAYER1-PLAN.md` - Full implementation plan
2. `/mnt/Shared/cs-projects/simple-mcp/docs/mcp-ui/NEXTJS-DEMO-ARCHITECTURE.md` - Visual diagrams
3. `/mnt/Shared/cs-projects/simple-mcp/docs/mcp-ui/NEXTJS-DEMO-EXECUTIVE-SUMMARY.md` - High-level overview

**Real Components** (already built - DO NOT MODIFY):
- `/mnt/Shared/cs-projects/simple-mcp/src/client/UIResourceRenderer.tsx`
- `/mnt/Shared/cs-projects/simple-mcp/src/client/HTMLResourceRenderer.tsx`
- `/mnt/Shared/cs-projects/simple-mcp/src/client/ui-types.ts`
- `/mnt/Shared/cs-projects/simple-mcp/src/client/ui-utils.ts`

**Demo App** (to be created):
- `demos/nextjs-mcp-ui/` - All new code goes here

---

## Implementation Sequence (TL;DR)

```bash
# Phase 1: Setup (2 hours)
1. Create Next.js project with App Router
2. Configure TypeScript paths
3. Install dependencies
4. Verify imports work

# Phase 2: Mock Client (2 hours)
1. Build lib/mockMcpClient.ts
2. Create lib/demoResources.ts
3. Build hooks/useResource.ts
4. Test resource loading

# Phase 3: Components (2 hours)
1. Build components/demo/ResourceViewer.tsx
2. Build components/demo/CodePreview.tsx
3. Build components/demo/DemoLayout.tsx
4. Build components/layout/Navigation.tsx

# Phase 4: Pages (2-3 hours)
1. Create app/layout.tsx
2. Create app/page.tsx
3. Create app/foundation/simple-card/page.tsx
4. Create app/foundation/dynamic-stats/page.tsx
5. Create app/foundation/feature-gallery/page.tsx

# Phase 5: Styling (1-2 hours)
1. Configure Tailwind CSS
2. Add responsive design
3. Add loading states
4. Polish UI

# Phase 6: Documentation (1 hour)
1. Write README.md
2. Add code comments
3. Create .env.example

# Phase 7: Testing (1 hour)
1. Manual test all demos
2. Browser compatibility
3. Security verification
4. Performance check
```

---

## Common Pitfalls & Solutions

### Pitfall 1: Can't Import from `@mcp-ui/*`

**Symptom**: TypeScript errors "Cannot find module '@mcp-ui/UIResourceRenderer'"

**Solution**:
1. Check `tsconfig.json` has correct paths
2. Check `next.config.ts` has webpack alias
3. Restart TypeScript server in IDE
4. Run `npx tsc --showConfig` to verify

**Test**:
```bash
# This should work after setup
npx tsx --eval "import('@mcp-ui/UIResourceRenderer')"
```

### Pitfall 2: Components Don't Render

**Symptom**: Blank page or error "Cannot read property 'text' of undefined"

**Solution**:
1. Verify resource structure matches `UIResourceContent` type
2. Check `useResource` hook returns valid data
3. Add console.log to debug resource shape
4. Ensure `resource.text` has HTML content

**Debug Code**:
```typescript
const { resource } = useResource('simple-product-card');
console.log('Resource:', JSON.stringify(resource, null, 2));
```

### Pitfall 3: iframe Is Blank

**Symptom**: iframe element exists but shows nothing

**Solution**:
1. Inspect iframe in DevTools
2. Check `srcdoc` attribute has HTML
3. Verify no CSP blocking iframe
4. Check browser console for errors

**Checklist**:
- [ ] HTML content is not empty string
- [ ] Sandbox attribute is correct
- [ ] No console errors
- [ ] CSP allows frame-src

### Pitfall 4: TypeScript Errors

**Symptom**: Type errors like "Type 'X' is not assignable to type 'Y'"

**Solution**:
1. Import types from `@mcp-ui/ui-types`
2. Don't redefine any MCP-UI types
3. Use `type` imports: `import type { ... }`
4. Check version compatibility

**Example**:
```typescript
// ✅ Correct
import type { UIResourceContent } from '@mcp-ui/ui-types';
const resource: UIResourceContent = { ... };

// ❌ Wrong
const resource: any = { ... };  // Loses type safety
```

### Pitfall 5: Sandbox Not Working

**Symptom**: XSS attacks work, scripts execute with full access

**Solution**:
1. Check iframe has `sandbox` attribute
2. Verify attribute value is `"allow-scripts"`
3. Don't add `allow-same-origin` in Layer 1
4. Inspect element in DevTools to confirm

**Verify**:
```javascript
// In browser console
document.querySelector('iframe').getAttribute('sandbox')
// Should be: "allow-scripts"
```

---

## Key Code Snippets

### Mock MCP Client Template

```typescript
// lib/mockMcpClient.ts
export class MockMcpClient {
  async getResource(id: ResourceId): Promise<MockMcpResponse> {
    await this.simulateDelay();
    const resource = this.resources.get(id);
    return resource
      ? { success: true, resource }
      : { success: false, error: 'Not found' };
  }

  private async simulateDelay(): Promise<void> {
    const delay = Math.random() * 200 + 100;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}
```

### Resource Hook Template

```typescript
// hooks/useResource.ts
export function useResource(id: ResourceId) {
  const [resource, setResource] = useState<UIResourceContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await mockMcpClient.getResource(id);
        if (response.success) {
          setResource(response.resource!);
        } else {
          setError(response.error!);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  return { resource, loading, error };
}
```

### Demo Page Template

```typescript
// app/foundation/simple-card/page.tsx
'use client';

import { DemoLayout } from '@/components/demo/DemoLayout';
import { ResourceViewer } from '@/components/demo/ResourceViewer';
import { useResource } from '@/hooks/useResource';

export default function SimpleCardPage() {
  const { resource, loading, error } = useResource('simple-product-card');

  return (
    <DemoLayout title="Simple Product Card">
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {resource && <ResourceViewer resource={resource} />}
    </DemoLayout>
  );
}
```

### ResourceViewer Template

```typescript
// components/demo/ResourceViewer.tsx
'use client';

import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';
import type { UIResourceContent } from '@mcp-ui/ui-types';

export function ResourceViewer({ resource }: { resource: UIResourceContent }) {
  return (
    <div className="resource-viewer">
      <div className="metadata">
        <span>URI: {resource.uri}</span>
        <span>Type: {resource.mimeType}</span>
      </div>

      <UIResourceRenderer
        resource={resource}
        style={{ height: '600px' }}
      />
    </div>
  );
}
```

---

## Validation Checkpoints

Use these to verify each phase is complete before moving on.

### ✅ Checkpoint 1: Project Setup
```bash
cd demos/nextjs-mcp-ui
npm run dev
# Should start without errors
# Open http://localhost:3000
```

### ✅ Checkpoint 2: Imports Work
```typescript
// Create test file: test-imports.ts
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';
import type { UIResourceContent } from '@mcp-ui/ui-types';
console.log('Imports work!');

// Run: npx tsx test-imports.ts
```

### ✅ Checkpoint 3: Mock Client Works
```typescript
// In any page component
const { resource } = useResource('simple-product-card');
console.log('Resource:', resource);
// Should log UIResourceContent object
```

### ✅ Checkpoint 4: Components Render
```typescript
// View in browser
// Should see iframe with HTML content
// Inspect element: <iframe sandbox="allow-scripts" srcdoc="...">
```

### ✅ Checkpoint 5: Navigation Works
```bash
# Click through all navigation links
# Verify each page loads without errors
# Check URL changes correctly
```

### ✅ Checkpoint 6: Responsive Design
```bash
# Open DevTools > Device Toolbar
# Test: iPhone 12 (390px)
# Test: iPad (768px)
# Test: Desktop (1440px)
# All should work without horizontal scroll
```

### ✅ Checkpoint 7: Security Verified
```javascript
// In browser DevTools console
document.querySelector('iframe').getAttribute('sandbox')
// Should be: "allow-scripts" (not "allow-same-origin")

// Network tab: Check response headers
// Should include Content-Security-Policy
```

---

## Testing Commands

```bash
# Development
npm run dev                 # Start dev server
npm run build              # Build for production
npm run start              # Start production server

# Type checking
npx tsc --noEmit           # Check TypeScript errors

# Debugging
rm -rf .next               # Clear Next.js cache
rm -rf node_modules        # Clean dependencies
npm install                # Reinstall dependencies
```

---

## Help & Resources

### If You Get Stuck

1. **Read the full plan**: Section-by-section guidance in `NEXTJS-DEMO-LAYER1-PLAN.md`
2. **Check architecture diagrams**: Visual reference in `NEXTJS-DEMO-ARCHITECTURE.md`
3. **Review existing code**: Look at real components in `simple-mcp/src/client/`
4. **Test incrementally**: Don't build everything at once
5. **Use console.log**: Debug state and props liberally

### Key Sections to Reference

- **Section 6**: Mock Client Specification (detailed implementation)
- **Section 5**: Component Breakdown (props and responsibilities)
- **Section 10**: Implementation Sequence (step-by-step)
- **Section 13**: Risk Analysis (common problems and solutions)
- **Appendix C**: Troubleshooting Guide (specific fixes)

### Example Code Locations

All examples are in the full plan document:
- Mock client: Section 6.2
- Demo resources: Section 6.3
- Resource hook: Section 6.4
- Demo page: Section 10, Phase 4
- ResourceViewer: Section 5.2

---

## Success Criteria (Quick Check)

Before considering Layer 1 complete, verify:

- [ ] 3+ HTML resources render correctly
- [ ] iframe has `sandbox="allow-scripts"` attribute
- [ ] Source view works with syntax highlighting
- [ ] Navigation between demos works smoothly
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No console errors or warnings
- [ ] Works in Chrome, Firefox, Safari
- [ ] Responsive on mobile (320px+), tablet (768px+), desktop (1024px+)
- [ ] Loading states appear during resource fetch
- [ ] Error states display when resources fail
- [ ] README is complete with setup instructions

---

## What's Out of Scope

**DO NOT implement in Layer 1**:
- ❌ Interactive callbacks (Layer 2)
- ❌ Tool execution (Layer 2)
- ❌ External URLs (Layer 2)
- ❌ Remote DOM (Layer 3)
- ❌ Chrome DevTools integration (Layer 5)
- ❌ Real MCP server
- ❌ Production authentication
- ❌ Database integration
- ❌ API rate limiting
- ❌ User accounts

**Focus**: Static HTML rendering in sandboxed iframes. That's it.

---

## Timeline

Realistic timeline for focused work:

| Phase | Duration | Can Start After |
|-------|----------|-----------------|
| 1. Setup | 2 hours | Immediately |
| 2. Mock Client | 2 hours | Phase 1 ✅ |
| 3. Components | 2 hours | Phase 2 ✅ |
| 4. Pages | 2-3 hours | Phase 3 ✅ |
| 5. Styling | 1-2 hours | Phase 4 ✅ |
| 6. Documentation | 1 hour | Phase 5 ✅ |
| 7. Testing | 1 hour | Phase 6 ✅ |

**Total**: 8-12 hours

**Can be parallelized**: No, phases are sequential.

---

## Final Checklist

Before submitting:

**Functional**:
- [ ] All demos work end-to-end
- [ ] No browser console errors
- [ ] Loading states work
- [ ] Error states work

**Code Quality**:
- [ ] No TypeScript errors
- [ ] Code has JSDoc comments
- [ ] Consistent formatting
- [ ] No TODOs left

**Documentation**:
- [ ] README explains setup
- [ ] Key components documented
- [ ] Architecture clear

**Security**:
- [ ] iframe sandbox verified
- [ ] CSP headers present
- [ ] No XSS vulnerabilities

**Testing**:
- [ ] Manual test completed
- [ ] Cross-browser verified
- [ ] Responsive tested

---

## One-Line Summary

**Build a Next.js 15 app that uses real UIResourceRenderer/HTMLResourceRenderer from simple-mcp with a mock client to demonstrate HTML resource rendering in sandboxed iframes.**

---

## Ready to Start?

1. Open `NEXTJS-DEMO-LAYER1-PLAN.md`
2. Read Section 1-7 (understand the system)
3. Begin Section 10: Implementation Sequence
4. Follow phases step-by-step
5. Validate at each checkpoint
6. Test thoroughly at the end

**Good luck!** 🚀

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-16
**Estimated Reading Time**: 5 minutes
