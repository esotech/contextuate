import { exec } from 'child_process';
import util from 'util';
import fs from 'fs-extra';
import path from 'path';

const execAsync = util.promisify(exec);

export class GitManager {
    private cwd: string;

    constructor(cwd: string) {
        this.cwd = cwd;
    }

    async isGitRepo(): Promise<boolean> {
        try {
            await execAsync('git rev-parse --is-inside-work-tree', { cwd: this.cwd });
            return true;
        } catch {
            return false;
        }
    }

    async getCurrentBranch(): Promise<string> {
        const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: this.cwd });
        return stdout.trim();
    }

    async createWorktree(agentName: string, sessionId: string): Promise<string> {
        // Worktrees will be stored in .contextuate/worktrees/
        const worktreeDir = path.join(this.cwd, '.contextuate/worktrees', `${agentName}-${sessionId}`);
        const branchName = `agent/${agentName}/${sessionId}`;

        // Ensure parent dir exists
        await fs.ensureDir(path.dirname(worktreeDir));

        // Create worktree with a new branch
        // -b creates the branch
        await execAsync(`git worktree add -b ${branchName} "${worktreeDir}"`, { cwd: this.cwd });

        return worktreeDir;
    }

    async removeWorktree(worktreePath: string, deleteBranch: boolean = false): Promise<void> {
        await execAsync(`git worktree remove "${worktreePath}" --force`, { cwd: this.cwd });

        if (deleteBranch) {
            // Extract branch name from path? Or pass it in.
            // For safety, maybe we don't auto-delete the branch by default so work is preserved.
        }
    }

    async commitChanges(worktreePath: string, message: string): Promise<void> {
        try {
            await execAsync('git add .', { cwd: worktreePath });
            // check if there are changes
            await execAsync(`git commit -m "${message}"`, { cwd: worktreePath });
        } catch (e: any) {
            // If nothing to commit, that's fine
            if (e.stdout && e.stdout.includes('nothing to commit')) {
                return;
            }
            throw e;
        }
    }
}
