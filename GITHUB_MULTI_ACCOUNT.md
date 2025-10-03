# Using Multiple GitHub Accounts with GitHub CLI

## Quick Answer

Yes! You can use multiple GitHub accounts with `gh`. The CLI supports switching between accounts.

---

## Method 1: Switch Accounts (Recommended)

GitHub CLI can store multiple authenticated accounts and switch between them.

### Setup Both Accounts

```bash
# Login to first account (e.g., personal)
gh auth login
# Follow prompts, choose account 1

# Login to second account (e.g., Clockwork-Innovations)
gh auth login
# Follow prompts, choose account 2
```

### Check Which Accounts Are Logged In

```bash
gh auth status
```

**Output will show:**
```
github.com
  ✓ Logged in to github.com as account1 (keyring)
  ✓ Logged in to github.com as account2 (keyring)
  ✓ Active account: account2
```

### Switch Between Accounts

```bash
# Switch to specific account
gh auth switch -u account1

# Or switch to account2
gh auth switch -u account2

# Verify current account
gh auth status
```

---

## Method 2: Use Different Hosts (Alternative)

If you need to be authenticated to both simultaneously:

```bash
# Login to GitHub.com
gh auth login --hostname github.com

# Check status
gh auth status
```

---

## For SimplyMCP Deployment

### Step 1: Install GitHub CLI

```bash
sudo apt update
sudo apt install gh -y
gh --version
```

### Step 2: Authenticate with Clockwork-Innovations Account

```bash
# Login - choose the account that has access to Clockwork-Innovations org
gh auth login

# Choose:
# - GitHub.com
# - HTTPS
# - Yes (authenticate Git with credentials)
# - Login with a web browser (or paste token)
```

Follow the prompts:
- It will give you a one-time code
- Open the URL in your browser
- Login with your **Clockwork-Innovations** account
- Enter the code
- Authorize GitHub CLI

### Step 3: Verify Authentication

```bash
# Check you're logged in
gh auth status

# Test access to the org
gh repo view Clockwork-Innovations/simply-mcp
```

### Step 4: Push Code

```bash
cd /mnt/Shared/cs-projects/simple-mcp

# Push to GitHub
git push -u origin main

# Create and push tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Create GitHub release
gh release create v1.0.0 \
  --title "SimplyMCP v1.0.0" \
  --notes-file CHANGELOG.md
```

---

## Useful GitHub CLI Commands

### Repository Management

```bash
# View repository
gh repo view Clockwork-Innovations/simply-mcp

# View in browser
gh repo view Clockwork-Innovations/simply-mcp --web

# Edit repository settings
gh repo edit Clockwork-Innovations/simply-mcp \
  --description "A modern, type-safe Model Context Protocol (MCP) server framework for TypeScript" \
  --homepage "https://cwinnov.com"

# Add topics (note: topics must be added via web or API, not directly with gh)
```

### Release Management

```bash
# Create release
gh release create v1.0.0 \
  --title "SimplyMCP v1.0.0" \
  --notes-file CHANGELOG.md

# List releases
gh release list

# View release
gh release view v1.0.0
```

### Authentication Management

```bash
# Check status of all accounts
gh auth status

# Switch accounts
gh auth switch -u your-account-name

# Logout from current account
gh auth logout

# Logout from specific account
gh auth logout -u account-name
```

---

## Troubleshooting

### "Resource not accessible by personal access token"

You're using the wrong account. Switch accounts:

```bash
gh auth switch -u correct-account-name
```

### "Permission denied"

Make sure the account you're using has access to Clockwork-Innovations org:

```bash
# Check current account
gh auth status

# Verify org access
gh api user/orgs | grep -i clockwork
```

### Multiple Git Credentials

GitHub CLI automatically configures Git to use its credentials:

```bash
# This happens automatically when you run:
gh auth login
# and choose "Yes" for "Authenticate Git with your GitHub credentials"
```

---

## Best Practices

1. **Name Your Tokens Clearly**
   - When creating PATs, use descriptive names like:
     - `gh-cli-personal`
     - `gh-cli-clockwork-innovations`

2. **Use Web Browser Login** (Easiest)
   - When `gh auth login` prompts, choose "Login with a web browser"
   - This automatically handles everything

3. **Check Before Pushing**
   ```bash
   gh auth status  # Verify correct account
   gh repo view    # Verify access to repo
   ```

4. **Keep Accounts Organized**
   ```bash
   # Personal projects - use personal account
   gh auth switch -u personal-account

   # Clockwork projects - use org account
   gh auth switch -u org-account
   ```

---

## Quick Reference

```bash
# Install
sudo apt install gh -y

# Login (first account)
gh auth login

# Login (second account)
gh auth login

# Check accounts
gh auth status

# Switch account
gh auth switch -u account-name

# Push code
git push -u origin main

# Create release
gh release create v1.0.0 --title "v1.0.0" --notes-file CHANGELOG.md
```

---

## For SimplyMCP Right Now

```bash
# 1. Install GitHub CLI
sudo apt install gh -y

# 2. Login with the account that has Clockwork-Innovations access
gh auth login
# Choose: HTTPS, Yes to Git auth, Login with browser

# 3. Verify
gh auth status
gh repo view Clockwork-Innovations/simply-mcp

# 4. Deploy
cd /mnt/Shared/cs-projects/simple-mcp
git push -u origin main
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
gh release create v1.0.0 --title "SimplyMCP v1.0.0" --notes-file CHANGELOG.md
```

Done! 🎉

---

**Last Updated**: 2025-10-02
