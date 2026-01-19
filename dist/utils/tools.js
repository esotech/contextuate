"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectRipgrep = detectRipgrep;
exports.detectTools = detectTools;
exports.detectPlatform = detectPlatform;
exports.installRipgrep = installRipgrep;
exports.promptInstallTools = promptInstallTools;
exports.processTemplateVariables = processTemplateVariables;
exports.processTemplateDirectory = processTemplateDirectory;
exports.readContextuateConfig = readContextuateConfig;
exports.writeContextuateConfig = writeContextuateConfig;
exports.printToolStatus = printToolStatus;
const child_process_1 = require("child_process");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
/**
 * Detect if a command exists and get its path
 */
function detectCommand(command) {
    try {
        const result = (0, child_process_1.execSync)(`which ${command}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
        return { exists: true, path: result.trim() };
    }
    catch {
        return { exists: false, path: null };
    }
}
/**
 * Get ripgrep version
 */
function getRipgrepVersion(rgPath) {
    try {
        const result = (0, child_process_1.execSync)(`"${rgPath}" --version`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
        const match = result.match(/ripgrep\s+(\d+\.\d+\.\d+)/);
        return match ? match[1] : null;
    }
    catch {
        return null;
    }
}
/**
 * Detect ripgrep installation
 */
function detectRipgrep() {
    const detection = detectCommand('rg');
    if (!detection.exists) {
        return { installed: false, version: null, path: null };
    }
    const version = getRipgrepVersion(detection.path);
    return {
        installed: true,
        version,
        path: detection.path
    };
}
/**
 * Detect all tools
 */
function detectTools() {
    return {
        ripgrep: detectRipgrep()
    };
}
/**
 * Detect the current operating system and package manager
 */
function detectPlatform() {
    const platform = os_1.default.platform();
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
async function installRipgrep() {
    const platform = detectPlatform();
    let installCommand;
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
            console.log(chalk_1.default.yellow('[WARN] No supported package manager found.'));
            console.log(chalk_1.default.blue('[INFO] Please install ripgrep manually:'));
            console.log(chalk_1.default.gray('  - macOS: brew install ripgrep'));
            console.log(chalk_1.default.gray('  - Ubuntu/Debian: sudo apt install ripgrep'));
            console.log(chalk_1.default.gray('  - Fedora: sudo dnf install ripgrep'));
            console.log(chalk_1.default.gray('  - Arch: sudo pacman -S ripgrep'));
            console.log(chalk_1.default.gray('  - Windows: choco install ripgrep'));
            console.log(chalk_1.default.gray('  - Or download from: https://github.com/BurntSushi/ripgrep/releases'));
            return false;
    }
    console.log(chalk_1.default.blue(`[INFO] Installing ripgrep via ${platform.packageManager}...`));
    console.log(chalk_1.default.gray(`  Running: ${installCommand}`));
    return new Promise((resolve) => {
        (0, child_process_1.exec)(installCommand, (error, stdout, stderr) => {
            if (error) {
                console.log(chalk_1.default.red(`[ERROR] Installation failed: ${error.message}`));
                if (stderr) {
                    console.log(chalk_1.default.gray(stderr));
                }
                resolve(false);
            }
            else {
                console.log(chalk_1.default.green('[OK] ripgrep installed successfully'));
                resolve(true);
            }
        });
    });
}
/**
 * Prompt user to install missing tools
 */
async function promptInstallTools(tools, nonInteractive = false) {
    // Check ripgrep
    if (!tools.ripgrep.installed && !nonInteractive) {
        const { installRg } = await inquirer_1.default.prompt([
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
function processTemplateVariables(content, tools) {
    // Replace {grep} with rg if ripgrep is installed, otherwise grep
    const grepCommand = tools.ripgrep.installed ? 'rg' : 'grep';
    return content.replace(/\{grep\}/g, grepCommand);
}
/**
 * Process template variables in all files in a directory
 */
async function processTemplateDirectory(dir, tools) {
    let processedCount = 0;
    if (!fs_extra_1.default.existsSync(dir)) {
        return processedCount;
    }
    const processDir = async (currentDir) => {
        const entries = await fs_extra_1.default.readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path_1.default.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                await processDir(fullPath);
            }
            else if (entry.isFile() && entry.name.endsWith('.md')) {
                const content = await fs_extra_1.default.readFile(fullPath, 'utf-8');
                const processed = processTemplateVariables(content, tools);
                if (content !== processed) {
                    await fs_extra_1.default.writeFile(fullPath, processed);
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
async function readContextuateConfig(installDir) {
    const configPath = path_1.default.join(installDir, 'contextuate.json');
    try {
        if (fs_extra_1.default.existsSync(configPath)) {
            const content = await fs_extra_1.default.readFile(configPath, 'utf-8');
            return JSON.parse(content);
        }
    }
    catch {
        // Config doesn't exist or is invalid
    }
    return null;
}
/**
 * Write contextuate.json config
 */
async function writeContextuateConfig(installDir, config) {
    const configPath = path_1.default.join(installDir, 'contextuate.json');
    await fs_extra_1.default.writeFile(configPath, JSON.stringify(config, null, 2));
}
/**
 * Print tool status
 */
function printToolStatus(tools) {
    console.log('');
    console.log(chalk_1.default.blue('[INFO] Tool Status:'));
    if (tools.ripgrep.installed) {
        console.log(chalk_1.default.green(`  [OK] ripgrep: ${tools.ripgrep.path} (v${tools.ripgrep.version})`));
    }
    else {
        console.log(chalk_1.default.yellow('  [--] ripgrep: not installed (using grep fallback)'));
    }
}
