# Progress Notifications

**Status:** ✅ Implemented (Phase 1)
**Priority:** HIGH
**MCP Protocol:** `notifications/progress`

## Overview

Progress Notifications allow MCP tools to report real-time progress updates during long-running operations. This provides better user experience by keeping users informed about operation status.

### Key Benefits

- ⏱️ **Better UX** - Users see real-time progress instead of waiting blindly
- 🔄 **Status Updates** - Inform users about current operation stage
- 📊 **Progress Bars** - Enable UI progress bar rendering
- ✅ **Transparency** - Users understand what's happening

## Quick Start

### Basic Progress Reporting

```typescript
server.addTool({
  name: 'process_files',
  description: 'Process multiple files',
  parameters: z.object({
    files: z.array(z.string()),
  }),
  execute: async (args, context) => {
    const total = args.files.length;

    for (let i = 0; i < total; i++) {
      // Do work
      await processFile(args.files[i]);

      // Report progress
      if (context?.reportProgress) {
        await context.reportProgress(
          i + 1,          // Current progress
          total,          // Total items
          `Processing ${args.files[i]}...`  // Status message
        );
      }
    }

    return `Processed ${total} files`;
  },
});
```

## API Reference

### Context Method

```typescript
context.reportProgress(
  progress: number,
  total?: number,
  message?: string
): Promise<void>
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `progress` | `number` | ✅ Yes | Current progress value (must increase with each call) |
| `total` | `number` | ❌ No | Total expected value (for percentage calculation) |
| `message` | `string` | ❌ No | Human-readable status message |

### Behavior

- **Availability**: Only available when client sends `progressToken` in request metadata
- **Order**: `progress` must increase with each notification (can't go backwards)
- **Optional**: Total can be omitted if unknown (indeterminate progress)
- **Asynchronous**: Returns Promise that resolves when notification is sent

## Examples

### Example 1: File Processing with Progress

```typescript
server.addTool({
  name: 'batch_convert',
  description: 'Convert multiple images',
  parameters: z.object({
    images: z.array(z.string()),
    format: z.string(),
  }),
  execute: async (args, context) => {
    const images = args.images;

    // Initial progress
    await context?.reportProgress?.(0, images.length, 'Starting conversion...');

    const results = [];
    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      // Update status
      await context?.reportProgress?.(
        i,
        images.length,
        `Converting ${image}...`
      );

      // Do work
      const result = await convertImage(image, args.format);
      results.push(result);

      // Report completion of this item
      await context?.reportProgress?.(
        i + 1,
        images.length,
        `Converted ${image}`
      );
    }

    return `Successfully converted ${results.length} images`;
  },
});
```

### Example 2: Multi-Stage Processing

```typescript
server.addTool({
  name: 'build_project',
  description: 'Build a software project',
  parameters: z.object({
    project: z.string(),
  }),
  execute: async (args, context) => {
    const stages = [
      { name: 'Installing dependencies', progress: 0 },
      { name: 'Compiling source', progress: 25 },
      { name: 'Running tests', progress: 50 },
      { name: 'Building artifacts', progress: 75 },
      { name: 'Complete', progress: 100 },
    ];

    for (const stage of stages) {
      await context?.reportProgress?.(
        stage.progress,
        100,
        stage.name
      );

      // Simulate work
      await performStage(stage.name);
    }

    return 'Build completed successfully';
  },
});
```

### Example 3: Indeterminate Progress

```typescript
server.addTool({
  name: 'sync_database',
  description: 'Synchronize database (unknown duration)',
  parameters: z.object({
    database: z.string(),
  }),
  execute: async (args, context) => {
    let progress = 0;

    // No total provided - indeterminate progress
    await context?.reportProgress?.(progress++, undefined, 'Connecting to database...');

    await connect(args.database);

    await context?.reportProgress?.(progress++, undefined, 'Fetching schema...');
    const schema = await fetchSchema();

    await context?.reportProgress?.(progress++, undefined, 'Syncing tables...');
    await syncTables(schema);

    await context?.reportProgress?.(progress++, undefined, 'Verifying integrity...');
    await verify();

    await context?.reportProgress?.(progress++, undefined, 'Complete');

    return 'Database synchronized';
  },
});
```

### Example 4: Nested Progress

```typescript
server.addTool({
  name: 'process_dataset',
  description: 'Process large dataset with sub-tasks',
  parameters: z.object({
    dataset: z.string(),
  }),
  execute: async (args, context) => {
    const batches = await loadDataset(args.dataset);
    const totalRecords = batches.reduce((sum, b) => sum + b.length, 0);
    let processedRecords = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      for (let j = 0; j < batch.length; j++) {
        // Process record
        await processRecord(batch[j]);
        processedRecords++;

        // Report overall progress (not per-batch)
        if (processedRecords % 10 === 0) { // Update every 10 records
          await context?.reportProgress?.(
            processedRecords,
            totalRecords,
            `Processing batch ${i + 1}/${batches.length} (${processedRecords}/${totalRecords} records)`
          );
        }
      }
    }

    return `Processed ${processedRecords} records`;
  },
});
```

## Best Practices

### 1. Always Check Availability

```typescript
// Safe progress reporting
if (context?.reportProgress) {
  await context.reportProgress(current, total, message);
}

// Or use optional chaining
await context?.reportProgress?.(current, total, message);
```

### 2. Update at Meaningful Intervals

```typescript
// ❌ Bad: Too frequent (every item)
for (let i = 0; i < 10000; i++) {
  await context?.reportProgress?.(i, 10000);
}

