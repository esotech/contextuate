# Contextuate Framework

**Standardized AI Context for Software Projects**

Contextuate provides a structured "brain" for your project that AI coding assistants (like Claude, Copilot, Cursor) can understand. It standardizes how AI agents receive context, follow coding standards, and execute tasks.

## Quick Start

Install Contextuate in your project:

```bash
curl -fsSL https://contextuate.dev/install.sh | bash
```

This creates a `docs/ai/` directory in your project root containing the framework and templates.

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

For full documentation, see [contextuate.dev](https://contextuate.dev) or browse the `docs/ai/.context/` directory.

## License

[GNU General Public License v3.0](LICENSE)
