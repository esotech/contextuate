# Platform Adapters

Use this checklist when adding or changing AI skills, rules, hooks, commands,
agents, memories, plans, artifacts, or assistant behavior in this repository.

## Rule

Update the shared source first, then check every platform adapter. Do not update
only the AI tool you are currently using.

## Shared Sources

| Asset | Canonical path |
|---|---|
| Skills | `./contextuate/skills/` |
| Rules | `./contextuate/rules/` |
| Commands | `./contextuate/commands/` |
| Agents | `./contextuate/agents/` |
| Hooks | `./contextuate/hooks/` |
| Memories | `./contextuate/memories/` |
| Plans | `./contextuate/plans/` |
| Artifacts | `./contextuate/artifacts/` |

## Adapter Checklist

| Platform | Check |
|---|---|
| Claude Code | `CLAUDE.md` points to `AGENTS.md`; `.claude/skills` should resolve to `./contextuate/skills`. |
| Codex | `AGENTS.md` is the primary instruction file; `.codex/skills` should resolve to `./contextuate/skills`. |
| Cursor | `AGENTS.md` is the primary workspace instruction file; `.cursor/skills` should resolve to `./contextuate/skills`; `.cursor/rules` should resolve to `./contextuate/rules`. |
| Gemini | `GEMINI.md` should be a relative symlink to `AGENTS.md`; `.gemini/skills` should resolve to `./contextuate/skills`. |
| Antigravity | `AGENTS.md` and `GEMINI.md` are workspace context files; `.agents/skills` should resolve to `./contextuate/skills`; `.agents/plugins/contextuate-shared/` should hold thin plugin adapters for rules, agents, hooks, or MCP config. |
| Grok | `AGENTS.md`/`Agents.md` is discovered as project instructions; `.grok/skills` should resolve to `./contextuate/skills`; `.grok/config.toml` should remain a thin tool-specific config file. |

## Verification

After changing shared AI assets, run basic path checks from the repo root:

```sh
test -e .claude/skills/acli-jira/SKILL.md
test -e .codex/skills/acli-jira/SKILL.md
test -e .cursor/rules/repo-bound-state.mdc
test -e .gemini/skills/acli-jira/SKILL.md
test -e .agents/skills/acli-jira/SKILL.md
test -e .agents/plugins/contextuate-shared/rules/repo-bound-state.md
test "$(readlink .agents/skills)" = ".././contextuate/skills"
test "$(readlink .agents/plugins/contextuate-shared/rules/repo-bound-state.md)" = "../../../.././contextuate/rules/repo-bound-state.mdc"
test -e .grok/skills/acli-jira/SKILL.md
test "$(readlink CLAUDE.md)" = "AGENTS.md"
test "$(readlink GEMINI.md)" = "AGENTS.md"
grok inspect | rg "Project Instructions|Agents\\.md|AGENTS\\.md"
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
