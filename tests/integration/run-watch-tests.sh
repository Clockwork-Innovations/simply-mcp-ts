#!/bin/bash

################################################################################
# Watch Mode Test Runner
# Interactive menu for running watch mode tests
################################################################################

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

show_menu() {
    clear
    echo -e "${BLUE}══════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}Watch Mode Integration Test Runner${NC}"
    echo -e "${BLUE}══════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Select test scenario:"
    echo ""
    echo "  0) Run ALL scenarios (full suite)"
    echo ""
    echo "  1) Basic Startup/Shutdown"
    echo "  2) File Change Auto-Restart"
    echo "  3) Polling Mode"
    echo "  4) HTTP Transport"
    echo "  5) Interface API"
    echo "  6) Debouncing"
    echo "  7) Error Recovery"
    echo "  8) Dependency Watching"
    echo ""
    echo "  v) Validate environment"
    echo "  q) Quit"
    echo ""
    echo -e "${BLUE}══════════════════════════════════════════════════════${NC}"
    echo -n "Enter choice: "
}

run_test() {
    local scenario=$1
    echo ""
    echo -e "${GREEN}Running test scenario...${NC}"
    echo ""

    if [ "$scenario" = "0" ]; then
        "$SCRIPT_DIR/test-watch-mode.sh"
    else
        "$SCRIPT_DIR/test-watch-mode.sh" "$scenario"
    fi

    local exit_code=$?

    echo ""
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}Test completed successfully!${NC}"
    else
        echo -e "${YELLOW}Test completed with failures.${NC}"
    fi
    echo ""
    echo -n "Press Enter to continue..."
    read
}

validate_env() {
    echo ""
    "$SCRIPT_DIR/validate-test-env.sh"
    echo ""
    echo -n "Press Enter to continue..."
    read
}

main() {
    # Check if running in interactive mode
    if [ ! -t 0 ]; then
        echo "This script requires an interactive terminal."
        echo "Use ./test-watch-mode.sh directly for non-interactive execution."
        exit 1
    fi

    while true; do
        show_menu
        read -r choice

        case "$choice" in
            0) run_test 0 ;;
            1) run_test 1 ;;
            2) run_test 2 ;;
            3) run_test 3 ;;
            4) run_test 4 ;;
            5) run_test 5 ;;
            6) run_test 6 ;;
            7) run_test 7 ;;
            8) run_test 8 ;;
            v|V) validate_env ;;
            q|Q)
                echo ""
                echo "Goodbye!"
                exit 0
                ;;
            *)
                echo ""
                echo "Invalid choice. Press Enter to continue..."
                read
                ;;
        esac
    done
}

main
