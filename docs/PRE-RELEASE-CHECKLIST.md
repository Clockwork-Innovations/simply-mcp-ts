# Pre-Release Checklist

## ⚠️ IMPORTANT: Automated Release Process

The release is **fully automated** when you push a git tag.

## Correct Release Process

1. **Run all tests locally** (see Required Tests below)
2. **Update CHANGELOG.md** - Move `[Unreleased]` section to `[X.Y.Z] - YYYY-MM-DD`
3. **Bump version**: `npm version [patch|minor|major] --no-git-tag-version`
4. **Commit changes**: `git add . && git commit -m "chore(release): vX.Y.Z"`
5. **Create and push tag**: `git tag vX.Y.Z && git push && git push --tags`
6. **Monitor**: GitHub Actions automatically runs validation and publishes to npm

## What Happens Automatically

When you push a tag (`vX.Y.Z`):
- ✅ Pre-release validation runs (package validation, pre-release tests, integration tests)
- ✅ GitHub release is created
- ✅ Package is published to npm with `latest` tag
- ✅ Release notes are generated

No manual GitHub Actions trigger needed!

## Tests to Run Locally Before Release

## Required Tests (in order)

### 1. Build
```bash
npm run build
```
Must complete without errors.

### 2. Full Jest Test Suite
```bash
npm test
```
All tests must pass (currently 365 tests across 15 suites).

### 3. Package Validation
```bash
bash scripts/validate-package.sh
```
All 64 validation checks must pass.

### 4. Pre-Release Tests
```bash
bash scripts/pre-release-test.sh <version>
# Example: bash scripts/pre-release-test.sh 3.3.0
```
All 32 tests must pass (creates tarball, tests installation, API imports, CLI commands, TypeScript types).

### 5. Integration Tests
```bash
bash scripts/integration-test.sh
```
All 8 scenarios must pass (fresh install, API styles, transports, examples).

## Quick Command

Run all tests in sequence:

```bash
npm run build && \
npm test && \
bash scripts/validate-package.sh && \
bash scripts/pre-release-test.sh $(node -p "require('./package.json').version") && \
bash scripts/integration-test.sh
```

## Expected Results

- ✅ Build: Clean compilation
- ✅ Jest: 365/365 tests passing
- ✅ Package: 64/64 checks passing
- ✅ Pre-release: 32/32 tests passing
- ✅ Integration: 8/8 scenarios passing

## What GitHub Actions Run

The `.github/workflows/release.yml` workflow runs:

1. **Pre-Release Validation Job**:
   - `npm ci` - Install dependencies
   - `npm run build` - Build the project
   - `npm test` - Run Jest tests
   - `bash scripts/validate-package.sh` - Package validation
   - `bash scripts/pre-release-test.sh <version>` - Pre-release tests
   - `bash scripts/integration-test.sh` - Integration tests

2. **Release Job** (if validation passes):
   - Version bump
   - Git tag creation
   - GitHub release creation
   - npm publish

## Common Issues

### Issue: Jest tests fail with `import.meta` errors
**Solution**: Remove any test files using `import.meta.url`. Use `.mjs` files for ESM tests instead.

### Issue: CLI tests fail
**Solution**: Ensure all example files are valid and up-to-date. Run `npx simply-mcp run <file> --dry-run` manually.

### Issue: Package validation fails on "files" field
**Solution**: Check that all files listed in `package.json` "files" array actually exist.

### Issue: Integration tests timeout
**Solution**: Ensure no background servers are running on test ports (3000-5010).

## After Release

Monitor these:

1. **GitHub Actions**: https://github.com/Clockwork-Innovations/simply-mcp-ts/actions
2. **npm Package**: https://www.npmjs.com/package/simply-mcp
3. **GitHub Releases**: https://github.com/Clockwork-Innovations/simply-mcp-ts/releases

## Rollback Procedure

If release fails after push:

1. **If tests fail in CI but before npm publish**:
   ```bash
   git tag -d v<version>
   git push origin :refs/tags/v<version>
   git revert HEAD
   git push
   ```

2. **If published to npm (within 72h)**:
   ```bash
   npm unpublish simply-mcp@<version>
   # Then follow step 1 above
   ```

3. **If published to npm (after 72h)**:
   - Cannot unpublish
   - Publish a patch version fixing the issue
   - Mark the broken version as deprecated: `npm deprecate simply-mcp@<version> "Broken release, use <fixed-version>"`
