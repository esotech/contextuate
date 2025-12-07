"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitManager = void 0;
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const execAsync = util_1.default.promisify(child_process_1.exec);
class GitManager {
    constructor(cwd) {
        this.cwd = cwd;
    }
    async isGitRepo() {
        try {
            await execAsync('git rev-parse --is-inside-work-tree', { cwd: this.cwd });
            return true;
        }
        catch {
            return false;
        }
    }
    async getCurrentBranch() {
        const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: this.cwd });
        return stdout.trim();
    }
    async createWorktree(agentName, sessionId) {
        // Worktrees will be stored in .contextuate/worktrees/
        const worktreeDir = path_1.default.join(this.cwd, '.contextuate/worktrees', `${agentName}-${sessionId}`);
        const branchName = `agent/${agentName}/${sessionId}`;
        // Ensure parent dir exists
        await fs_extra_1.default.ensureDir(path_1.default.dirname(worktreeDir));
        // Create worktree with a new branch
        // -b creates the branch
        await execAsync(`git worktree add -b ${branchName} "${worktreeDir}"`, { cwd: this.cwd });
        return worktreeDir;
    }
    async removeWorktree(worktreePath, deleteBranch = false) {
        await execAsync(`git worktree remove "${worktreePath}" --force`, { cwd: this.cwd });
        if (deleteBranch) {
            // Extract branch name from path? Or pass it in.
            // For safety, maybe we don't auto-delete the branch by default so work is preserved.
        }
    }
    async commitChanges(worktreePath, message) {
        try {
            await execAsync('git add .', { cwd: worktreePath });
            // check if there are changes
            await execAsync(`git commit -m "${message}"`, { cwd: worktreePath });
        }
        catch (e) {
            // If nothing to commit, that's fine
            if (e.stdout && e.stdout.includes('nothing to commit')) {
                return;
            }
            throw e;
        }
    }
}
exports.GitManager = GitManager;
