# Contextuate Create Agent Command

The `contextuate create-agent` (alias: `new-agent`) command scaffolds a new AI agent definition file.

## Usage

```bash
contextuate create-agent [name] [options]
```

### Arguments

*   `[name]`: The name of the agent in kebab-case (e.g., `code-reviewer` or `bug-fixer`). If not provided, you will be prompted.

### Options

*   `-d, --description <text>`: A brief description of the agent's purpose.

## Output

Creates a file at `docs/ai/agents/<name>.md`.

This file contains **YAML Frontmatter** and **Markdown** instructions:

```markdown
---
name: "my-agent"
description: "A helper agent"
version: "1.0.0"
capabilities:
  - "read_files"
context:
  files:
    - "docs/context.md"
---

# My Agent

> **Purpose:** A helper agent
```

## Next Steps

After creation:
1.  Open the file and modify the **Role** and **Specialized Rules** sections.
2.  Add specific files to the `context` list in the frontmatter if the agent needs them (e.g., specific library documentation).
3.  Run the agent with `contextuate run <name>`.
