# Contextuate Project Context

> **Package:** `@esotech/contextuate`
> **Version:** 2.0.0
> **Author:** Alexander David Conroy ([@geilt](https://github.com/geilt))

---

## Project Overview

Contextuate is a CLI tool and framework that provides standardized AI context for software projects. It creates a structured "brain" that AI coding assistants (Claude Code, Copilot, Cursor, Windsurf, etc.) can understand and use consistently.

**This repository IS the Contextuate framework itself** - both the CLI tool source code and the framework templates it installs.

### Important: Dogfooding Notice

This project uses Contextuate for its own AI context. However:

- **DO NOT** modify files in `docs/ai/.contextuate/` - these are installed copies
- **DO** modify source templates in `src/templates/` instead
- Installed files are overwritten when running `npm run build`
- The source templates (`src/templates/`) are the source of truth

| Location | Purpose | Edit? |
|----------|---------|-------|
| `src/templates/` | Source templates (framework code) | Yes |
| `docs/ai/.contextuate/` | Installed copies (for dogfooding) | No |
| `docs/ai/context.md` | This file (project-specific) | Yes |
| `docs/ai/agents/` | User agents (installed from templates) | Modify source |

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

### Build Process
- `npm run build` - Compiles TypeScript and copies `src/templates/` to `dist/templates/`
- `npm run build:monitor-ui` - Builds the Vue.js monitor dashboard
- `npm run build:all` - Full build including UI

### Template Development
When modifying framework templates (agents, standards, tools, skills):
1. Edit files in `src/templates/`
2. Run `npm run build`
3. Copy updated files to `docs/ai/.contextuate/` for testing (or re-run init)

**Never edit `docs/ai/.contextuate/` directly** - changes will be lost on next build.

---

## Links

- **Repository:** https://github.com/esotech/contextuate
- **Documentation:** https://contextuate.md
- **npm:** https://www.npmjs.com/package/@esotech/contextuate
