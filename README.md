# Contextuate Framework

<p align="center">
  <img src="assets/logo-black.png" alt="Contextuate Logo" width="200" />
</p>


**Standardized AI Context for Software Projects**

Contextuate provides a structured "brain" for your project that AI coding assistants (like Claude, Copilot, Cursor) can understand. It standardizes how AI agents receive context, follow coding standards, and execute tasks.

## Quick Start

### Installation

Clone the repository and install globally:

```bash
git clone https://github.com/esotech/contextuate.git
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
- **`docs/ai/project-structure.md`**: Auto-generated file tree map (created by `contextuate index`).
- **`docs/ai/agents/`**: Specialized "personas" for your AI (e.g., `documentation-expert`).
- **`docs/ai/standards/`**: Explicit coding standards and behavioral guidelines.
- **`docs/ai/quickrefs/`**: Condensed documentation optimized for AI token limits.
- **`docs/ai/tasks/`**: A workflow for managing multi-session AI tasks.

## How LLMs Use Contextuate

1. **Discovery**: The AI reads `docs/ai/context.md` first. This file maps the project and links to all other resources.
2. **Specialization**: If acting as a specific agent, it reads `docs/ai/agents/<name>.agent.md` to load specific capabilities and rules.
3. **Execution**: The AI follows the linked standards in `docs/ai/standards/` and uses `docs/ai/quickrefs/` for technical lookups.
4. **Memory**: If working on a long-running task, it tracks state in `docs/ai/tasks/<task-name>/` to maintain context across sessions.

When using the `contextuate run` command, this context loading is automated based on the agent definition.

## Repository Structure

This repository contains the source for the Contextuate framework.

- **`docs/ai/.contextuate/`**: The core framework files distributed to users.
  - `agents/`: Base agent definitions.
  - `templates/`: Templates for new projects.
  - `tools/`: AI tool guides.


## Usage

Once installed, you customize the framework for your project:

1. Edit **`docs/ai/context.md`** with your project details.
2. Create custom agents in **`docs/ai/agents/`** (using the Agent Creator tool).
3. Document coding standards in **`docs/ai/standards/`**.
4. Generate quickrefs in **`docs/ai/quickrefs/`**.

## CLI Usage

### Running Agents

Execute an agent definition with the `run` command:

```bash
contextuate run <agent-name> [options]
```

Options:
- `--goal <text>`: Provide a specific goal or instruction for this run.
- `--task <name>`: Automatically load context from a task in `docs/ai/tasks/<name>` (loads scope and latest log).
- `--isolation worktree`: Run the agent in a sandboxed git worktree (safe for destructive changes).
- `--dry-run`: Simulate the execution plan without running the agent loop.

Example:
```bash
contextuate run documentation-expert --task api-refactor --goal "Update API docs" --isolation worktree
```

### Creating Agents

Scaffold a new agent definition:

```bash
contextuate create-agent <name> --description "Description of what it does"
```

### Context Management

#### Indexing the Project
Generate a token-optimized map of your codebase:

```bash
contextuate index
```
This creating `docs/ai/project-structure.md`, which is automatically loaded by the `run` command to give agents a high-level view of the project without reading every file.

#### Adding Context
Interactively select files to add to your main context:

```bash
contextuate add-context
```

### Context Analysis
When running an agent with `--dry-run`, Contextuate now displays a "Context Size Analysis" to help you manage token usage:

```bash
contextuate run documentation-expert --dry-run
```
Output:
```
Loading Context:
- docs/ai/project-structure.md: FOUND (450 tokens)
- docs/ai/context.md: FOUND (1200 tokens)

Total Context Size: ~1650 tokens
```

## Documentation

For full documentation, see [contextuate.md](https://contextuate.md) or browse the `docs/ai/.contextuate/` directory.

## License

[MIT License](LICENSE)

## Credits

Powered by **Esotech**.
Created by **Alexander Conroy** ([@geilt](https://github.com/geilt)).
