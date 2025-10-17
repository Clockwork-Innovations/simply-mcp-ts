# Resources Guide

Learn how to expose data and resources to the LLM.

**What are resources?** Shared data (files, config, documents) that the LLM can read and reference.

**See working examples:** [examples/class-prompts-resources.ts](../../examples/class-prompts-resources.ts)

---

## Basic Resource

A resource needs:
- **uri** - Unique identifier (e.g., `file://path`, `config://key`)
- **name** - Human-readable name
- **mimeType** - Content type (text/plain, application/json, etc.)
- **content** - The actual data (string or object)

```typescript
{
  uri: 'file://config.json',
  name: 'Application Configuration',
  mimeType: 'application/json',
  content: {
    version: '1.0.0',
    features: ['auth', 'api', 'database']
  }
}
```

---

## MIME Types

Common MIME types:

```typescript
'text/plain'           // Plain text files
'text/markdown'        // Markdown files
'text/html'           // HTML content
'application/json'    // JSON data
'application/xml'     // XML data
'text/csv'            // CSV data
'application/pdf'     // PDF files
'image/jpeg'          // JPEG images
'image/png'           // PNG images
```

---

## URI Schemes

Standard URI patterns:

```typescript
'file://path/to/file.txt'      // File reference
'config://app/setting'          // Configuration
'database://users/table'        // Database reference
'api://endpoint/resource'       // API reference
'memory://cache/key'            // In-memory data
```

---

## String Content

Simple text resources:

```typescript
{
  uri: 'file://readme.md',
  name: 'README',
  mimeType: 'text/markdown',
  content: `# My Project

This is the README for my project.

## Installation
Run: npm install
`
}
```

---

## JSON Content

Structured data as object:

```typescript
{
  uri: 'config://app',
  name: 'Application Config',
  mimeType: 'application/json',
  content: {
    name: 'My App',
    version: '1.0.0',
    settings: {
      theme: 'dark',
      notifications: true
    }
  }
}
```

---

## Common Patterns

### Documentation

```typescript
{
  uri: 'doc://api-reference',
  name: 'API Reference',
  mimeType: 'text/markdown',
  content: `
# API Reference

## GET /users
Retrieve all users

### Response
\`\`\`json
[
  { "id": 1, "name": "User 1" }
]
\`\`\`

## POST /users
Create a new user
`
}
```

### Database Schema

```typescript
{
  uri: 'database://schema',
  name: 'Database Schema',
  mimeType: 'text/plain',
  content: `
Table: users
- id (INTEGER, PRIMARY KEY)
- email (VARCHAR, UNIQUE)
- name (VARCHAR)
- created_at (TIMESTAMP)

Table: posts
- id (INTEGER, PRIMARY KEY)
- user_id (INTEGER, FOREIGN KEY)
- title (VARCHAR)
- content (TEXT)
- created_at (TIMESTAMP)
`
}
```

### Configuration

```typescript
{
  uri: 'config://features',
  name: 'Feature Flags',
  mimeType: 'application/json',
  content: {
    newUI: true,
    betaAPI: false,
    analytics: true,
    maintenance: false
  }
}
```

### Sample Data

```typescript
{
  uri: 'data://users-sample',
  name: 'Sample Users',
  mimeType: 'application/json',
  content: [
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob', role: 'user' },
    { id: 3, name: 'Charlie', role: 'user' }
  ]
}
```

---

## Dynamic Resources

### From Environment

```typescript
{
  uri: 'config://database',
  name: 'Database URL',
  mimeType: 'text/plain',
  content: process.env.DATABASE_URL || 'Not configured'
}
```

### From File System

```typescript
import { readFileSync } from 'fs';

{
  uri: 'file://config.json',
  name: 'Config File',
  mimeType: 'application/json',
  content: readFileSync('./config.json', 'utf-8')
}
```

### From Database

```typescript
{
  uri: 'database://users',
  name: 'Users List',
  mimeType: 'application/json',
  content: async () => {
    const users = await db.users.find();
    return JSON.stringify(users);
  }
}
```

---

## Multiple Resources

### Functional API

```typescript
export default defineMCP({
  name: 'resource-server',
  version: '1.0.0',
  resources: [
    {
      uri: 'file://readme',
      name: 'README',
      mimeType: 'text/markdown',
      content: '# My Project'
    },
    {
      uri: 'config://app',
      name: 'Config',
      mimeType: 'application/json',
      content: { version: '1.0.0' }
    }
  ]
});
```

### Decorator API

```typescript
@MCPServer({ name: 'resource-server', version: '1.0.0' })
class MyServer {
  @resource('file://readme', { mimeType: 'text/markdown' })
  readme() {
    return '# My Project';
  }

  @resource('config://app', { mimeType: 'application/json' })
  config() {
    return { version: '1.0.0' };
  }
}
```

---

## Best Practices

✅ **DO:**
- Use consistent URI naming
- Provide clear resource names
- Document what each resource contains
- Keep resources focused and manageable
- Update resources when underlying data changes

❌ **DON'T:**
- Expose sensitive data (passwords, keys, tokens)
- Create too many resources (keep it focused)
- Forget to set correct MIME types
- Make resources that change constantly without notification
- Expose unvalidated user data

---

## Security Considerations

❌ **Never expose:**
```typescript
// BAD - Never expose secrets!
{
  uri: 'config://secrets',
  content: {
    api_key: process.env.SECRET_KEY,
    password: db.password
  }
}
```

✅ **Instead, use:**
```typescript
// GOOD - Use environment variables at runtime
const apiKey = process.env.API_KEY;
// Keep it private, don't expose to LLM
```

---

## Examples

**See working examples:**
- Prompts & resources: [examples/class-prompts-resources.ts](../../examples/class-prompts-resources.ts)

---

## Next Steps

- **Add tools?** See [TOOLS.md](./TOOLS.md)
- **Add prompts?** See [PROMPTS.md](./PROMPTS.md)
- **Deploy server?** See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

**Need help?** Check [docs/README.md](../README.md) for the full documentation index.
