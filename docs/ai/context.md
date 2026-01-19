# Contextuate Project Context

> **Package:** `@esotech/contextuate`
> **Version:** 2.0.0
> **Author:** Alexander David Conroy ([@geilt](https://github.com/geilt))

---

## Project Overview

Contextuate is a CLI tool and framework that provides standardized AI context for software projects. It creates a structured "brain" that AI coding assistants (Claude Code, Copilot, Cursor, Windsurf, etc.) can understand and use consistently.

**This repository IS the Contextuate framework itself** - both the CLI tool source code and the framework templates it installs.

### CRITICAL: This IS the Contextuate Framework Project

**⚠️ DO NOT MODIFY FILES IN `docs/ai/` ⚠️**

This repository is the Contextuate framework source code. The `docs/ai/` folder exists only for dogfooding (testing the framework on itself). These files are **installed copies** that get overwritten.

**The ONLY editable files are in `src/`:**

| Location | Purpose | Editable? |
|----------|---------|-----------|
| `src/templates/agents/` | Agent definitions (source) | ✅ YES |
| `src/templates/standards/` | Standards (source) | ✅ YES |
| `src/templates/skills/` | Skills (source) | ✅ YES |
| `src/templates/tools/` | Tool guides (source) | ✅ YES |
| `src/commands/` | CLI commands | ✅ YES |
| `docs/ai/` | Installed copies | ❌ NO |
| `docs/ai/.contextuate/` | Installed copies | ❌ NO |
| `docs/ai/agents/` | Installed copies | ❌ NO |
| `docs/ai/commands/` | Installed copies | ❌ NO |
| `docs/ai/context.md` | Project-specific context | ✅ YES (this file only) |

**Workflow for making changes:**
1. Edit source files in `src/templates/`
2. Run `npm run build` to compile to `dist/`
3. The `dist/` folder is used by the installer (`npm link` or published package)
4. To test changes locally, re-run `contextuate init` or manually copy from `dist/templates/`

**Why this matters:**
- `docs/ai/` files are overwritten by the installer
- Changes made directly to `docs/ai/` will be lost
- Other projects installing Contextuate won't get your changes
- The `src/templates/` → `dist/templates/` → install pipeline is the only way changes propagate

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript (CommonJS) |
| Runtime | Node.js |
| CLI Framework | Commander.js |
| Web Server | Fastify (monitor) |
| WebSocket | ws |
| UI Framework | Vue.js + Vite (monitor dashboard) |
| Optional | Redis (ioredis), PostgreSQL |

---

## Project Structure

```
contextuate/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── commands/             # CLI command implementations
│   │   ├── init.ts           # Initialize framework in projects
│   │   ├── install.ts        # Install agents, standards, tools
│   │   ├── run.ts            # Execute agents
│   │   ├── create.ts         # Create new agent definitions
│   │   ├── index.ts          # Generate file tree index
│   │   ├── context.ts        # Add files to context
│   │   ├── remove.ts         # Clean up framework files
│   │   ├── claude.ts         # Claude wrapper management
│   │   └── monitor.ts        # Monitor commands
│   ├── monitor/              # Real-time session monitoring
│   │   ├── daemon/           # Background monitoring daemon
│   │   ├── server/           # WebSocket + HTTP server
│   │   ├── hooks/            # Event emission hooks
│   │   ├── persistence/      # Data storage
│   │   └── ui/               # Vue.js dashboard
│   ├── runtime/              # Agent execution runtime
│   ├── templates/            # Framework templates (installed to projects)
│   │   ├── agents/           # Specialist agent definitions
│   │   ├── framework-agents/ # Base framework agents
│   │   ├── standards/        # Coding/behavioral standards
│   │   ├── tools/            # AI tool guides
│   │   ├── skills/           # Skill definitions
│   │   └── templates/        # Platform files + contextuate.md
│   ├── types/                # TypeScript type definitions
│   └── utils/                # Shared utilities
├── dist/                     # Compiled output
└── docs/ai/                  # AI context (dogfooding)
```

---

## CLI Commands

### Framework Setup
| Command | Description |
|---------|-------------|
| `contextuate init [platforms...]` | Initialize framework in a project |
| `contextuate remove` | Remove unmodified platform files |

### Content Management
| Command | Description |
|---------|-------------|
| `contextuate install agents` | Install agent definitions |
| `contextuate install standards` | Install coding standards |
| `contextuate install tools` | Install AI tool guides |
| `contextuate install skills` | Install skill definitions |
| `contextuate index` | Generate project structure index |
| `contextuate add-context` | Interactively add files to context |

### Agent Execution
| Command | Description |
|---------|-------------|
| `contextuate run <agent>` | Execute an agent with optional goal |
| `contextuate create-agent [name]` | Create a new agent definition |

### Monitor System
| Command | Description |
|---------|-------------|
| `contextuate monitor init` | Initialize monitor configuration |
| `contextuate monitor start` | Start the monitor server |
| `contextuate monitor stop` | Stop the monitor server |
| `contextuate monitor status` | Check monitor status |
| `contextuate monitor daemon start` | Start background daemon |
| `contextuate monitor daemon stop` | Stop background daemon |

### Claude Integration
| Command | Description |
|---------|-------------|
| `contextuate claude [goal]` | Launch Claude with PTY wrapper |
| `contextuate claude list` | List active Claude wrappers |
| `contextuate claude kill <id>` | Kill a specific wrapper |

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/index.ts` | CLI entry, command registration |
| `src/commands/init.ts` | Framework installation logic |
| `src/commands/run.ts` | Agent execution runtime |
| `src/monitor/daemon/index.ts` | Monitoring daemon |
| `src/monitor/server/broker.ts` | Event brokering |
| `src/monitor/ui/src/main.ts` | Dashboard entry |

---

## Development Notes

### Markdown Link Formatting

**IMPORTANT:** When creating links in markdown files, follow these rules:

1. **Use relative paths** - Always prefer relative pathing over absolute paths
2. **Description matches path** - The link text must be the same as the relative path

```markdown
# Correct
> **Context:** [../.contextuate/standards/task-workflow.md](../.contextuate/standards/task-workflow.md)

# Incorrect
> **Context:** [Task Workflow](../.contextuate/standards/task-workflow.md)
```

**Why this matters:**
- This project uses symlinks that need to maintain correct references
- AI tools (Claude Code, etc.) read the link description text to determine file paths, not the actual href
- Using descriptive text like "Task Workflow" causes AI to fail to find the file
- Matching description to path ensures AI can navigate correctly regardless of symlink resolution

### Commands vs Agents

**Commands should be minimal.** They exist only to invoke agents.

| Component | Purpose | Contains |
|-----------|---------|----------|
| **Commands** (`src/templates/commands/`) | Invoke agents | Just the invocation, usage examples |
| **Agents** (`src/templates/agents/`) | Define behavior | All rules, decision trees, processes |

**Example:**
- `/orchestrate` command → Just says "read and adopt ARCHON agent"
- ARCHON agent → Contains all orchestration rules, LEDGER-first requirement, parallel execution, etc.

**Why this separation matters:**
- Commands are user-facing entry points, keep them simple
- Agents are reusable definitions with complete behavioral specifications
- Duplicating rules in commands leads to inconsistency
- When behavior needs to change, update the agent (single source of truth)

### Build Process
- `npm run build` - Compiles TypeScript and copies `src/templates/` to `dist/templates/`
- `npm run build:monitor-ui` - Builds the Vue.js monitor dashboard
- `npm run build:all` - Full build including UI

### Template Development

**Source → Build → Install Pipeline:**

```
src/templates/     →  npm run build  →  dist/templates/  →  contextuate init  →  target project
     ↑                                        ↑
  EDIT HERE                              INSTALLER USES THIS
```

**To modify agents, standards, skills, or tools:**
1. Find the source file in `src/templates/`
2. Make your changes there
3. Run `npm run build`
4. Test by running `contextuate init` in a target project (or this project)

**NEVER edit files in `docs/ai/` directly** - they are installed copies and will be overwritten.

---

## Links

- **Repository:** https://github.com/esotech/contextuate
- **Documentation:** https://contextuate.md
- **npm:** https://www.npmjs.com/package/@esotech/contextuate
