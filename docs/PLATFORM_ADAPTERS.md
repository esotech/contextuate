# Platform Adapters

Use this checklist when adding or changing AI skills, rules, hooks, commands,
agents, memories, plans, artifacts, or assistant behavior in this repository.

## Rule

Update the shared source first, then check every platform adapter. Do not update
only the AI tool you are currently using.

In this repository, the editable source lives under `src/templates/`. In an
installed project, the canonical AI context bundle lives under `docs/ai/`, with
`AGENTS.md` as the only root instruction file.

If a project already has legacy bootstrap files such as `CLAUDE.md`,
`GEMINI.md`, `.cursorrules`, `.windsurfrules`, or tool-specific instruction
files, review them and merge any unique rules into `AGENTS.md`. Do not keep
parallel instruction sources.

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
| Claude Code | Do not create `CLAUDE.md` by default. Let Claude use `AGENTS.md`; `.claude/commands`, `.claude/agents`, `.claude/hooks`, `.claude/skills`, and `.claude/.contextuate` may resolve to `docs/ai/...` as non-instruction asset links. |
| Codex | `AGENTS.md` is the primary instruction file. If adding `.codex/skills`, keep it as a symlink or generated adapter to `docs/ai/skills`. |
| Cursor | Use root `AGENTS.md`; do not create `.cursorrules` or `.cursor/rules/project.mdc` by default. Merge existing Cursor rules into `AGENTS.md`. |
| Gemini | Do not create `GEMINI.md` by default. Let Gemini use `AGENTS.md`; merge any existing `GEMINI.md` rules into `AGENTS.md`. |
| Antigravity | Prefer `AGENTS.md` as the shared workspace context. Only add `.agents/skills` or `.agents/plugins/<plugin-name>/` when Antigravity-specific skills, hooks, or MCP config are required. |
| Grok | Treat as unverified until current official docs are checked; prefer `AGENTS.md` as the root instruction source and keep any `.grok/` files thin. |

## Verification

After changing shared AI assets, run basic path checks from the repo root:

```sh
test -e AGENTS.md
test ! -e CLAUDE.md
test ! -e GEMINI.md
test "$(readlink .claude/commands)" = "../docs/ai/commands"
test "$(readlink .claude/agents)" = "../docs/ai/agents"
test "$(readlink .claude/hooks)" = "../docs/ai/hooks"
test "$(readlink .claude/skills)" = "../docs/ai/skills"
test "$(readlink .claude/.contextuate)" = "../docs/ai/.contextuate"
test -e .claude/commands/interview.md
test -e .claude/agents/archon.md
test ! -e .cursor/rules/project.mdc
test -e docs/ai/.contextuate/contextuate.md
# Optional when Grok CLI is installed:
# grok inspect | rg "Project Instructions|Agents\\.md|AGENTS\\.md"
```

## Antigravity Notes

As of the current Google Antigravity docs, workspace context can include
`GEMINI.md` and `AGENTS.md`, and workspace skills live under `.agents/skills`.
Antigravity plugins can also contain `agents/`, `rules/`, `hooks.json`, and
`mcp_config.json` inside `.agents/plugins/<plugin-name>/`. Keep those as
Antigravity-specific adapters only when `AGENTS.md` cannot express the behavior.

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
