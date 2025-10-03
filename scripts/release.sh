#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

VERSION_TYPE=${1:-patch}

if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo -e "${RED}Error: Invalid version type. Use 'patch', 'minor', or 'major'${NC}"
  exit 1
fi

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  SimpleMCP Release Script${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
  echo -e "${RED}Error: You have uncommitted changes. Please commit or stash them first.${NC}"
  git status -s
  exit 1
fi

# Check if on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo -e "${YELLOW}Warning: You are not on the main branch (current: $CURRENT_BRANCH)${NC}"
  read -p "Do you want to continue? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Pull latest changes
echo -e "${BLUE}Pulling latest changes...${NC}"
git pull origin main

# Run tests
echo -e "${BLUE}Running tests...${NC}"
npm test

# Build the project
echo -e "${BLUE}Building project...${NC}"
npm run build

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}Current version: ${YELLOW}$CURRENT_VERSION${NC}"

# Bump version
echo -e "${BLUE}Bumping $VERSION_TYPE version...${NC}"
npm version $VERSION_TYPE -m "chore(release): v%s"

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}New version: ${YELLOW}$NEW_VERSION${NC}"

# Push changes
echo -e "${BLUE}Pushing changes to GitHub...${NC}"
git push origin main --follow-tags

# Create GitHub release
echo -e "${BLUE}Creating GitHub release...${NC}"
gh release create "v$NEW_VERSION" \
  --title "v$NEW_VERSION" \
  --generate-notes

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  Release v$NEW_VERSION completed!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. The GitHub release has been created"
echo -e "2. The publish workflow will automatically publish to npm"
echo -e "3. Check the Actions tab: https://github.com/clockwork-innovations/simple-mcp/actions"
echo ""
