#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { removeCommand } from './commands/remove';
import { runCommand } from './commands/run';
import { createAgentCommand } from './commands/create';
import { readFileSync } from 'fs';
import { join } from 'path';

const program = new Command();

// Try to read version from package.json
let version = '0.0.0';
try {
    const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
    version = packageJson.version;
} catch (error) {
    // Ignore error if package.json is not found (e.g. during development)
}

program
    .name('contextuate')
    .description('Standardized AI context framework for any project')
    .version(version);

program
    .command('init')
    .description('Initialize Contextuate in the current project')
    .option('-f, --force', 'Overwrite existing files')
    .action(initCommand);

program
    .command('remove')
    .description('Remove unmodified platform jump files')
    .action(removeCommand);

program
    .command('create-agent')
    .alias('new-agent')
    .description('Create a new agent definition')
    .argument('[name]', 'Name of the agent (kebab-case)')
    .option('-d, --description <text>', 'Description of the agent')
    .action(createAgentCommand);

program
    .command('run')
    .description('Run an agent definition')
    .argument('<agent>', 'Name of the agent to run (e.g. "documentation-expert")')
    .option('--dry-run', 'Simulate execution without running logic')
    .option('--isolation <mode>', 'Isolation mode (worktree, none)', 'none')
    .action(runCommand);

program.parse();
