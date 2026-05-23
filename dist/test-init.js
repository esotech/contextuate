#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const test_init_1 = require("./commands/test-init");
const program = new commander_1.Command();
program
    .name('contextuate-test')
    .description('Recreate ./contextuate-test and run contextuate init inside it.')
    .argument('[platforms...]', 'Platforms to pass to contextuate init, such as "all" or "claude gemini"')
    .option('-f, --force', 'Pass --force to contextuate init')
    .action(test_init_1.testInitCommand);
program.parse();
