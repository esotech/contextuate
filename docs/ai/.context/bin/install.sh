#!/usr/bin/env bash
#
# Esocontext Installer
# Standardized AI context framework for any project
#
# Usage:
#   curl -fsSL https://esocontext.dev/install.sh | bash
#
# Or with options:
#   curl -fsSL https://esocontext.dev/install.sh | bash -s -- [options]
#
# Options:
#   --force     Overwrite existing files (default: merge/skip)
#   --no-git    Don't modify .gitignore
#   --help      Show this help message
#

set -e

# Configuration
ESOCONTEXT_VERSION="1.0.0"
ESOCONTEXT_REPO="https://raw.githubusercontent.com/esotech/esocontext/main"
INSTALL_DIR="docs/ai/.context"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Flags
FORCE=false
NO_GIT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
	case $1 in
		--force)
			FORCE=true
			shift
			;;
		--no-git)
			NO_GIT=true
			shift
			;;
		--help)
			echo "Esocontext Installer v${ESOCONTEXT_VERSION}"
			echo ""
			echo "Usage: curl -fsSL https://esocontext.dev/install.sh | bash -s -- [options]"
			echo ""
			echo "Options:"
			echo "  --force     Overwrite existing files"
			echo "  --no-git    Don't modify .gitignore"
			echo "  --help      Show this help message"
			exit 0
			;;
		*)
			echo -e "${RED}Unknown option: $1${NC}"
			exit 1
			;;
	esac
done

# Helper functions
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

create_dir() {
	if [[ ! -d "$1" ]]; then
		mkdir -p "$1"
		log_success "Created directory: $1"
	fi
}

copy_file() {
	local src="$1"
	local dest="$2"
	local overwrite="${3:-false}"

	if [[ -f "$dest" ]] && [[ "$overwrite" != "true" ]]; then
		log_warn "Skipped (exists): $dest"
		return 0
	fi

	cp "$src" "$dest"
	log_success "Created: $dest"
}

download_file() {
	local url="$1"
	local dest="$2"
	local overwrite="${3:-false}"

	if [[ -f "$dest" ]] && [[ "$overwrite" != "true" ]]; then
		log_warn "Skipped (exists): $dest"
		return 0
	fi

	if command -v curl &> /dev/null; then
		curl -fsSL "$url" -o "$dest"
	elif command -v wget &> /dev/null; then
		wget -q "$url" -O "$dest"
	else
		log_error "Neither curl nor wget found. Please install one."
		exit 1
	fi

	log_success "Downloaded: $dest"
}

