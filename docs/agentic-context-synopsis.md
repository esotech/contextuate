# Synopsis: Agentic Harness Rule Files & Fallback Behavior

1. **Antigravity CLI (Gemini)**: Primary: `GEMINI.md` | Fallback: **Yes**
2. **Claude Code**: Primary: `CLAUDE.md` | Fallback: **Yes**
3. **Hermes Agent**: Primary: `.hermes.md` / `HERMES.md` | Fallback: **Yes**
4. **OpenClaw**: Primary: `SOUL.md` & `AGENTS.md` | Fallback: **Yes** (Natively uses `AGENTS.md`)
5. **OpenCode**: Primary: `AGENTS.md` | Fallback: **Yes**
6. **Kimi Code**: Primary: `KIMI.md` | Fallback: **Yes** (Via explicit references)
7. **Codex CLI / Grok**: Primary: `AGENTS.md` | Fallback: **N/A** (Primary standard)
8. **Cursor**: Primary: `.cursorrules` | Fallback: **Yes** (Natively detects and reads `AGENTS.md`)
9. **Windsurf**: Primary: `.windsurfrules` | Fallback: **Yes** (Cascade natively detects and reads `AGENTS.md`)
10. **Aider**: Primary: `.aider.instruction.md` / `CONVENTIONS.md` | Fallback: **Config** (via `.aider.conf.yml` or `--read`)
11. **VS Code GitHub Copilot**: Primary: `.github/copilot-instructions.md` | Fallback: **Config** (requires enabling `chat.useAgentsMdFile`)
12. **Supermaven**: Primary: `.supermavenrules` | Fallback: **No**
13. **Mentat**: Primary: `.mentat/` | Fallback: **No**
