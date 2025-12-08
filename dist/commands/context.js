"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addContextCommand = addContextCommand;
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const inquirer_1 = __importDefault(require("inquirer"));
const tokens_1 = require("../utils/tokens");
async function addContextCommand() {
    console.log(chalk_1.default.blue('[INFO] Interactive Context Creator'));
    const contextFile = path_1.default.join(process.cwd(), 'docs/ai/context.md');
    if (!await fs_extra_1.default.pathExists(contextFile)) {
        console.error(chalk_1.default.red(`[ERROR] context.md not found at ${contextFile}`));
        console.log(chalk_1.default.yellow('Run "contextuate init" first.'));
        return;
    }
    // 1. Scan for files
    // In a real app we'd need a more robust file picker or fuzzy search
    // For now we will just list files in root and src (depth 2) to pick from
    // or allow typing a path.
    const { action } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
                { name: 'Add specific file by path', value: 'path' },
                // { name: 'Select from list (root)', value: 'select' }, // Hard to implement well without a huge list
                { name: 'Cancel', value: 'cancel' }
            ]
        }
    ]);
    if (action === 'cancel')
        return;
    if (action === 'path') {
        const { filePath } = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'filePath',
                message: 'Enter relative path to file (e.g. src/index.ts):',
                validate: async (input) => {
                    if (!await fs_extra_1.default.pathExists(path_1.default.join(process.cwd(), input))) {
                        return 'File does not exist';
                    }
                    return true;
                }
            }
        ]);
        await appendToContext(contextFile, filePath);
    }
}
async function appendToContext(contextFile, targetFile) {
    const content = await fs_extra_1.default.readFile(targetFile, 'utf-8');
    const tokens = (0, tokens_1.estimateTokens)(content);
    console.log(`Analyzing ${targetFile}... (~${tokens} tokens)`);
    // Check if valid to add
    if (tokens > 5000) {
        const { confirm } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: `This file is large (~${tokens} tokens). Are you sure you want to add it?`,
                default: false
            }
        ]);
        if (!confirm)
            return;
    }
    const docEntry = `
## [File: ${targetFile}](file:///${path_1.default.resolve(targetFile)})
\`\`\`${path_1.default.extname(targetFile).substring(1) || 'text'}
${content}
\`\`\`
`;
    await fs_extra_1.default.appendFile(contextFile, docEntry);
    console.log(chalk_1.default.green(`[OK] Added ${targetFile} to context.md`));
}
