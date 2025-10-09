# GitHub Actions Workflows

This directory contains automated CI/CD workflows for the Simply-MCP project.

---

## Workflows Overview

| Workflow | Trigger | Purpose | Duration |
|----------|---------|---------|----------|
| **CI** | Push, PR | Run tests and build | ~2-3 min |
| **Validate Package** | Manual, Pre-release | Validate tarball | ~3-5 min |
| **Pre-release** | Manual | Beta/RC releases | ~5-7 min |
| **Release** | Tag push | Stable releases | ~7-10 min |
| **Publish NPM** | Manual | Publish to NPM | ~2-3 min |

---

## 1. CI Workflow (`ci.yml`)

**Purpose**: Continuous Integration - Run tests on every push and PR

**Triggers**:
- Push to `main` branch
- Pull requests to `main`

**Jobs**:
1. **Test** (Node 20.x, 22.x)
   - Install dependencies
   - Run TypeScript build
   - Run test suite
   - Upload coverage

**Usage**: Automatic on push/PR

**Success Criteria**:
- ✅ Build succeeds
- ✅ All tests pass
- ✅ No TypeScript errors

---

## 2. Validate Package (`validate-package.yml`)

**Purpose**: Validate that the package works when installed from tarball

**Triggers**:
- Manual workflow dispatch
- Called by pre-release workflow
- Called by release workflow

**Inputs**:
- `version` (required): Version to test (e.g., `2.5.0-beta.1`)

**Jobs**:
1. **Build Tarball**
   - Clean install
   - Build TypeScript
   - Create tarball with `npm pack`
   - Upload tarball as artifact

2. **Test Tarball**
   - Create clean test environment
   - Install from tarball
   - Test all CLI commands (`--dry-run`)
   - Test examples from repository
   - Test README examples
   - Validate imports work

**Usage**:
```bash
# Via GitHub UI: Actions → Validate Package → Run workflow
# Input: version = "2.5.0-beta.2"

# Via CLI
gh workflow run validate-package.yml -f version=2.5.0-beta.2
```

**Success Criteria**:
- ✅ Tarball builds successfully
- ✅ All CLI commands work
- ✅ Examples run without errors
- ✅ Imports resolve correctly

---

## 3. Pre-release Workflow (`pre-release.yml`)

**Purpose**: Automated beta and RC releases with validation

**Triggers**:
- Manual workflow dispatch

**Inputs**:
- `version` (required): Pre-release version (e.g., `2.5.0-beta.2`)
- `tag` (optional): NPM dist-tag (default: `beta`)

**Jobs**:
1. **Validate Version Format**
   - Check version matches semver pre-release format
   - Validate tag name (beta, rc, alpha, next)

2. **Run Tests**
   - Install dependencies
   - Run TypeScript build
   - Run full test suite

3. **Validate Package**
   - Call `validate-package.yml` workflow
   - Ensure package works when installed

4. **Create Release**
   - Update `package.json` version
   - Build TypeScript
   - Create Git tag
   - Create GitHub pre-release
   - Build and publish to NPM with dist-tag
   - Commit version bump

**Usage**:
```bash
# Via GitHub UI: Actions → Pre-release → Run workflow
# Inputs:
#   version: 2.5.0-beta.2
#   tag: beta (or rc, alpha, next)

# Via CLI
gh workflow run pre-release.yml \
  -f version=2.5.0-beta.2 \
  -f tag=beta
```

**Success Criteria**:
- ✅ Tests pass
- ✅ Package validates
- ✅ GitHub pre-release created
- ✅ NPM package published with correct tag
- ✅ Version bump committed

**Example Tags**:
- `beta`: For beta testing (e.g., `2.5.0-beta.1`, `2.5.0-beta.2`)
- `rc`: Release candidates (e.g., `2.5.0-rc.1`)
- `alpha`: Alpha releases (e.g., `2.6.0-alpha.1`)
- `next`: Experimental features (e.g., `3.0.0-next.1`)

