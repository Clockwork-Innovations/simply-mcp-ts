# Pre-Release Plan for simply-mcp

This document provides a comprehensive guide to the pre-release process for simply-mcp, including workflows, decision trees, and best practices for ensuring stable releases.

## Table of Contents

- [Overview](#overview)
- [When to Use Pre-Release](#when-to-use-pre-release)
- [Release Strategies](#release-strategies)
- [Pre-Release Workflow](#pre-release-workflow)
- [Integration with GitHub Actions](#integration-with-github-actions)
- [Manual vs Automated Steps](#manual-vs-automated-steps)
- [Validation Requirements](#validation-requirements)
- [Decision Trees](#decision-trees)
- [Best Practices](#best-practices)
- [Common Scenarios](#common-scenarios)

---

## Overview

The pre-release process is designed to ensure that every release of simply-mcp is stable, well-tested, and delivers value to users without breaking existing functionality.

### Goals

1. **Prevent Breaking Changes**: Catch issues before they reach stable releases
2. **User Confidence**: Build trust through reliable, predictable releases
3. **Fast Iteration**: Enable quick fixes while maintaining quality
4. **Community Engagement**: Allow users to test and provide feedback early

### Pre-Release Types

| Type | Tag | Purpose | Stability |
|------|-----|---------|-----------|
| **Alpha** | `alpha` | Experimental features, early testing | Unstable, expect breaking changes |
| **Beta** | `beta` | Feature-complete, needs user testing | Mostly stable, may have bugs |
| **RC** | `rc` | Release candidate, final testing | Very stable, minor fixes only |
| **Stable** | `latest` | Production-ready release | Stable |

### Release Cadence

- **Patch releases**: As needed (bug fixes)
- **Minor releases**: Every 2-4 weeks (new features)
- **Major releases**: Every 3-6 months (breaking changes)

---

## When to Use Pre-Release

### Use Pre-Release (Beta/Alpha) When:

1. **Breaking Changes**
   - Any change that breaks existing APIs
   - Removal of deprecated features
   - Major architectural changes

2. **New Major Features**
   - Complex new functionality
   - Features requiring user integration
   - Changes to CLI behavior

3. **Significant Refactoring**
   - Core code restructuring
   - Performance optimizations that may affect behavior
   - Dependency upgrades that may have side effects

4. **User Feedback Needed**
   - Experimental features
   - API design validation
   - UX improvements requiring real-world testing

### Skip Pre-Release (Direct Stable) When:

1. **Bug Fixes**
   - Simple bug fixes with no behavioral changes
   - Patches that fix regressions
   - Security patches (evaluate case-by-case)

2. **Documentation Only**
   - README updates
   - Documentation corrections
   - Example improvements

3. **Internal Changes**
   - Code refactoring with no API changes
   - Test improvements
   - Build process changes

4. **Low-Risk Minor Features**
   - Purely additive features (no breaking changes)
   - Opt-in functionality
   - Features behind feature flags

---

## Release Strategies

### Strategy 1: Direct Release (Low Risk)

**Use for**: Patch releases, documentation, simple bug fixes

```
main branch → Build & Test → Validate → Release to stable
```

**Timeline**: Same day

**Process**:
1. Merge PR to main
2. Run validation scripts
3. Trigger release workflow
4. Monitor for 2-4 hours

**Risk Level**: Low

### Strategy 2: Beta Release (Medium Risk)

**Use for**: Minor releases, new features, moderate refactoring

```
main branch → Build & Test → Validate → Beta Release → Testing (1-7 days) → Stable Release
```

**Timeline**: 1-7 days

**Process**:
1. Complete feature development
2. Run full validation suite
3. Release as beta (`2.5.0-beta.1`)
4. Test with real users
5. Fix issues (iterate beta if needed)
6. Promote to stable

**Risk Level**: Medium

### Strategy 3: Alpha → Beta → Stable (High Risk)

**Use for**: Major releases, breaking changes, experimental features

```
main branch → Alpha Release → Early Testing → Beta Release → User Testing → RC → Stable Release
```

**Timeline**: 2-4 weeks

**Process**:
1. Release alpha for early adopters
2. Gather initial feedback (1-3 days)
3. Release beta with fixes
4. Extended testing period (7-14 days)
5. Release candidate (RC) for final validation
6. Stable release

**Risk Level**: High

---

## Pre-Release Workflow

### Phase 1: Preparation

**Step 1: Code Freeze**
- Stop accepting new features
- Focus on bug fixes and testing
- Update documentation

**Step 2: Documentation Review**
- [ ] Update CHANGELOG.md
- [ ] Update README.md if needed
- [ ] Create/update migration guides
- [ ] Review API documentation

**Step 3: Dependency Audit**
```bash
npm audit --audit-level=moderate
npm outdated
```

### Phase 2: Validation

**Step 1: Automated Validation**
```bash
# Build
npm run build

# Run test suite
npm test

# Package validation
bash scripts/validate-package.sh

# Pre-release tests
bash scripts/pre-release-test.sh [VERSION]

# Integration tests
bash scripts/integration-test.sh
```

**Step 2: Manual Validation**
- Test CLI commands manually
- Test in different environments (Node 20.x, 22.x)
- Test both transports (stdio, HTTP)
- Test all API styles (decorator, functional, programmatic)

**Step 3: Tarball Testing**
```bash
# Create tarball
npm pack

# Test installation in clean environment
mkdir /tmp/test && cd /tmp/test
npm init -y
npm install /path/to/simply-mcp-*.tgz

# Test imports
npm install tsx
echo "import { SimplyMCP } from 'simply-mcp'; console.log('OK');" | npx tsx
```

### Phase 3: Release

**Step 1: Version Decision**

Determine version number based on changes:
```bash
# For beta
VERSION="2.5.0-beta.1"

# For stable
VERSION="2.5.0"  # or use npm version [patch|minor|major]
```

**Step 2: Execute Release**

**Option A: GitHub Actions (Recommended)**
- Navigate to Actions → Pre-Release Validation & Publish
- Set version, tag, and publish options
- Click "Run workflow"

**Option B: Manual**
```bash
# Update version
npm version $VERSION --no-git-tag-version

# Build
npm run build

# Test
npm test

# Commit and tag
git add package.json package-lock.json
git commit -m "chore(release): v$VERSION"
git tag "v$VERSION"

# Push
git push origin main --follow-tags

# Publish
npm publish --tag [beta|latest] --access public

# Create GitHub release
gh release create "v$VERSION" --title "v$VERSION" [--prerelease] --generate-notes
```

### Phase 4: Post-Release

**Immediate (0-2 hours)**
- [ ] Verify npm publication
- [ ] Test installation: `npm install simply-mcp@[beta|latest]`
- [ ] Monitor GitHub issues
- [ ] Verify documentation

**Short-term (2-24 hours)**
- [ ] Post release announcement
- [ ] Monitor user feedback
- [ ] Track download statistics
- [ ] Watch for bug reports

**Medium-term (1-7 days for beta, 1-2 weeks for stable)**
- [ ] Collect feedback
- [ ] Plan next iteration (if beta)
- [ ] Prepare promotion to stable (if beta successful)

---

## Integration with GitHub Actions

### Available Workflows

#### 1. CI Workflow (`.github/workflows/ci.yml`)
- **Trigger**: Push/PR to main
- **Purpose**: Continuous integration testing
- **Duration**: ~5 minutes
- **Runs**: Build, test, lint, type check

#### 2. Package Validation Workflow (`.github/workflows/validate-package.yml`)
- **Trigger**: PR/Push (package changes), Manual
- **Purpose**: Validate package structure and exports
- **Duration**: ~5-10 minutes
- **Runs**: Package validation, import tests, security checks

#### 3. Pre-Release Workflow (`.github/workflows/pre-release.yml`)
- **Trigger**: Manual (workflow_dispatch)
- **Purpose**: Full pre-release validation and optional beta publishing
- **Duration**: ~10-15 minutes
- **Inputs**:
  - `version`: Pre-release version (e.g., `2.5.0-beta.1`)
  - `publish`: Whether to publish to npm
  - `tag`: npm dist-tag (`beta`, `alpha`, `next`)

#### 4. Release Workflow (`.github/workflows/release.yml`)
- **Trigger**: Manual (workflow_dispatch)
- **Purpose**: Release stable or beta versions
- **Duration**: ~10-15 minutes
- **Inputs**:
  - `version`: Version type (`patch`, `minor`, `major`, `beta`, `promote-beta`)
  - `specific_version`: Optional specific version
  - `skip_validation`: Skip pre-release validation (not recommended)

### Workflow Usage Examples

**Example 1: Beta Release**
```yaml
# Navigate to: Actions → Pre-Release Validation & Publish
Inputs:
  version: "2.5.0-beta.1"
  publish: true
  tag: beta
```

**Example 2: Promote Beta to Stable**
```yaml
# Navigate to: Actions → Release & Publish
Inputs:
  version: "promote-beta"
  specific_version: ""
  skip_validation: false
```

**Example 3: Direct Patch Release**
```yaml
# Navigate to: Actions → Release & Publish
Inputs:
  version: "patch"
  specific_version: ""
  skip_validation: false
```

### Workflow Integration Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     Developer Workflow                        │
└────────────┬────────────────────────────┬────────────────────┘
             │                            │
             ▼                            ▼
    ┌────────────────┐          ┌────────────────┐
    │ Push to main   │          │ Create PR      │
    └────────┬───────┘          └────────┬───────┘
             │                           │
             ▼                           ▼
    ┌────────────────┐          ┌────────────────┐
    │   CI Workflow  │          │  CI Workflow   │
    │   (automatic)  │          │  (automatic)   │
    └────────┬───────┘          └────────┬───────┘
             │                           │
             ▼                           ▼
    ┌────────────────┐          ┌────────────────┐
    │ Package Valid  │          │ Package Valid  │
    │   (automatic)  │          │   (automatic)  │
    └────────┬───────┘          └────────────────┘
             │
             ▼
    ┌────────────────────────┐
    │ Ready for Release?     │
    └────────┬───────────────┘
             │
             ▼
    ┌────────────────────────────────────────┐
    │   Manual Workflow Trigger              │
    └────┬─────────────────────────┬─────────┘
         │                         │
         ▼                         ▼
┌─────────────────┐      ┌──────────────────┐
│ Pre-Release     │      │  Release & Publish│
│ Validation      │      │  Workflow         │
│ (manual trigger)│      │  (manual trigger) │
└────────┬────────┘      └────────┬──────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐      ┌──────────────────┐
│ Validation      │      │ Pre-Release      │
│ + Beta Publish  │      │ Validation       │
│ (if requested)  │      │ (runs first)     │
└────────┬────────┘      └────────┬──────────┘
         │                        │
         │                        ▼
         │               ┌──────────────────┐
         │               │ Version Bump     │
         │               │ & Publish        │
         │               └────────┬──────────┘
         │                        │
         └────────────────────────┼──────────────┐
                                  │              │
                                  ▼              ▼
                         ┌─────────────┐  ┌───────────┐
                         │ npm Package │  │  GitHub   │
                         │  Published  │  │  Release  │
                         └─────────────┘  └───────────┘
```

---

## Manual vs Automated Steps

### Fully Automated (via GitHub Actions)

- ✅ Build and compilation
- ✅ Test execution
- ✅ Package validation
- ✅ Pre-release validation
- ✅ Integration testing
- ✅ Version bumping
- ✅ Git tagging
- ✅ npm publishing
- ✅ GitHub release creation
- ✅ Artifact generation

### Manual Steps Required

- 🔸 Decision to release (human judgment)
- 🔸 Version type selection (patch/minor/major)
- 🔸 Beta testing period duration
- 🔸 Promotion decision (beta → stable)
- 🔸 Release notes editing (if needed)
- 🔸 Community communication
- 🔸 Rollback decision (if issues found)
- 🔸 Post-release monitoring

### Semi-Automated (Workflow Trigger + Human Oversight)

- 🔹 Workflow initiation (manual trigger)
- 🔹 Validation review (automated run, manual review)
- 🔹 Release approval (workflow runs, human confirms)
- 🔹 Post-release verification (automated checks, human spot-checks)

---

## Validation Requirements

### Mandatory Validations (Must Pass)

All of these must pass before any release:

1. **Build**: Package builds without errors
   ```bash
   npm run build
   ```

2. **Tests**: All tests pass
   ```bash
   npm test
   ```

3. **Package Structure**: Package validation passes
   ```bash
   bash scripts/validate-package.sh
   ```

4. **Type Checking**: TypeScript compiles without errors
   ```bash
   npx tsc --noEmit
   ```

5. **Exports**: All exports are valid and accessible
   - Main export (`simply-mcp`)
   - Subpath exports (`simply-mcp/decorators`, `simply-mcp/config`)

6. **Bin Entries**: All CLI commands work
   - `simply-mcp`, `simplymcp`, `SimplyMCP`, `simplyMCP`
   - `simplymcp-run`, `simplymcp-class`, `simplymcp-func`, `simplymcp-bundle`

7. **Documentation**: Key files present and valid
   - README.md exists and not empty
   - LICENSE exists
   - CHANGELOG.md updated

### Recommended Validations (Should Pass)

These should pass for stable releases, may be relaxed for alpha/beta:

1. **Pre-Release Tests**: Comprehensive testing scenarios
   ```bash
   bash scripts/pre-release-test.sh [VERSION]
   ```

2. **Integration Tests**: End-to-end workflow testing
   ```bash
   bash scripts/integration-test.sh
   ```

3. **Security Audit**: No high/critical vulnerabilities
   ```bash
   npm audit --audit-level=high
   ```

4. **Package Size**: Reasonable package size (< 10MB)

5. **Import Patterns**: Both old and new import styles work
   - Old: `import { tool } from 'simply-mcp/decorators'`
   - New: `import { tool } from 'simply-mcp'`

### Optional Validations (Nice to Have)

1. **Performance Benchmarks**: No significant regressions
2. **Documentation Site**: Renders correctly
3. **Example Projects**: All examples work
4. **Compatibility Testing**: Works on multiple Node versions

---

## Decision Trees

### Release Type Decision Tree

```
Do you have changes to release?
│
├─ Yes → What type of changes?
│         │
│         ├─ Bug fixes only?
│         │  │
│         │  ├─ Yes → PATCH RELEASE (Direct to stable)
│         │  │         Example: 2.4.7 → 2.4.8
│         │  │         Duration: Same day
│         │  │
│         │  └─ No → Continue below...
│         │
│         ├─ New features (no breaking changes)?
│         │  │
│         │  ├─ Small feature (low risk) → MINOR RELEASE (Direct to stable or short beta)
│         │  │                              Example: 2.4.7 → 2.5.0
│         │  │                              Duration: Same day or 1-3 day beta
│         │  │
│         │  └─ Large feature (medium risk) → MINOR RELEASE (Beta required)
│         │                                   Example: 2.4.7 → 2.5.0-beta.1 → 2.5.0
│         │                                   Duration: 3-7 day beta
│         │
│         └─ Breaking changes?
│            │
│            └─ Yes → MAJOR RELEASE (Beta strongly recommended)
│                     Example: 2.4.7 → 3.0.0-beta.1 → 3.0.0
│                     Duration: 7-14 day beta
│
└─ No → No release needed
```

### Pre-Release Decision Tree

```
Should you use a pre-release (beta/alpha)?
│
├─ Is this a breaking change?
│  ├─ Yes → BETA REQUIRED
│  └─ No → Continue below...
│
├─ Is this a major new feature?
│  ├─ Yes → BETA RECOMMENDED
│  └─ No → Continue below...
│
├─ Does this affect the CLI?
│  ├─ Yes → BETA RECOMMENDED
│  └─ No → Continue below...
│
├─ Is this a refactoring with behavior changes?
│  ├─ Yes → BETA RECOMMENDED
│  └─ No → Continue below...
│
├─ Do you need user feedback before stable release?
│  ├─ Yes → BETA RECOMMENDED
│  └─ No → Continue below...
│
└─ Is this a simple bug fix or documentation change?
   ├─ Yes → SKIP PRE-RELEASE (Direct to stable)
   └─ No → USE PRE-RELEASE (when in doubt, beta)
```

### Beta Duration Decision Tree

```
How long should the beta period be?
│
├─ What's the risk level?
│  │
│  ├─ Low (small changes)
│  │  └─ Duration: 1-3 days
│  │     Scenarios: Minor feature additions, small refactoring
│  │
│  ├─ Medium (moderate changes)
│  │  └─ Duration: 3-7 days
│  │     Scenarios: New features, CLI changes, multiple features
│  │
│  └─ High (major changes)
│     └─ Duration: 7-14 days
│        Scenarios: Breaking changes, major refactoring, new transport
│
├─ Have issues been found in beta?
│  ├─ Yes → Extend beta period
│  │        Release beta.2, beta.3, etc.
│  │        Add 1-3 more days per iteration
│  │
│  └─ No → Continue below...
│
└─ Has there been sufficient user feedback?
   ├─ Yes → PROMOTE TO STABLE
   └─ No → EXTEND BETA
            Wait for more feedback
```

### Rollback Decision Tree

```
Should you rollback a release?
│
├─ How severe is the issue?
│  │
│  ├─ Critical (security, data loss, complete breakage)
│  │  └─ ROLLBACK IMMEDIATELY
│  │     If < 72 hours: unpublish
│  │     If > 72 hours: hotfix + deprecate
│  │
│  ├─ Major (core functionality broken, affects most users)
│  │  └─ How long since release?
│  │     ├─ < 72 hours → Consider rollback
│  │     └─ > 72 hours → Hotfix release
│  │
│  ├─ Minor (edge case, affects few users)
│  │  └─ FIX IN NEXT VERSION
│  │     No rollback needed
│  │
│  └─ Trivial (documentation, minor UX)
│     └─ FIX IN NEXT VERSION
│        No rollback needed
│
└─ No issues → No action needed
```

---

## Best Practices

### Before Release

1. **Test in Clean Environment**
   - Always test installation in a fresh directory
   - Don't rely on cached dependencies
   - Test on multiple Node versions

2. **Update Documentation First**
   - CHANGELOG.md should be complete before release
   - Migration guides should be ready
   - Examples should be updated and tested

3. **Communicate Early**
   - Announce upcoming releases (especially major versions)
   - Give users time to prepare for breaking changes
   - Solicit feedback on beta releases

4. **Use Beta for Doubt**
   - When in doubt, use a beta release
   - Better to have an unnecessary beta than a broken stable release
   - Beta releases build user confidence

### During Release

1. **Follow the Checklist**
   - Use the CI/CD checklist religiously
   - Don't skip validation steps
   - Document any deviations

2. **Monitor Workflows**
   - Watch GitHub Actions workflows in real-time
   - Check for warnings or errors
   - Verify each step completes successfully

3. **Verify Immediately**
   - Test npm installation within minutes of release
   - Check GitHub release page
   - Verify git tags

### After Release

1. **Monitor Proactively**
   - Watch GitHub issues
   - Track npm download stats
   - Check community channels

2. **Respond Quickly**
   - Acknowledge issues within hours
   - Provide workarounds if available
   - Communicate timeline for fixes

3. **Learn from Issues**
   - Document what went wrong
   - Update validation scripts to catch similar issues
   - Improve pre-release testing

### General Best Practices

1. **Automate Everything Possible**
   - Use GitHub Actions workflows
   - Automate validation scripts
   - Minimize manual steps

2. **Version Carefully**
   - Follow semantic versioning strictly
   - Communicate breaking changes clearly
   - Provide migration guides

3. **Test Like a User**
   - Install from npm (not local files)
   - Use the package as a user would
   - Test common use cases

4. **Keep Communication Open**
   - Respond to feedback
   - Be transparent about issues
   - Thank contributors and testers

---

## Common Scenarios

### Scenario 1: Simple Bug Fix

**Situation**: Fixed a small bug, no API changes, low risk

**Strategy**: Direct patch release

**Timeline**: Same day

**Process**:
1. Fix bug, write test, merge PR
2. Run validation: `bash scripts/validate-package.sh`
3. Trigger Release workflow (patch)
4. Monitor for 2-4 hours

### Scenario 2: New Feature (Low Risk)

**Situation**: Added new optional API, backward compatible, additive only

**Strategy**: Direct minor release or short beta

**Timeline**: Same day or 1-3 day beta

**Process**:
1. Complete feature, merge PR
2. Update documentation
3. Option A: Direct release (if confident)
4. Option B: 1-3 day beta (if want feedback)
5. Monitor for 1 week

### Scenario 3: New Feature (Medium Risk)

**Situation**: New feature with CLI changes, affects user workflows

**Strategy**: Beta release (3-7 days)

**Timeline**: 3-7 days

**Process**:
1. Complete feature, update docs
2. Release beta: `2.5.0-beta.1`
3. Announce beta, request testing
4. Collect feedback for 3-7 days
5. Fix issues (iterate beta if needed)
6. Promote to stable: `2.5.0`

### Scenario 4: Breaking Change

**Situation**: API change that breaks existing code, major refactoring

**Strategy**: Beta release (7-14 days) with migration guide

**Timeline**: 7-14 days

**Process**:
1. Create comprehensive migration guide
2. Release beta: `3.0.0-beta.1`
3. Announce breaking changes prominently
4. Provide example migrations
5. Extended testing period (7-14 days)
6. Multiple beta iterations expected
7. Promote to stable with fanfare: `3.0.0`

### Scenario 5: Critical Bug in Production

**Situation**: Severe bug discovered in stable release

**Strategy**: Immediate hotfix

**Timeline**: Within 24 hours

**Process**:
1. Assess severity
2. If < 72 hours: consider unpublish
3. Develop and test fix urgently
4. Release hotfix patch: `2.5.1`
5. Deprecate broken version
6. Communicate to all users
7. Post-mortem: why did this get through?

### Scenario 6: Security Vulnerability

**Situation**: Security issue discovered or reported

**Strategy**: Coordinated disclosure + patch

**Timeline**: 24-48 hours

**Process**:
1. Privately verify vulnerability
2. Create security advisory (private)
3. Develop and test patch
4. Coordinate disclosure timing
5. Release patched version
6. Publish security advisory
7. Notify users to upgrade immediately
8. Consider backporting to older versions

---

## Appendix: Workflow Diagrams

### Complete Release Flow (Visual)

```
┌─────────────────────────────────────────────────────────────┐
│                    Development Phase                         │
│  - Feature development                                       │
│  - Code review                                               │
│  - PR merge to main                                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Validation Phase                          │
│  - Automated CI tests                                        │
│  - Package validation                                        │
│  - Pre-release validation                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Release      │
                  │ Decision     │
                  └──┬────────┬──┘
                     │        │
           Low Risk  │        │  High Risk
              ┌──────┘        └─────────┐
              │                          │
              ▼                          ▼
     ┌────────────────┐          ┌──────────────┐
     │ Direct Release │          │ Beta Release │
     │   (Stable)     │          │ (Pre-release)│
     └────────┬───────┘          └──────┬───────┘
              │                         │
              │                         ▼
              │                  ┌─────────────┐
              │                  │ Beta Testing│
              │                  │  (1-14 days)│
              │                  └──────┬──────┘
              │                         │
              │                         ▼
              │                  ┌─────────────┐
              │                  │  Promote to │
              │                  │   Stable    │
              │                  └──────┬──────┘
              │                         │
              └─────────────┬───────────┘
                            │
                            ▼
               ┌─────────────────────────┐
               │  npm Publish (latest)   │
               │  GitHub Release         │
               │  Git Tag                │
               └────────────┬────────────┘
                            │
                            ▼
               ┌─────────────────────────┐
               │  Post-Release           │
               │  - Monitoring           │
               │  - Communication        │
               │  - Feedback Collection  │
               └─────────────────────────┘
```

---

**Version**: 1.0.0
**Last Updated**: 2025-10-06
**Maintained By**: DevOps Team

For questions or suggestions, please open an issue or discussion on GitHub.
