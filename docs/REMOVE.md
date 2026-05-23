# Contextuate Remove Command

The `contextuate remove` command safely cleans up the Contextuate framework files from your project.

## Usage

```bash
contextuate remove
```

## How It Works

This command is designed to be **safe**. It checks the hash of each installed file against the original template.

*   **Unmodified Files**: If a file (like a jump file in `.cursor/rules/`) has NOT been changed since installation, it is deleted.
*   **Modified Files**: If you have edited a file, `remove` will **SKIP** it to prevent data loss. You will see a `[SKIP]` message in the console.

## What Gets Removed?

It primarily targets generated or legacy bootstrap adapters. Current installs use
`AGENTS.md` as the single root instruction file, but `remove` also knows how to
clean up older generated platform files when they are unmodified or known
symlinks.

*   `AGENTS.md`
*   `CLAUDE.md`
*   `GEMINI.md`
*   `.clinerules/cline-memory-bank.md`
*   `.cursor/rules/project.mdc`
*   `.windsurf/rules/project.md`
*   `.gemini/rules.md`
*   `.github/copilot-instructions.md`
*   `.claude/commands`
*   `.claude/agents`
*   `.claude/hooks`
*   `.claude/skills`
*   `.claude/.contextuate`

It also cleans up empty directories left behind by these files.
