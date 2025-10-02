# Bundling & Deployment Guide

## Introduction

This guide provides comprehensive deployment strategies for SimpleMCP server bundles. Learn how to deploy your bundled servers to various platforms including traditional servers, containers, serverless environments, and edge functions.

### What You'll Learn

- Deploying to traditional servers (VPS, dedicated)
- Containerizing with Docker
- Serverless deployments (AWS Lambda, Vercel, Cloudflare)
- CI/CD pipeline integration (GitHub Actions, GitLab CI)
- Distributing to end users
- Monitoring and logging in production
- Rollback and recovery procedures

### Prerequisites

- SimpleMCP server bundled with `simplemcp bundle`
- Basic knowledge of your target deployment platform
- SSH access (for server deployments) or platform credentials

## Deployment Scenarios

### Scenario 1: Traditional Server (VPS/Dedicated)

Deploy bundled SimpleMCP servers to traditional Linux servers.

#### Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- Node.js 18+ installed
- SSH access with sudo privileges
- Domain name (optional, for HTTPS)

#### Step 1: Bundle Your Server

```bash
# Production bundle
simplemcp bundle server.ts \
  --output dist/server.js \
  --minify \
  --target node20 \
  --external fsevents
```

#### Step 2: Prepare Server Environment

```bash
# SSH into your server
ssh user@your-server.com

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be 20.x
```

#### Step 3: Create Application Directory

```bash
# Create app directory
sudo mkdir -p /opt/myserver
sudo chown $USER:$USER /opt/myserver
cd /opt/myserver
```

#### Step 4: Deploy Bundle

```bash
# From local machine, copy bundle
scp dist/server.js user@your-server.com:/opt/myserver/

# If native modules required, install on server
ssh user@your-server.com "cd /opt/myserver && npm install fsevents better-sqlite3"
```

#### Step 5: Create systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/myserver.service
```

**Content:**
```ini
[Unit]
Description=SimpleMCP Server
After=network.target

[Service]
Type=simple
User=nobody
Group=nogroup
WorkingDirectory=/opt/myserver
ExecStart=/usr/bin/node /opt/myserver/server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

# Environment variables
Environment="NODE_ENV=production"
Environment="PORT=3000"

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/myserver

[Install]
WantedBy=multi-user.target
```

#### Step 6: Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable myserver

# Start service
sudo systemctl start myserver

# Check status
sudo systemctl status myserver
```

#### Step 7: Configure Reverse Proxy (Optional)

**Install Nginx:**
```bash
sudo apt install -y nginx
```

**Configure Nginx:**
```bash
sudo nano /etc/nginx/sites-available/myserver
```

**Content:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/myserver /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 8: Setup SSL with Let's Encrypt (Optional)

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (certbot creates cron job automatically)
```

#### Step 9: Verify Deployment

```bash
# Check service status
sudo systemctl status myserver

# View logs
sudo journalctl -u myserver -f

# Test endpoint
curl http://localhost:3000
curl https://your-domain.com
```

---

### Scenario 2: Docker Container

Containerize SimpleMCP servers for portable deployments.

#### Prerequisites

- Docker installed locally and on server
- Docker Hub or private registry account
- Basic Docker knowledge

#### Step 1: Create Optimized Dockerfile

**Dockerfile:**
```dockerfile
# Multi-stage build for smallest image
FROM node:20 AS builder

WORKDIR /app

# Copy source
COPY . .

# Install dependencies and bundle
RUN npm install
RUN npx simplemcp bundle server.ts \
    --output dist/bundle.js \
    --minify \
    --target node20

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy only bundle
COPY --from=builder /app/dist/bundle.js .

# Install native modules if needed
# RUN npm install fsevents better-sqlite3

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1))" || exit 1

# Start server
CMD ["node", "bundle.js"]
```

#### Step 2: Create .dockerignore

**.dockerignore:**
```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.local
dist
coverage
.DS_Store
```

#### Step 3: Build Image

```bash
# Build image
docker build -t myserver:latest .

# Tag for registry
docker tag myserver:latest your-username/myserver:latest
docker tag myserver:latest your-username/myserver:1.0.0
```

#### Step 4: Test Locally

```bash
# Run container
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  --name myserver \
  myserver:latest

# Test
curl http://localhost:3000

# View logs
docker logs -f myserver