// ✅ Good: Reasonable intervals
for (let i = 0; i < 10000; i++) {
  if (i % 100 === 0) { // Every 100 items
    await context?.reportProgress?.(i, 10000, `Processing...`);
  }
}
```

### 3. Provide Meaningful Messages

```typescript
// ❌ Bad: Generic message
await context?.reportProgress?.(i, total, 'Processing...');

// ✅ Good: Specific status
await context?.reportProgress?.(
  i,
  total,
  `Processing ${currentItem.name} (${i}/${total})`
);
```

### 4. Report Initial and Final Progress

```typescript
// Initial
await context?.reportProgress?.(0, total, 'Starting...');

// ... work ...

// Final
await context?.reportProgress?.(total, total, 'Complete!');
```

### 5. Handle Progress Errors Gracefully

```typescript
try {
  await context?.reportProgress?.(current, total, message);
} catch (error) {
  // Log but don't fail the operation
  context?.logger?.warn('Failed to send progress notification:', error);
}
```

## Patterns

### Pattern 1: Percentage-Based Progress

```typescript
const total = 100; // Use 100 for percentage
for (let i = 0; i <= 100; i += 10) {
  await doWork();
  await context?.reportProgress?.(i, total, `${i}% complete`);
}
```

### Pattern 2: Stage-Based Progress

```typescript
const stages = ['init', 'process', 'finalize'];
for (let i = 0; i < stages.length; i++) {
  await context?.reportProgress?.(
    i + 1,
    stages.length,
    `Stage: ${stages[i]}`
  );
  await executeStage(stages[i]);
}
```

### Pattern 3: Time-Based Updates

```typescript
let lastUpdate = Date.now();
const updateInterval = 1000; // Update every second

for (const item of items) {
  await process(item);

  const now = Date.now();
  if (now - lastUpdate > updateInterval) {
    await context?.reportProgress?.(current, total, status);
    lastUpdate = now;
  }
}
```

## Client Requirements

### For Progress to Work

1. **Client must send progressToken**
   ```json
   {
     "params": {
       "_meta": {
         "progressToken": "unique-token-123"
       }
     }
   }
   ```

2. **Client must handle progress notifications**
   - Subscribe to `notifications/progress`
   - Match notifications by `progressToken`
   - Update UI accordingly

### Claude Desktop Example

Claude Desktop automatically:
- Sends progress tokens for long-running tools
- Displays progress bars in the UI
- Shows status messages

## Limitations

### Current Implementation

- **No Cancellation** - Can't cancel operations in progress (planned for future)
- **Fire and Forget** - No confirmation that client received notification
- **No Backpressure** - Can't tell if progress notifications are being throttled
- **Linear Progress** - Must always increase, can't go backwards

### MCP Protocol

- **Client Opt-In** - Only works if client sends `progressToken`
- **No Guarantee** - Client may ignore or throttle notifications
- **Token Required** - Can't send progress without token

## Performance Considerations

### Throttling Recommendations

```typescript
// For very fast operations
const throttleMs = 100; // Max 10 updates/second
let lastUpdate = 0;

for (let i = 0; i < items.length; i++) {
  await process(items[i]);

  const now = Date.now();
  if (now - lastUpdate > throttleMs || i === items.length - 1) {
    await context?.reportProgress?.(i + 1, items.length);
    lastUpdate = now;
  }
}
```

### Batching

```typescript
// Batch small items, report per-batch
const batchSize = 100;
for (let i = 0; i < items.length; i += batchSize) {
  const batch = items.slice(i, i + batchSize);
  await processBatch(batch);

  await context?.reportProgress?.(
    Math.min(i + batchSize, items.length),
    items.length
  );
}
```

## Use Cases

- 📁 **File Operations** - Copying, converting, uploading files
- 📊 **Data Processing** - ETL, batch processing, analysis
- 🔨 **Build Systems** - Compilation, bundling, deployment
- 🔄 **Synchronization** - Database sync, API sync
- 🧪 **Testing** - Running test suites
- 📦 **Package Management** - Installing dependencies
- 🎨 **Media Processing** - Video encoding, image processing

## Related Features

- [Logging](./logging.md) - Log progress milestones
- [Sampling](./sampling.md) - Report progress during LLM requests
- [Context API](./context-api.md) - Full context interface

## Troubleshooting

### Progress Not Showing

**Cause:** Client not sending `progressToken`

**Solutions:**
1. Verify client supports progress notifications
2. Check client configuration
3. Test with Claude Desktop or MCP Inspector

### "Cannot report progress" Error

**Cause:** `context.reportProgress` is undefined

**Solutions:**
1. Always use optional chaining: `context?.reportProgress?.()`
2. Check that client sent progressToken
3. Verify tool is called by MCP client (not directly)

### Progress Bar Stuck

**Cause:** Not updating total or sending final progress

**Solutions:**
1. Always send final progress at 100%
2. Provide accurate `total` value
3. Ensure `progress` reaches `total`

## Future Enhancements

- [ ] Progress cancellation support
- [ ] Progress notification batching
- [ ] Progress acknowledgment from client
- [ ] Sub-task progress (nested progress bars)
- [ ] Estimated time remaining
- [ ] Progress streaming for real-time updates

---

**Next Steps:**
- Learn about [Logging to Client](./logging.md)
- See [Complete Context API](./context-api.md)
- Explore [Examples](../../examples/phase1-features.ts)