---

## 4. Release Workflow (`release.yml`)

**Purpose**: Automated stable releases with full validation

**Triggers**:
- Tag push matching `v*.*.*` (e.g., `v2.5.0`)

**Jobs**:
1. **Extract Version**
   - Parse version from Git tag
   - Validate semantic version format

2. **Run Tests**
   - Install dependencies
   - Run TypeScript build
   - Run full test suite

3. **Validate Package**
   - Call `validate-package.yml` workflow
   - Ensure package works when installed

4. **Create Release**
   - Build TypeScript
   - Create GitHub release (not pre-release)
   - Generate release notes from commits
   - Build and publish to NPM with `latest` tag
   - Update package.json version
   - Commit version bump

**Usage**:
```bash
# Create and push tag
git tag v2.5.0
git push origin v2.5.0

# Or via GitHub UI: Releases → Create new release
# Tag: v2.5.0
# This will trigger the workflow automatically
```

**Success Criteria**:
- ✅ Tests pass
- ✅ Package validates
- ✅ GitHub release created
- ✅ NPM package published as `latest`
- ✅ Version bump committed

**Important**: Only push tags for stable releases. Use pre-release workflow for betas.

---

## 5. Publish NPM (`publish-npm.yml`)

**Purpose**: Manual NPM publish with custom dist-tag

**Triggers**:
- Manual workflow dispatch

**Inputs**:
- `tag` (required): NPM dist-tag (e.g., `latest`, `beta`, `next`)

**Jobs**:
1. **Publish**
   - Install dependencies
   - Run TypeScript build
   - Publish to NPM with specified tag

**Usage**:
```bash
# Via GitHub UI: Actions → Publish NPM → Run workflow
# Input: tag = "beta"

# Via CLI
gh workflow run publish-npm.yml -f tag=beta
```

**Use Cases**:
- Republish a version with different tag
- Fix dist-tag after incorrect publish
- Promote beta to latest

**Warning**: This doesn't update package.json or create releases. Use for tag management only.

---

## Workflow Dependencies

```
pre-release.yml
  ├─→ validate-package.yml
  └─→ publish-npm.yml (implicit)

release.yml
  ├─→ validate-package.yml
  └─→ publish-npm.yml (implicit)

ci.yml (independent)

publish-npm.yml (manual only)
```

---

## Common Tasks

### Publishing a Beta Release

```bash
# 1. Update version in code if needed
npm version 2.5.0-beta.2 --no-git-tag-version

# 2. Commit changes
git add package.json package-lock.json
git commit -m "chore: bump to v2.5.0-beta.2"
git push

# 3. Trigger pre-release workflow
gh workflow run pre-release.yml \
  -f version=2.5.0-beta.2 \
  -f tag=beta

# Or via GitHub UI: Actions → Pre-release → Run workflow
```

### Publishing a Stable Release

```bash
# 1. Update version
npm version 2.5.0 --no-git-tag-version

# 2. Commit and tag
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(release): v2.5.0"
git tag v2.5.0

# 3. Push (triggers release workflow automatically)
git push origin main
git push origin v2.5.0

# Workflow runs automatically on tag push
```

### Testing Package Before Release

```bash
# Run validation manually
gh workflow run validate-package.yml -f version=2.5.0-beta.2

# Check results in Actions tab
```

### Fixing a Bad Publish

```bash
# Option 1: Deprecate the version
npm deprecate simply-mcp@2.5.0-beta.1 "Use 2.5.0-beta.2 instead"

# Option 2: Unpublish (within 72 hours only)
npm unpublish simply-mcp@2.5.0-beta.1 --force

# Option 3: Publish with different tag
gh workflow run publish-npm.yml -f tag=beta-broken
```

---

## Secrets Required

The workflows use these GitHub secrets:

