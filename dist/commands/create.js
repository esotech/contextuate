"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAgentCommand = createAgentCommand;
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
async function createAgentCommand(name, options) {
    console.log(chalk_1.default.blue('╔════════════════════════════════════════╗'));
    console.log(chalk_1.default.blue('║     Contextuate Agent Creator          ║'));
    console.log(chalk_1.default.blue('╚════════════════════════════════════════╝'));
    console.log('');
    let agentName = name;
    let agentDescription = options.description;
    // Prompt for name if not provided
    if (!agentName) {
        const answers = await inquirer_1.default.prompt([
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
        const answers = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'description',
                message: 'Briefly describe what this agent does:',
                default: 'A specialized agent for...',
            },
        ]);
        agentDescription = answers.description;
    }
    const agentsDir = path_1.default.join(process.cwd(), 'docs/ai/agents');
    const agentFile = path_1.default.join(agentsDir, `${agentName}.agent.md`);
    await fs_extra_1.default.ensureDir(agentsDir);
    if (await fs_extra_1.default.pathExists(agentFile)) {
        console.error(chalk_1.default.red(`[ERROR] Agent already exists: ${agentFile}`));
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
> **Inherits:** [Base Agent](../.contextuate/agents/base.agent.md)

## Role

Describe the specific role and improvements this agent provides.

## Specialized Rules

1. **Rule 1**: Description
2. **Rule 2**: Description

---
`;
    try {
        await fs_extra_1.default.writeFile(agentFile, template);
        console.log(chalk_1.default.green(`[OK] Created agent: ${agentFile}`));
        console.log('');
        console.log('Next steps:');
        console.log(`1. Edit ${chalk_1.default.cyan(agentFile)} to refine rules and context.`);
        console.log(`2. Run it with: ${chalk_1.default.yellow(`contextuate run ${agentName}`)}`);
    }
    catch (error) {
        console.error(chalk_1.default.red('[ERROR] Failed to write agent file:'), error);
        process.exit(1);
    }
}
