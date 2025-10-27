# SimplyMCP Deployment Guide

Complete step-by-step instructions for deploying SimplyMCP to GitHub and npm.

**Production-Ready Examples:**
- Production optimized: [examples/interface-production-optimized.ts](../../examples/interface-production-optimized.ts)
- HTTP with auth: [examples/interface-http-auth.ts](../../examples/interface-http-auth.ts)
- Stateless HTTP: [examples/interface-http-stateless.ts](../../examples/interface-http-stateless.ts)

## Prerequisites

Before deploying, ensure you have:

- [x] Git installed and configured
- [ ] GitHub account with access to `clockwork-innovations` organization
- [ ] npm account (for publishing to npm registry)
- [ ] Node.js 20+ installed
- [ ] All tests passing

## 📋 Pre-Deployment Checklist

### 1. Verify Build

```bash
cd /mnt/Shared/cs-projects/simply-mcp-ts

# Install dependencies
npm install

# Clean and rebuild
npm run clean
npm run build

# Verify dist/ was created
ls -la dist/
```

**Expected output**: You should see `index.js`, `index.d.ts`, and other compiled files.

### 2. Run Tests

```bash
# Run all tests
npm test

# Test Interface API examples
npx tsx examples/interface-minimal.ts
npx tsx examples/interface-protocol-comprehensive.ts
```

### 3. Test as Module (Optional but Recommended)

Create a test project to verify the module works:

```bash
# Create test directory
mkdir /tmp/test-simply-mcp
cd /tmp/test-simply-mcp
npm init -y

# Install from local directory
npm install /mnt/Shared/cs-projects/simply-mcp-ts

# Create test file using Interface API
cat > test.ts << 'EOF'
import { MCPInterface } from 'simply-mcp';
console.log('SimplyMCP imported successfully!');
EOF

# Run test
npx tsx test.ts
```

## 🚀 GitHub Deployment

### Step 1: Create GitHub Repository

1. **Go to**: https://github.com/organizations/clockwork-innovations/repositories/new
   - Or create under your personal account if you don't have org access yet

2. **Repository Settings**:
   - Name: `simply-mcp-ts`
   - Description: "A modern, type-safe Model Context Protocol (MCP) server framework for TypeScript with Interface API"
   - Visibility: **Public**
   - ❌ Do NOT initialize with README (we have one)

3. **Click**: "Create repository"

### Step 2: Prepare Git Repository

```bash
cd /mnt/Shared/cs-projects/simply-mcp-ts

# Check current status
git status

# Add all files
git add .

# Check what will be committed
git status

# Create initial commit
git commit -m "Initial commit: SimplyMCP v3.x.x

- Interface API for declarative MCP server definitions
- Full TypeScript support with Zod validation
- Binary content support
- LLM sampling and progress reporting
- Comprehensive documentation and examples"
```

### Step 3: Push to GitHub

**If using `clockwork-innovations` organization:**

```bash
# Add remote
git remote add origin https://github.com/clockwork-innovations/simply-mcp-ts.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

**If using personal account temporarily:**

```bash
# Replace 'yourusername' with your GitHub username
git remote add origin https://github.com/yourusername/simply-mcp-ts.git
git branch -M main
git push -u origin main
```

**Authentication**: You may be prompted for credentials. Use:
- Personal Access Token (recommended)
- SSH key
- GitHub CLI

### Step 4: Create Release Tag

```bash
# Create annotated tag
git tag -a v3.x.x -m "Release v3.x.x

SimplyMCP - A modern MCP server framework for TypeScript

Features:
- Interface API for declarative server definitions
- Full type safety with TypeScript and Zod
- Binary content support
- Enhanced protocol features (sampling, progress reporting)"

# Push tag to GitHub
git push origin v3.x.x
```

### Step 5: Create GitHub Release

1. Go to: `https://github.com/clockwork-innovations/simply-mcp-ts/releases/new`
2. Choose tag: `v3.x.x`
3. Release title: `SimplyMCP v3.x.x`
4. Description: Copy from `CHANGELOG.md`
5. Click: "Publish release"

## 📦 npm Deployment

### Step 1: Check Package Name Availability

```bash
# Check if 'simply-mcp' is available
npm view simply-mcp

# If taken, you'll see package info
# If available, you'll see: npm ERR! 404 Not Found
```

**If name is taken**, choose alternative:
- `simply-mcp-server` (recommended)
- `simplymcp`
- `mcp-server-framework`

**To use alternative package name**, update `package.json`:
```json
{
  "name": "simply-mcp-server"
}
```

### Step 2: Login to npm

```bash
# Login to npm
npm login

# Follow prompts:
# Username: your-npm-username
# Password: your-npm-password
# Email: your-email@example.com
# Enter OTP (if 2FA enabled)
```

### Step 3: Verify Package Contents

```bash
# See what will be published
npm pack --dry-run

# Create tarball to inspect
npm pack

# Extract and inspect
tar -tzf simply-mcp-3.x.x.tgz

# Should include:
# - dist/
# - src/ (source)
# - examples/ (Interface API examples)
# - README.md
# - LICENSE
# - package.json
```

### Step 4: Publish to npm

**For unscoped package:**
```bash
npm publish
```

**For scoped package:**
```bash
npm publish --access public
```

