import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

export async function createAgentCommand(name: string, options: { description?: string }) {
    console.log(chalk.blue('╔════════════════════════════════════════╗'));
    console.log(chalk.blue('║     Contextuate Agent Creator          ║'));
    console.log(chalk.blue('╚════════════════════════════════════════╝'));
    console.log('');

    let agentName = name;
    let agentDescription = options.description;

    // Prompt for name if not provided
    if (!agentName) {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'What is the name of the new agent? (kebab-case)',
                validate: (input) => /^[a-z0-9-]+$/.test(input) || 'Name must be lowercase alphanumeric with hyphens',
            },
        ]);
        agentName = answers.name;
    }

    // Prompt for description if not provided
    if (!agentDescription) {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'description',
                message: 'Briefly describe what this agent does:',
                default: 'A specialized agent for...',
            },
        ]);
        agentDescription = answers.description;
    }

    const agentsDir = path.join(process.cwd(), 'docs/ai/agents');
    const agentFile = path.join(agentsDir, `${agentName}.md`);

    await fs.ensureDir(agentsDir);

    if (await fs.pathExists(agentFile)) {
        console.error(chalk.red(`[ERROR] Agent already exists: ${agentFile}`));
        // Optional: Ask to overwrite
        process.exit(1);
    }

    const template = `---
name: "${agentName}"
description: "${agentDescription}"
version: "1.0.0"
capabilities:
  - "read_files"
  - "search_files"
context:
  files:
    - "docs/context.md"
  directories:
    - "src/"
env: []
---

# ${agentName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}

> **Purpose:** ${agentDescription}
> **Inherits:** [Base Agent](../.contextuate/agents/base.md)

## Role

Describe the specific role and improvements this agent provides.

## Specialized Rules

1. **Rule 1**: Description
2. **Rule 2**: Description

---
`;

    try {
        await fs.writeFile(agentFile, template);
        console.log(chalk.green(`[OK] Created agent: ${agentFile}`));
        console.log('');
        console.log('Next steps:');
        console.log(`1. Edit ${chalk.cyan(agentFile)} to refine rules and context.`);
        console.log(`2. Run it with: ${chalk.yellow(`contextuate run ${agentName}`)}`);
    } catch (error) {
        console.error(chalk.red('[ERROR] Failed to write agent file:'), error);
        process.exit(1);
    }
}
