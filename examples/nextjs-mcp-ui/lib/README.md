# Library Directory

This directory will contain utility functions, mock client, and type definitions for the MCP-UI Next.js demo.

## Planned Structure (Phase 2)

```
lib/
├── mockMcpClient.ts          # Mock MCP client implementation
├── demoResources.ts          # Catalog of demo UI resources
├── types.ts                  # Demo-specific type definitions
└── utils.ts                  # Utility functions
```

## File Descriptions

### mockMcpClient.ts
Mock implementation of an MCP client that simulates server responses for demonstration purposes.

**Features**:
- Returns UIResource objects
- Simulates network delay (100-300ms)
- Manages demo resource catalog
- Provides getResource() and listResources() methods
- Supports tool execution simulation (for Layer 2+)

### demoResources.ts
Catalog of pre-defined UI resources for demos.

**Resources**:
- `simple-product-card` - Basic HTML card with styling
- `dynamic-stats` - Generated dashboard with live data
- `feature-gallery` - Complex styled layout
- Additional resources as needed

### types.ts
Type definitions specific to the demo application.

**Exports**:
- Re-exports of MCP-UI types from `@mcp-ui/ui-types`
- Demo-specific types (ResourceId, MockMcpResponse, etc.)

### utils.ts
Utility functions for the demo application.

**Functions**:
- HTML sanitization helpers
- Format utilities
- Validation functions

## Implementation Status

- **Phase 1** (Complete): Directory structure created
- **Phase 2** (Pending): File implementation
- **Phase 3** (Pending): Component integration

## Usage Example

```typescript
import { mockMcpClient } from '@/lib/mockMcpClient';
import type { UIResourceContent } from '@/lib/types';

// Get a resource
const response = await mockMcpClient.getResource('simple-product-card');
if (response.success && response.resource) {
  // Use resource with UIResourceRenderer
}
```
