# Components Directory

This directory will contain demo-specific React components for the MCP-UI Next.js demo.

## Planned Structure (Phase 3)

```
components/
├── demo/
│   ├── ResourceViewer.tsx    # Wrapper for UIResourceRenderer with metadata
│   ├── CodePreview.tsx        # Syntax-highlighted source code display
│   ├── DemoCard.tsx           # Card component for demo previews
│   └── DemoLayout.tsx         # Standard layout for demo pages
│
├── layout/
│   ├── Navigation.tsx         # Main navigation bar
│   ├── Sidebar.tsx            # Sidebar with demo links
│   └── Footer.tsx             # Footer with info
│
└── ui/
    ├── Button.tsx             # Reusable button component
    ├── Card.tsx               # Reusable card component
    └── Badge.tsx              # Reusable badge component
```

## Implementation Status

- **Phase 1** (Complete): Directory structure created
- **Phase 2** (Pending): Mock client and resources
- **Phase 3** (Pending): Component implementation

## Notes

All components in this directory are **demo-specific** and wrap or use the real MCP-UI components from `simply-mcp/src/client`.

The real MCP-UI components are imported via the `@mcp-ui/*` path alias:
```typescript
import { UIResourceRenderer } from '@mcp-ui/UIResourceRenderer';
import { HTMLResourceRenderer } from '@mcp-ui/HTMLResourceRenderer';
```
