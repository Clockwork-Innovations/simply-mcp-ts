# Publishing simply-mcp-inspector

This document describes how to publish the `simply-mcp-inspector` package to npm.

## Prerequisites

- GitHub repository must have `NPM_TOKEN` secret configured
- You need appropriate repository permissions

## Publishing Methods

### Method 1: Automatic via GitHub Release (Recommended)

1. **Create a new release on GitHub:**
   ```bash
   # Tag format: inspector-v0.1.0
   git tag inspector-v0.1.0
   git push origin inspector-v0.1.0
   ```

2. **Create GitHub Release:**
   - Go to: https://github.com/Clockwork-Innovations/simply-mcp-ts/releases/new
   - Select tag: `inspector-v0.1.0`
   - Title: `Inspector v0.1.0`
   - Description: Release notes
   - Click "Publish release"

3. **Automatic workflow:**
   - GitHub Action will automatically trigger
   - Builds main `simply-mcp` package (dependency)
   - Builds `simply-mcp-inspector`
   - Publishes to npm with appropriate dist-tag

### Method 2: Manual Trigger via GitHub Actions

1. **Go to Actions tab:**
   - https://github.com/Clockwork-Innovations/simply-mcp-ts/actions
   - Select "Publish Inspector to npm" workflow
   - Click "Run workflow"

2. **Configure run:**
   - Branch: `main` (or your branch)
   - Tag: `latest` (or `beta`, `next`, etc.)
   - Click "Run workflow"

### Method 3: Manual CLI Publish (Not Recommended)

Only use this if GitHub Actions are unavailable:

```bash
# Ensure you're logged in to npm
npm login

# Build main package first
cd /mnt/Shared/cs-projects/simply-mcp-ts
npm ci
npm run build

# Build and publish inspector
cd inspector
npm ci
npm run build
npm publish --access public
```

## Version Management

### Bump Version

Before creating a release, update the version:

```bash
cd inspector

# Patch version (0.1.0 -> 0.1.1)
npm version patch

# Minor version (0.1.0 -> 0.2.0)
npm version minor

# Major version (0.1.0 -> 1.0.0)
npm version major

# Pre-release versions
npm version prerelease --preid=beta  # 0.1.0 -> 0.1.1-beta.0
```

Then commit and push:
```bash
git add package.json
git commit -m "chore(inspector): bump version to X.Y.Z"
git push
```

## Dist Tags

The workflow automatically determines the dist-tag:

- **`latest`**: Stable releases (e.g., `0.1.0`, `1.0.0`)
- **`beta`**: Beta releases (e.g., `0.1.0-beta.1`)
- **`alpha`**: Alpha releases (e.g., `0.1.0-alpha.1`)
- **`next`**: Next releases (e.g., `0.1.0-next.1`)
- **`rc`**: Release candidates (e.g., `0.1.0-rc.1`)

### Install Specific Dist Tag

```bash
# Latest stable
npm install -g simply-mcp-inspector

# Specific tag
npm install -g simply-mcp-inspector@beta
npm install -g simply-mcp-inspector@next

# Specific version
npm install -g simply-mcp-inspector@0.1.0
```

## Release Checklist

Before publishing:

- [ ] Update version in `package.json`
- [ ] Update CHANGELOG (if exists)
- [ ] Test build locally: `npm run build`
- [ ] Test CLI locally: `node dist/cli.js`
- [ ] Commit changes
- [ ] Push to GitHub
- [ ] Create GitHub release with tag `inspector-vX.Y.Z`
- [ ] Verify workflow runs successfully
- [ ] Test published package: `npx simply-mcp-inspector@latest`

## Troubleshooting

### Build Fails

Check that:
- Main `simply-mcp` package builds successfully
- All dependencies are installed
- TypeScript compiles without errors

### Publish Fails

Check that:
- `NPM_TOKEN` secret is configured correctly
- Package name is available on npm
- Version doesn't already exist on npm

### Manual Fix

If automated publishing fails, you can:
1. Fix the issue
2. Re-run the GitHub Action workflow
3. Or publish manually via CLI (Method 3)

## Monitoring

After publishing:
- View on npm: https://www.npmjs.com/package/simply-mcp-inspector
- Check download stats
- Monitor for issues/bug reports

## Versioning Strategy

Recommended versioning:
- **0.x.x**: Pre-1.0 releases (current)
- **1.0.0**: First stable release
- **1.x.x**: Stable releases with backwards compatibility
- **2.0.0+**: Breaking changes

Keep inspector version separate from main `simply-mcp` package version.
