#!/usr/bin/env node

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function assertIncludes(file, expected) {
  const content = read(file);
  assert(
    content.includes(expected),
    `${file} should include ${JSON.stringify(expected)}`
  );
}

function assertFilesMatch(source, generated) {
  assert.strictEqual(
    read(generated),
    read(source),
    `${generated} should match ${source}; run npm run build`
  );
}

function testInitUsesAgentsMdAsOnlyRootBootstrapFile() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'contextuate-init-'));

  try {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{"name":"fixture"}\n');

    const output = childProcess.execFileSync(
      process.execPath,
      [path.join(root, 'dist/index.js'), 'init', 'all', '--force'],
      {
        cwd: tmpDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    const agentsMd = fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf8');
    assert.strictEqual(
      agentsMd,
      read('src/templates/templates/platforms/AGENTS.md'),
      'init should install AGENTS.md from the primary platform template'
    );

    for (const relativePath of [
      'CLAUDE.md',
      'GEMINI.md',
      '.gemini/rules.md',
      '.clinerules/cline-memory-bank.md',
      '.cursor/rules/project.mdc',
      '.github/copilot-instructions.md',
      '.windsurf/rules/project.md',
    ]) {
      assert(
        !fs.existsSync(path.join(tmpDir, relativePath)),
        `init should not create ${relativePath}; AGENTS.md is the master file`
      );
    }
    assert(
      agentsMd.includes('merge any unique') && agentsMd.includes('instructions into this AGENTS.md file'),
      'AGENTS.md should tell agents to consolidate legacy bootstrap instructions'
    );
    assert(
      !output.includes('Existing AI bootstrap files detected'),
      'init should not report the canonical AGENTS.md file as a legacy bootstrap file'
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function testInitPreservesExistingBootstrapFilesAndWarnsToMerge() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'contextuate-merge-'));

  try {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{"name":"fixture"}\n');
    fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), 'Use pnpm for package scripts.\n');
    fs.writeFileSync(path.join(tmpDir, 'GEMINI.md'), 'Prefer small pull requests.\n');

    const output = childProcess.execFileSync(
      process.execPath,
      [path.join(root, 'dist/index.js'), 'init', 'claude', 'gemini', '--force'],
      {
        cwd: tmpDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    assert.strictEqual(
      fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8'),
      'Use pnpm for package scripts.\n',
      'init should preserve existing CLAUDE.md for manual consolidation'
    );
    assert.strictEqual(
      fs.readFileSync(path.join(tmpDir, 'GEMINI.md'), 'utf8'),
      'Prefer small pull requests.\n',
      'init should preserve existing GEMINI.md for manual consolidation'
    );
    assert(
      output.includes('Existing AI bootstrap files detected'),
      'init output should flag existing bootstrap files'
    );
    assert(
      output.includes('merge any unique rules into AGENTS.md'),
      'init output should instruct agents/users to merge legacy rules into AGENTS.md'
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function testRemoveCleansGeneratedAndLegacyPlatformAdapters() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'contextuate-remove-'));

  try {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{"name":"fixture"}\n');

    childProcess.execFileSync(
      process.execPath,
      [path.join(root, 'dist/index.js'), 'init', 'claude', 'gemini', '--force'],
      {
        cwd: tmpDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    fs.symlinkSync('AGENTS.md', path.join(tmpDir, 'CLAUDE.md'));
    fs.symlinkSync('AGENTS.md', path.join(tmpDir, 'GEMINI.md'));
    childProcess.execFileSync(
      process.execPath,
      [path.join(root, 'dist/index.js'), 'remove'],
      {
        cwd: tmpDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    for (const relativePath of [
      'AGENTS.md',
      'CLAUDE.md',
      'GEMINI.md',
      '.claude/commands',
      '.claude/agents',
      '.claude/hooks',
      '.claude/skills',
      '.claude/.contextuate',
    ]) {
      assert(
        !fs.existsSync(path.join(tmpDir, relativePath)),
        `remove should clean generated platform adapter ${relativePath}`
      );
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function testContextuateTestBinRecreatesInitFixtureDirectory() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'contextuate-test-bin-'));

  try {
    const fixtureDir = path.join(tmpDir, 'contextuate-test');
    fs.mkdirSync(fixtureDir);
    fs.writeFileSync(path.join(fixtureDir, 'stale.txt'), 'stale fixture content\n');

    childProcess.execFileSync(
      process.execPath,
      [path.join(root, 'dist/test-init.js'), 'all', '--force'],
      {
        cwd: tmpDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    assert(
      fs.existsSync(path.join(fixtureDir, 'AGENTS.md')),
      'contextuate-test should run init inside ./contextuate-test'
    );
    assert(
      fs.existsSync(path.join(fixtureDir, 'docs/ai/.contextuate/contextuate.md')),
      'contextuate-test should install framework files in the fixture'
    );
    assert(
      !fs.existsSync(path.join(fixtureDir, 'stale.txt')),
      'contextuate-test should delete stale fixture contents before running init'
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function testPackageVersionsMatch() {
  const packageJson = readJson('package.json');
  const packageLock = readJson('package-lock.json');

  assert.strictEqual(
    packageLock.version,
    packageJson.version,
    'package-lock.json root version should match package.json'
  );
  assert.strictEqual(
    packageLock.packages[''].version,
    packageJson.version,
    'package-lock.json package entry version should match package.json'
  );
  assert.strictEqual(
    packageJson.scripts.test,
    'node test/template-readiness.test.js',
    'npm test should run the template readiness checks'
  );
  assert.deepStrictEqual(
    packageJson.files,
    ['dist'],
    'package files should publish the built dist output only'
  );
  assert.strictEqual(
    packageJson.bin['contextuate-test'],
    'dist/test-init.js',
    'package should expose the development init fixture runner'
  );
  assert.strictEqual(
    packageLock.packages[''].bin['contextuate-test'],
    'dist/test-init.js',
    'package-lock should expose the development init fixture runner'
  );
}

function testInterviewTemplatesArePackaged() {
  assertFilesMatch(
    'src/templates/agents/sibyl.md',
    'dist/templates/agents/sibyl.md'
  );
  assertFilesMatch(
    'src/templates/commands/interview.md',
    'dist/templates/commands/interview.md'
  );
  assertFilesMatch(
    'src/templates/commands/consult.md',
    'dist/templates/commands/consult.md'
  );
  assertFilesMatch(
    'src/templates/commands/orchestrate.md',
    'dist/templates/commands/orchestrate.md'
  );
  assertFilesMatch(
    'src/templates/standards/agent-roles.md',
    'dist/templates/standards/agent-roles.md'
  );
}

function testInterviewDocumentationIsDiscoverable() {
  assertIncludes('README.md', 'docs/ai/commands/');
  assertIncludes('README.md', 'contextuate install --skills interview');
  assertIncludes('README.md', '`/interview`');
  assertIncludes('README.md', 'SIBYL');

  assertIncludes('CHANGELOG.md', '**`/interview` skill**');
  assertIncludes('CHANGELOG.md', 'SIBYL');

  assertIncludes('src/templates/README.md', 'docs/ai/commands/');
  assertIncludes('src/templates/README.md', '### /interview');
  assertIncludes('src/templates/README.md', '**File:** `docs/ai/commands/interview.md`');

  assertIncludes('src/templates/commands/consult.md', '/interview');
  assertIncludes('src/templates/commands/orchestrate.md', '/interview');
}

function testFrameworkPathReferencesUseContextuate() {
  assertIncludes(
    'src/templates/tools/standards-detector.md',
    'docs/ai/.contextuate/standards/'
  );
  assertIncludes('.gitignore', 'contextuate-test/');
}

const tests = [
  testPackageVersionsMatch,
  testInitUsesAgentsMdAsOnlyRootBootstrapFile,
  testInitPreservesExistingBootstrapFilesAndWarnsToMerge,
  testRemoveCleansGeneratedAndLegacyPlatformAdapters,
  testContextuateTestBinRecreatesInitFixtureDirectory,
  testInterviewTemplatesArePackaged,
  testInterviewDocumentationIsDiscoverable,
  testFrameworkPathReferencesUseContextuate,
];

for (const test of tests) {
  test();
  console.log(`ok - ${test.name}`);
}
