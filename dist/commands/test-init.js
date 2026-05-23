"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testInitCommand = testInitCommand;
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const init_1 = require("./init");
const FIXTURE_DIR = 'contextuate-test';
async function testInitCommand(platforms = [], options = {}) {
    const originalCwd = process.cwd();
    const fixturePath = path_1.default.join(originalCwd, FIXTURE_DIR);
    if (path_1.default.resolve(fixturePath) === path_1.default.resolve(originalCwd)) {
        throw new Error('Refusing to use the current working directory as the init test fixture.');
    }
    console.log(chalk_1.default.blue(`[INFO] Recreating init test fixture: ${fixturePath}`));
    await fs_extra_1.default.remove(fixturePath);
    await fs_extra_1.default.ensureDir(fixturePath);
    await fs_extra_1.default.writeFile(path_1.default.join(fixturePath, 'package.json'), JSON.stringify({ name: FIXTURE_DIR, private: true }, null, 2) + '\n');
    try {
        process.chdir(fixturePath);
        await (0, init_1.initCommand)(platforms, { force: options.force });
    }
    finally {
        process.chdir(originalCwd);
    }
    console.log('');
    console.log(chalk_1.default.green(`[OK] Init test fixture ready: ${FIXTURE_DIR}/`));
}
