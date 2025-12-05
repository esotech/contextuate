#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const init_1 = require("./commands/init");
const remove_1 = require("./commands/remove");
const fs_1 = require("fs");
const path_1 = require("path");
const program = new commander_1.Command();
// Try to read version from package.json
let version = '0.0.0';
try {
    const packageJson = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(__dirname, '../package.json'), 'utf-8'));
    version = packageJson.version;
}
catch (error) {
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
    .action(init_1.initCommand);
program
    .command('remove')
    .description('Remove unmodified platform jump files')
    .action(remove_1.removeCommand);
program.parse();
