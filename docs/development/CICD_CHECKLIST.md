# CI/CD Checklist for simply-mcp

This comprehensive checklist covers all phases of the release process, from pre-release validation to post-release monitoring and rollback procedures.

## Table of Contents

- [Pre-Release Phase](#pre-release-phase)
- [Beta Release Phase](#beta-release-phase)
- [Stable Release Phase](#stable-release-phase)
- [Post-Release Phase](#post-release-phase)
- [Rollback Procedures](#rollback-procedures)
- [Emergency Procedures](#emergency-procedures)
- [Version Management](#version-management)
- [Documentation Updates](#documentation-updates)
- [Communication Plan](#communication-plan)

---

## Pre-Release Phase

### Before Starting Release

**Code Quality**
- [ ] All tests passing on `main` branch
  ```bash
  npm test
  ```
- [ ] CI/CD pipeline passing (all workflows green)
- [ ] No open critical or high-priority bugs
- [ ] Code review completed for all PRs in release
- [ ] TypeScript builds without errors
  ```bash
  npm run build
  npx tsc --noEmit
  ```

**Documentation**
- [ ] README.md up to date
- [ ] CHANGELOG.md updated with all changes
- [ ] API documentation reflects new features
- [ ] Migration guide ready (if breaking changes)
- [ ] Examples updated and tested

**Dependencies**
- [ ] Dependencies up to date (or documented why not)
- [ ] No security vulnerabilities
  ```bash
  npm audit --audit-level=moderate
  ```
- [ ] Lock file (`package-lock.json`) committed

**Testing**
- [ ] Unit tests cover new features
- [ ] Integration tests passing
- [ ] Manual testing in clean environment completed
- [ ] CLI commands tested manually

### Pre-Release Validation

Run comprehensive validation scripts:

**Package Validation**
- [ ] Run package validation script
  ```bash
  bash scripts/validate-package.sh
  ```
- [ ] All exports valid and accessible
- [ ] Bin entries work correctly
- [ ] TypeScript declarations present

**Pre-Release Tests**
- [ ] Run pre-release test script
  ```bash
  bash scripts/pre-release-test.sh [VERSION]
  ```
- [ ] Tarball creation successful
- [ ] Installation from tarball works
- [ ] Import patterns validated (old and new)
- [ ] API styles tested (decorator, functional, programmatic)

**Integration Tests**
- [ ] Run integration test suite
  ```bash
  bash scripts/integration-test.sh
  ```
- [ ] Fresh installation workflow
- [ ] Upgrade workflow
- [ ] CLI commands functional
- [ ] Both transports (stdio, HTTP) working

**Breaking Changes Assessment**
- [ ] Identify all breaking changes
- [ ] Document breaking changes in CHANGELOG
- [ ] Create migration guide if needed
- [ ] Consider deprecation warnings for gradual migration
- [ ] Communicate breaking changes to users

---

## Beta Release Phase

Use beta releases for:
- Minor/major version updates
- New features requiring user testing
- Breaking changes
- Significant refactoring

### Before Beta Release

- [ ] Review [Pre-Release Phase](#pre-release-phase) checklist
- [ ] Decide beta version number (e.g., `2.5.0-beta.1`)
- [ ] Prepare beta release notes
- [ ] Identify beta testing goals/metrics

### Trigger Beta Release

**Option 1: Using Pre-Release Workflow**
- [ ] Go to Actions → Pre-Release Validation & Publish
- [ ] Click "Run workflow"
- [ ] Set version: `2.5.0-beta.1`
- [ ] Set tag: `beta`
- [ ] Set publish: `true`
- [ ] Wait for workflow completion

**Option 2: Manual Beta Release**
```bash
# Update version
npm version 2.5.0-beta.1 --no-git-tag-version

# Build and test
npm run build
npm test

# Validate
bash scripts/validate-package.sh
bash scripts/pre-release-test.sh 2.5.0-beta.1

# Commit and tag
git add package.json package-lock.json
git commit -m "chore(release): v2.5.0-beta.1"
git tag v2.5.0-beta.1

# Push
git push origin main --follow-tags

# Publish to npm
npm publish --tag beta --access public

# Create GitHub pre-release
gh release create v2.5.0-beta.1 --title "v2.5.0-beta.1" --prerelease --generate-notes
```

### Beta Testing Period

**Duration**: 1-14 days (depends on change scope)
- Patch features: 1-3 days
- Minor features: 3-7 days
- Major changes: 7-14 days

**Testing**
- [ ] Install beta version
  ```bash
  npm install simply-mcp@beta
  ```
- [ ] Test in clean environment
- [ ] Test upgrade path from stable
- [ ] Verify all features work as documented
- [ ] Check for deprecation warnings

**Monitoring**
- [ ] Monitor GitHub issues for beta feedback
- [ ] Track npm downloads of beta version
- [ ] Collect user feedback
- [ ] Document any issues found

### Beta Iteration (if issues found)

If bugs or issues are discovered:
- [ ] Fix issues on `main` branch
- [ ] Increment beta version (`2.5.0-beta.2`)
- [ ] Repeat beta release process
- [ ] Reset testing period (1-3 more days)
- [ ] Communicate changes to beta testers

### Beta Promotion Decision

Before promoting to stable:
- [ ] No critical bugs in beta
- [ ] Positive user feedback (or no negative feedback)
- [ ] Testing period completed
- [ ] All features working as expected
- [ ] Documentation verified with beta

---

## Stable Release Phase

### Pre-Release Validation (Stable)

- [ ] Review all checklists above
- [ ] Ensure beta testing completed (if beta was used)
- [ ] Final code freeze - no new commits
- [ ] All tests passing
- [ ] All validation scripts pass

### Release Execution

**Using GitHub Actions Workflow**

For **promoting beta to stable**:
- [ ] Go to Actions → Release & Publish
- [ ] Click "Run workflow"
- [ ] Set version: `promote-beta`
- [ ] Review and confirm
- [ ] Wait for workflow completion

For **direct stable release** (patch/minor/major):
- [ ] Go to Actions → Release & Publish
- [ ] Click "Run workflow"
- [ ] Set version: `patch`, `minor`, or `major`
- [ ] Review and confirm
- [ ] Wait for workflow completion

**Manual Release** (if workflow unavailable):
```bash
# Determine version
npm version [patch|minor|major]

# Build and test
npm run build
npm test

# Run all validation
bash scripts/validate-package.sh
bash scripts/pre-release-test.sh [VERSION]
bash scripts/integration-test.sh

# Commit and tag
git add package.json package-lock.json
git commit -m "chore(release): v[VERSION]"
git tag v[VERSION]

# Push
git push origin main --follow-tags

# Create GitHub release
gh release create v[VERSION] --title "v[VERSION]" --generate-notes

# Publish to npm
npm publish --access public
```

### Verification Immediately After Release

Within **15 minutes** of release:

**NPM Publication**
- [ ] Verify package on npm: https://www.npmjs.com/package/simply-mcp
- [ ] Check version matches expected
- [ ] Verify tarball size is reasonable
- [ ] Test installation
  ```bash
  npm install simply-mcp@latest
  ```

**GitHub Release**
- [ ] Release created: https://github.com/Clockwork-Innovations/simply-mcp-ts/releases
- [ ] Release notes accurate
- [ ] Git tag present
- [ ] Assets attached (if any)

**Git Repository**
- [ ] Version commit on `main` branch
- [ ] Git tag pushed
- [ ] package.json version matches release

**Quick Functionality Test**
```bash
# In a temporary directory
mkdir /tmp/test-simply-mcp && cd /tmp/test-simply-mcp
npm init -y
npm install simply-mcp@latest tsx

# Test imports
echo "import { SimplyMCP } from 'simply-mcp'; console.log('OK');" | npx tsx
```

---

## Post-Release Phase

### Immediate Post-Release (0-2 hours)

**Monitoring**
- [ ] Watch GitHub issues for new bug reports
- [ ] Monitor npm download stats
- [ ] Check CI/CD for any failures
- [ ] Review GitHub release page for comments

**Testing**
- [ ] Test fresh installation
  ```bash
  npm install simply-mcp@latest
  ```
- [ ] Test upgrade from previous version
  ```bash
  npm update simply-mcp
  ```
- [ ] Verify examples work with new version
- [ ] Test CLI commands

**Documentation**
- [ ] Verify documentation site updated (if applicable)
- [ ] Check README renders correctly on npm
- [ ] Verify links in README work

### Short-term Post-Release (2-24 hours)

**Monitoring**
- [ ] Continue watching for issues
- [ ] Monitor community feedback
- [ ] Check download statistics
- [ ] Review CI/CD status

**Communication**
- [ ] Post release announcement (see [Communication Plan](#communication-plan))
- [ ] Update relevant discussions/issues
- [ ] Notify beta testers (if beta was used)
- [ ] Thank contributors

### Medium-term Post-Release (1-7 days)

**Monitoring**
- [ ] Track adoption rate
- [ ] Monitor for edge case bugs
- [ ] Review user feedback
- [ ] Check compatibility reports

**Planning**
- [ ] Plan next release (if needed)
- [ ] Address any issues found
- [ ] Update roadmap based on feedback

---

## Rollback Procedures

### Assessment

First, assess severity:
- **Critical**: Security vulnerability, data loss, complete breakage
- **Major**: Core functionality broken, affects most users
- **Minor**: Edge case bug, affects few users
- **Trivial**: Documentation error, minor UX issue

### Rollback Decision Matrix

| Severity | Time Since Release | Action |
|----------|-------------------|--------|
| Critical | Any time | Immediate rollback + hotfix |
| Major | < 72 hours | Consider rollback |
| Major | > 72 hours | Hotfix patch release |
| Minor | Any time | Fix in next version |
| Trivial | Any time | Fix in next version |

### Rollback Procedure (Within 72 hours)

**Step 1: Unpublish from npm**
```bash
# WARNING: Only possible within 72 hours of publish
npm unpublish simply-mcp@[VERSION]
```

**Step 2: Delete GitHub Release**
```bash
gh release delete v[VERSION] --yes
```

**Step 3: Remove Git Tag**
```bash
# Delete local tag
git tag -d v[VERSION]

# Delete remote tag
git push origin :refs/tags/v[VERSION]
```

**Step 4: Revert Version Commit**
```bash
# Revert the version bump commit
git revert [COMMIT_HASH]
git push origin main
```

**Step 5: Communication**
- [ ] Post issue explaining rollback
- [ ] Notify users who may have installed
- [ ] Update release notes (if any)
- [ ] Communicate timeline for fix

### Hotfix Procedure (After 72 hours)

If unpublish is not possible:

**Step 1: Create Hotfix Branch**
```bash
git checkout -b hotfix/[VERSION]
```

**Step 2: Apply Fix**
```bash
# Make fixes
# Test thoroughly
npm test
bash scripts/validate-package.sh
```

**Step 3: Release Hotfix**
```bash
# Increment patch version
npm version patch

# Merge to main
git checkout main
git merge hotfix/[VERSION]

# Release normally
npm publish --access public
git push origin main --follow-tags
```

**Step 4: Deprecate Broken Version**
```bash
npm deprecate simply-mcp@[BROKEN_VERSION] "This version has critical bugs. Use [HOTFIX_VERSION] instead."
```

---

## Emergency Procedures

### Complete Package Breakage

If the package is completely broken and unusable:

**Immediate Actions** (within 1 hour)
- [ ] Assess impact and scope
- [ ] Determine if rollback is possible (< 72 hours)
- [ ] Post GitHub issue explaining situation
- [ ] Deprecate broken version on npm
  ```bash
  npm deprecate simply-mcp@[VERSION] "CRITICAL: Do not use. See GitHub issues."
  ```

**Recovery Plan** (within 24 hours)
- [ ] Identify root cause
- [ ] Develop and test fix
- [ ] Create emergency hotfix release
- [ ] Communicate timeline to users

### Security Vulnerability

If a security vulnerability is discovered:

**Immediate Actions** (within 2 hours)
- [ ] Assess severity (use CVSS score)
- [ ] Determine affected versions
- [ ] Create security advisory (private)
- [ ] Develop patch

**Coordinated Disclosure** (24-48 hours)
- [ ] Test security patch thoroughly
- [ ] Prepare security advisory
- [ ] Release patched version
- [ ] Publish security advisory
- [ ] Notify users to upgrade

---

## Version Management

### Semantic Versioning

Follow [Semantic Versioning](https://semver.org/):
- **Patch** (`2.4.8`): Bug fixes, no breaking changes
- **Minor** (`2.5.0`): New features, backward compatible
- **Major** (`3.0.0`): Breaking changes

### Pre-Release Versions

**Beta**: `2.5.0-beta.1`, `2.5.0-beta.2`, etc.
- For testing new features
- Published with `--tag beta`
- Installed with `npm install simply-mcp@beta`

**Alpha**: `2.5.0-alpha.1`, `2.5.0-alpha.2`, etc.
- For experimental features
- Published with `--tag alpha`
- Highly unstable, for early testing

### Version Planning

**When to use each version type:**

| Change Type | Version | Example | Beta? |
|------------|---------|---------|-------|
| Bug fix | Patch | 2.4.7 → 2.4.8 | No |
| New feature (small) | Minor | 2.4.7 → 2.5.0 | Optional |
| New feature (major) | Minor | 2.4.7 → 2.5.0 | Recommended |
| Breaking change | Major | 2.4.7 → 3.0.0 | Strongly Recommended |
| Deprecation | Minor | 2.4.7 → 2.5.0 | No |

---

## Documentation Updates

### Pre-Release Documentation

**Must Update Before Release:**
- [ ] CHANGELOG.md with all changes
- [ ] README.md if API changed
- [ ] Migration guide if breaking changes
- [ ] API documentation
- [ ] Examples if API changed

### Post-Release Documentation

**Update After Release:**
- [ ] Documentation website (if applicable)
- [ ] Tutorial videos (if needed)
- [ ] Blog posts announcing features
- [ ] FAQ with new information

### Documentation Checklist

**README.md**
- [ ] Installation instructions current
- [ ] Quick start example works
- [ ] Links to documentation valid
- [ ] Badges updated (version, CI status)

**CHANGELOG.md**
- [ ] Version number and date
- [ ] All changes categorized (Added, Changed, Fixed, Deprecated, Removed)
- [ ] Breaking changes clearly marked
- [ ] Links to issues/PRs

**API Documentation**
- [ ] New features documented
- [ ] Deprecated features marked
- [ ] Examples provided
- [ ] TypeScript types accurate

---

## Communication Plan

### Release Announcement

**Channels:**
- [ ] GitHub Release notes
- [ ] GitHub Discussions (if applicable)
- [ ] npm package page
- [ ] Twitter/Social media (if applicable)
- [ ] Discord/Slack community (if applicable)

**Announcement Template:**

```markdown
# simply-mcp v[VERSION] Released

We're excited to announce the release of simply-mcp v[VERSION]!

## Highlights

- [Major feature 1]
- [Major feature 2]
- [Major improvement]

## Installation

```bash
npm install simply-mcp@latest
```

## What's Changed

[Full changelog from CHANGELOG.md or GitHub]

## Breaking Changes

[If any - with migration guide]

## Contributors

Thank you to all contributors who made this release possible!

## Feedback

We'd love to hear your feedback! Please open issues or discussions on GitHub.
```

### Communication Timeline

**Pre-Release:**
- 1 week before: Announce upcoming release (for major versions)
- Beta release: Announce beta availability and request testing

**Release Day:**
- Immediately: Post GitHub release
- Within 2 hours: Social media announcement
- Within 24 hours: Community updates

**Post-Release:**
- 1 day after: Follow-up on feedback
- 1 week after: Summary of adoption/issues

### Issue Communication

**For Critical Bugs:**
```markdown
# Critical Bug in v[VERSION]

We've identified a critical bug in v[VERSION] that affects [DESCRIPTION].

**Impact**: [Who is affected]

**Workaround**: [Temporary solution]

**Fix Timeline**: We're working on a hotfix and expect to release v[HOTFIX_VERSION] within [TIMEFRAME].

**Action Required**:
- If you've installed v[VERSION], please [RECOMMENDED ACTION]
- Monitor this issue for updates

We apologize for the inconvenience.
```

---

## Quick Reference

### Common Commands

```bash
# Validation
bash scripts/validate-package.sh
bash scripts/pre-release-test.sh [VERSION]
bash scripts/integration-test.sh

# Beta Release
npm version 2.5.0-beta.1 --no-git-tag-version
npm publish --tag beta --access public

# Stable Release
npm version [patch|minor|major]
npm publish --access public

# Rollback (< 72 hours)
npm unpublish simply-mcp@[VERSION]
git push origin :refs/tags/v[VERSION]

# Deprecate
npm deprecate simply-mcp@[VERSION] "Use [BETTER_VERSION] instead"
```

### Workflow URLs

- **Pre-Release**: https://github.com/Clockwork-Innovations/simply-mcp-ts/actions/workflows/pre-release.yml
- **Release**: https://github.com/Clockwork-Innovations/simply-mcp-ts/actions/workflows/release.yml
- **CI**: https://github.com/Clockwork-Innovations/simply-mcp-ts/actions/workflows/ci.yml
- **Package Validation**: https://github.com/Clockwork-Innovations/simply-mcp-ts/actions/workflows/validate-package.yml

### Key Resources

- **npm Package**: https://www.npmjs.com/package/simply-mcp
- **GitHub Releases**: https://github.com/Clockwork-Innovations/simply-mcp-ts/releases
- **Documentation**: See `docs/` directory
- **Support**: GitHub Issues

---

## Appendix: Release Decision Tree

```
┌─────────────────────────────┐
│   Need to Release?          │
└──────────┬──────────────────┘
           │
           ▼
    ┌──────────────┐
    │ Bug Fix Only?│
    └──┬────────┬──┘
       │        │
      Yes       No
       │        │
       ▼        ▼
    ┌────┐  ┌──────────────┐
    │Patch│  │New Features? │
    └────┘  └──┬────────┬──┘
               │        │
              Yes       No
               │        │
               ▼        ▼
        ┌─────────┐  ┌──────────────┐
        │Breaking?│  │Major Refactor?│
        └──┬───┬──┘  └──┬────────┬──┘
           │   │        │        │
          Yes  No      Yes       No
           │   │        │        │
           ▼   ▼        ▼        ▼
        ┌────┐ ┌─────┐ ┌─────┐ ┌─────┐
        │Major│ │Minor│ │Major│ │Minor│
        │Beta│ │Beta?│ │Beta│ │Direct│
        └────┘ └─────┘ └─────┘ └─────┘
```

---

**Version**: 1.0.0
**Last Updated**: 2025-10-06
**Maintained By**: DevOps Team
