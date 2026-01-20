"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.doctorCommand = doctorCommand;
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const tools_1 = require("../utils/tools");
async function doctorCommand(options = {}) {
    console.log(chalk_1.default.blue('╔════════════════════════════════════════╗'));
    console.log(chalk_1.default.blue('║     Contextuate Doctor                 ║'));
    console.log(chalk_1.default.blue('╚════════════════════════════════════════╝'));
    console.log('');
    const installDir = 'docs/ai/.contextuate';
    // Check if Contextuate is installed
    if (!fs_extra_1.default.existsSync(installDir)) {
        console.log(chalk_1.default.red('[ERROR] Contextuate is not installed in this project.'));
        console.log(chalk_1.default.gray('  Run: contextuate init'));
        return;
    }
    // Read existing config
    let config = await (0, tools_1.readContextuateConfig)(installDir);
    const configExists = config !== null;
    if (!configExists) {
        console.log(chalk_1.default.yellow('[WARN] contextuate.json not found. Will create one.'));
    }
    // Detect tools
    console.log(chalk_1.default.blue('[INFO] Checking tool availability...'));
    let tools = (0, tools_1.detectTools)();
    (0, tools_1.printToolStatus)(tools);
    // Offer to install missing tools if --install flag or interactive
    if (options.install || options.fix) {
        tools = await (0, tools_1.promptInstallTools)(tools, false);
    }
    else if (!tools.ripgrep.installed) {
        console.log('');
        console.log(chalk_1.default.gray('  Tip: Run "contextuate doctor --install" to install missing tools'));
    }
    // Update or create config
    console.log('');
    console.log(chalk_1.default.blue('[INFO] Updating contextuate.json...'));
    const now = new Date().toISOString();
    if (config) {
        // Update existing config
        config.tools = tools;
        config.updated = now;
    }
    else {
        // Create new config - try to read version.json for migration
        const versionJsonPath = path_1.default.join(installDir, 'version.json');
        let pkgInfo = {
            name: '@esotech/contextuate',
            version: '0.0.0',
            description: 'AI Context Framework',
            repository: 'https://github.com/esotech/contextuate'
        };
        if (fs_extra_1.default.existsSync(versionJsonPath)) {
            try {
                const versionData = JSON.parse(await fs_extra_1.default.readFile(versionJsonPath, 'utf-8'));
                pkgInfo = {
                    name: versionData.name || pkgInfo.name,
                    version: versionData.version || pkgInfo.version,
                    description: versionData.description || pkgInfo.description,
                    repository: versionData.repository || pkgInfo.repository
                };
            }
            catch {
                // Use defaults
            }
        }
        config = {
            ...pkgInfo,
            initialized: now,
            updated: now,
            tools
        };
    }
    await (0, tools_1.writeContextuateConfig)(installDir, config);
    console.log(chalk_1.default.green('[OK] contextuate.json updated'));
    // Remove old version.json if it exists (migration)
    const versionJsonPath = path_1.default.join(installDir, 'version.json');
    if (fs_extra_1.default.existsSync(versionJsonPath)) {
        await fs_extra_1.default.remove(versionJsonPath);
        console.log(chalk_1.default.yellow('[CLEANUP] Removed legacy version.json (migrated to contextuate.json)'));
    }
    // Process template variables if --fix flag
    if (options.fix) {
        console.log('');
        console.log(chalk_1.default.blue('[INFO] Processing template variables...'));
        const agentsDir = 'docs/ai/agents';
        const frameworkAgentsDir = path_1.default.join(installDir, 'agents');
        let totalProcessed = 0;
        if (fs_extra_1.default.existsSync(agentsDir)) {
            const count = await (0, tools_1.processTemplateDirectory)(agentsDir, tools);
            totalProcessed += count;
        }
        if (fs_extra_1.default.existsSync(frameworkAgentsDir)) {
            const count = await (0, tools_1.processTemplateDirectory)(frameworkAgentsDir, tools);
            totalProcessed += count;
        }
        if (totalProcessed > 0) {
            console.log(chalk_1.default.green(`[OK] Updated template variables in ${totalProcessed} file(s)`));
        }
        else {
            console.log(chalk_1.default.gray('[--] No template variables to update'));
        }
    }
    // Summary
    console.log('');
    console.log(chalk_1.default.green('╔════════════════════════════════════════╗'));
    console.log(chalk_1.default.green('║     Doctor Check Complete              ║'));
    console.log(chalk_1.default.green('╚════════════════════════════════════════╝'));
    console.log('');
    // Report issues
    const issues = [];
    if (!tools.ripgrep.installed) {
        issues.push('ripgrep not installed (code search will use slower grep)');
    }
    if (issues.length > 0) {
        console.log(chalk_1.default.yellow('Issues found:'));
        issues.forEach(issue => console.log(chalk_1.default.yellow(`  - ${issue}`)));
        console.log('');
        console.log(chalk_1.default.gray('Run "contextuate doctor --fix" to attempt automatic fixes'));
    }
    else {
        console.log(chalk_1.default.green('All checks passed!'));
    }
    console.log('');
}
