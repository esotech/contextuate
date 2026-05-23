# Contextuate Init Command

The `contextuate init` command is the entry point for the Contextuate framework. It bootstraps your project with the necessary structure, configuration files, and platform-specific optimizations.

## Usage

### Interactive Mode (Default)

```bash
contextuate init [options]
```

The interactive installer will guide you through platform and agent selection.

### Non-Interactive Mode (CLI Arguments)

```bash
contextuate init [platforms...] [options]
```

#### Examples

**Install specific platform(s):**
```bash
# Single platform
contextuate init claude

# Multiple platforms
contextuate init claude gemini cursor

# All platforms
contextuate init all
```

**Install platform(s) with agents:**
```bash
# Install Claude with specific agents
contextuate init claude --agents base archon

# Install Claude with all agents
contextuate init claude --agents all

# Multiple platforms with specific agents
contextuate init claude gemini --agents base archon nexus
```

**Force overwrite existing files:**
```bash
contextuate init claude --force
contextuate init claude --agents all --force
```

### Options

*   `-f, --force`: Overwrite existing files without asking. Use with caution.
*   `-a, --agents <agents...>`: Install specific agents. Use "all" to install all available agents.

### Platform Fuzzy Matching

Platform arguments support fuzzy matching for convenience:

- `claude` → Claude Code
- `gem` or `gemini` → Google Gemini
- `curs` or `cursor` → Cursor IDE
- `wind` or `windsurf` → Windsurf IDE
- `github` or `copilot` → GitHub Copilot
- `cline` → Cline
- `anti` or `antigravity` → Antigravity
- `agents` → Agents.ai

**Supported Platforms:**
- agents (Agents.ai)
- antigravity (Antigravity)
- claude (Claude Code)
- cline (Cline)
- cursor (Cursor IDE)
- gemini (Google Gemini)
- copilot (GitHub Copilot)
- windsurf (Windsurf IDE)

## What It Does

1.  **Platform Selection**: Interactively asks which platforms (e.g., Cursor, Claude, GitHub Copilot) you are using.
2.  **Directory Structure**: Creates the standard `docs/ai` hierarchy:
    *   `docs/ai/agents`: Usage definitions for AI agents.
    *   `docs/ai/standards`: Coding standards and best practices.
    *   `docs/ai/context.md`: The main context file for LLMs.
    *   `docs/ai/project-structure.md`: (Optional) Auto-generated map of your codebase.
3.  **Primary Instruction File**: Creates `AGENTS.md` as the root source of instructions for AI coding agents.
4.  **Legacy Bootstrap Review**: Detects existing tool-specific bootstrap files such as `CLAUDE.md`, `GEMINI.md`, `.cursorrules`, and `.windsurfrules`, then instructs you to merge unique rules into `AGENTS.md`.
5.  **Platform Asset Links**: Creates non-instruction asset links for platforms that need them, such as `.claude/commands` and `.claude/agents`.
6.  **Template Installation**: Copies default templates to get you started immediately.
7.  **Git Integration**: Updates `.gitignore` to ensure generated files (or library files) are handled correctly.

## Interactive Flow

When you run `init`, you will see a wizard:

1.  **Project Marker Check**: Verifies you are in a project root.
2.  **Platform Choice**: You can select "All", search by name (e.g., "gemini"), or select from a checklist.
3.  **Installation**: The CLI then performs the setup and confirms each step.

## Post-Install Steps

After running `init`:
1.  Edit `docs/ai/context.md` to describe your project.
2.  Run `contextuate index` to generate a file tree.
3.  Start using your AI editor—it should now automatically detect the context!
