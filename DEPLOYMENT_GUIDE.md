# SimplyMCP Deployment Guide

Complete step-by-step instructions for deploying SimplyMCP to GitHub and npm.

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
cd /mnt/Shared/cs-projects/simply-mcp

# Install dependencies
npm install --legacy-peer-deps

# Clean and rebuild
npm run clean
npm run build

# Verify dist/ was created
ls -la dist/mcp/
```

**Expected output**: You should see `index.js`, `index.d.ts`, and other compiled files.

### 2. Run Tests

```bash
# Run all tests
npm test

# Run specific tests
npm run test:stdio
npm run test:http

# Test examples
npm run dev
npm run dev:class
```

### 3. Test as Module (Optional but Recommended)

Create a test project to verify the module works:

```bash
# Create test directory
mkdir /tmp/test-simply-mcp
cd /tmp/test-simply-mcp
npm init -y

# Install from local directory
npm install /mnt/Shared/cs-projects/simply-mcp

# Create test file
cat > test.js << 'EOF'
import { SimplyMCP } from 'simply-mcp';
console.log('SimplyMCP imported successfully!');
EOF

# Run test
node test.js
```

## 🚀 GitHub Deployment

### Step 1: Create GitHub Repository

1. **Go to**: https://github.com/organizations/clockwork-innovations/repositories/new
   - Or create under your personal account if you don't have org access yet

2. **Repository Settings**:
   - Name: `simply-mcp`
   - Description: "A modern, type-safe Model Context Protocol (MCP) server framework for TypeScript"
   - Visibility: **Public**
   - ❌ Do NOT initialize with README (we have one)

3. **Click**: "Create repository"

### Step 2: Prepare Git Repository

```bash
cd /mnt/Shared/cs-projects/simply-mcp

# Check current status
git status

# Add all files
git add .

# Check what will be committed
git status

# Create initial commit
git commit -m "Initial commit: SimplyMCP v1.0.0

- Multiple API styles (Decorator, Functional, Programmatic)
- Multiple transports (stdio, HTTP, SSE)
- Full TypeScript support with Zod validation
- Binary content support
- LLM sampling and progress reporting
- Comprehensive documentation and tests"
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
git remote add origin https://github.com/yourusername/simply-mcp.git
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
git tag -a v1.0.0 -m "Release v1.0.0

SimplyMCP - A modern MCP server framework for TypeScript

Features:
- Multiple API styles
- Multiple transports
- Full type safety
- Binary content support
- Enhanced protocol features"

# Push tag to GitHub
git push origin v1.0.0
```

### Step 5: Create GitHub Release

1. Go to: `https://github.com/clockwork-innovations/simply-mcp-ts/releases/new`
2. Choose tag: `v1.0.0`
3. Release title: `SimplyMCP v1.0.0`
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
tar -tzf simply-mcp-1.0.0.tgz

# Should include:
# - dist/
# - mcp/ (source)
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
+ simply-mcp@1.0.0
```

### Step 5: Verify Publication

```bash
# View on npm
npm view simply-mcp

# Install in test project
cd /tmp/test-publish
npm init -y
npm install simply-mcp
```

## 🔍 Post-Deployment Verification

### GitHub Checks

- [ ] Repository is public
- [ ] README displays correctly
- [ ] License file is present
- [ ] Release v1.0.0 is published
- [ ] Repository topics/tags are set (mcp, typescript, ai, llm)
- [ ] Description is set
- [ ] Issues are enabled
- [ ] Discussions enabled (optional)

### npm Checks

- [ ] Package appears on npm: `https://www.npmjs.com/package/simply-mcp`
- [ ] Documentation tab shows README
- [ ] Version is 1.0.0
- [ ] All files are present
- [ ] Can be installed: `npm install simply-mcp`

### Functional Tests

```bash
# Create fresh test project
mkdir /tmp/test-deployment
cd /tmp/test-deployment
npm init -y

# Install published package
npm install simply-mcp

# Test Decorator API
cat > test-decorator.ts << 'EOF'
import { MCPServer } from 'simply-mcp';

@MCPServer({ name: 'test', version: '1.0.0' })
class TestServer {
  hello(name: string): string {
    return `Hello, ${name}!`;
  }
}
EOF

# Test Functional API
cat > test-functional.ts << 'EOF'
import { defineMCP } from 'simply-mcp';
import { z } from 'zod';

export default defineMCP({
  name: 'test',
  version: '1.0.0',
  tools: [{
    name: 'greet',
    description: 'Greet user',
    parameters: z.object({ name: z.string() }),
    execute: async (args) => `Hello, ${args.name}!`
  }]
});
EOF

# Test Programmatic API
cat > test-programmatic.ts << 'EOF'
import { SimplyMCP } from 'simply-mcp';
import { z } from 'zod';

const server = new SimplyMCP({ name: 'test', version: '1.0.0' });
server.addTool({
  name: 'echo',
  description: 'Echo input',
  parameters: z.object({ msg: z.string() }),
  execute: async (args) => args.msg
});
EOF

# Run type check
npx tsc --noEmit test-*.ts
```

## 📣 Announcement

After successful deployment:

### Update Repository

1. **Add topics** on GitHub:
   - mcp, model-context-protocol, typescript, ai, llm, claude, anthropic

2. **Configure repository**:
   - Enable issues
   - Enable discussions (optional)
   - Add description
   - Add website: https://cwinnov.com

### Share the News

**Social Media Posts:**

```
🚀 Introducing SimplyMCP v1.0.0!

A modern, type-safe Model Context Protocol server framework for TypeScript.

✨ 3 API styles (Decorator, Functional, Programmatic)
🔌 Multiple transports (stdio, HTTP, SSE)
💪 Full TypeScript + Zod validation
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
- Write detailed introduction
- Comparison with alternatives
- Tutorial with examples
- Use cases

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
- Users may need `--legacy-peer-deps` for zod version conflict
- Document in README installation section

**5. Module not found errors**
- Verify `main`, `module`, `types` fields in package.json
- Check `exports` field configuration
- Ensure dist/ was included in published package

## 📞 Support

If you encounter issues:

1. Check this guide thoroughly
2. Review OPEN_SOURCE_CHECKLIST.md
3. Check GitHub documentation
4. Check npm documentation
5. Contact Clockwork Innovations team

## ✅ Final Checklist

- [ ] Code pushed to GitHub
- [ ] Release v1.0.0 created
- [ ] Package published to npm
- [ ] Installation tested
- [ ] Documentation verified
- [ ] Social media announcement
- [ ] Repository configured (topics, description)
- [ ] Issues/Discussions enabled
- [ ] Celebrated! 🎉

---

**Author**: Nicholas Marinkovich, MD
**Organization**: Clockwork Innovations, LLC
**Date**: 2025-10-02
