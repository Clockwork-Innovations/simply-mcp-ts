#!/bin/bash
# MCP Adapter Runner - automatically loads nvm and runs the adapter

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Activate default node version
nvm use default > /dev/null 2>&1

# Run the adapter with tsx
npx tsx src/adapter.ts "$@"