**Expected output:**
```
+ simply-mcp@3.x.x
```

### Step 5: Verify Publication

```bash
# View on npm
npm view simply-mcp

# Install in test project
cd /tmp/test-publish
npm init -y
npm install simply-mcp

# Test Interface API import
cat > test.ts << 'EOF'
import { MCPInterface } from 'simply-mcp';
console.log('Import successful!');
EOF

npx tsx test.ts
```

## 🔍 Post-Deployment Verification

### GitHub Checks

- [ ] Repository is public
- [ ] README displays correctly
- [ ] License file is present
- [ ] Release v3.x.x is published
- [ ] Repository topics/tags are set (mcp, model-context-protocol, typescript, ai, llm, interface-api)
- [ ] Description is set
- [ ] Issues are enabled
- [ ] Discussions enabled (optional)

### npm Checks

- [ ] Package appears on npm: `https://www.npmjs.com/package/simply-mcp`
- [ ] Documentation tab shows README
- [ ] Version is 3.x.x
- [ ] All files are present (dist/, examples/, src/)
- [ ] Can be installed: `npm install simply-mcp`

### Functional Tests

```bash
# Create fresh test project
mkdir /tmp/test-deployment
cd /tmp/test-deployment
npm init -y

# Install published package
npm install simply-mcp zod

# Test Interface API - Basic
cat > test-interface-minimal.ts << 'EOF'
import { MCPInterface } from 'simply-mcp';
import { z } from 'zod';

const server: MCPInterface = {
  name: 'test-server',
  version: '1.0.0',
  tools: {
    greet: {
      description: 'Greet a user',
      parameters: z.object({
        name: z.string().describe('User name')
      }),
      execute: async ({ name }) => ({
        content: [{ type: 'text', text: `Hello, ${name}!` }]
      })
    }
  }
};

export default server;
EOF

# Test Interface API - With Resources
cat > test-interface-resources.ts << 'EOF'
import { MCPInterface } from 'simply-mcp';
import { z } from 'zod';

const server: MCPInterface = {
  name: 'resource-server',
  version: '1.0.0',
  resources: {
    'config://settings': {
      name: 'App Settings',
      description: 'Configuration settings',
      mimeType: 'application/json',
      get: async () => ({
        contents: [{
          uri: 'config://settings',
          mimeType: 'application/json',
          text: JSON.stringify({ theme: 'dark' })
        }]
      })
    }
  }
};

export default server;
EOF

# Run type check
npx tsc --noEmit test-*.ts
```

## 📣 Announcement

After successful deployment:

### Update Repository

1. **Add topics** on GitHub:
   - mcp, model-context-protocol, typescript, ai, llm, claude, anthropic, interface-api

2. **Configure repository**:
   - Enable issues
   - Enable discussions (optional)
   - Add description
   - Add website: https://cwinnov.com

### Share the News

**Social Media Posts:**

```
🚀 SimplyMCP v3.x.x - Interface API Release!

A modern, type-safe Model Context Protocol server framework for TypeScript.

✨ Declarative Interface API for clean server definitions
🔌 Full MCP protocol support (tools, resources, prompts)
💪 TypeScript + Zod validation
📦 npm install simply-mcp

#MCP #TypeScript #AI #Claude

https://github.com/clockwork-innovations/simply-mcp-ts
```

**Where to Post:**
- [ ] Twitter/X
- [ ] LinkedIn
- [ ] Reddit r/typescript
- [ ] Reddit r/MachineLearning
- [ ] Dev.to
- [ ] Hacker News (Show HN)
- [ ] Anthropic Discord/Community

**Blog Post** (optional):
- Write detailed introduction on Interface API
- Tutorial with Interface API examples
- Migration guide for existing users
- Use cases and best practices

## 🔧 Troubleshooting

### Common Issues

**1. npm publish fails with 403**
- You don't have permission to publish
- Package name is taken
- Try: `npm publish --access public` for scoped packages

**2. Git push fails**
- Check authentication (use PAT or SSH)
- Verify remote URL: `git remote -v`
- Try: `git push -u origin main --force` (only for first push)

**3. Package name taken**
- Use alternative name: `simply-mcp-server`
- Choose different name
- Contact npm support if you own the namespace

**4. TypeScript errors in published package**
- Ensure proper TypeScript configuration
- Verify Zod peer dependencies are installed
- Check Interface API type definitions are exported

**5. Module not found errors**
- Verify `main`, `module`, `types` fields in package.json
- Check `exports` field configuration
- Ensure dist/ was included in published package
- Confirm Interface API exports are accessible

## 📞 Support

If you encounter issues:

1. Check this guide thoroughly
2. Review OPEN_SOURCE_CHECKLIST.md
3. Check GitHub documentation
4. Check npm documentation
5. Contact Clockwork Innovations team

## ✅ Final Checklist

- [ ] Code pushed to GitHub
- [ ] Release v3.x.x created
- [ ] Package published to npm
- [ ] Installation tested with Interface API examples
- [ ] Interface API documentation verified
- [ ] Social media announcement
- [ ] Repository configured (topics, description)
- [ ] Issues/Discussions enabled
- [ ] Interface API examples working in published package

---

**Author**: Nicholas Marinkovich, MD
**Organization**: Clockwork Innovations, LLC
**Last Updated**: 2025-10-23
