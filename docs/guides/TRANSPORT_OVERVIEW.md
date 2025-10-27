# Transport Overview

Complete guide to choosing and comparing MCP transport modes in Simply MCP.

**Version:** 3.0.0

## Table of Contents

- [Introduction](#introduction)
  - [What are MCP Transports?](#what-are-mcp-transports)
  - [Why Multiple Transport Options?](#why-multiple-transport-options)
  - [Which Transport Should I Use?](#which-transport-should-i-use)
- [Transport Comparison](#transport-comparison)
  - [Feature Matrix](#feature-matrix)
  - [Performance Characteristics](#performance-characteristics)
  - [Use Case Mapping](#use-case-mapping)
- [Choosing the Right Transport](#choosing-the-right-transport)
  - [Decision Tree](#decision-tree)
  - [Environment Analysis](#environment-analysis)
  - [Security Considerations](#security-considerations)
  - [Scalability Requirements](#scalability-requirements)
- [Summary](#summary)
- [Related Guides](#related-guides)

---

## Introduction

### What are MCP Transports?

**MCP Transports** are communication channels between your MCP server and clients (like Claude Desktop, web applications, or other services). They define:

- **How messages are sent** (stdio pipes, HTTP requests, Server-Sent Events)
- **How connections are established** (process spawning, HTTP sessions, WebSocket-like streams)
- **How state is managed** (per-process, session-based, or stateless)
- **What deployment options are available** (local processes, web servers, serverless functions)

Think of transports as the "postal system" for your MCP server:
- **Stdio** = Direct mail between two people in the same building
- **HTTP Stateful** = Post office with mailboxes (sessions)
- **HTTP Stateless** = Drop box with no tracking (pure request/response)

### Why Multiple Transport Options?

Simply MCP provides 3 transport modes because different applications have different needs:

**1. Desktop Integration (Stdio)**
   - Claude Desktop spawns your server as a subprocess
   - Direct stdin/stdout communication
   - No network configuration needed
   - Ideal for local AI assistants

**2. Web Applications (HTTP Stateful)**
   - Browser-based clients need HTTP
   - Sessions maintain conversation context
   - SSE enables real-time streaming
   - Perfect for web dashboards

**3. Serverless APIs (HTTP Stateless)**
   - AWS Lambda, Cloud Functions, etc.
   - No persistent state
   - Infinite horizontal scaling
   - Pay-per-request pricing

**Note**: SSE transport was removed in v3.0.0. Use HTTP Stateful mode for session-based streaming.

### Which Transport Should I Use?

**Quick Decision Guide:**

```
Are you building for Claude Desktop?
  → Use Stdio

Are you deploying to serverless (Lambda, Cloud Functions)?
  → Use HTTP Stateless

Are you building a web app with real-time features?
  → Use HTTP Stateful

Not sure?
  → Start with Stdio (simplest), migrate later if needed
```

---

## Transport Comparison

### Feature Matrix

| Feature | Stdio | HTTP Stateful | HTTP Stateless |
|---------|-------|---------------|----------------|
| **Connection** | Process spawn | HTTP session | HTTP request |
| **State Management** | Per-process | Header-based sessions | None |
| **Streaming** | ❌ No | ✅ Yes (SSE) | ❌ No |
| **Progress Reporting** | ❌ No | ✅ Yes | ❌ No |
| **Concurrent Clients** | 1 per process | Multiple sessions | Unlimited |
| **Session Persistence** | ✅ In-process | ✅ Across requests | ❌ None |
| **Scalability** | Low (1:1) | Medium (N sessions) | ✅ High (serverless) |
| **Complexity** | ⭐ Low | ⭐⭐ Medium | ⭐ Low |
| **Setup Time** | Instant | < 1 second | Instant |
| **Network Required** | ❌ No | ✅ Yes | ✅ Yes |
| **CORS Support** | N/A | ✅ Yes | ✅ Yes |
| **Health Endpoints** | N/A | ✅ `/health` | ✅ `/health` |
| **Deployment** | Local only | Server/Container | Serverless |

### Performance Characteristics

```
┌─────────────────────────────────────────────────────────┐
│                   Latency Comparison                    │
├─────────────────────────────────────────────────────────┤
│ Stdio:              █ 1-5ms (IPC overhead)              │
│ HTTP Stateful:      ████ 10-50ms (network + session)    │
│ HTTP Stateless:     ██ 5-20ms (no session lookup)       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 Throughput Comparison                   │
├─────────────────────────────────────────────────────────┤
│ Stdio:              ████████ High (direct IPC)          │
│ HTTP Stateful:      ████ Medium (network bound)         │
│ HTTP Stateless:     ██████ High (parallel requests)     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   Memory Footprint                      │
├─────────────────────────────────────────────────────────┤
│ Stdio:              ██ Low (single process)             │
│ HTTP Stateful:      ████ Medium (session storage)       │
│ HTTP Stateless:     █ Very Low (no state)               │
└─────────────────────────────────────────────────────────┘
```

**Benchmarks (requests/second):**
- **Stdio**: ~10,000 (local IPC)
- **HTTP Stateful**: ~1,000 (network + session overhead)
- **HTTP Stateless**: ~5,000 (no session, but network overhead)

*Note: Benchmarks are approximate and vary based on hardware, network, and payload size.*

### Use Case Mapping

| Use Case | Recommended Transport | Why |
|----------|----------------------|-----|
| **Claude Desktop** | Stdio | Only supported transport |
| **Web Dashboard** | HTTP Stateful | Sessions + streaming |
| **AWS Lambda** | HTTP Stateless | Serverless-friendly |
| **CLI Tool** | Stdio | Simple, no network |
| **Mobile App** | HTTP Stateful | Network-based, sessions |
| **Batch Processing** | Stdio or Stateless | No state needed |
| **Real-Time Chat** | HTTP Stateful | SSE streaming |
| **Multi-Tenant SaaS** | HTTP Stateful | Session isolation |
| **Edge Functions** | HTTP Stateless | Fast cold starts |
| **Load-Balanced API** | HTTP Stateless | No sticky sessions |
| **Desktop Agent** | Stdio | Local, integrated |
| **Webhook Handler** | HTTP Stateless | One-off requests |

---

## Choosing the Right Transport

### Decision Tree

```
START: What are you building?
  │
  ├─> Claude Desktop integration?
  │   └─> YES → Use STDIO
  │
  ├─> Serverless deployment (Lambda, Cloud Functions)?
  │   └─> YES → Use HTTP STATELESS
  │
  ├─> Web application with real-time features?
  │   └─> YES → Use HTTP STATEFUL
  │
  ├─> CLI tool or local agent?
  │   └─> YES → Use STDIO
  │
  ├─> Load-balanced API without sticky sessions?
  │   └─> YES → Use HTTP STATELESS
  │
  ├─> Multi-tenant SaaS with session isolation?
  │   └─> YES → Use HTTP STATEFUL
  │
  ├─> Batch processing or one-off tasks?
  │   └─> YES → Use STDIO or HTTP STATELESS
  │
  └─> Not sure?
      └─> Start with STDIO (simplest)
          Migrate later if needed
```

### Environment Analysis

| Environment | Recommended Transport | Why |
|-------------|----------------------|-----|
| **Local Development** | Stdio | Fastest, simplest setup |
| **Desktop App** | Stdio | Direct process integration |
| **Web Frontend** | HTTP Stateful | Browser needs HTTP + streaming |
| **Mobile App** | HTTP Stateful | Network-based, sessions |
| **AWS Lambda** | HTTP Stateless | Serverless-optimized |
| **Google Cloud Functions** | HTTP Stateless | Serverless-optimized |
| **Azure Functions** | HTTP Stateless | Serverless-optimized |
| **Kubernetes** | HTTP Stateful or Stateless | Depends on state needs |
| **Docker Container** | HTTP Stateful | Traditional server |
| **Edge Workers (Cloudflare)** | HTTP Stateless | Distributed, stateless |
| **Load-Balanced Cluster** | HTTP Stateless | No sticky sessions |
| **Single VPS** | HTTP Stateful | Traditional server |

### Security Considerations

**Stdio:**
- ✅ **Pros**: No network exposure, process isolation
- ❌ **Cons**: Code injection if spawning untrusted commands
- **Best for**: Trusted local environments

**HTTP Stateful:**
- ✅ **Pros**: Standard web security (CORS, HTTPS, auth)
- ❌ **Cons**: Session fixation, CSRF, DNS rebinding
- **Best for**: Web apps with proper auth
- **Mitigations**:
  - Use HTTPS in production
  - Implement CORS properly
  - Validate origins (built-in)
  - Use secure session IDs (automatic)

**HTTP Stateless:**
- ✅ **Pros**: No session attacks, stateless = simpler security
- ❌ **Cons**: Must authenticate each request
- **Best for**: APIs with token-based auth
- **Mitigations**:
  - Use API keys or JWT
  - Rate limiting
  - Request signing

### Scalability Requirements

```
┌─────────────────────────────────────────────────────────┐
│              Concurrent Clients Supported               │
├─────────────────────────────────────────────────────────┤
│ Stdio:              1 (per process)                     │
│ HTTP Stateful:      100-1000 (session overhead)         │
│ HTTP Stateless:     ∞ (limited only by server capacity) │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Horizontal Scaling Difficulty              │
├─────────────────────────────────────────────────────────┤
│ Stdio:              ⭐⭐⭐⭐⭐ Impossible (1:1 process)   │
│ HTTP Stateful:      ⭐⭐⭐ Hard (sticky sessions needed)  │
│ HTTP Stateless:     ⭐ Easy (any instance handles)       │
└─────────────────────────────────────────────────────────┘
```

**Scaling Strategies:**

**Stdio:**
- Spawn multiple processes (one per client)
- Not suitable for high-scale deployments

**HTTP Stateful:**
- Use sticky sessions (session affinity)
- Shared session store (Redis, memcached)
- Limited by session memory

**HTTP Stateless:**
- Add more instances freely
- Use load balancer (no sticky sessions needed)
- Infinite horizontal scaling

---

## Summary

This guide covered transport mode selection for Simply MCP:

**Key Insights:**

1. **Choose Based on Environment:**
   - Desktop → Stdio
   - Serverless → HTTP Stateless
   - Web app → HTTP Stateful

2. **Scalability Spectrum:**
   - Stdio: 1 client (lowest)
   - HTTP Stateful: 100-1000 clients (medium)
   - HTTP Stateless: Unlimited (highest)

3. **State Management:**
   - Stdio: In-process
   - HTTP Stateful: Session-based
   - HTTP Stateless: External storage only

4. **Migration Path:**
   - Start simple (Stdio)
   - Scale to HTTP Stateful (web apps)
   - Optimize to HTTP Stateless (serverless)

5. **Production Readiness:**
   - All transports are production-ready
   - Choose based on deployment environment
   - Use health endpoints for monitoring
   - Implement proper error handling

---

## Related Guides

- [Stdio Transport](./TRANSPORT_STDIO.md) - Standard I/O details
- [HTTP Transport](./TRANSPORT_HTTP.md) - HTTP modes
- [Advanced Transports](./TRANSPORT_ADVANCED.md) - Multi-transport patterns
- [Configuration](./CONFIGURATION.md) - Transport configuration
- [Quick Start](./QUICK_START.md) - Get started quickly

