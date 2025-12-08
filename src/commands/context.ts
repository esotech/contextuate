import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import { generateFileTree, estimateTokens } from '../utils/tokens';

export async function addContextCommand() {
    console.log(chalk.blue('[INFO] Interactive Context Creator'));

    const contextFile = path.join(process.cwd(), 'docs/ai/context.md');

    if (!await fs.pathExists(contextFile)) {
        console.error(chalk.red(`[ERROR] context.md not found at ${contextFile}`));
        console.log(chalk.yellow('Run "contextuate init" first.'));
        return;
    }

    // 1. Scan for files
    // In a real app we'd need a more robust file picker or fuzzy search
    // For now we will just list files in root and src (depth 2) to pick from
    // or allow typing a path.

    const { action } = await inquirer.prompt([
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

    if (action === 'cancel') return;

    if (action === 'path') {
        const { filePath } = await inquirer.prompt([
            {
                type: 'input',
                name: 'filePath',
                message: 'Enter relative path to file (e.g. src/index.ts):',
                validate: async (input) => {
                    if (!await fs.pathExists(path.join(process.cwd(), input))) {
                        return 'File does not exist';
                    }
                    return true;
                }
            }
        ]);

        await appendToContext(contextFile, filePath);
    }
}

async function appendToContext(contextFile: string, targetFile: string) {
    const content = await fs.readFile(targetFile, 'utf-8');
    const tokens = estimateTokens(content);

    console.log(`Analyzing ${targetFile}... (~${tokens} tokens)`);

    // Check if valid to add
    if (tokens > 5000) {
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: `This file is large (~${tokens} tokens). Are you sure you want to add it?`,
                default: false
            }
        ]);
        if (!confirm) return;
    }

    const docEntry = `
## [File: ${targetFile}](file:///${path.resolve(targetFile)})
\`\`\`${path.extname(targetFile).substring(1) || 'text'}
${content}
\`\`\`
`;

    await fs.appendFile(contextFile, docEntry);
    console.log(chalk.green(`[OK] Added ${targetFile} to context.md`));
}
