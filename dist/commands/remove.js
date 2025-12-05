"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeCommand = removeCommand;
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
async function removeCommand(options) {
    console.log(chalk_1.default.blue('╔════════════════════════════════════════╗'));
    console.log(chalk_1.default.blue('║     Contextuate Cleanup                ║'));
    console.log(chalk_1.default.blue('╚════════════════════════════════════════╝'));
    console.log('');
    // Define source directory for templates
    let templateSource = path_1.default.join(__dirname, '../../docs/ai/.contextuate');
    if (!fs_extra_1.default.existsSync(templateSource)) {
        templateSource = path_1.default.join(__dirname, '../../../docs/ai/.contextuate');
    }
    if (!fs_extra_1.default.existsSync(templateSource)) {
        console.error(chalk_1.default.red(`[ERROR] Could not find template source at ${templateSource}`));
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
    const calculateHash = async (filePath) => {
        const content = await fs_extra_1.default.readFile(filePath);
        return crypto_1.default.createHash('sha256').update(content).digest('hex');
    };
    console.log(chalk_1.default.blue('[INFO] Checking for unmodified jump files...'));
    for (const file of jumpFiles) {
        const templatePath = path_1.default.join(templateSource, file.src);
        const destPath = path_1.default.resolve(file.dest);
        if (fs_extra_1.default.existsSync(destPath)) {
            if (fs_extra_1.default.existsSync(templatePath)) {
                try {
                    const templateHash = await calculateHash(templatePath);
                    const destHash = await calculateHash(destPath);
                    if (templateHash === destHash) {
                        await fs_extra_1.default.remove(destPath);
                        console.log(chalk_1.default.green(`[OK] Removed (unmodified): ${file.dest}`));
                        // Clean up empty parent directories if applicable
                        const dir = path_1.default.dirname(destPath);
                        if (dir !== process.cwd()) {
                            const files = await fs_extra_1.default.readdir(dir);
                            if (files.length === 0) {
                                await fs_extra_1.default.remove(dir);
                                console.log(chalk_1.default.gray(`[CLEAN] Removed empty directory: ${path_1.default.relative(process.cwd(), dir)}`));
                            }
                        }
                    }
                    else {
                        console.log(chalk_1.default.yellow(`[SKIP] Kept (modified): ${file.dest}`));
                    }
                }
                catch (error) {
                    console.error(chalk_1.default.red(`[ERROR] Failed to process ${file.dest}: ${error}`));
                }
            }
            else {
                console.warn(chalk_1.default.yellow(`[WARN] Template not found for comparison: ${file.src}`));
            }
        }
    }
    console.log('');
    console.log(chalk_1.default.green('Cleanup complete!'));
}
