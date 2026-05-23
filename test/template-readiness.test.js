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

function testInitUsesAgentsMdAsPrimaryPlatformFile() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'contextuate-init-'));

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

    assert.strictEqual(
      fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf8'),
      read('src/templates/templates/platforms/AGENTS.md'),
      'init should install AGENTS.md from the primary platform template'
    );
    assert.strictEqual(
      fs.readlinkSync(path.join(tmpDir, 'CLAUDE.md')),
      'AGENTS.md',
      'CLAUDE.md should be a relative symlink to AGENTS.md'
    );
    assert.strictEqual(
      fs.readlinkSync(path.join(tmpDir, 'GEMINI.md')),
      'AGENTS.md',
      'GEMINI.md should be a relative symlink to AGENTS.md'
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function testRemoveCleansGeneratedPlatformSymlinks() {
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
}

const tests = [
  testPackageVersionsMatch,
  testInitUsesAgentsMdAsPrimaryPlatformFile,
  testRemoveCleansGeneratedPlatformSymlinks,
  testInterviewTemplatesArePackaged,
  testInterviewDocumentationIsDiscoverable,
  testFrameworkPathReferencesUseContextuate,
];

for (const test of tests) {
  test();
  console.log(`ok - ${test.name}`);
}
