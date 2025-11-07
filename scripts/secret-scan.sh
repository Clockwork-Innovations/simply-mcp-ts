#!/bin/bash
# Secret scanning script for local development and CI/CD
# Prevents accidental API key leaks

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   SimpleMCP Secret Scanner${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

ISSUES_FOUND=0

# Function to scan for real API keys (not examples)
check_real_secrets() {
    echo -e "${BLUE}[1/6]${NC} Scanning for API keys..."

    # Patterns for real API keys (with entropy check)
    PATTERNS=(
        "sk-[a-zA-Z0-9]{48,}:OpenAI API Key"
        "sk-proj-[a-zA-Z0-9]{48,}:OpenAI Project Key"
        "sk-ant-[a-zA-Z0-9_-]{95,}:Anthropic API Key"
        "AKIA[0-9A-Z]{16}:AWS Access Key"
        "AIza[0-9A-Za-z\\-_]{35}:Google API Key"
        "xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,}:Slack Token"
        "gh[pousr]_[A-Za-z0-9_]{36,}:GitHub Token"
        "-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----:Private Key"
    )

    for PATTERN_PAIR in "${PATTERNS[@]}"; do
        PATTERN="${PATTERN_PAIR%%:*}"
        NAME="${PATTERN_PAIR##*:}"

        # Exclude markdown docs, node_modules, dist, and test results
        if grep -rE "$PATTERN" \
            --exclude-dir=node_modules \
            --exclude-dir=.git \
            --exclude-dir=dist \
            --exclude-dir=build \
            --exclude-dir=playwright-report \
            --exclude-dir=test-results \
            --exclude="*.md" \
            --exclude="CHANGELOG.md" \
            . 2>/dev/null; then

            echo -e "${RED}❌ ERROR: Found potential $NAME!${NC}"
            echo -e "${YELLOW}Location shown above. If these are examples, use placeholders like 'sk-xxx-example'${NC}"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        fi
    done

    if [ $ISSUES_FOUND -eq 0 ]; then
        echo -e "${GREEN}✅ No API keys detected${NC}"
    fi
}

# Check .env files
check_env_files() {
    echo -e "${BLUE}[2/6]${NC} Checking for .env files..."

    # Check for .env files that are tracked by git (accidentally committed)
    TRACKED_ENV=$(git ls-files | grep -E '^\.env' | grep -vE '\.(example|template)$' || true)

    if [ -n "$TRACKED_ENV" ]; then
        echo -e "${RED}❌ ERROR: Found .env files tracked by git:${NC}"
        echo "$TRACKED_ENV"
        echo -e "${YELLOW}These files are committed to the repository and may contain secrets!${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${GREEN}✅ No .env files tracked in git${NC}"
    fi
}

# Validate .gitignore
check_gitignore() {
    echo -e "${BLUE}[3/6]${NC} Validating .gitignore coverage..."

    REQUIRED_PATTERNS=(
        "\.env"
        "\.env\.local"
        "\*secret\*"
        "\*credential\*"
        "\*\.key"
        "\*\.pem"
    )

    MISSING=0
    for PATTERN in "${REQUIRED_PATTERNS[@]}"; do
        if ! grep -q "$PATTERN" .gitignore 2>/dev/null; then
            if [ $MISSING -eq 0 ]; then
                echo -e "${YELLOW}⚠️  WARNING: .gitignore missing recommended patterns:${NC}"
            fi
            echo "  - $PATTERN"
            MISSING=$((MISSING + 1))
        fi
    done

    if [ $MISSING -eq 0 ]; then
        echo -e "${GREEN}✅ .gitignore has good coverage${NC}"
    fi
}

# Check for hardcoded credentials in code
check_hardcoded_credentials() {
    echo -e "${BLUE}[4/6]${NC} Scanning for hardcoded credentials..."

    # Look for suspicious variable assignments
    if grep -rE "(?i)(password|secret|api_?key|access_?token|auth_?token)[\s]*=[\s]*['\"][^'\"]{16,}['\"]" \
        --exclude-dir=node_modules \
        --exclude-dir=.git \
        --exclude-dir=dist \
        --exclude-dir=playwright-report \
        --exclude-dir=test-results \
        --exclude="*.md" \
        --exclude="*.test.ts" \
        --exclude="*.spec.ts" \
        . 2>/dev/null | grep -v "process.env" | grep -v "YOUR_" | grep -v "xxx" | grep -v "example"; then

        echo -e "${RED}❌ WARNING: Found potential hardcoded credentials${NC}"
        echo -e "${YELLOW}Review the matches above. Use environment variables instead.${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${GREEN}✅ No hardcoded credentials detected${NC}"
    fi
}

# Validate documentation examples
validate_examples() {
    echo -e "${BLUE}[5/6]${NC} Validating documentation examples..."

    # Check docs for API key patterns that aren't clearly marked
    if [ -d "docs" ]; then
        SUSPICIOUS=$(grep -rE "sk-[a-z]+-[a-z]+-" docs/ 2>/dev/null | \
            grep -v "xxx\|yyy\|zzz\|example\|placeholder\|YOUR_" || true)

        if [ -n "$SUSPICIOUS" ]; then
            echo -e "${YELLOW}⚠️  WARNING: Found API key-like patterns in docs:${NC}"
            echo "$SUSPICIOUS"
            echo -e "${YELLOW}Ensure these are clearly marked as examples${NC}"
        else
            echo -e "${GREEN}✅ Documentation examples look safe${NC}"
        fi
    else
        echo -e "${GREEN}✅ No docs directory${NC}"
    fi
}

# Check recent commits
check_commit_messages() {
    echo -e "${BLUE}[6/6]${NC} Scanning commit messages..."

    if git rev-parse --git-dir > /dev/null 2>&1; then
        SUSPICIOUS_COMMITS=$(git log -20 --pretty=format:"%h %s" 2>/dev/null | \
            grep -iE "(password|secret|key|token|credential)" | \
            grep -vE "(add|update|fix|remove|rotate|change|reset|scan)" || true)

        if [ -n "$SUSPICIOUS_COMMITS" ]; then
            echo -e "${YELLOW}⚠️  WARNING: Suspicious references in recent commits:${NC}"
            echo "$SUSPICIOUS_COMMITS"
        else
            echo -e "${GREEN}✅ No suspicious commit messages${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Not a git repository${NC}"
    fi
}

# Check for gitignored files that are tracked (accidentally committed)
check_tracked_gitignored_files() {
    echo -e "${BLUE}[0/6]${NC} Checking for tracked files that should be gitignored..."

    # Find files that are both tracked by git AND match .gitignore patterns
    TRACKED_IGNORED=""
    while IFS= read -r file; do
        if [ -n "$file" ] && git check-ignore -q "$file" 2>/dev/null; then
            TRACKED_IGNORED="${TRACKED_IGNORED}${file}\n"
        fi
    done < <(git ls-files)

    if [ -n "$TRACKED_IGNORED" ]; then
        echo -e "${RED}❌ ERROR: Found tracked files that match .gitignore patterns:${NC}"
        echo -e "$TRACKED_IGNORED"
        echo -e "${YELLOW}These files are in .gitignore but were committed before being ignored.${NC}"
        echo -e "${YELLOW}Remove them with: git rm --cached <file>${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${GREEN}✅ No tracked files in gitignore${NC}"
    fi
}

# Run all checks
check_tracked_gitignored_files
check_real_secrets
check_env_files
check_gitignore
check_hardcoded_credentials
validate_examples
check_commit_messages

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ Secret scanning completed - No issues found!${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
else
    echo -e "${RED}❌ Secret scanning found $ISSUES_FOUND issue(s)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi
