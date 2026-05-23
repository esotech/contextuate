import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

interface JumpFile {
    src?: string;
    dest: string;
    symlinkTarget?: string;
}

// Get template source directory
function getTemplateSource(): string {
    let templateSource = path.join(__dirname, '../templates');

    // Handle ts-node vs compiled paths
    if (path.basename(path.join(__dirname, '..')) === 'src') {
        templateSource = path.join(__dirname, '../../src/templates');
    } else if (path.basename(__dirname) === 'commands') {
        templateSource = path.join(__dirname, '../templates');
    }

    if (!fs.existsSync(templateSource)) {
        templateSource = path.join(__dirname, '../../templates');
    }

    return templateSource;
}

export async function removeCommand(options: { force?: boolean } = {}) {
    console.log(chalk.blue('╔════════════════════════════════════════╗'));
    console.log(chalk.blue('║     Contextuate Cleanup                ║'));
    console.log(chalk.blue('╚════════════════════════════════════════╝'));
    console.log('');

    const templateSource = getTemplateSource();

    if (!fs.existsSync(templateSource)) {
        console.error(chalk.red(`[ERROR] Could not find template source at ${templateSource}`));
        return;
    }

    // Define jump files to check
    const jumpFiles: JumpFile[] = [
        { src: 'templates/platforms/AGENTS.md', dest: 'AGENTS.md' },
        { src: 'templates/platforms/CLAUDE.md', dest: 'CLAUDE.md', symlinkTarget: 'AGENTS.md' },
        { src: 'templates/platforms/GEMINI.md', dest: 'GEMINI.md', symlinkTarget: 'AGENTS.md' },
        { src: 'templates/platforms/clinerules.md', dest: '.clinerules/cline-memory-bank.md' },
        { src: 'templates/platforms/copilot.md', dest: '.github/copilot-instructions.md' },
        { src: 'templates/platforms/cursor.mdc', dest: '.cursor/rules/project.mdc' },
        { src: 'templates/platforms/windsurf.md', dest: '.windsurf/rules/project.md' },
        { src: 'templates/platforms/GEMINI.md', dest: '.gemini/rules.md' },
        { dest: '.claude/commands', symlinkTarget: '../docs/ai/commands' },
        { dest: '.claude/agents', symlinkTarget: '../docs/ai/agents' },
        { dest: '.claude/hooks', symlinkTarget: '../docs/ai/hooks' },
        { dest: '.claude/skills', symlinkTarget: '../docs/ai/skills' },
        { dest: '.claude/.contextuate', symlinkTarget: '../docs/ai/.contextuate' },
    ];

    const calculateHash = async (filePath: string): Promise<string> => {
        const content = await fs.readFile(filePath);
        return crypto.createHash('sha256').update(content).digest('hex');
    };

    const cleanupEmptyParentDirs = async (destPath: string) => {
        const projectRoot = process.cwd();
        let dir = path.dirname(destPath);

        while (dir !== projectRoot && dir.startsWith(projectRoot)) {
            const files = await fs.readdir(dir);
            if (files.length > 0) {
                break;
            }

            await fs.remove(dir);
            console.log(chalk.gray(`[CLEAN] Removed empty directory: ${path.relative(projectRoot, dir)}`));
            dir = path.dirname(dir);
        }
    };

    console.log(chalk.blue('[INFO] Checking for unmodified jump files...'));

    for (const file of jumpFiles) {
        const templatePath = file.src ? path.join(templateSource, file.src) : null;
        const destPath = path.resolve(file.dest);

        if (fs.existsSync(destPath)) {
            const stat = await fs.lstat(destPath);

            if (stat.isSymbolicLink() && file.symlinkTarget) {
                const target = await fs.readlink(destPath);
                if (target === file.symlinkTarget || options.force) {
                    await fs.remove(destPath);
                    console.log(chalk.green(`[OK] Removed symlink: ${file.dest}`));
                    await cleanupEmptyParentDirs(destPath);
                } else {
                    console.log(chalk.yellow(`[SKIP] Kept (different symlink target): ${file.dest}`));
                }
                continue;
            }

            if (templatePath && fs.existsSync(templatePath)) {
                try {
                    const templateHash = await calculateHash(templatePath);
                    const destHash = await calculateHash(destPath);

                    if (templateHash === destHash || options.force) {
                        await fs.remove(destPath);
                        console.log(chalk.green(`[OK] Removed (unmodified): ${file.dest}`));
                        await cleanupEmptyParentDirs(destPath);
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
}
