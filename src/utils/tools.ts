import { execSync, exec } from 'child_process';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export interface ToolInfo {
    installed: boolean;
    version: string | null;
    path: string | null;
}

export interface ToolsConfig {
    ripgrep: ToolInfo;
}

export interface ContextuateConfig {
    name: string;
    version: string;
    description: string;
    repository: string;
    initialized: string;
    updated: string;
    tools: ToolsConfig;
}

/**
 * Detect if a command exists and get its path
 */
function detectCommand(command: string): { exists: boolean; path: string | null } {
    try {
        const result = execSync(`which ${command}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
        return { exists: true, path: result.trim() };
    } catch {
        return { exists: false, path: null };
    }
}

/**
 * Get ripgrep version
 */
function getRipgrepVersion(rgPath: string): string | null {
    try {
        const result = execSync(`"${rgPath}" --version`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
        const match = result.match(/ripgrep\s+(\d+\.\d+\.\d+)/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

/**
 * Detect ripgrep installation
 */
export function detectRipgrep(): ToolInfo {
    const detection = detectCommand('rg');
    if (!detection.exists) {
        return { installed: false, version: null, path: null };
    }

    const version = getRipgrepVersion(detection.path!);
    return {
        installed: true,
        version,
        path: detection.path
    };
}

/**
 * Detect all tools
 */
export function detectTools(): ToolsConfig {
    return {
        ripgrep: detectRipgrep()
    };
}

/**
 * Detect the current operating system and package manager
 */
export function detectPlatform(): { os: 'macos' | 'linux' | 'windows'; packageManager: string | null } {
    const platform = os.platform();

    if (platform === 'darwin') {
        // Check for Homebrew
        const brew = detectCommand('brew');
        return { os: 'macos', packageManager: brew.exists ? 'brew' : null };
    }

    if (platform === 'linux') {
        // Check for common package managers
        if (detectCommand('apt-get').exists) {
            return { os: 'linux', packageManager: 'apt' };
        }
        if (detectCommand('dnf').exists) {
            return { os: 'linux', packageManager: 'dnf' };
        }
        if (detectCommand('yum').exists) {
            return { os: 'linux', packageManager: 'yum' };
        }
        if (detectCommand('pacman').exists) {
            return { os: 'linux', packageManager: 'pacman' };
        }
        return { os: 'linux', packageManager: null };
    }

    if (platform === 'win32') {
        // Check for common Windows package managers
        if (detectCommand('choco').exists) {
            return { os: 'windows', packageManager: 'choco' };
        }
        if (detectCommand('winget').exists) {
            return { os: 'windows', packageManager: 'winget' };
        }
        return { os: 'windows', packageManager: null };
    }

    return { os: 'linux', packageManager: null };
}

/**
 * Install ripgrep using the appropriate package manager
 */
export async function installRipgrep(): Promise<boolean> {
    const platform = detectPlatform();

    let installCommand: string;

    switch (platform.packageManager) {
        case 'brew':
            installCommand = 'brew install ripgrep';
            break;
        case 'apt':
            installCommand = 'sudo apt-get install -y ripgrep';
            break;
        case 'dnf':
            installCommand = 'sudo dnf install -y ripgrep';
            break;
        case 'yum':
            installCommand = 'sudo yum install -y ripgrep';
            break;
        case 'pacman':
            installCommand = 'sudo pacman -S --noconfirm ripgrep';
            break;
        case 'choco':
            installCommand = 'choco install ripgrep -y';
            break;
        case 'winget':
            installCommand = 'winget install BurntSushi.ripgrep.MSVC';
            break;
        default:
            console.log(chalk.yellow('[WARN] No supported package manager found.'));
            console.log(chalk.blue('[INFO] Please install ripgrep manually:'));
            console.log(chalk.gray('  - macOS: brew install ripgrep'));
            console.log(chalk.gray('  - Ubuntu/Debian: sudo apt install ripgrep'));
            console.log(chalk.gray('  - Fedora: sudo dnf install ripgrep'));
            console.log(chalk.gray('  - Arch: sudo pacman -S ripgrep'));
            console.log(chalk.gray('  - Windows: choco install ripgrep'));
            console.log(chalk.gray('  - Or download from: https://github.com/BurntSushi/ripgrep/releases'));
            return false;
    }

    console.log(chalk.blue(`[INFO] Installing ripgrep via ${platform.packageManager}...`));
    console.log(chalk.gray(`  Running: ${installCommand}`));

    return new Promise((resolve) => {
        exec(installCommand, (error, stdout, stderr) => {
            if (error) {
                console.log(chalk.red(`[ERROR] Installation failed: ${error.message}`));
                if (stderr) {
                    console.log(chalk.gray(stderr));
                }
                resolve(false);
            } else {
                console.log(chalk.green('[OK] ripgrep installed successfully'));
                resolve(true);
            }
        });
    });
}

/**
 * Prompt user to install missing tools
 */
export async function promptInstallTools(tools: ToolsConfig, nonInteractive: boolean = false): Promise<ToolsConfig> {
    // Check ripgrep
    if (!tools.ripgrep.installed && !nonInteractive) {
        const { installRg } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'installRg',
                message: 'ripgrep (rg) is not installed. Would you like to install it? (Recommended for faster code search)',
                default: true,
            },
        ]);

        if (installRg) {
            const success = await installRipgrep();
            if (success) {
                // Re-detect after installation
                tools.ripgrep = detectRipgrep();
            }
        }
    }

    return tools;
}

/**
 * Process template variables in a file
 */
export function processTemplateVariables(content: string, tools: ToolsConfig): string {
    // Replace {grep} with rg if ripgrep is installed, otherwise grep
    const grepCommand = tools.ripgrep.installed ? 'rg' : 'grep';
    return content.replace(/\{grep\}/g, grepCommand);
}

/**
 * Process template variables in all files in a directory
 */
export async function processTemplateDirectory(dir: string, tools: ToolsConfig): Promise<number> {
    let processedCount = 0;

    if (!fs.existsSync(dir)) {
        return processedCount;
    }

    const processDir = async (currentDir: string) => {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                await processDir(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.md')) {
                const content = await fs.readFile(fullPath, 'utf-8');
                const processed = processTemplateVariables(content, tools);

                if (content !== processed) {
                    await fs.writeFile(fullPath, processed);
                    processedCount++;
                }
            }
        }
    };

    await processDir(dir);
    return processedCount;
}

/**
 * Read contextuate.json config
 */
export async function readContextuateConfig(installDir: string): Promise<ContextuateConfig | null> {
    const configPath = path.join(installDir, 'contextuate.json');
    try {
        if (fs.existsSync(configPath)) {
            const content = await fs.readFile(configPath, 'utf-8');
            return JSON.parse(content);
        }
    } catch {
        // Config doesn't exist or is invalid
    }
    return null;
}

/**
 * Write contextuate.json config
 */
export async function writeContextuateConfig(installDir: string, config: ContextuateConfig): Promise<void> {
    const configPath = path.join(installDir, 'contextuate.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

/**
 * Print tool status
 */
export function printToolStatus(tools: ToolsConfig): void {
    console.log('');
    console.log(chalk.blue('[INFO] Tool Status:'));

    if (tools.ripgrep.installed) {
        console.log(chalk.green(`  [OK] ripgrep: ${tools.ripgrep.path} (v${tools.ripgrep.version})`));
    } else {
        console.log(chalk.yellow('  [--] ripgrep: not installed (using grep fallback)'));
    }
}
