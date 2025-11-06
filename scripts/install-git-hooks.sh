#!/bin/bash
# Install git hooks for secret scanning

set -e

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Installing Git Hooks${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Not a git repository. Skipping hook installation.${NC}"
    exit 0
fi

HOOKS_DIR=".git/hooks"
SCRIPTS_DIR="scripts"

# Create hooks directory if it doesn't exist
mkdir -p "$HOOKS_DIR"

# Install pre-commit hook
echo -e "${BLUE}Installing pre-commit hook...${NC}"

cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash
# Pre-commit hook: Scan for secrets before committing

echo "🔍 Running secret scan before commit..."

# Run the secret scanner
if ! bash scripts/secret-scan.sh; then
    echo ""
    echo "❌ Commit rejected: Secret scanner found potential issues"
    echo ""
    echo "To bypass this check (NOT RECOMMENDED):"
    echo "  git commit --no-verify"
    echo ""
    exit 1
fi

echo "✅ Secret scan passed - proceeding with commit"
exit 0
EOF

chmod +x "$HOOKS_DIR/pre-commit"
echo -e "${GREEN}✅ Pre-commit hook installed${NC}"

# Install pre-push hook
echo -e "${BLUE}Installing pre-push hook...${NC}"

cat > "$HOOKS_DIR/pre-push" << 'EOF'
#!/bin/bash
# Pre-push hook: Extra security check before pushing

# Only scan on push to main or release branches
CURRENT_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null)

if [[ "$CURRENT_BRANCH" =~ ^(main|master|release/.*)$ ]]; then
    echo "🔍 Running security scan before push to $CURRENT_BRANCH..."

    if ! bash scripts/secret-scan.sh; then
        echo ""
        echo "❌ Push rejected: Secret scanner found issues in $CURRENT_BRANCH"
        echo ""
        echo "To bypass this check (NOT RECOMMENDED):"
        echo "  git push --no-verify"
        echo ""
        exit 1
    fi

    echo "✅ Security scan passed - proceeding with push"
fi

exit 0
EOF

chmod +x "$HOOKS_DIR/pre-push"
echo -e "${GREEN}✅ Pre-push hook installed${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Git hooks installed successfully!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Hooks installed:${NC}"
echo "  • pre-commit  - Scans for secrets before every commit"
echo "  • pre-push    - Scans before pushing to main/release branches"
echo ""
echo -e "${YELLOW}To bypass hooks (not recommended):${NC}"
echo "  git commit --no-verify"
echo "  git push --no-verify"
echo ""