# Stop
docker stop myserver
docker rm myserver
```

#### Step 5: Push to Registry

```bash
# Login to Docker Hub
docker login

# Push images
docker push your-username/myserver:latest
docker push your-username/myserver:1.0.0
```

#### Step 6: Deploy to Server

```bash
# SSH to server
ssh user@your-server.com

# Pull image
docker pull your-username/myserver:latest

# Run container
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  --name myserver \
  --restart unless-stopped \
  your-username/myserver:latest

# Check status
docker ps
docker logs myserver
```

#### Step 7: Docker Compose (Recommended)

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  myserver:
    image: your-username/myserver:latest
    container_name: myserver
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1))"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
    networks:
      - myserver-network

networks:
  myserver-network:
    driver: bridge
```

**Deploy:**
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

### Scenario 3: AWS Lambda (Serverless)

Deploy SimpleMCP servers as AWS Lambda functions.

#### Prerequisites

- AWS account with CLI configured
- AWS SAM CLI or Serverless Framework installed
- Basic Lambda knowledge

#### Step 1: Bundle for Lambda

```bash
# Bundle optimized for Lambda
simplemcp bundle server.ts \
  --output lambda/index.js \
  --format single-file \
  --minify \
  --target node20 \
  --external aws-sdk
```

#### Step 2: Create Lambda Handler

**lambda/handler.js:**
```javascript
import { handler as serverHandler } from './index.js';

export const handler = async (event, context) => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));

    // SimpleMCP servers use stdio by default
    // For Lambda, we need HTTP/REST adapter
    const result = await serverHandler(event, context);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};
```

#### Step 3: Create SAM Template

**template.yaml:**
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Timeout: 30
    MemorySize: 512
    Runtime: nodejs20.x

Resources:
  MyServerFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: lambda/
      Handler: handler.handler
      Environment:
        Variables:
          NODE_ENV: production
          LOG_LEVEL: info
      Events:
        ApiGateway:
          Type: Api
          Properties:
            Path: /{proxy+}
            Method: ANY

Outputs:
  ApiUrl:
    Description: "API Gateway endpoint URL"
    Value: !Sub "https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/"
```

#### Step 4: Deploy with SAM

```bash
# Build
sam build

# Deploy (first time - guided)
sam deploy --guided

# Subsequent deploys
sam deploy

# Test
curl https://your-api-url.execute-api.us-east-1.amazonaws.com/Prod/
```

#### Step 5: Alternative - Serverless Framework

**serverless.yml:**
```yaml
service: myserver

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  memorySize: 512
  timeout: 30

functions:
  server:
    handler: lambda/handler.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
    environment:
      NODE_ENV: production
      LOG_LEVEL: info

