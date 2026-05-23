# Contextuate Framework

> **DO NOT MODIFY FILES IN THIS DIRECTORY**
>
> This folder contains the core Contextuate framework files. These are managed by the installer and will be overwritten during updates.

---

## Quick Start

After installation, customize your project context in `docs/ai/context.md`. AI assistants will automatically read this file when they start.

---

## Available Tools

Contextuate includes AI tool guides - markdown files that AI assistants read and follow to perform tasks. Ask your AI assistant to use these tools with natural language.

### Standards Detector

Analyzes your codebase to detect and document coding standards.

**How to use:** Ask your AI assistant:
> "Detect the coding standards for this project"
> "Analyze my code and create coding standards"
> "Generate standards documentation from my source files"

**What it does:**
1. Scans for source files (PHP, JS, TS, etc.)
2. Checks for config files (.eslintrc, phpcs.xml, etc.)
3. Analyzes patterns (indentation, naming, braces)
4. Creates standards files in `docs/ai/standards/`

**Guide:** [tools/standards-detector.md](tools/standards-detector.md)

---

### Quickref Generator

Creates condensed, AI-friendly references from large documentation files.

**How to use:** Ask your AI assistant:
> "Generate a quickref for docs/classes/user-service.md"
> "Create a quick reference for the API documentation"
> "Make a condensed reference for this class"

**What it does:**
1. Reads source documentation
2. Extracts method/API signatures
3. Creates scannable reference tables
4. Outputs to `docs/ai/quickrefs/{name}.quickref.md`

**When to use:**
- Documentation exceeds ~200 lines
- Methods are frequently looked up
- AI needs method awareness without full context

**Guide:** [tools/quickref.md](tools/quickref.md)

---

### Agent Creator

Creates new AI agent definitions following Contextuate patterns.

**How to use:** Ask your AI assistant:
> "Create an agent for database operations"
> "Make a new agent for the authentication system"
> "Generate an agent definition for React components"

**What it does:**
1. Determines agent scope and responsibilities
2. Creates supporting docs if needed
3. Generates agent file from template
4. Outputs to `docs/ai/agents/{domain}-expert.md`

**Guide:** [tools/agent-creator.md](tools/agent-creator.md)

---

## Skills (Slash Commands)

Skills are special commands that activate specific AI behaviors. Install them with `contextuate install skills`. They are installed into `docs/ai/commands/`.

### /interview

Activates SIBYL requirements interview mode for structured discovery before planning.

**How to use:** In a Claude Code session, run:
> `/interview Build a customer reporting dashboard`

**What it does:**
1. Asks targeted questions for vague or incomplete requirements
2. Tracks confidence across architecture, integrations, data model, business logic, and constraints
3. Summarizes the emerging specification after each round
4. Produces a requirements handoff for `/consult` or `/orchestrate`

**File:** `docs/ai/commands/interview.md`

---

### /consult

Activates PYTHIA planning mode for technical research and specification after requirements are clear.

**How to use:** In a Claude Code session, run:
> `/consult Research real-time sync approaches for the approved inventory requirements`

**What it does:**
1. Researches unfamiliar technologies, APIs, and trade-offs
2. Synthesizes findings into a recommended approach
3. Produces an implementation specification for `/orchestrate`

**File:** `docs/ai/commands/consult.md`

---

### /orchestrate

Activates ARCHON orchestrator mode for coordinated multi-agent task execution.

**How to use:** In a Claude Code session, run:
> `/orchestrate Add a new API endpoint with database query, validation, and tests`

**What it does:**
1. Analyzes your task to identify required domains
2. Delegates to specialist agents instead of implementing directly
3. Coordinates handoffs between agents
4. Synthesizes results into a cohesive solution

**Available specialist agents:** aegis, atlas, canvas, chronicle, chronos, cipher, crucible, echo, forge, ledger, meridian, nexus, thoth, scribe, sentinel, unity, vox, weaver

**File:** `docs/ai/commands/orchestrate.md`

---

## Directory Structure

```
docs/ai/
├── .contextuate/       # Framework files (DO NOT MODIFY)
│   ├── agents/         # Base agent definitions
│   ├── standards/      # Default coding/behavioral standards
│   ├── templates/      # Platform jump-files and standards templates
│   ├── tools/          # AI tool guides
│   └── bin/            # Install/update scripts
├── agents/             # Your custom agents (user-editable)
├── commands/           # Slash commands (e.g., /interview, /consult, /orchestrate)
├── skills/             # Optional platform-specific skill files
├── standards/          # Your project standards (user-editable)
├── quickrefs/          # Generated quick references
├── tasks/              # Task tracking (gitignored)
└── context.md          # Your project context (user-editable)
```

---

## Standards Resolution

When AI looks up coding standards:

1. **Project Standards (First):** `docs/ai/standards/{language}.md`
2. **Framework Principles (Always):** `docs/ai/.contextuate/standards/coding-standards.md`
3. **Additional Templates:** install language templates with `contextuate install standards [language]`

---

## Framework Scripts

### install.sh

```bash
# Remote installation
curl -fsSL https://contextuate.md/install.sh | bash

# With options
curl -fsSL https://contextuate.md/install.sh | bash -s -- --force
```

**Options:**
- `--force` - Overwrite existing files
- `--no-git` - Don't modify .gitignore

### update.sh

```bash
./docs/ai/.contextuate/bin/update.sh
```

Updates framework files while preserving your customizations.

---

## Agents vs Tools vs Skills

| Type | Purpose | Location |
|------|---------|----------|
| **Agent** | Persona with expertise, decision-making | `agents/*.md` |
| **Tool** | Step-by-step process guide | `tools/*.md` |
| **Skill** | Slash command that activates behaviors | `commands/*.md` |

**Agents** define *who* the AI is acting as (e.g., "documentation expert").
**Tools** define *how* to accomplish a specific task (e.g., "follow these steps to generate a quickref").
**Skills** are slash commands that trigger specific modes or behaviors (e.g., `/interview` activates requirements discovery).

---

## Support

- Documentation: https://contextuate.md
- Repository: https://github.com/contextuate/contextuate
- Issues: https://github.com/contextuate/contextuate/issues
