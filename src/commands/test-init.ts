import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { initCommand } from './init';

interface TestInitOptions {
    force?: boolean;
}

const FIXTURE_DIR = 'contextuate-test';

export async function testInitCommand(platforms: string[] = [], options: TestInitOptions = {}): Promise<void> {
    const originalCwd = process.cwd();
    const fixturePath = path.join(originalCwd, FIXTURE_DIR);

    if (path.resolve(fixturePath) === path.resolve(originalCwd)) {
        throw new Error('Refusing to use the current working directory as the init test fixture.');
    }

    console.log(chalk.blue(`[INFO] Recreating init test fixture: ${fixturePath}`));
    await fs.remove(fixturePath);
    await fs.ensureDir(fixturePath);
    await fs.writeFile(
        path.join(fixturePath, 'package.json'),
        JSON.stringify({ name: FIXTURE_DIR, private: true }, null, 2) + '\n'
    );

    try {
        process.chdir(fixturePath);
        await initCommand(platforms, { force: options.force });
    } finally {
        process.chdir(originalCwd);
    }

    console.log('');
    console.log(chalk.green(`[OK] Init test fixture ready: ${FIXTURE_DIR}/`));
}