| Secret | Usage | How to Set |
|--------|-------|------------|
| `NPM_TOKEN` | NPM publishing | Settings → Secrets → Actions → New secret |
| `GITHUB_TOKEN` | GitHub releases | Auto-provided by GitHub |

**Setting NPM Token**:
1. Create token on npmjs.com (Settings → Access Tokens)
2. Token type: "Automation" (for CI/CD)
3. Add to GitHub: Repository → Settings → Secrets and variables → Actions
4. Name: `NPM_TOKEN`
5. Value: Your NPM token

---

## Monitoring Workflows

### Via GitHub UI
1. Navigate to repository
2. Click "Actions" tab
3. View workflow runs

### Via CLI
```bash
# List workflow runs
gh run list

# Watch a specific run
gh run watch

# View logs
gh run view <run-id> --log
```

### Notifications
- **Email**: Configured in GitHub settings
- **Slack**: Add GitHub app to Slack workspace
- **Status checks**: Required for PRs

---

## Debugging Failed Workflows

### Common Issues

**1. Tests Fail**
```bash
# Run locally
npm run build
npm test

# Check specific test
npm test -- --grep "test name"
```

**2. Package Validation Fails**
```bash
# Test locally
npm pack
cd /tmp
npm install /path/to/tarball.tgz
npx simply-mcp run --help
```

**3. NPM Publish Fails**
```bash
# Check token
npm whoami --registry=https://registry.npmjs.org/

# Test publish (dry run)
npm publish --dry-run --tag beta
```

**4. Version Conflicts**
```bash
# Check current published versions
npm view simply-mcp versions

# Check dist-tags
npm dist-tag ls simply-mcp
```

### Re-running Workflows

```bash
# Re-run failed jobs
gh run rerun <run-id>

# Re-run specific job
gh run rerun <run-id> --job <job-id>
```

---

## Best Practices

### 1. Version Naming
- **Stable**: `2.5.0` (no suffix)
- **Beta**: `2.5.0-beta.1`, `2.5.0-beta.2`, etc.
- **RC**: `2.5.0-rc.1`, `2.5.0-rc.2`, etc.
- **Alpha**: `2.6.0-alpha.1` (major/minor changes)
- **Next**: `3.0.0-next.1` (experimental)

### 2. Git Tags
- Stable: `v2.5.0`
- Pre-release: `v2.5.0-beta.1`
- Always prefix with `v`

### 3. NPM Tags
- `latest`: Stable releases only
- `beta`: Beta testing
- `rc`: Release candidates
- `next`: Experimental features
- Never use `latest` for pre-releases!

### 4. Changelog
- Update CHANGELOG.md before release
- Follow Keep a Changelog format
- Document breaking changes clearly

### 5. Testing
- Always run `validate-package.yml` before publishing
- Test examples and README code
- Verify imports work from installed package

---

## Workflow File Locations

```
.github/workflows/
├── ci.yml                    # Continuous integration
├── validate-package.yml      # Package validation
├── pre-release.yml          # Beta/RC releases
├── release.yml              # Stable releases
├── publish-npm.yml          # Manual NPM publish
└── README.md                # This file
```

---

## Support

**Issues**: https://github.com/Clockwork-Innovations/simply-mcp-ts/issues
**Discussions**: https://github.com/Clockwork-Innovations/simply-mcp-ts/discussions
**CI/CD Docs**: `docs/development/CICD_*.md`

---

## Quick Reference

```bash
# Check workflow status
gh run list --limit 10

# Trigger pre-release
gh workflow run pre-release.yml -f version=2.5.0-beta.2 -f tag=beta

# Trigger validation
gh workflow run validate-package.yml -f version=2.5.0-beta.2

# Create stable release (via tag)
git tag v2.5.0 && git push origin v2.5.0

# View logs
gh run view <run-id> --log

# Cancel run
gh run cancel <run-id>
```

---

**Last Updated**: 2025-10-09
**Version**: 2.5.0-beta.2
