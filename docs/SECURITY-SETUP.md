# Security Setup Guide

This guide explains how to set up and use the secret scanning system to prevent API key leaks.

## Quick Start

### 1. Install Git Hooks (Recommended)

Install pre-commit and pre-push hooks to prevent accidental commits:

```bash
npm run security:install-hooks
```

This will:
- ✅ Scan for secrets before every commit
- ✅ Block commits containing API keys or secrets
- ✅ Run extra checks before pushing to main/release branches

### 2. Test the Scanner

Run a manual scan to ensure everything works:

```bash
npm run security:scan
```

You should see output like:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SimpleMCP Secret Scanner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/6] Scanning for API keys...
✅ No API keys detected

[2/6] Checking for .env files...
✅ No .env files in repository

[3/6] Validating .gitignore coverage...
✅ .gitignore has good coverage

[4/6] Scanning for hardcoded credentials...
✅ No hardcoded credentials detected

[5/6] Validating documentation examples...
✅ Documentation examples look safe

[6/6] Scanning commit messages...
✅ No suspicious commit messages

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Secret scanning completed - No issues found!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## What Gets Detected

The scanner looks for:

### API Keys
- **OpenAI**: `sk-*`, `sk-proj-*`
- **Anthropic**: `sk-ant-*`
- **AWS**: `AKIA*`
- **Google**: `AIza*`
- **Slack**: `xox*`
- **GitHub**: `ghp_*`, `gho_*`, `ghs_*`, `ghu_*`

### Credentials
- Private keys (RSA, EC, OpenSSH)
- Hardcoded passwords
- Bearer tokens
- Access tokens

### Files
- `.env` files (should be gitignored)
- Files with `secret`, `credential`, `password` in name

## CI/CD Integration

Secret scanning runs automatically on:

### GitHub Actions
- ✅ Every push to `main`
- ✅ Every pull request to `main`
- ✅ Before every release
- ✅ Manual workflow dispatch

### Workflow Files
1. **`.github/workflows/secret-scan.yml`** - Dedicated secret scanning
2. **`.github/workflows/ci.yml`** - Includes security job
3. **`.github/workflows/release.yml`** - Pre-release security check

## Best Practices

### ✅ DO: Use Environment Variables

```typescript
// Good: Use environment variables
const apiKey = process.env.OPENAI_API_KEY;
const dbPassword = process.env.DATABASE_PASSWORD;
```

Create a `.env` file (gitignored):
```bash
OPENAI_API_KEY=sk-proj-your-real-key-here
DATABASE_PASSWORD=your-secure-password
```

### ✅ DO: Use Clear Placeholders in Docs

```typescript
// Good: Obviously fake examples
const apiKey = "sk-xxx-example-key-here";
const apiKey = "YOUR_API_KEY";
const apiKey = "sk-admin-xxx-placeholder";
```

### ❌ DON'T: Hardcode Secrets

```typescript
// Bad: Never do this!
const apiKey = "sk-proj-abc123def456...";
const password = "MySecretPassword123";
```

### ❌ DON'T: Commit .env Files

```bash
# Bad: Never commit these
git add .env
git add .env.production
git add config/secrets.json
```

## Handling Detections

### If Scanner Finds a Secret

1. **Remove the secret** from your code
2. **Use environment variables** instead
3. **Rotate the API key** if it was committed previously
4. **Re-run the scan**: `npm run security:scan`

### Example Fix

**Before (detected):**
```typescript
const client = new OpenAI({
  apiKey: "sk-proj-abc123..."  // ❌ Detected!
});
```

**After (fixed):**
```typescript
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY  // ✅ Safe
});
```

## Bypassing Checks (Emergency Only)

⚠️ **Only use when absolutely necessary and you're certain there are no secrets!**

### Skip pre-commit hook
```bash
git commit --no-verify -m "Emergency fix"
```

### Skip pre-push hook
```bash
git push --no-verify
```

## Configuration

### GitLeaks Config: `.gitleaks.toml`

Customize detection rules and allowlists:

```toml
# Allow specific patterns in documentation
[allowlist]
regexes = [
  '''example-key''',
  '''placeholder''',
  '''YOUR_API_KEY''',
]

# Add custom detection rules
[[rules]]
id = "custom-api-key"
description = "Custom API Key Pattern"
regex = '''custom-[a-zA-Z0-9]{32}'''
```

### Scanner Script: `scripts/secret-scan.sh`

Modify patterns or exclusions:

```bash
# Add new patterns to check
PATTERNS=(
    "sk-[a-zA-Z0-9]{48,}:OpenAI API Key"
    "your-pattern-here:Description"
)

# Exclude additional directories
--exclude-dir=your-directory
```

## Testing

### Test with Known Pattern

Create a test file (don't commit!):

```bash
echo 'const key = "sk-test-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz"' > test-secret.ts
npm run security:scan
# Should detect the key!
rm test-secret.ts
```

### Test Git Hooks

```bash
# Try to commit a file with a fake secret
echo 'sk-proj-test123456789...' > bad-file.txt
git add bad-file.txt
git commit -m "Test"
# Should be blocked!
git reset HEAD bad-file.txt
rm bad-file.txt
```

## Troubleshooting

### False Positives

If the scanner flags legitimate code:

1. **Verify it's not a real secret**
2. **Use clearer placeholders** in examples
3. **Update `.gitleaks.toml`** allowlist if needed

### Scanner Not Running

Check that:
- Scripts are executable: `chmod +x scripts/secret-scan.sh`
- Git hooks are installed: `npm run security:install-hooks`
- You're in a git repository: `git status`

### .env File Detected Locally

This is **expected behavior**. The scanner detects `.env` files to ensure they're gitignored. If the file is already gitignored, you're safe:

```bash
# Verify .env is gitignored
git check-ignore -v .env
# Should output: .gitignore:17:.env  .env
```

## Advanced Usage

### Scan Specific Files

```bash
# Scan a single file
grep -E "sk-[a-zA-Z0-9]{48,}" your-file.ts

# Scan a directory
grep -rE "sk-[a-zA-Z0-9]{48,}" src/
```

### Scan Git History

```bash
# Search entire git history for patterns
git log --all --full-history -S "sk-" --source --pretty=format:"%H %s"
```

### Custom Workflow

Create a custom workflow for your needs:

```yaml
name: Custom Security Scan

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - run: bash scripts/secret-scan.sh
```

## Support

- **Documentation**: See [SECURITY.md](../SECURITY.md)
- **Issues**: Report false positives or bugs on GitHub
- **Security concerns**: Email security@cwinnov.com

## Checklist

Before committing:
- [ ] Git hooks installed
- [ ] No secrets in code (use env vars)
- [ ] `.env` files gitignored
- [ ] Examples use placeholders
- [ ] Scanner passes: `npm run security:scan`

Before release:
- [ ] All CI checks pass
- [ ] No secrets in commit history
- [ ] Dependencies scanned
- [ ] Release notes reviewed
