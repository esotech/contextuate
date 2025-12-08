import fs from 'fs-extra';
import path from 'path';

/**
 * Estimates the number of tokens in a string.
 * Uses a simple heuristic: ~4 characters per token for English text/code.
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Generates a compact file tree representation of a directory.
 * Respects .gitignore via a simple filter (can be enhanced).
 */
export async function generateFileTree(dir: string, maxDepth: number = 5): Promise<string> {
    const lines: string[] = [];

    // Load gitignore if present
    const gitignorePath = path.join(dir, '.gitignore');
    let ignorePatterns: string[] = ['.git', 'node_modules', 'dist', 'coverage', '.DS_Store'];

    if (await fs.pathExists(gitignorePath)) {
        const content = await fs.readFile(gitignorePath, 'utf-8');
        const userIgnores = content.split('\n')
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('#'));
        ignorePatterns = [...ignorePatterns, ...userIgnores];
    }

    const isIgnored = (name: string): boolean => {
        // Very basic glob matching for common patterns
        return ignorePatterns.some(pattern => {
            const cleanPattern = pattern.replace(/\/$/, '').replace(/^\//, '');
            if (pattern.startsWith('*')) return name.endsWith(pattern.slice(1));
            if (pattern.endsWith('*')) return name.startsWith(pattern.slice(0, -1));
            return name === cleanPattern || matchGlob(name, cleanPattern);
        });
    };

    // Helper for simple glob matching
    const matchGlob = (str: string, glob: string): boolean => {
        const regex = new RegExp('^' + glob.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
        return regex.test(str);
    }

    async function traverse(currentDir: string, currentDepth: number, prefix: string = '') {
        if (currentDepth > maxDepth) return;

        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        // Sort: directories first, then files
        entries.sort((a, b) => {
            if (a.isDirectory() === b.isDirectory()) return a.name.localeCompare(b.name);
            return a.isDirectory() ? -1 : 1;
        });

        const filtered = entries.filter(e => !isIgnored(e.name));

        for (let i = 0; i < filtered.length; i++) {
            const entry = filtered[i];
            const isLast = i === filtered.length - 1;
            const marker = isLast ? '└── ' : '├── ';

            lines.push(`${prefix}${marker}${entry.name}${entry.isDirectory() ? '/' : ''}`);

            if (entry.isDirectory()) {
                const newPrefix = prefix + (isLast ? '    ' : '│   ');
                await traverse(path.join(currentDir, entry.name), currentDepth + 1, newPrefix);
            }
        }
    }

    lines.push(path.basename(dir) + '/');
    await traverse(dir, 1);

    return lines.join('\n');
}
