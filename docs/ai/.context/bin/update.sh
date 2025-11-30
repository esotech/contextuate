#!/usr/bin/env bash
#
# Esocontext Updater
# Updates the framework files while preserving user customizations
#
# Usage:
#   ./docs/ai/.context/bin/update.sh
#
# Or via curl:
#   curl -fsSL https://esocontext.dev/update.sh | bash
#

set -e

# Configuration
ESOCONTEXT_REPO="https://raw.githubusercontent.com/esotech/esocontext/main"
INSTALL_DIR="docs/ai/.context"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
	echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
	echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
	echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
	echo -e "${RED}[ERROR]${NC} $1"
}

download_file() {
	local url="$1"
	local dest="$2"

	if command -v curl &> /dev/null; then
		curl -fsSL "$url" -o "$dest"
	elif command -v wget &> /dev/null; then
		wget -q "$url" -O "$dest"
	else
		log_error "Neither curl nor wget found."
		exit 1
	fi
}

main() {
	echo ""
	echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
	echo -e "${BLUE}║${NC}     Esocontext Updater                 ${BLUE}║${NC}"
	echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
	echo ""

	# Check if esocontext is installed
	if [[ ! -d "$INSTALL_DIR" ]]; then
		log_error "Esocontext not found. Run the installer first:"
		echo "  curl -fsSL https://esocontext.dev/install.sh | bash"
		exit 1
	fi

	# Get current version
	CURRENT_VERSION="unknown"
	if [[ -f "$INSTALL_DIR/version.json" ]]; then
		CURRENT_VERSION=$(grep -o '"version": "[^"]*"' "$INSTALL_DIR/version.json" | cut -d'"' -f4)
	fi
	log_info "Current version: ${CURRENT_VERSION}"

	# Download latest version info
	log_info "Checking for updates..."
	TEMP_VERSION=$(mktemp)
	download_file "${ESOCONTEXT_REPO}/docs/ai/.context/version.json" "$TEMP_VERSION"
	LATEST_VERSION=$(grep -o '"version": "[^"]*"' "$TEMP_VERSION" | cut -d'"' -f4)
	rm -f "$TEMP_VERSION"

	log_info "Latest version: ${LATEST_VERSION}"

	if [[ "$CURRENT_VERSION" == "$LATEST_VERSION" ]]; then
		log_success "Already up to date!"
		exit 0
	fi

	echo ""
	log_info "Updating framework files..."

	# Update core files (these always get updated)
	download_file "${ESOCONTEXT_REPO}/docs/ai/.context/version.json" "$INSTALL_DIR/version.json"
	download_file "${ESOCONTEXT_REPO}/docs/ai/.context/README.md" "$INSTALL_DIR/README.md"

	# Update templates - platforms
	mkdir -p "$INSTALL_DIR/templates/platforms"
	for template in CLAUDE.md AGENTS.md GEMINI.md clinerules.md copilot.md cursor.mdc windsurf.md antigravity.md; do
		download_file "${ESOCONTEXT_REPO}/docs/ai/.context/templates/platforms/${template}" "$INSTALL_DIR/templates/platforms/${template}"
	done

	# Update templates - standards
	mkdir -p "$INSTALL_DIR/templates/standards"
	for template in php.standards.md javascript.standards.md python.standards.md go.standards.md java.standards.md; do
		download_file "${ESOCONTEXT_REPO}/docs/ai/.context/templates/standards/${template}" "$INSTALL_DIR/templates/standards/${template}"
	done

	# Update templates - root
	download_file "${ESOCONTEXT_REPO}/docs/ai/.context/templates/context.md" "$INSTALL_DIR/templates/context.md"
	log_success "Updated templates"

	# Update agents
	download_file "${ESOCONTEXT_REPO}/docs/ai/.context/agents/base.agent.md" "$INSTALL_DIR/agents/base.agent.md"
	download_file "${ESOCONTEXT_REPO}/docs/ai/.context/agents/documentation-expert.agent.md" "$INSTALL_DIR/agents/documentation-expert.agent.md"
	download_file "${ESOCONTEXT_REPO}/docs/ai/.context/agents/tools-expert.agent.md" "$INSTALL_DIR/agents/tools-expert.agent.md"
	log_success "Updated agents"

	# Update standards
	download_file "${ESOCONTEXT_REPO}/docs/ai/.context/standards/coding-standards.md" "$INSTALL_DIR/standards/coding-standards.md"
	download_file "${ESOCONTEXT_REPO}/docs/ai/.context/standards/behavioral-guidelines.md" "$INSTALL_DIR/standards/behavioral-guidelines.md"
	download_file "${ESOCONTEXT_REPO}/docs/ai/.context/standards/task-workflow.md" "$INSTALL_DIR/standards/task-workflow.md"
	log_success "Updated standards"

	# Update bin
	download_file "${ESOCONTEXT_REPO}/docs/ai/.context/bin/install.sh" "$INSTALL_DIR/bin/install.sh"
	download_file "${ESOCONTEXT_REPO}/docs/ai/.context/bin/update.sh" "$INSTALL_DIR/bin/update.sh"
	chmod +x "$INSTALL_DIR/bin/"*.sh
	log_success "Updated bin scripts"

	# Update tools
	mkdir -p "$INSTALL_DIR/tools"
	download_file "${ESOCONTEXT_REPO}/docs/ai/.context/tools/quickref.tool.md" "$INSTALL_DIR/tools/quickref.tool.md"
	download_file "${ESOCONTEXT_REPO}/docs/ai/.context/tools/standards-detector.tool.md" "$INSTALL_DIR/tools/standards-detector.tool.md"
	download_file "${ESOCONTEXT_REPO}/docs/ai/.context/tools/agent-creator.tool.md" "$INSTALL_DIR/tools/agent-creator.tool.md"
	log_success "Updated tools"

	# Update timestamp
	if command -v date &> /dev/null && command -v sed &> /dev/null; then
		TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
		sed -i.bak "s/\"updated\": [^,}]*/\"updated\": \"${TIMESTAMP}\"/" "$INSTALL_DIR/version.json" 2>/dev/null || true
		rm -f "$INSTALL_DIR/version.json.bak" 2>/dev/null || true
	fi

	echo ""
	echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
	echo -e "${GREEN}║${NC}     Update Complete!                    ${GREEN}║${NC}"
	echo -e "${GREEN}║${NC}     ${CURRENT_VERSION} → ${LATEST_VERSION}                         ${GREEN}║${NC}"
	echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
	echo ""
	echo "Note: Your custom files were preserved:"
	echo "  - docs/ai/context.md"
	echo "  - docs/ai/agents/*"
	echo "  - docs/ai/quickrefs/*"
	echo "  - docs/ai/tasks/*"
	echo ""
	echo "Jump files (CLAUDE.md, etc.) were NOT updated."
	echo "Run with --force to regenerate them:"
	echo "  ./docs/ai/.context/bin/install.sh --force"
	echo ""
}

main "$@"
