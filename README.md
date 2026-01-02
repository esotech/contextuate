# Contextuate Framework

<p align="center">
  <a href="https://contextuate.md">
    <img src="assets/logo-black.png" alt="Contextuate Logo" width="200" />
  </a>
</p>


**Standardized AI Context for Software Projects**

Contextuate provides a structured "brain" for your project that AI coding assistants (like Claude, Copilot, Cursor) can understand. It standardizes how AI agents receive context, follow coding standards, and execute tasks.

## Quick Start

### One-Line Install (Recommended)

```bash
curl -fsSL https://contextuate.md/install.sh | sh
```

### Install via npm

```bash
npm install -g @esotech/contextuate
```

Or use directly with npx:

```bash
npx @esotech/contextuate init
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
- **`docs/ai/skills/`**: Slash commands that activate special behaviors (e.g., `/orchestrate`).

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
| `monitor`      | Real-time Claude Code session monitoring |

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
contextuate install --skills orchestrate

# Subcommand style
contextuate install agents archon base
contextuate install agents --all
contextuate install standards php javascript python
contextuate install standards --all
contextuate install tools --all
contextuate install skills --all

# Force overwrite
contextuate install agents --all --force
```

**Options:**
- `-a, --agents <names...>` - Install specific agents
- `-s, --standards <names...>` - Install language standards
- `-t, --tools <names...>` - Install tools
- `-k, --skills <names...>` - Install skills (slash commands)
- `--all` - Install all available templates
- `-l, --list` - List available templates
- `-f, --force` - Overwrite existing files

**Subcommands:**
- `install agents [names...]` - Install agent templates (also installs skills by default)
- `install standards [names...]` - Install language standard templates
- `install tools [names...]` - Install tool templates
- `install skills [names...]` - Install skill templates (slash commands like `/orchestrate`)

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

---

### `contextuate monitor`

Real-time monitoring dashboard for Claude Code sessions. Tracks tool usage, events, and session activity.

#### Architecture

The monitor uses a 3-layer architecture:

1. **Hooks** - Claude Code hooks emit events to the daemon
2. **Daemon** - Background process that collects and processes events (runs independently)
3. **UI Server** - Web dashboard and WebSocket server for real-time updates

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Claude Code   │────▶│     Daemon      │────▶│   UI Server     │
│     (Hooks)     │     │   (Background)  │     │   (Dashboard)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Important:** The daemon runs independently of the UI server. Starting the monitor will spawn the daemon, but stopping the monitor will NOT stop the daemon (so it can continue collecting events). Use `--all` to stop both.

#### Commands

```bash
# Initial setup (interactive)
contextuate monitor init
contextuate monitor init --global   # Install hooks at user level (~/.claude/)
contextuate monitor init --project  # Install hooks at project level (.claude/)

# Start the monitor (auto-starts daemon if not running)
contextuate monitor
contextuate monitor start
contextuate monitor start --port 8080       # Custom HTTP port
contextuate monitor start --ws-port 8081    # Custom WebSocket port
contextuate monitor start --no-open         # Don't open browser
contextuate monitor start --foreground      # Run in foreground (blocking)

# Stop the monitor
contextuate monitor stop          # Stop UI server only (daemon keeps running)
contextuate monitor stop --all    # Stop both UI server and daemon

# Check status
contextuate monitor status

# Daemon management (advanced)
contextuate monitor daemon start            # Start daemon only
contextuate monitor daemon start --detach   # Start daemon in background
contextuate monitor daemon stop             # Stop daemon
contextuate monitor daemon status           # Check daemon status
contextuate monitor daemon logs             # View daemon logs
contextuate monitor daemon logs -f          # Follow daemon logs
contextuate monitor daemon logs -n 100      # Show last 100 lines
```

#### Configuration

Configuration is stored in `~/.contextuate/monitor/config.json`. Run `contextuate monitor init` for interactive setup, or edit the file directly.

##### Full Configuration Example

```json
{
  "mode": "local",
  "server": {
    "host": "0.0.0.0",
    "port": 3847,
    "wsPort": 3848
  },
  "redis": {
    "host": "localhost",
    "port": 6379,
    "password": null,
    "channel": "contextuate:events"
  },
  "persistence": {
    "enabled": true,
    "type": "file",
    "database": {
      "host": "localhost",
      "port": 3306,
      "database": "contextuate",
      "user": "contextuate",
      "password": "secret"
    }
  },
  "socketPath": "/tmp/contextuate-monitor.sock"
}
```

##### Configuration Parameters

| Parameter | Type | Default | Description |
|:----------|:-----|:--------|:------------|
| `mode` | `"local"` \| `"redis"` | `"local"` | Communication mode between components |
| `socketPath` | string | `"/tmp/contextuate-monitor.sock"` | Unix socket path (local mode only) |

**Server Settings** (`server`):

| Parameter | Type | Default | Description |
|:----------|:-----|:--------|:------------|
| `host` | string | `"0.0.0.0"` | Host to bind the HTTP server |
| `port` | number | `3847` | HTTP port for the dashboard |
| `wsPort` | number | `3848` | WebSocket port for real-time updates |

**Redis Settings** (`redis`) - for distributed/multi-machine setups:

| Parameter | Type | Default | Description |
|:----------|:-----|:--------|:------------|
| `host` | string | `"localhost"` | Redis server host |
| `port` | number | `6379` | Redis server port |
| `password` | string \| null | `null` | Redis password (optional) |
| `channel` | string | `"contextuate:events"` | Redis pub/sub channel name |

**Persistence Settings** (`persistence`):

| Parameter | Type | Default | Description |
|:----------|:-----|:--------|:------------|
| `enabled` | boolean | `true` | Enable session persistence |
| `type` | `"file"` \| `"mysql"` \| `"postgresql"` | `"file"` | Storage backend |
| `database` | object | - | Database connection settings (required for mysql/postgresql) |

**Database Settings** (`persistence.database`) - for MySQL/PostgreSQL:

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `host` | string | Database server host |
| `port` | number | Database server port (3306 for MySQL, 5432 for PostgreSQL) |
| `database` | string | Database name |
| `user` | string | Database username |
| `password` | string | Database password |

> **Note:** MySQL and PostgreSQL persistence are planned features. Currently only file-based persistence is fully implemented.

##### Mode Comparison

| Feature | Local Mode | Redis Mode |
|:--------|:-----------|:-----------|
| Setup complexity | Simple | Requires Redis server |
| Multi-machine support | No | Yes |
| Single machine | Recommended | Overkill |
| Event delivery | Unix socket | Redis pub/sub |
| Use case | Personal development | Team/distributed environments |

#### Files and Directories

```
~/.contextuate/monitor/
├── config.json      # Monitor configuration
├── sessions/        # Persisted session data
├── raw/             # Raw event files from hooks
├── processed/       # Processed event files
├── hooks/           # Hook scripts
├── daemon.pid       # Daemon process ID
├── daemon.log       # Daemon logs
├── server.pid       # UI server process ID
└── server.log       # UI server logs
```

---

## Documentation

For full documentation, see [contextuate.md](https://contextuate.md) or browse the `docs/ai/.contextuate/` directory.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and release notes.

## License

[MIT License](LICENSE)

## Credits

Powered by **Esotech**.
Created by **Alexander Conroy** ([@geilt](https://github.com/geilt)).