# Main installation
main() {
	echo ""
	echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
	echo -e "${BLUE}║${NC}     Esocontext Installer v${ESOCONTEXT_VERSION}        ${BLUE}║${NC}"
	echo -e "${BLUE}║${NC}     AI Context Framework               ${BLUE}║${NC}"
	echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
	echo ""

	# Check if we're in a project directory
	if [[ ! -d ".git" ]] && [[ ! -f "package.json" ]] && [[ ! -f "composer.json" ]] && [[ ! -f "Cargo.toml" ]] && [[ ! -f "go.mod" ]]; then
		log_warn "No project markers found (.git, package.json, etc.)"
		read -p "Continue anyway? (y/N) " -n 1 -r
		echo
		if [[ ! $REPLY =~ ^[Yy]$ ]]; then
			log_info "Installation cancelled."
			exit 0
		fi
	fi

	log_info "Installing Esocontext framework..."
	echo ""

	# Create directory structure
	log_info "Creating directory structure..."
	create_dir "docs"
	create_dir "docs/ai"
	create_dir "docs/ai/.context"
	create_dir "docs/ai/.context/templates/platforms"
	create_dir "docs/ai/.context/templates/standards"
	create_dir "docs/ai/.context/agents"
	create_dir "docs/ai/.context/standards"
	create_dir "docs/ai/.context/bin"
	create_dir "docs/ai/.context/tools"
	create_dir "docs/ai/agents"
	create_dir "docs/ai/standards"
	create_dir "docs/ai/quickrefs"
	create_dir "docs/ai/tasks"
	echo ""

	# Download or copy framework files
	log_info "Installing framework files..."

	# For local installation (when running from the esocontext repo itself)
	if [[ -f "docs/ai/.context/version.json" ]]; then
		log_info "Detected local installation source..."
		SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
		CONTEXT_DIR="$(dirname "$SCRIPT_DIR")"

		# Copy from local source
		cp "$CONTEXT_DIR/version.json" "$INSTALL_DIR/version.json"
		cp "$CONTEXT_DIR/README.md" "$INSTALL_DIR/README.md"

		# Templates - platforms
		for f in "$CONTEXT_DIR/templates/platforms/"*; do
			[[ -f "$f" ]] && cp "$f" "$INSTALL_DIR/templates/platforms/"
		done

		# Templates - standards
		for f in "$CONTEXT_DIR/templates/standards/"*; do
			[[ -f "$f" ]] && cp "$f" "$INSTALL_DIR/templates/standards/"
		done

		# Templates - root (context.md)
		[[ -f "$CONTEXT_DIR/templates/context.md" ]] && cp "$CONTEXT_DIR/templates/context.md" "$INSTALL_DIR/templates/"

		# Agents
		for f in "$CONTEXT_DIR/agents/"*; do
			[[ -f "$f" ]] && cp "$f" "$INSTALL_DIR/agents/"
		done

		# Standards
		for f in "$CONTEXT_DIR/standards/"*; do
			[[ -f "$f" ]] && cp "$f" "$INSTALL_DIR/standards/"
		done

		# Bin
		for f in "$CONTEXT_DIR/bin/"*; do
			[[ -f "$f" ]] && cp "$f" "$INSTALL_DIR/bin/"
		done

		# Tools
		for f in "$CONTEXT_DIR/tools/"*; do
			[[ -f "$f" ]] && cp "$f" "$INSTALL_DIR/tools/"
		done

		log_success "Copied framework files from local source"
	else
		# Download from remote
		log_info "Downloading from ${ESOCONTEXT_REPO}..."

		# Core files
		download_file "${ESOCONTEXT_REPO}/docs/ai/.context/version.json" "$INSTALL_DIR/version.json" "$FORCE"
		download_file "${ESOCONTEXT_REPO}/docs/ai/.context/README.md" "$INSTALL_DIR/README.md" "$FORCE"

		# Templates - platforms
		for template in CLAUDE.md AGENTS.md GEMINI.md clinerules.md copilot.md cursor.mdc windsurf.md antigravity.md; do
			download_file "${ESOCONTEXT_REPO}/docs/ai/.context/templates/platforms/${template}" "$INSTALL_DIR/templates/platforms/${template}" "$FORCE"
		done

		# Templates - standards
		for template in php.standards.md javascript.standards.md python.standards.md go.standards.md java.standards.md; do
			download_file "${ESOCONTEXT_REPO}/docs/ai/.context/templates/standards/${template}" "$INSTALL_DIR/templates/standards/${template}" "$FORCE"
		done

		# Templates - root
		download_file "${ESOCONTEXT_REPO}/docs/ai/.context/templates/context.md" "$INSTALL_DIR/templates/context.md" "$FORCE"

		# Agents
		download_file "${ESOCONTEXT_REPO}/docs/ai/.context/agents/base.agent.md" "$INSTALL_DIR/agents/base.agent.md" "$FORCE"
		download_file "${ESOCONTEXT_REPO}/docs/ai/.context/agents/documentation-expert.agent.md" "$INSTALL_DIR/agents/documentation-expert.agent.md" "$FORCE"
		download_file "${ESOCONTEXT_REPO}/docs/ai/.context/agents/tools-expert.agent.md" "$INSTALL_DIR/agents/tools-expert.agent.md" "$FORCE"

		# Standards
		download_file "${ESOCONTEXT_REPO}/docs/ai/.context/standards/coding-standards.md" "$INSTALL_DIR/standards/coding-standards.md" "$FORCE"
		download_file "${ESOCONTEXT_REPO}/docs/ai/.context/standards/behavioral-guidelines.md" "$INSTALL_DIR/standards/behavioral-guidelines.md" "$FORCE"
		download_file "${ESOCONTEXT_REPO}/docs/ai/.context/standards/task-workflow.md" "$INSTALL_DIR/standards/task-workflow.md" "$FORCE"

		# Bin
		download_file "${ESOCONTEXT_REPO}/docs/ai/.context/bin/install.sh" "$INSTALL_DIR/bin/install.sh" "$FORCE"
		download_file "${ESOCONTEXT_REPO}/docs/ai/.context/bin/update.sh" "$INSTALL_DIR/bin/update.sh" "$FORCE"

		# Tools
		download_file "${ESOCONTEXT_REPO}/docs/ai/.context/tools/quickref.tool.md" "$INSTALL_DIR/tools/quickref.tool.md" "$FORCE"
		download_file "${ESOCONTEXT_REPO}/docs/ai/.context/tools/standards-detector.tool.md" "$INSTALL_DIR/tools/standards-detector.tool.md" "$FORCE"
		download_file "${ESOCONTEXT_REPO}/docs/ai/.context/tools/agent-creator.tool.md" "$INSTALL_DIR/tools/agent-creator.tool.md" "$FORCE"
	fi

	# Make scripts executable
	chmod +x "$INSTALL_DIR/bin/"*.sh 2>/dev/null || true
	echo ""

	# Create context.md if it doesn't exist
	log_info "Setting up project context..."
	if [[ ! -f "docs/ai/context.md" ]]; then
		cp "$INSTALL_DIR/templates/context.md" "docs/ai/context.md"
		log_success "Created: docs/ai/context.md (customize this file!)"
	else
		log_warn "Skipped (exists): docs/ai/context.md"
	fi
	echo ""

	# Generate jump files
	log_info "Generating platform jump files..."

	# CLAUDE.md
	if [[ ! -f "CLAUDE.md" ]] || [[ "$FORCE" == "true" ]]; then
		cp "$INSTALL_DIR/templates/platforms/CLAUDE.md" "CLAUDE.md"
		log_success "Created: CLAUDE.md"
	else
		log_warn "Skipped (exists): CLAUDE.md"
	fi

	# AGENTS.md
	if [[ ! -f "AGENTS.md" ]] || [[ "$FORCE" == "true" ]]; then
		cp "$INSTALL_DIR/templates/platforms/AGENTS.md" "AGENTS.md"
		log_success "Created: AGENTS.md"
	else
		log_warn "Skipped (exists): AGENTS.md"
	fi

	# GEMINI.md
	if [[ ! -f "GEMINI.md" ]] || [[ "$FORCE" == "true" ]]; then
		cp "$INSTALL_DIR/templates/platforms/GEMINI.md" "GEMINI.md"
		log_success "Created: GEMINI.md"
	else
		log_warn "Skipped (exists): GEMINI.md"
	fi

	# .clinerules/cline-memory-bank.md
	create_dir ".clinerules"
	if [[ ! -f ".clinerules/cline-memory-bank.md" ]] || [[ "$FORCE" == "true" ]]; then
		cp "$INSTALL_DIR/templates/platforms/clinerules.md" ".clinerules/cline-memory-bank.md"
		log_success "Created: .clinerules/cline-memory-bank.md"
	else
		log_warn "Skipped (exists): .clinerules/cline-memory-bank.md"
	fi

	# .github/copilot-instructions.md
	create_dir ".github"
	if [[ ! -f ".github/copilot-instructions.md" ]] || [[ "$FORCE" == "true" ]]; then
		cp "$INSTALL_DIR/templates/platforms/copilot.md" ".github/copilot-instructions.md"
		log_success "Created: .github/copilot-instructions.md"
	else
		log_warn "Skipped (exists): .github/copilot-instructions.md"
	fi

	# .cursor/rules/project.mdc
	create_dir ".cursor/rules"
	if [[ ! -f ".cursor/rules/project.mdc" ]] || [[ "$FORCE" == "true" ]]; then
		cp "$INSTALL_DIR/templates/platforms/cursor.mdc" ".cursor/rules/project.mdc"
		log_success "Created: .cursor/rules/project.mdc"
	else
		log_warn "Skipped (exists): .cursor/rules/project.mdc"
	fi

	# .windsurf/rules/project.md
	create_dir ".windsurf/rules"
	if [[ ! -f ".windsurf/rules/project.md" ]] || [[ "$FORCE" == "true" ]]; then
		cp "$INSTALL_DIR/templates/platforms/windsurf.md" ".windsurf/rules/project.md"
		log_success "Created: .windsurf/rules/project.md"
	else
		log_warn "Skipped (exists): .windsurf/rules/project.md"
	fi

	# .antigravity/rules.md
	create_dir ".antigravity"
	if [[ ! -f ".antigravity/rules.md" ]] || [[ "$FORCE" == "true" ]]; then
		cp "$INSTALL_DIR/templates/platforms/antigravity.md" ".antigravity/rules.md"
		log_success "Created: .antigravity/rules.md"
	else
		log_warn "Skipped (exists): .antigravity/rules.md"
	fi
	echo ""

	# Update .gitignore
	if [[ "$NO_GIT" != "true" ]]; then
		log_info "Updating .gitignore..."

		GITIGNORE_ENTRIES=(
			""
			"# Esocontext - Framework files"
			"docs/ai/.context/"
			"docs/ai/tasks/"
			""
			"# Esocontext - Generated Artifacts (DO NOT EDIT)"
			"CLAUDE.md"
			"AGENTS.md"
			"GEMINI.md"
			".clinerules/"
			".cursor/rules/project.mdc"
			".windsurf/rules/project.md"
			".antigravity/rules.md"
			".github/copilot-instructions.md"
		)

		if [[ -f ".gitignore" ]]; then
			# Check if already present
			if ! grep -q "# Esocontext - Framework files" ".gitignore" 2>/dev/null; then
				printf '%s\n' "${GITIGNORE_ENTRIES[@]}" >> ".gitignore"
				log_success "Added Esocontext entries to .gitignore"
			else
				log_warn "Esocontext entries already in .gitignore"
			fi
		else
			printf '%s\n' "${GITIGNORE_ENTRIES[@]}" > ".gitignore"
			log_success "Created .gitignore with Esocontext entries"
		fi
	else
		log_info "Skipped .gitignore modification (--no-git)"
	fi
	echo ""

	# Update version.json with install timestamp
	if command -v date &> /dev/null; then
		TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
		if command -v sed &> /dev/null; then
			sed -i.bak "s/\"installed\": null/\"installed\": \"${TIMESTAMP}\"/" "$INSTALL_DIR/version.json" 2>/dev/null || true
			rm -f "$INSTALL_DIR/version.json.bak" 2>/dev/null || true
		fi
	fi

	# Success message
	echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
	echo -e "${GREEN}║${NC}     Installation Complete!              ${GREEN}║${NC}"
	echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
	echo ""
	echo "Next steps:"
	echo ""
	echo "  1. Edit ${BLUE}docs/ai/context.md${NC} with your project details"
	echo "  2. Create custom agents in ${BLUE}docs/ai/agents/${NC}"
	echo "  3. Add quickrefs in ${BLUE}docs/ai/quickrefs/${NC}"
	echo ""
	echo "Documentation: https://esocontext.dev"
	echo ""
}

# Run main
main "$@"
