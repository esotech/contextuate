#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { removeCommand } from './commands/remove';
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

program.parse();
