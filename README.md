# Contextuate Framework

**Standardized AI Context for Software Projects**

Contextuate provides a structured "brain" for your project that AI coding assistants (like Claude, Copilot, Cursor) can understand. It standardizes how AI agents receive context, follow coding standards, and execute tasks.

## Quick Start

### Installation

Clone the repository and install globally:

```bash
git clone https://github.com/anthropics/contextuate.git
cd contextuate
npm install
npm run build
npm link
```

### Initialize Your Project

Navigate to your project directory and run:

```bash
contextuate init
```

The interactive installer will guide you through:
1. Selecting which AI platforms to configure (Claude Code, Cursor, Copilot, Windsurf, etc.)
2. Creating the `docs/ai/` directory structure with framework files
3. Generating platform-specific configuration files
4. Setting up symlinks for supported platforms (e.g., `.claude/` for Claude Code)

## What is Contextuate?

Contextuate is a directory structure and set of conventions that helps AI agents work more effectively. It turns implicit project knowledge into explicit, structured context.

- **`docs/ai/context.md`**: The single entry point for all AI context.
- **`docs/ai/agents/`**: Specialized "personas" for your AI (e.g., `documentation-expert`).
- **`docs/ai/standards/`**: Explicit coding standards and behavioral guidelines.
- **`docs/ai/quickrefs/`**: Condensed documentation optimized for AI token limits.
- **`docs/ai/tasks/`**: A workflow for managing multi-session AI tasks.

## Repository Structure

This repository contains the source for the Contextuate framework.

- **`docs/ai/.context/`**: The core framework files distributed to users.
  - `agents/`: Base agent definitions.
  - `templates/`: Templates for new projects.
  - `tools/`: AI tool guides.
  - `bin/`: Installation and update scripts.

## Usage

Once installed, you customize the framework for your project:

1. Edit **`docs/ai/context.md`** with your project details.
2. Create custom agents in **`docs/ai/agents/`** (using the Agent Creator tool).
3. Document coding standards in **`docs/ai/standards/`**.
4. Generate quickrefs in **`docs/ai/quickrefs/`**.

## Documentation

For full documentation, see [contextuate.md](https://contextuate.md) or browse the `docs/ai/.context/` directory.

## License

[MIT License](LICENSE)
