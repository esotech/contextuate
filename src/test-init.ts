#!/usr/bin/env node

import { Command } from 'commander';
import { testInitCommand } from './commands/test-init';

const program = new Command();

program
    .name('contextuate-test')
    .description('Recreate ./contextuate-test and run contextuate init inside it.')
    .argument('[platforms...]', 'Platforms to pass to contextuate init, such as "all" or "claude gemini"')
    .option('-f, --force', 'Pass --force to contextuate init')
    .action(testInitCommand);

program.parse();
