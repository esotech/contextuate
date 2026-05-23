#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
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
  testInterviewTemplatesArePackaged,
  testInterviewDocumentationIsDiscoverable,
  testFrameworkPathReferencesUseContextuate,
];

for (const test of tests) {
  test();
  console.log(`ok - ${test.name}`);
}
