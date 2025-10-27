# Advanced Transport Topics

Advanced transport configurations, multi-transport servers, and production deployment.

## Table of Contents

- [Custom Ports](#custom-ports)
- [Environment Configuration](#environment-configuration)
- [Load Balancing](#load-balancing)
- [Health Monitoring](#health-monitoring)
- [Scaling Strategies](#scaling-strategies)
- [Multi-Transport Servers](#multi-transport-servers)
- [Dynamic Transport Switching](#dynamic-transport-switching)
- [Production Deployment](#production-deployment)
  - [Stdio in Production](#stdio-in-production)
  - [HTTP Stateful in Production](#http-stateful-in-production)
  - [HTTP Stateless in Production](#http-stateless-in-production)
  - [Docker Deployment](#docker-deployment)
  - [Kubernetes Deployment](#kubernetes-deployment)
- [Related Guides](#related-guides)

---

## Custom Ports

**Set port in constructor:**

```typescript
const server = new BuildMCPServer({
  name: 'custom-port-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    port: 8080  // Custom port
  }
});

await server.start();
```

**Override at start:**

```typescript
const server = new BuildMCPServer({
  name: 'flexible-server',
  version: '1.0.0',
  transport: {
    port: 3000  // Default
  }
});

await server.start({ port: 9000 });  // Override
```

**From environment variable:**

```typescript
const server = new BuildMCPServer({
  name: 'env-port-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    port: parseInt(process.env.PORT || '3000')
  }
});
```

## Environment Configuration

**Using .env file:**

```bash
# .env
MCP_TRANSPORT=http
MCP_PORT=3000
MCP_STATEFUL=true
MCP_LOG_LEVEL=debug
```

```typescript
import dotenv from 'dotenv';
dotenv.config();

const server = new BuildMCPServer({
  name: 'env-config-server',
  version: '1.0.0',
  transport: {
    type: process.env.MCP_TRANSPORT as 'stdio' | 'http' || 'stdio',
    port: parseInt(process.env.MCP_PORT || '3000'),
    stateful: process.env.MCP_STATEFUL === 'true'
  }
});
```

**Configuration file:**

```typescript
// config/production.ts
export const config = {
  name: 'production-server',
  version: '1.0.0',
  transport: {
    type: 'http' as const,
    port: 8080,
    stateful: true
  },
  capabilities: {
    logging: true
  }
};

// server.ts
import { config } from './config/production';
const server = new BuildMCPServer(config);
```

## Load Balancing

**HTTP Stateful with Sticky Sessions:**

```nginx
# nginx.conf
upstream mcp_servers {
    ip_hash;  # Sticky sessions based on client IP

    server 10.0.1.1:3000;
    server 10.0.1.2:3000;
    server 10.0.1.3:3000;
}

server {
    listen 80;

    location /mcp {
        proxy_pass http://mcp_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Forward session header
        proxy_set_header Mcp-Session-Id $http_mcp_session_id;
    }
}
```

**HTTP Stateless (no sticky sessions needed):**

```nginx
# nginx.conf
upstream mcp_stateless {
    least_conn;  # Any load balancing algorithm works

    server 10.0.1.1:3000;
    server 10.0.1.2:3000;
    server 10.0.1.3:3000;
}

server {
    listen 80;

    location /mcp {
        proxy_pass http://mcp_stateless;
        proxy_set_header Host $host;
    }
}
```

## Health Monitoring

**Built-in health endpoint (HTTP only):**

```bash
curl http://localhost:3000/health
```

**Response:**

```json
{
  "status": "ok",
  "server": {
    "name": "my-server",
    "version": "1.0.0",
    "description": "My MCP Server"
  },
  "transport": {
    "type": "http",
    "mode": "stateful",
    "sessions": 3,
    "port": 3000
  },
  "capabilities": {},
  "resources": {
    "tools": 5,
    "prompts": 2,
    "resources": 1
  },
  "uptime": 1234.567,
  "timestamp": "2025-10-06T01:00:00.000Z"
}
```

**Kubernetes Liveness/Readiness:**

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: mcp-server
        image: my-mcp-server:latest
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
```

## Scaling Strategies

**Vertical Scaling (Stdio/HTTP Stateful):**

```typescript
// Increase process resources
const server = new BuildMCPServer({
  name: 'high-performance-server',
  version: '1.0.0',
  defaultTimeout: 60000,  // Longer timeout for heavy operations
  transport: {
    type: 'http',
    port: 3000,
    stateful: true
  }
});

// Run with more memory
// node --max-old-space-size=4096 server.js
```

**Horizontal Scaling (HTTP Stateless):**

```bash
# Deploy multiple instances
kubectl scale deployment mcp-server --replicas=10

# Auto-scaling
kubectl autoscale deployment mcp-server \
  --min=3 --max=20 --cpu-percent=70
```

## Multi-Transport Servers

**Not directly supported**, but you can run separate server instances:

```typescript
import { BuildMCPServer } from 'simply-mcp';
import { z } from 'zod';

// Shared tool definition
const greetTool = {
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({ name: z.string() }),
  execute: async (args: any) => `Hello, ${args.name}!`
};

// Stdio server
const stdioServer = new BuildMCPServer({
  name: 'multi-transport-stdio',
  version: '1.0.0'
});
stdioServer.addTool(greetTool);

// HTTP server
const httpServer = new BuildMCPServer({
  name: 'multi-transport-http',
  version: '1.0.0',
  transport: { type: 'http', port: 3000 }
});
httpServer.addTool(greetTool);

// Start based on environment
const transport = process.env.TRANSPORT || 'stdio';

if (transport === 'stdio') {
  await stdioServer.start({ transport: 'stdio' });
} else {
  await httpServer.start({ transport: 'http', port: 3000 });
}
```

## Dynamic Transport Switching

**Switch transport at runtime:**

```typescript
const server = new BuildMCPServer({
  name: 'dynamic-server',
  version: '1.0.0'
});

server.addTool({
  name: 'greet',
  description: 'Greet a user',
  parameters: z.object({ name: z.string() }),
  execute: async (args) => `Hello, ${args.name}!`
});

// Start with stdio
await server.start({ transport: 'stdio' });

// Later, restart with HTTP (requires stop first)
// Note: In practice, you'd typically just restart the process
// This is more for demonstration

// Stop stdio
await server.stop();

// Start HTTP
await server.start({ transport: 'http', port: 3000 });
```

## Production Deployment

### Stdio in Production

**Docker Container:**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

# Stdio doesn't need EXPOSE

CMD ["npx", "tsx", "server.ts"]
```

**Usage:**

```bash
docker run -i my-mcp-server < input.jsonl > output.jsonl
```

**Systemd Service (Linux):**

```ini
# /etc/systemd/system/mcp-server.service
[Unit]
Description=MCP Stdio Server
After=network.target

[Service]
Type=simple
User=mcp
WorkingDirectory=/opt/mcp-server
ExecStart=/usr/bin/node server.js
Restart=on-failure
StandardInput=socket
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### HTTP Stateful in Production

**Docker with Health Checks:**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); });"

CMD ["node", "server.js"]
```

**Docker Compose:**

```yaml
version: '3.8'

services:
  mcp-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
```

**Nginx Reverse Proxy:**

```nginx
server {
    listen 80;
    server_name api.example.com;

    location /mcp {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # CORS
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Expose-Headers Mcp-Session-Id;
    }

    location /health {
        proxy_pass http://localhost:3000/health;
    }
}
```

### HTTP Stateless in Production

**Kubernetes Deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-stateless
spec:
  replicas: 5
  selector:
    matchLabels:
      app: mcp-stateless
  template:
    metadata:
      labels:
        app: mcp-stateless
    spec:
      containers:
      - name: mcp-server
        image: my-mcp-server:latest
        env:
        - name: MCP_STATEFUL
          value: "false"
        - name: PORT
          value: "3000"
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: mcp-stateless-service
spec:
  type: LoadBalancer
  selector:
    app: mcp-stateless
  ports:
  - port: 80
    targetPort: 3000
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mcp-stateless-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mcp-stateless
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Docker Deployment

**Multi-stage build (optimized):**

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

USER node

CMD ["node", "dist/server.js"]
```

### Kubernetes Deployment

**With Ingress:**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mcp-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: mcp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: mcp-stateless-service
            port:
              number: 80
```

---

## Related Guides

- [Transport Overview](./TRANSPORT_OVERVIEW.md) - Transport comparison
- [HTTP Transport](./TRANSPORT_HTTP.md) - HTTP basics
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production patterns

