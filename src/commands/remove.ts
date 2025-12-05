import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

export async function removeCommand(options: { force?: boolean }) {
    console.log(chalk.blue('╔════════════════════════════════════════╗'));
    console.log(chalk.blue('║     Contextuate Cleanup                ║'));
    console.log(chalk.blue('╚════════════════════════════════════════╝'));
    console.log('');

    // Define source directory for templates
    let templateSource = path.join(__dirname, '../../docs/ai/.context');
    if (!fs.existsSync(templateSource)) {
        templateSource = path.join(__dirname, '../../../docs/ai/.context');
    }

    if (!fs.existsSync(templateSource)) {
        console.error(chalk.red(`[ERROR] Could not find template source at ${templateSource}`));
        return;
    }

    // Define jump files to check
    const jumpFiles = [
        { src: 'templates/platforms/CLAUDE.md', dest: 'CLAUDE.md' },
        { src: 'templates/platforms/AGENTS.md', dest: 'AGENTS.md' },
        { src: 'templates/platforms/GEMINI.md', dest: 'GEMINI.md' },
        { src: 'templates/platforms/clinerules.md', dest: '.clinerules/cline-memory-bank.md' },
        { src: 'templates/platforms/copilot.md', dest: '.github/copilot-instructions.md' },
        { src: 'templates/platforms/cursor.mdc', dest: '.cursor/rules/project.mdc' },
        { src: 'templates/platforms/windsurf.md', dest: '.windsurf/rules/project.md' },
        { src: 'templates/platforms/antigravity.md', dest: '.antigravity/rules.md' },
    ];

    const calculateHash = async (filePath: string): Promise<string> => {
        const content = await fs.readFile(filePath);
        return crypto.createHash('sha256').update(content).digest('hex');
    };

    console.log(chalk.blue('[INFO] Checking for unmodified jump files...'));

    for (const file of jumpFiles) {
        const templatePath = path.join(templateSource, file.src);
        const destPath = path.resolve(file.dest);

        if (fs.existsSync(destPath)) {
            if (fs.existsSync(templatePath)) {
                try {
                    const templateHash = await calculateHash(templatePath);
                    const destHash = await calculateHash(destPath);

                    if (templateHash === destHash) {
                        await fs.remove(destPath);
                        console.log(chalk.green(`[OK] Removed (unmodified): ${file.dest}`));

                        // Clean up empty parent directories if applicable
                        const dir = path.dirname(destPath);
                        if (dir !== process.cwd()) {
                            const files = await fs.readdir(dir);
                            if (files.length === 0) {
                                await fs.remove(dir);
                                console.log(chalk.gray(`[CLEAN] Removed empty directory: ${path.relative(process.cwd(), dir)}`));
                            }
                        }
                    } else {
                        console.log(chalk.yellow(`[SKIP] Kept (modified): ${file.dest}`));
                    }
                } catch (error) {
                    console.error(chalk.red(`[ERROR] Failed to process ${file.dest}: ${error}`));
                }
            } else {
                console.warn(chalk.yellow(`[WARN] Template not found for comparison: ${file.src}`));
            }
        }
    }

    console.log('');
    console.log(chalk.green('Cleanup complete!'));
    console.log('');
}
