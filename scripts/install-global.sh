#!/usr/bin/env bash
#
# Contextuate Global Installer
# Installs @esotech/contextuate globally via npm
#
# Usage:
#   curl -fsSL https://contextuate.md/install.sh | bash
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Contextuate Global Installer${NC}"
echo "============================"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed.${NC}"
    echo "Please install Node.js (v18+) from https://nodejs.org/"
    exit 1
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR] npm is not installed.${NC}"
    exit 1
fi

echo -e "${BLUE}[INFO] Installing @esotech/contextuate globally...${NC}"

# Attempt install
if npm install -g @esotech/contextuate; then
    echo -e "${GREEN}[OK] Successfully installed contextuate!${NC}"
else
    echo -e "${RED}[ERROR] Installation failed.${NC}"
    echo -e "${BLUE}[INFO] You might need permission. Try running with sudo:${NC}"
    echo "  curl -fsSL https://contextuate.md/install.sh | sudo bash"
    exit 1
fi

echo ""
echo -e "${GREEN}Getting Started:${NC}"
echo "  1. Go to your project directory"
echo "  2. Run: contextuate init"
echo ""
echo "Documentation: https://contextuate.md"
echo ""
echo -e "${BLUE}Powered by Esotech.${NC}"
echo -e "${BLUE}Created by Alexander Conroy (@geilt)${NC}"
echo ""
