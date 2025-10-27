# Release & CI/CD Documentation

## Overview

SimplyMCP uses GitHub Actions for automated testing, versioning, and publishing to npm.

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:** Push to main, Pull Requests

**Actions:**
- Runs tests on Node.js 20.x and 22.x
- Builds the project
- Type checks with TypeScript

### 2. Release Workflow (`.github/workflows/release.yml`)

**Trigger:** Manual (workflow_dispatch)

**Actions:**
- Runs tests and builds
- Bumps version (patch/minor/major)
- Pushes changes and tags
- Creates GitHub release
- Publishes to npm

### 3. Publish to npm Workflow (`.github/workflows/publish-npm.yml`)

**Trigger:** GitHub release published

**Actions:**
- Runs tests and builds
- Publishes to npm with provenance

## Making a Release

### Method 1: Local Script (Recommended)

```bash
# Patch release (1.0.0 -> 1.0.1)
npm run release:patch

# Minor release (1.0.0 -> 1.1.0)
npm run release:minor

# Major release (1.0.0 -> 2.0.0)
npm run release:major
```

The script will:
1. Check for uncommitted changes
2. Pull latest from main
3. Run tests
4. Build the project
5. Bump version
6. Push changes and tags
7. Create GitHub release
8. Trigger npm publish automatically

### Method 2: GitHub UI

1. Go to **Actions** tab
2. Select **Release & Publish** workflow
3. Click **Run workflow**
4. Choose version bump type (patch/minor/major)
5. Click **Run workflow**

### Method 3: GitHub CLI

```bash
# Patch release
gh workflow run release.yml -f version=patch

# Minor release
gh workflow run release.yml -f version=minor

# Major release
gh workflow run release.yml -f version=major
```

## Setup Requirements

### GitHub Secrets

You need to configure the following secret in your GitHub repository:

1. **NPM_TOKEN**: npm authentication token for publishing
   - Go to npmjs.com → Account → Access Tokens
   - Generate new token (Automation type)
   - Add to GitHub: Settings → Secrets and variables → Actions → New repository secret
   - Name: `NPM_TOKEN`

### Repository Settings

1. **Actions permissions**: Ensure workflows have write permissions
   - Settings → Actions → General → Workflow permissions
   - Select "Read and write permissions"
   - Check "Allow GitHub Actions to create and approve pull requests"

## Version Strategy

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (x.0.0): Breaking changes
- **MINOR** (0.x.0): New features, backward compatible
- **PATCH** (0.0.x): Bug fixes, backward compatible

## Publishing Process

1. **Development**: Work on feature branches, create PRs to main
2. **CI**: Automated tests run on every PR and push to main
3. **Release**: Use release script or GitHub Actions to create version
4. **Publish**: npm package automatically published on GitHub release

## Troubleshooting

### Release fails with "uncommitted changes"
```bash
git status
git add .
git commit -m "your message"
```

### npm publish fails
- Verify NPM_TOKEN secret is set correctly
- Check npm package name is available
- Ensure you're logged into npm CLI: `npm login`

### Tests fail in CI but pass locally
- Check Node.js version matches CI (20.x or 22.x)
- Ensure all dependencies are in package.json
- Run `npm ci` instead of `npm install` locally

## Manual Publishing (Emergency)

If automated publishing fails:

```bash
# Ensure you're on latest main
git pull origin main

# Run tests
npm test

# Build
npm run build

# Login to npm (if not already)
npm login

# Publish manually
npm publish --access public
```
