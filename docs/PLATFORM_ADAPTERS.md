# Platform Adapters

Use this checklist when adding or changing AI skills, rules, hooks, commands,
agents, memories, plans, artifacts, or assistant behavior in this repository.

## Rule

Update the shared source first, then check every platform adapter. Do not update
only the AI tool you are currently using.

In this repository, the editable source lives under `src/templates/`. In an
installed project, the canonical AI context bundle lives under `docs/ai/`, with
root-level and tool-specific files acting as thin adapters.

## Shared Sources

| Asset | Source path in this repo | Installed project path |
|---|---|
| Root instructions | `src/templates/templates/platforms/AGENTS.md` | `AGENTS.md` |
| Framework bootstrap | `src/templates/templates/contextuate.md` | `docs/ai/.contextuate/contextuate.md` |
| Commands / slash skills | `src/templates/commands/` | `docs/ai/commands/` |
| Platform-native skills | future source under `src/templates/skills/` | `docs/ai/skills/` |
| Agents | `src/templates/agents/` | `docs/ai/agents/` |
| Framework agents | `src/templates/framework-agents/` | `docs/ai/.contextuate/agents/` |
| Standards / rules | `src/templates/standards/` and `src/templates/templates/standards/` | `docs/ai/.contextuate/standards/` and `docs/ai/standards/` |
| Tool guides | `src/templates/tools/` | `docs/ai/.contextuate/tools/` |
| Hooks | `src/monitor/hooks/` and future AI hook templates | `docs/ai/hooks/` or platform hook config |
| Plans / task memory | user-created | `docs/ai/tasks/` |

## Adapter Checklist

| Platform | Check |
|---|---|
| Claude Code | `CLAUDE.md` should be a relative symlink to `AGENTS.md`; `.claude/commands`, `.claude/agents`, `.claude/hooks`, `.claude/skills`, and `.claude/.contextuate` should resolve to `docs/ai/...`. |
| Codex | `AGENTS.md` is the primary instruction file. If adding `.codex/skills`, keep it as a symlink or generated adapter to `docs/ai/skills`. |
| Cursor | `AGENTS.md` is the simple root instruction file; `.cursor/rules/project.mdc` should remain a thin pointer to `docs/ai/.contextuate/contextuate.md`. If adding `.cursor/skills`, link it to `docs/ai/skills`. |
| Gemini | `GEMINI.md` should be a relative symlink to `AGENTS.md`. If symlinks are not available, use a tiny `GEMINI.md` with `@AGENTS.md`. |
| Antigravity | `AGENTS.md` and `GEMINI.md` are workspace context files; workspace skills should live under `.agents/skills`; plugins can live under `.agents/plugins/<plugin-name>/` when rules, agents, hooks, or MCP config need Antigravity-specific packaging. |
| Grok | Treat as unverified until current official docs are checked; prefer `AGENTS.md` as the root instruction source and keep any `.grok/` files thin. |

## Verification

After changing shared AI assets, run basic path checks from the repo root:

```sh
test -e AGENTS.md
test "$(readlink CLAUDE.md)" = "AGENTS.md"
test "$(readlink GEMINI.md)" = "AGENTS.md"
test "$(readlink .claude/commands)" = "../docs/ai/commands"
test "$(readlink .claude/agents)" = "../docs/ai/agents"
test "$(readlink .claude/hooks)" = "../docs/ai/hooks"
test "$(readlink .claude/skills)" = "../docs/ai/skills"
test "$(readlink .claude/.contextuate)" = "../docs/ai/.contextuate"
test -e .claude/commands/interview.md
test -e .claude/agents/archon.md
test -e .cursor/rules/project.mdc
test -e docs/ai/.contextuate/contextuate.md
# Optional when Grok CLI is installed:
# grok inspect | rg "Project Instructions|Agents\\.md|AGENTS\\.md"
```

## Antigravity Notes

As of the current Google Antigravity docs, workspace context is loaded from
`GEMINI.md` and `AGENTS.md`, and workspace skills live under `.agents/skills`.
Antigravity plugins can also contain `agents/`, `rules/`, `hooks.json`, and
`mcp_config.json` inside `.agents/plugins/<plugin-name>/`. This repo uses
`.agents/plugins/contextuate-shared/` for those Antigravity-specific plugin
adapters.

Do not create a repo-local `.antigravity/` adapter unless Google documents it or
the local app creates one with a clear workspace contract. Google documents
Antigravity local app data under `~/.gemini/antigravity/`, which is user-local
runtime state and should not be used as this repo's shared AI asset location.

References:

- Google Antigravity migration docs:
  `https://antigravity.google/docs/gcli-migration?app=antigravity`
- Google Antigravity skills docs:
  `https://antigravity.google/docs/skills`
- Google Antigravity agent settings:
  `https://antigravity.google/docs/agent-settings`

If a platform needs a file in a different format, keep that file as a thin
adapter and link back to the shared source instead of duplicating behavior.
