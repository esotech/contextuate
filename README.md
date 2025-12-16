# Contextuate Framework

<p align="center">
  <a href="https://contextuate.md">
    <img src="assets/logo-black.png" alt="Contextuate Logo" width="200" />
  </a>
</p>


**Standardized AI Context for Software Projects**

Contextuate provides a structured "brain" for your project that AI coding assistants (like Claude, Copilot, Cursor) can understand. It standardizes how AI agents receive context, follow coding standards, and execute tasks.

## Quick Start

### Install via npm (Recommended)

```bash
npm install -g @esotech/contextuate
```

Or use directly with npx:

```bash
npx @esotech/contextuate init
```

### One-Line Install (Alternative)

```bash
curl -fsSL https://contextuate.md/install.sh | sh
```

### Install from Source

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

- **`docs/ai/.contextuate/contextuate.md`**: The framework bootstrap file. It links to everything else.
- **`docs/ai/context.md`**: Your project-specific context (Identity, Tech Stack).
- **`docs/ai/project-structure.md`**: Auto-generated file tree map (created by `contextuate index`).
- **`docs/ai/agents/`**: Specialized "personas" for your AI (e.g., `documentation-expert`).
- **`docs/ai/standards/`**: Explicit coding standards and behavioral guidelines.
- **`docs/ai/quickrefs/`**: Condensed documentation optimized for AI token limits.
- **`docs/ai/tasks/`**: A workflow for managing multi-session AI tasks.

## How LLMs Use Contextuate

1. **Discovery**: The AI reads `docs/ai/.contextuate/contextuate.md` first. This file maps the project and links to all other resources.
2. **Specialization**: If acting as a specific agent, it reads `docs/ai/agents/<name>.md` to load specific capabilities and rules.
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

1. Edit **`docs/ai/context.md`** with your project details (Identity, Tech Stack).
    *   *Note: `docs/ai/.contextuate/contextuate.md` is the framework entry point and typically shouldn't be edited.*
2. Create custom agents in **`docs/ai/agents/`** (using the Agent Creator tool).
3. Document coding standards in **`docs/ai/standards/`**.
4. Generate quickrefs in **`docs/ai/quickrefs/`**.

## CLI Usage

### Global Options

```bash
contextuate --help     # Display all available commands
contextuate --version  # Display the installed version
contextuate -V         # Short form for version
```

### Command Reference

| Command        | Description                              |
| :------------- | :--------------------------------------- |
| `init`         | Initialize Contextuate in a project      |
| `install`      | Install templates (agents, standards)    |
| `run`          | Execute an agent                         |
| `create-agent` | Create a new agent definition            |
| `index`        | Generate a project file tree             |
| `add-context`  | Interactively add files to context       |
| `remove`       | Clean up framework files                 |

---

### `contextuate init`

Initialize Contextuate in the current project.

```bash
# Interactive mode - prompts for platforms and agents
contextuate init

# Non-interactive - specify platforms directly
contextuate init claude cursor copilot
contextuate init all  # Install all platforms

# With agents
contextuate init claude --agents archon base
contextuate init claude --agents all

# Force overwrite existing files
contextuate init claude --force
```

**Options:**
- `-f, --force` - Overwrite existing files
- `-a, --agents <names...>` - Install specific agents (e.g., "base archon" or "all")

**Available Platforms:** `agents`, `antigravity`, `claude`, `cline`, `cursor`, `gemini`, `copilot`, `windsurf`

---

### `contextuate install`

Install templates from the global Contextuate repository. Supports both flag-style and subcommand-style usage.

```bash
# Interactive mode
contextuate install

# List available templates
contextuate install --list

# Install all templates
contextuate install --all

# Flag style - install specific items
contextuate install --agents archon base canvas
contextuate install --standards php javascript
contextuate install --tools quickref

# Subcommand style
contextuate install agents archon base
contextuate install agents --all
contextuate install standards php javascript python
contextuate install standards --all
contextuate install tools --all

# Force overwrite
contextuate install agents --all --force
```

**Options:**
- `-a, --agents <names...>` - Install specific agents
- `-s, --standards <names...>` - Install language standards
- `-t, --tools <names...>` - Install tools
- `--all` - Install all available templates
- `-l, --list` - List available templates
- `-f, --force` - Overwrite existing files

**Subcommands:**
- `install agents [names...]` - Install agent templates
- `install standards [names...]` - Install language standard templates
- `install tools [names...]` - Install tool templates

---

### `contextuate run`

Execute an agent definition with optional task context.

```bash
contextuate run documentation-expert
contextuate run archon --goal "Review the codebase structure"
contextuate run forge --task my-feature
contextuate run nexus --dry-run
```

**Options:**
- `--dry-run` - Simulate execution without running logic
- `--isolation <mode>` - Isolation mode (`worktree`, `none`). Default: `none`
- `--goal <text>` - Goal or instructions for the agent
- `--task <name>` - Load a task context (scope and latest log)

---

### `contextuate create-agent`

Create a new agent definition.

```bash
# Interactive mode
contextuate create-agent

# With name
contextuate create-agent my-custom-agent
contextuate new-agent my-custom-agent  # Alias

# With description
contextuate create-agent api-expert --description "Expert in REST API design"
```

**Options:**
- `-d, --description <text>` - Description of the agent

---

### `contextuate index`

Generate a project structure index for AI context.

```bash
contextuate index
contextuate index --depth 3
contextuate index --force
```

**Options:**
- `-d, --depth <number>` - Maximum depth of the file tree. Default: `5`
- `-f, --force` - Overwrite existing index

---

### `contextuate add-context`

Interactively add files to `docs/ai/context.md`.

```bash
contextuate add-context
```

---

### `contextuate remove`

Remove unmodified platform jump files.

```bash
contextuate remove
```

## Documentation

For full documentation, see [contextuate.md](https://contextuate.md) or browse the `docs/ai/.contextuate/` directory.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and release notes.

## License

[MIT License](LICENSE)

## Credits

Powered by **Esotech**.
Created by **Alexander Conroy** ([@geilt](https://github.com/geilt)).
