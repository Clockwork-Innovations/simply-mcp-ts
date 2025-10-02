# Deployment Guide

**Version:** 1.0.0
**Last Updated:** 2025-09-29

Complete guide to deploying the MCP Configurable Framework to production.

## Table of Contents

1. [Production Checklist](#production-checklist)
2. [Environment Variables](#environment-variables)
3. [Security Hardening](#security-hardening)
4. [Performance Tuning](#performance-tuning)
5. [Monitoring and Logging](#monitoring-and-logging)
6. [Docker Deployment](#docker-deployment)
7. [Systemd Service](#systemd-service)
8. [Reverse Proxy Configuration](#reverse-proxy-configuration)
9. [SSL/TLS Setup](#ssltls-setup)
10. [Health Checks](#health-checks)
11. [Backup and Recovery](#backup-and-recovery)
12. [Scaling](#scaling)

---

## Production Checklist

### Pre-Deployment

- [ ] Configuration file validated
- [ ] All handler files exist and tested
- [ ] Security configuration enabled
- [ ] API keys generated (strong, random)
- [ ] Environment variables configured
- [ ] SSL/TLS certificates obtained
- [ ] Firewall rules configured
- [ ] Monitoring setup complete
- [ ] Backup strategy defined
- [ ] Rollback plan documented

### Post-Deployment

- [ ] Health check endpoint responding
- [ ] Logs being written correctly
- [ ] Metrics being collected
- [ ] SSL certificate valid
- [ ] API endpoints accessible
- [ ] Authentication working
- [ ] Rate limiting functional
- [ ] Audit logs being written
- [ ] Alerts configured
- [ ] Documentation updated

---

## Environment Variables

### Required Variables

```bash
# Server Configuration
NODE_ENV=production
PORT=3001
CONFIG_PATH=/etc/mcp/config.json

# Security
API_KEY_SALT=your-random-salt-here
SESSION_SECRET=your-session-secret-here

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/mcp/server.log
AUDIT_LOG_FILE=/var/log/mcp/audit.log
```

### Optional Variables

```bash
# Performance
NODE_OPTIONS=--max-old-space-size=2048
MAX_REQUEST_SIZE=10mb
REQUEST_TIMEOUT=30000

# External Services (example)
DATABASE_URL=postgresql://user:pass@localhost:5432/db
REDIS_URL=redis://localhost:6379
API_TOKEN=your-api-token

# Monitoring
METRICS_ENABLED=true
METRICS_PORT=9090
HEALTH_CHECK_PATH=/health
```

### Managing Environment Variables

**Development** (`.env` file):
```bash
NODE_ENV=development
PORT=3001
CONFIG_PATH=./mcp/config-dev.json
LOG_LEVEL=debug
```

**Production** (systemd service):
```ini
[Service]
Environment="NODE_ENV=production"
Environment="PORT=3001"
EnvironmentFile=/etc/mcp/environment
```

**Docker** (docker-compose.yml):
```yaml
environment:
  - NODE_ENV=production
  - PORT=3001
env_file:
  - .env.production
```

---

## Security Hardening

### 1. API Key Security

**Generate Strong Keys**:
```bash
# Generate 32-byte random key
openssl rand -base64 32

# Or using Node
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Store Securely**:
```bash
# Use environment variables
export MCP_API_KEY="your-generated-key"

# Or use secrets manager
# AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id mcp/api-keys

# Or HashiCorp Vault
vault kv get secret/mcp/api-keys
```

**Rotate Regularly**:
```bash
# Rotate API keys every 90 days
# 1. Generate new key
# 2. Add to config with overlap period
# 3. Update clients
# 4. Remove old key after transition period
```

### 2. Network Security

**Firewall Rules** (ufw):
```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 443/tcp  # HTTPS only
sudo ufw enable
```

**IP Whitelisting** (config.json):
```json
{
  "security": {
    "ipWhitelist": [
      "10.0.0.0/8",
      "192.168.0.0/16",
      "203.0.113.0/24"
    ]
  }
}
```

### 3. TLS/SSL Configuration

**Obtain Certificate**:
```bash
# Using Let's Encrypt
sudo certbot certonly --standalone -d mcp.yourdomain.com

# Certificates saved to:
# /etc/letsencrypt/live/mcp.yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/mcp.yourdomain.com/privkey.pem
```

**Configure HTTPS** (use nginx as reverse proxy - see below)

### 4. Rate Limiting

**Production Rate Limits**:
```json
{
  "security": {
    "rateLimit": {
      "enabled": true,
      "global": {
        "window": 60000,
        "maxRequests": 1000
      },
      "perTool": {
        "expensive-operation": {
          "window": 60000,
          "maxRequests": 10
        }
      },
      "perApiKey": {
        "free-tier": {
          "window": 60000,
          "maxRequests": 100
        },
        "paid-tier": {
          "window": 60000,
          "maxRequests": 10000
        }
      }
    }
  }
}
```

### 5. Input Validation

**Strict Validation**:
```json
{
  "tools": [
    {
      "name": "example",
      "inputSchema": {
        "type": "object",
        "properties": {
          "email": {
            "type": "string",
            "format": "email",
            "maxLength": 255
          },
          "age": {
            "type": "integer",
            "minimum": 0,
            "maximum": 150
          }
        },
        "required": ["email"],
        "additionalProperties": false
      }
    }
  ]
}
```

---

## Performance Tuning

### 1. Node.js Optimization

**Memory Settings**:
```bash
# Increase heap size for large workloads
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable V8 optimizations
export NODE_OPTIONS="--optimize-for-size --max-old-space-size=4096"
```

**Clustering** (for multi-core):
```javascript
// server-cluster.js
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`Master process starting ${numCPUs} workers`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died, starting new worker`);
    cluster.fork();
  });
} else {
  // Start MCP server
  import('./configurableServer.js');
}
```

### 2. Caching Strategy

**Response Caching**:
```json
{
  "caching": {
    "enabled": true,
    "ttl": 300,
    "maxSize": 1000,
    "tools": {
      "expensive-tool": {
        "ttl": 600,
        "enabled": true
      }
    }
  }
}
```

**Redis Cache** (optional):
```javascript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  password: process.env.REDIS_PASSWORD
});

// Cache handler results
const getCached = async (key) => {
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
};

const setCache = async (key, value, ttl = 300) => {
  await redis.setex(key, ttl, JSON.stringify(value));
};
```

### 3. Connection Pooling

**Database Connections**:
```javascript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,                    // Maximum pool size
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000 // Timeout for acquiring connection
});
```

### 4. Request Optimization

**Compression**:
```javascript
import compression from 'compression';

app.use(compression({
  level: 6,
  threshold: 1024 // Only compress responses > 1KB
}));
```

**Keep-Alive**:
```javascript
import http from 'http';

const server = http.createServer(app);

server.keepAliveTimeout = 65000; // 65 seconds
server.headersTimeout = 66000;   // Slightly higher than keepAliveTimeout
```

---

## Monitoring and Logging

### 1. Structured Logging

**Winston Configuration**:
```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'mcp-server' },
  transports: [
    new winston.transports.File({
      filename: '/var/log/mcp/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: '/var/log/mcp/combined.log',
      maxsize: 10485760,
      maxFiles: 10
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### 2. Metrics Collection

**Prometheus Metrics**:
```javascript
import promClient from 'prom-client';

// Default metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom metrics
const requestDuration = new promClient.Histogram({
  name: 'mcp_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const toolExecutionCounter = new promClient.Counter({
  name: 'mcp_tool_executions_total',
  help: 'Total number of tool executions',
  labelNames: ['tool', 'status'],
  registers: [register]
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 3. Health Checks

```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {
      database: checkDatabase(),
      redis: checkRedis(),
      handlers: checkHandlers()
    }
  };

  const allHealthy = Object.values(health.checks)
    .every(check => check.status === 'healthy');

  res.status(allHealthy ? 200 : 503).json(health);
});
```

### 4. Error Tracking

**Sentry Integration**:
```javascript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1 // 10% of transactions
});

// Error handler
app.use(Sentry.Handlers.errorHandler());
```

---

## Docker Deployment

### Dockerfile

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S mcp && \
    adduser -S mcp -u 1001

# Create directories
RUN mkdir -p /var/log/mcp && \
    chown -R mcp:mcp /var/log/mcp

USER mcp

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/mcp/configurableServer.js", "/app/config.json"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  mcp-server:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    env_file:
      - .env.production
    volumes:
      - ./config.json:/app/config.json:ro
      - ./handlers:/app/handlers:ro
      - logs:/var/log/mcp
    restart: unless-stopped
    networks:
      - mcp-network
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    networks:
      - mcp-network

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: mcp
      POSTGRES_USER: mcp
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - mcp-network

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - mcp-server
    networks:
      - mcp-network

volumes:
  logs:
  redis-data:
  postgres-data:

networks:
  mcp-network:
    driver: bridge
```

### Build and Run

```bash
# Build image
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f mcp-server

# Stop services
docker-compose down

# Update and restart
docker-compose pull
docker-compose up -d --build
```

---

## Systemd Service

### Service File

Create `/etc/systemd/system/mcp-server.service`:

```ini
[Unit]
Description=MCP Configurable Server
After=network.target

[Service]
Type=simple
User=mcp
Group=mcp
WorkingDirectory=/opt/mcp
Environment="NODE_ENV=production"
Environment="PORT=3001"
EnvironmentFile=/etc/mcp/environment
ExecStart=/usr/bin/node /opt/mcp/dist/mcp/configurableServer.js /etc/mcp/config.json
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mcp-server

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/mcp

# Resource limits
LimitNOFILE=65536
MemoryLimit=2G
CPUQuota=80%

[Install]
WantedBy=multi-user.target
```

### Setup

```bash
# Create user
sudo useradd -r -s /bin/false mcp

# Create directories
sudo mkdir -p /opt/mcp /etc/mcp /var/log/mcp
sudo chown -R mcp:mcp /opt/mcp /var/log/mcp

# Copy files
sudo cp -r dist node_modules /opt/mcp/
sudo cp config.json /etc/mcp/

# Set permissions
sudo chmod 600 /etc/mcp/config.json

# Install service
sudo systemctl daemon-reload
sudo systemctl enable mcp-server
sudo systemctl start mcp-server

# Check status
sudo systemctl status mcp-server

# View logs
sudo journalctl -u mcp-server -f
```

### Management Commands

```bash
# Start
sudo systemctl start mcp-server

# Stop
sudo systemctl stop mcp-server

# Restart
sudo systemctl restart mcp-server

# Reload config (if supported)
sudo systemctl reload mcp-server

# Check status
sudo systemctl status mcp-server

# View logs
sudo journalctl -u mcp-server -n 100 -f
```

---

## Reverse Proxy Configuration

### Nginx Configuration

Create `/etc/nginx/sites-available/mcp`:

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=mcp_limit:10m rate=10r/s;

# Upstream
upstream mcp_backend {
    server 127.0.0.1:3001;
    keepalive 32;
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name mcp.yourdomain.com;

    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name mcp.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/mcp.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.yourdomain.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Logging
    access_log /var/log/nginx/mcp-access.log combined buffer=16k;
    error_log /var/log/nginx/mcp-error.log warn;

    # Rate limiting
    limit_req zone=mcp_limit burst=20 nodelay;

    # Main proxy location
    location /mcp {
        proxy_pass http://mcp_backend;

        # Proxy headers
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering (disable for SSE)
        proxy_buffering off;
        proxy_cache_bypass $http_upgrade;

        # Keep-alive
        proxy_set_header Connection "";
    }

    # Health check (internal only)
    location /health {
        proxy_pass http://mcp_backend;
        access_log off;
        allow 127.0.0.1;
        deny all;
    }

    # Metrics (internal only)
    location /metrics {
        proxy_pass http://mcp_backend;
        allow 127.0.0.1;
        deny all;
    }
}
```

### Enable Configuration

```bash
# Link configuration
sudo ln -s /etc/nginx/sites-available/mcp /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## SSL/TLS Setup

### Let's Encrypt (Certbot)

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d mcp.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

### Manual Certificate

```bash
# Generate private key
openssl genrsa -out private.key 2048

# Generate CSR
openssl req -new -key private.key -out request.csr

# Submit CSR to CA and obtain certificate

# Install certificate
sudo cp certificate.crt /etc/nginx/ssl/
sudo cp private.key /etc/nginx/ssl/
sudo chmod 600 /etc/nginx/ssl/private.key
```

---

## Health Checks

### Kubernetes Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### External Monitoring

**UptimeRobot**:
```
Monitor Type: HTTP(s)
URL: https://mcp.yourdomain.com/health
Interval: 5 minutes
Alert: Email/SMS on failure
```

**Custom Script**:
```bash
#!/bin/bash
# health-check.sh

URL="https://mcp.yourdomain.com/health"
EXPECTED_STATUS=200

STATUS=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ $STATUS -eq $EXPECTED_STATUS ]; then
    echo "$(date): Health check passed"
    exit 0
else
    echo "$(date): Health check failed (status: $STATUS)"
    # Send alert
    curl -X POST https://alerts.example.com/mcp-down
    exit 1
fi
```

---

## Backup and Recovery

### Configuration Backup

```bash
# Backup script
#!/bin/bash
BACKUP_DIR=/backup/mcp
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

# Backup config
cp /etc/mcp/config.json $BACKUP_DIR/config-$DATE.json

# Backup handlers
tar -czf $BACKUP_DIR/handlers-$DATE.tar.gz /opt/mcp/handlers

# Backup logs (last 7 days)
tar -czf $BACKUP_DIR/logs-$DATE.tar.gz /var/log/mcp

# Keep only last 30 backups
ls -t $BACKUP_DIR/*.json | tail -n +31 | xargs rm -f
```

### Database Backup

```bash
# PostgreSQL backup
pg_dump -h localhost -U mcp -d mcp > mcp-db-$DATE.sql

# Automated backup
0 2 * * * /usr/local/bin/backup-mcp.sh
```

### Disaster Recovery

```bash
# Restore configuration
sudo cp backup/config-20250929.json /etc/mcp/config.json

# Restore handlers
sudo tar -xzf backup/handlers-20250929.tar.gz -C /

# Restart service
sudo systemctl restart mcp-server
```

---

## Scaling

### Horizontal Scaling

**Load Balancer** (nginx):
```nginx
upstream mcp_cluster {
    least_conn;
    server mcp1.internal:3001;
    server mcp2.internal:3001;
    server mcp3.internal:3001;
}

server {
    location /mcp {
        proxy_pass http://mcp_cluster;
        # ... proxy settings
    }
}
```

### Vertical Scaling

```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=8192"

# Increase system limits
ulimit -n 65536
```

### Auto-Scaling (Kubernetes)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mcp-server
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mcp-server
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## Summary

### Production Deployment Steps

1. **Prepare**
   - Generate API keys
   - Configure environment variables
   - Obtain SSL certificate

2. **Deploy**
   - Choose deployment method (Docker/Systemd)
   - Configure reverse proxy
   - Enable monitoring

3. **Verify**
   - Test health endpoints
   - Verify SSL certificate
   - Check logs

4. **Monitor**
   - Setup alerts
   - Review metrics
   - Check audit logs

5. **Maintain**
   - Regular backups
   - Update dependencies
   - Rotate secrets

---

**Next Steps**:
- Review [FRAMEWORK-README.md](./FRAMEWORK-README.md) for framework overview
- Check [HANDLER-GUIDE.md](./HANDLER-GUIDE.md) for handler development
- See [API-EXAMPLES.md](./API-EXAMPLES.md) for client integration

**Support**: GitHub Issues or community forums