package:
  patterns:
    - lambda/**
    - '!node_modules/**'
```

**Deploy:**
```bash
# Install Serverless Framework
npm install -g serverless

# Deploy
serverless deploy

# View logs
serverless logs -f server -t
```

#### Step 6: Monitor and Debug

```bash
# View CloudWatch logs
aws logs tail /aws/lambda/myserver-function --follow

# Invoke function
aws lambda invoke \
  --function-name myserver-function \
  --payload '{"test": true}' \
  response.json
```

---

### Scenario 4: Vercel Edge Functions

Deploy to Vercel's edge network for global distribution.

#### Prerequisites

- Vercel account
- Vercel CLI installed (`npm i -g vercel`)

#### Step 1: Bundle for Vercel

```bash
# Bundle as ESM for Vercel
simplemcp bundle server.ts \
  --output api/server.js \
  --format esm \
  --minify \
  --target esnext
```

#### Step 2: Create Vercel Configuration

**vercel.json:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/api/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

#### Step 3: Create API Endpoint

**api/server.js** (already bundled):
```javascript
// Your bundled SimpleMCP server
export default async function handler(req, res) {
  // Handle MCP requests
  // Vercel provides req/res objects
}
```

#### Step 4: Deploy

```bash
# Login to Vercel
vercel login

# Deploy (first time)
vercel

# Production deploy
vercel --prod

# View deployment
vercel ls
```

#### Step 5: Environment Variables

```bash
# Add secrets
vercel env add API_KEY production
vercel env add DATABASE_URL production

# List variables
vercel env ls
```

#### Step 6: Monitor

```bash
# View logs
vercel logs https://your-deployment-url.vercel.app

# View deployments
vercel ls
```

---

### Scenario 5: GitHub Actions CI/CD

Automate bundling and deployment with GitHub Actions.

#### Prerequisites

- GitHub repository
- Deployment target configured (server, AWS, Vercel, etc.)
- Secrets configured in GitHub

#### Step 1: Create Workflow

**.github/workflows/deploy.yml:**
```yaml
name: Bundle and Deploy

on:
  push:
    branches: [main, production]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - run: npm test

  bundle:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push'

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Bundle server
        run: |
          npx simplemcp bundle server.ts \
            --output dist/server.js \
            --minify \
            --target node20 \
            --auto-install

      - name: Upload bundle artifact
        uses: actions/upload-artifact@v3
        with:
          name: server-bundle
          path: dist/server.js

  deploy-production:
    needs: bundle
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/download-artifact@v3
        with:
          name: server-bundle
          path: dist/

      - name: Deploy to server
        env:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          SERVER_HOST: ${{ secrets.SERVER_HOST }}
          SERVER_USER: ${{ secrets.SERVER_USER }}
        run: |
          # Setup SSH
          mkdir -p ~/.ssh
          echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H $SERVER_HOST >> ~/.ssh/known_hosts

          # Deploy bundle
          scp dist/server.js $SERVER_USER@$SERVER_HOST:/opt/myserver/

          # Restart service
          ssh $SERVER_USER@$SERVER_HOST "sudo systemctl restart myserver"

      - name: Verify deployment
        env:
          SERVER_HOST: ${{ secrets.SERVER_HOST }}
        run: |
          sleep 5
          curl -f https://$SERVER_HOST/health || exit 1
```

#### Step 2: Configure Secrets

Go to GitHub repository settings → Secrets and add:

- `SSH_PRIVATE_KEY` - SSH private key for deployment
- `SERVER_HOST` - Server hostname
- `SERVER_USER` - SSH username

#### Step 3: Test Workflow

```bash
# Push to main branch
git add .
git commit -m "Deploy via GitHub Actions"
git push origin main

# View workflow
# Go to Actions tab in GitHub
```

#### Step 4: Advanced - Docker Deploy

**.github/workflows/docker-deploy.yml:**
```yaml
name: Docker Build and Deploy

on:
  push:
    branches: [main]
    tags:
      - 'v*'

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: your-username/myserver
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}

      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

      - name: Deploy to server
        env:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          SERVER_HOST: ${{ secrets.SERVER_HOST }}
        run: |
          mkdir -p ~/.ssh
          echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H $SERVER_HOST >> ~/.ssh/known_hosts

          ssh user@$SERVER_HOST << 'EOF'
            docker pull your-username/myserver:latest
            docker stop myserver || true
            docker rm myserver || true
            docker run -d \
              -p 3000:3000 \
              -e NODE_ENV=production \
              --name myserver \
              --restart unless-stopped \
              your-username/myserver:latest
          EOF
```

---

### Scenario 6: End-User Distribution

Package SimpleMCP servers for end users without Node.js expertise.

#### Step 1: Create Executable Bundle

```bash
simplemcp bundle server.ts \
  --format executable \
  --output dist/myserver
```

#### Step 2: Create Distribution Package

**Package structure:**
```
myserver-v1.0.0/
├── myserver           # Executable wrapper
├── myserver.js        # Bundle
├── README.md          # User guide
├── LICENSE            # License
└── config.example.json # Example config
```

#### Step 3: Write User README

**README.md:**
```markdown
# MyServer - SimpleMCP Server

## Installation

### macOS/Linux

1. Extract the archive:
   \`\`\`bash
   unzip myserver-v1.0.0.zip
   cd myserver-v1.0.0
   \`\`\`

2. Make executable:
   \`\`\`bash
   chmod +x myserver
   \`\`\`

3. Run:
   \`\`\`bash
   ./myserver
   \`\`\`

### Windows

1. Extract the archive
2. Double-click `myserver.bat`

## Configuration

Copy `config.example.json` to `config.json` and edit:

\`\`\`json
{
  "port": 3000,
  "logLevel": "info"
}
\`\`\`

## Requirements

- Node.js 18+ (download from https://nodejs.org)

## Support

For issues, visit: https://github.com/your-org/myserver/issues
```

#### Step 4: Create Platform Scripts

**myserver.sh** (macOS/Linux):
```bash
#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
node "$DIR/myserver.js" "$@"
```

**myserver.bat** (Windows):
```batch
@echo off
SET DIR=%~dp0
node "%DIR%myserver.js" %*
```

#### Step 5: Package for Distribution

```bash
# Create archive
zip -r myserver-v1.0.0.zip myserver-v1.0.0/

# Or tar.gz
tar -czf myserver-v1.0.0.tar.gz myserver-v1.0.0/
```

#### Step 6: Distribute

- GitHub Releases
- npm package
- Direct download from website
- Package managers (homebrew, apt)

---

## Production Checklist

Before deploying to production, verify:

### Security

- [ ] Environment variables for secrets (not hardcoded)
- [ ] HTTPS enabled (SSL/TLS)
- [ ] Rate limiting configured
- [ ] Authentication/authorization implemented
- [ ] Input validation enabled
- [ ] Security headers set
- [ ] CORS properly configured
- [ ] No debug logs in production

### Performance

- [ ] Bundle minified
- [ ] Tree-shaking enabled
- [ ] Native modules externalized
- [ ] Connection pooling configured
- [ ] Caching strategy implemented
- [ ] CDN configured (if applicable)

### Reliability

- [ ] Health check endpoint
- [ ] Graceful shutdown implemented
- [ ] Error handling comprehensive
- [ ] Retry logic for external services
- [ ] Circuit breakers configured
- [ ] Timeouts set appropriately

### Monitoring

- [ ] Logging configured
- [ ] Metrics collection setup
- [ ] Alerting configured
- [ ] Error tracking (Sentry, etc.)
- [ ] Performance monitoring (APM)
- [ ] Uptime monitoring

### Deployment

- [ ] Automated deployment pipeline
- [ ] Rollback procedure documented
- [ ] Blue-green or canary deployment
- [ ] Database migrations automated
- [ ] Configuration management
- [ ] Secrets management

### Documentation

- [ ] Deployment guide written
- [ ] Runbook for operations
- [ ] Architecture diagrams
- [ ] API documentation
- [ ] Troubleshooting guide

---

## Monitoring and Logging

### Centralized Logging

**Using Winston + CloudWatch:**

```javascript
import winston from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new WinstonCloudWatch({
      logGroupName: 'myserver',
      logStreamName: process.env.HOSTNAME,
      awsRegion: 'us-east-1',
    }),
  ],
});
```

**Using Pino + Datadog:**

```javascript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  transport: {
    target: 'pino-datadog',
    options: {
      apiKey: process.env.DATADOG_API_KEY,
      service: 'myserver',
      env: process.env.NODE_ENV,
    },
  },
});
```

### Metrics Collection

**Prometheus metrics:**

```javascript
import promClient from 'prom-client';

const register = new promClient.Registry();

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// Expose /metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Health Checks

```javascript
app.get('/health', (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'ok',
  };

  res.status(200).json(health);
});

app.get('/ready', async (req, res) => {
  try {
    // Check dependencies
    await db.ping();
    await redis.ping();

    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});
```

---

## Rollback Procedures

### Traditional Server Rollback

```bash
# Keep previous versions
/opt/myserver/
├── current -> releases/v1.2.0/
├── releases/
│   ├── v1.2.0/
│   ├── v1.1.0/
│   └── v1.0.0/

# Rollback script
#!/bin/bash
VERSION=$1

# Stop service
sudo systemctl stop myserver

# Update symlink
sudo ln -sfn /opt/myserver/releases/$VERSION /opt/myserver/current

# Start service
sudo systemctl start myserver

# Verify
sleep 2
sudo systemctl status myserver
curl http://localhost:3000/health
```

### Docker Rollback

```bash
# Tag deployments
docker tag myserver:latest myserver:v1.2.0

# Rollback
docker stop myserver
docker rm myserver
docker run -d \
  -p 3000:3000 \
  --name myserver \
  myserver:v1.1.0  # Previous version
```

### Lambda Rollback

```bash
# List versions
aws lambda list-versions-by-function --function-name myserver

# Update alias to previous version
aws lambda update-alias \
  --function-name myserver \
  --name production \
  --function-version 3  # Previous version
```

### Kubernetes Rollback

```bash
# View rollout history
kubectl rollout history deployment/myserver

# Rollback to previous
kubectl rollout undo deployment/myserver

# Rollback to specific revision
kubectl rollout undo deployment/myserver --to-revision=2
```

---

## Common Pitfalls

### 1. Forgetting Native Modules

**Problem:** Bundle fails at runtime with "Cannot find module 'fsevents'"

**Solution:**
```bash
# Externalize native modules
simplemcp bundle server.ts --external fsevents,better-sqlite3

# Install on server
npm install fsevents better-sqlite3
```

### 2. Wrong Node.js Version

**Problem:** Bundle uses features not available in deployment environment

**Solution:**
```bash
# Target specific Node version
simplemcp bundle server.ts --target node18  # For Node 18 servers
```

### 3. Missing Environment Variables

**Problem:** Server fails because environment variables aren't set

**Solution:**
```bash
# Document required variables
# Create .env.example
# Set in deployment environment
```

### 4. Hard-Coded Paths

**Problem:** Bundle expects files in specific locations

**Solution:**
```javascript
// Use relative paths
const dataPath = path.join(__dirname, 'data');

// Or environment variables
const dataPath = process.env.DATA_DIR || './data';
```

### 5. Memory Leaks

**Problem:** Server memory usage grows over time

**Solution:**
- Monitor memory with `--max-old-space-size=512`
- Use heap snapshots to find leaks
- Implement connection pooling
- Clean up event listeners

### 6. File System Access in Serverless

**Problem:** Lambda can't write to file system (except /tmp)

**Solution:**
- Use S3 for persistent storage
- Use /tmp for temporary files (500MB limit)
- Store state in database or cache

### 7. Cold Start Times

**Problem:** Lambda cold starts are too slow

**Solution:**
```bash
# Minimize bundle size
simplemcp bundle server.ts \
  --minify \
  --tree-shake \
  --external aws-sdk \
  --target node20

# Use provisioned concurrency (Lambda)
# Keep functions warm with scheduled pings
```

### 8. CORS Issues

**Problem:** Browser requests blocked by CORS

**Solution:**
```javascript
// Add CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
```

---

## Security Considerations

### 1. Secrets Management

**Never bundle secrets:**
```bash
# Bad - secrets in bundle
const API_KEY = "sk-1234567890";

# Good - from environment
const API_KEY = process.env.API_KEY;
```

**Use secrets managers:**
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Environment variables

### 2. Input Validation

```javascript
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  age: z.number().min(0).max(120),
});

// Validate all inputs
const result = schema.safeParse(input);
if (!result.success) {
  throw new Error('Invalid input');
}
```

### 3. Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 4. Security Headers

```javascript
import helmet from 'helmet';

app.use(helmet());
```

### 5. HTTPS Only

```javascript
// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

---

## Performance Optimization

### 1. Connection Pooling

```javascript
// Database connection pool
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 2. Caching

```javascript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache responses
app.get('/api/data', async (req, res) => {
  const cached = await redis.get('api:data');
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  const data = await fetchData();
  await redis.setex('api:data', 300, JSON.stringify(data)); // 5 min TTL
  res.json(data);
});
```

### 3. Compression

```javascript
import compression from 'compression';

app.use(compression());
```

### 4. CDN for Static Assets

- CloudFront (AWS)
- Cloudflare
- Fastly
- Vercel Edge Network

---

## Summary

This guide covered comprehensive deployment strategies for SimpleMCP bundles:

1. **Traditional Servers** - systemd services with Nginx
2. **Docker** - Containerized deployments
3. **AWS Lambda** - Serverless functions
4. **Vercel** - Edge functions
5. **GitHub Actions** - CI/CD automation
6. **End-User Distribution** - Executable packages

### Key Takeaways

- Bundle servers with `simplemcp bundle` before deployment
- Externalize native modules - they can't be bundled
- Use environment variables for configuration
- Implement health checks and monitoring
- Automate deployments with CI/CD
- Document rollback procedures
- Follow security best practices
- Optimize for your deployment platform

### Next Steps

- Choose your deployment platform
- Follow the relevant scenario
- Set up monitoring and logging
- Configure CI/CD pipeline
- Test rollback procedures
- Document for your team

---

**Last Updated:** October 2, 2025
**Version:** 1.4.0
**Maintained by:** SimpleMCP Team
