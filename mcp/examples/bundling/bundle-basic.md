# Basic Bundling Example

This guide demonstrates basic bundling of SimplyMCP servers into standalone distributions.

## Prerequisites

- SimplyMCP server file (e.g., `server.ts`)
- Node.js 18+ installed
- npm/yarn/pnpm package manager

## Simple Single-File Bundle

The simplest way to bundle a SimplyMCP server:

```bash
simplemcp bundle server.ts
```

This creates `dist/bundle.js` with:
- All dependencies bundled
- Minified code
- Production-ready output

**Output:**
```
SimplyMCP Bundler
=================

Entry:    /path/to/server.ts
Output:   /path/to/dist/bundle.js
Format:   single-file
Minify:   Yes
Platform: node
Target:   node20

✓ Bundle created successfully!

Output:   /path/to/dist/bundle.js
Size:     847.2 KB
Duration: 1234ms
```

## Run the Bundle

After bundling, run your server:

```bash
node dist/bundle.js
```

The bundle is completely self-contained - no `node_modules` needed!

## Custom Output Path

Specify a custom output location:

```bash
simplemcp bundle server.ts --output build/server.bundle.js
```

## Development Mode

For development with source maps and no minification:

```bash
simplemcp bundle server.ts --no-minify --sourcemap
```

This creates:
- `dist/bundle.js` - Readable, unminified code
- `dist/bundle.js.map` - Source map for debugging

## Watch Mode

Auto-rebuild on file changes:

```bash
simplemcp bundle server.ts --watch
```

Perfect for development - the bundle rebuilds automatically when you edit files.

## Example: Complete Workflow

### 1. Create a SimplyMCP Server

```typescript
// server.ts
import { SimplyMCP } from './SimplyMCP';
import { z } from 'zod';

const server = new SimplyMCP({
  name: 'my-server',
  version: '1.0.0'
});

server.addTool({
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({
    name: z.string(),
  }),
  execute: async (args) => {
    return `Hello, ${args.name}!`;
  },
});

await server.start({ transport: 'stdio' });
```

### 2. Bundle It

```bash
simplemcp bundle server.ts
```

### 3. Deploy

Copy the single file to your server:

```bash
scp dist/bundle.js user@server:/app/
ssh user@server
cd /app
node bundle.js
```

Done! Your server is running with zero configuration.

## Deployment Examples

### Local Deployment

```bash
# Bundle
simplemcp bundle server.ts

# Copy to production directory
cp dist/bundle.js /opt/my-server/

# Run
node /opt/my-server/bundle.js
```

### Docker Deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy bundle (no npm install needed!)
COPY dist/bundle.js .

CMD ["node", "bundle.js"]
```

Build and run:

```bash
docker build -t my-server .
docker run -p 3000:3000 my-server
```

### systemd Service

Create `/etc/systemd/system/my-server.service`:

```ini
[Unit]
Description=My SimplyMCP Server
After=network.target

[Service]
Type=simple
User=nobody
WorkingDirectory=/opt/my-server
ExecStart=/usr/bin/node /opt/my-server/bundle.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable my-server
sudo systemctl start my-server
sudo systemctl status my-server
```

## Tips

### Bundle Size

Check bundle size:

```bash
ls -lh dist/bundle.js
```

Typical sizes:
- Small server (few dependencies): 200-500 KB
- Medium server (axios, zod, etc.): 800 KB - 2 MB
- Large server (many dependencies): 2-5 MB

### Optimization

For smallest bundle size:

```bash
simplemcp bundle server.ts \
  --minify \
  --target esnext \
  --external fsevents
```

### Debugging

If bundle fails, use verbose mode:

```bash
simplemcp bundle server.ts --verbose
```

## Next Steps

- [Advanced Bundling](./bundle-advanced.md) - Learn about different formats
- [Configuration Files](./bundle-config.md) - Use config files for complex setups
