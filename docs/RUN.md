# Contextuate Run Command

The `contextuate run` command is the execution engine for the Contextuate agent framework. It allows you to launch defined agents, provide them with specific goals, and execute them within controlled environments.

## Overview

The `run` command transforms static context into active runtime execution. It takes an **Agent Definition** (a markdown file with YAML metadata), provisions the necessary environment (including git worktrees for isolation), injects context (from tasks or the project structure), and hands control over to an LLM driver to achieve a goal.

## Usage

```bash
contextuate run <agent-name> [options]
```

### Arguments

*   `<agent-name>`: The name of the agent to run. This corresponds to a file named `<agent-name>.md` located in `docs/ai/agents/`.

### Options

*   `--goal <string>`: A specific objective for this run. Overrides or supplements the agent's default behavior.
*   `--dry-run`: Simulates the setup process (loading context, creating worktrees) without actually invoking the LLM or executing actions. Useful for verifying configuration.
*   `--isolation <mode>`: Specifies the isolation level.
    *   `worktree`: Creates a temporary Git Worktree for the agent. This allows the agent to modify files without affecting your main working copy until you choose to merge. **Requires the project to be a Git repository.**
*   `--task <task-name>`: Injects context from a specific task directory (`docs/ai/tasks/<task-name>`). This includes the `00-project-scope.md` and the latest log file from that task, helping the agent continue work or debug a specific issue.

## How It Works

1.  **Agent Discovery**: Looks for `docs/ai/agents/<name>.md`.
2.  **Configuration Parsing**: Reads the YAML frontmatter to understand the agent's capabilities, required environment variables, and base context.
3.  **Environment Provisioning**:
    *   Checks for required environment variables.
    *   If `--isolation worktree` is used, creates a new directory linked to the current branch (or a detached state).
4.  **Context Injection**:
    *   Loads files specified in the agent's `context` config.
    *   If `--task` is provided, loads the task's scope and latest logs.
    *   Injects `docs/ai/project-structure.md` if available.
    *   Calculates token usage to ensure it fits within limits.
5.  **Execution Check**:
    *   If `--dry-run`, it prints the plan and cleans up.
    *   Otherwise, it initializes the `LLMDriver` and begins the agent execution loop.

## Best Uses

*   **Task Delegation**: "I need this bug fixed, but I don't want to switch contexts." -> `contextuate run bug-fixer --goal "Fix NPE in auth.ts" --isolation worktree`
*   **Regression Testing**: Run a QA agent against a specific task's output to verify it meets requirements.
*   **Exploration**: Let a research agent explore a codebase and generate a report without cluttering your file history (using worktrees).
*   **Continuation**: Resume a complex task by feeding its history back into a fresh agent instance using `--task`.

## Application for LLMs

As an AI assistant (like me), you can use `contextuate run` to **spawn sub-agents** to handle sub-tasks.

**Example Scenario:**
You are working on a large refactor. You realize you need to update 5 different adapter files, which is tedious but straightforward.

1.  **You (The Primary Agent)**: Decide to delegate this.
2.  **Action**: You call `run_command` with:
    ```bash
    contextuate run refactor-bot --goal "Update all adapters to use the new InterfaceV2" --isolation worktree
    ```
3.  **Result**: The CLI spawns a separate process. The `refactor-bot` works in a parallel worktree.
4.  **Monitoring**: You can monitor its logs or wait for it to finish.
5.  **Merge**: Once finished, you verify its work in the worktree and merge it back to your main workspace.

This capability allows for **Agentic Parallelism**—scaling your ability to modify code by orchestrating specialized sub-agents.
