#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = process.cwd();
const SPEC_PATH = path.join(REPO_ROOT, 'SPEC.md');
const DEFAULT_OUTPUT_DIR = path.join(REPO_ROOT, 'artifacts', 'spec-trace');

const args = process.argv.slice(2);
let outputDir = DEFAULT_OUTPUT_DIR;
if (args.length > 0) {
  if (args[0] === '--write' && args[1]) {
    outputDir = path.resolve(REPO_ROOT, args[1]);
  } else {
    console.error('Usage: node tools/spec-trace.cjs [--write <outputDir>]');
    process.exit(1);
  }
}

function ensureFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing file: ${filePath}`);
    process.exit(1);
  }
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join(path.posix.sep);
}

function parseSpec(specContent) {
  const stripped = specContent.replace(/```[\s\S]*?```/g, '');
  const reqRegex = /(?:@--|<!--)\s*req:id=([A-Za-z0-9-]+)\s+title="([^"]+)"\s*(?:--|-->)/g;
  const reqs = new Map();
  const order = [];
  let match;
  let index = 0;
  while ((match = reqRegex.exec(stripped)) !== null) {
    const id = match[1];
    const title = match[2];
    if (reqs.has(id)) {
      console.error(`Duplicate requirement ID in SPEC.md: ${id}`);
      process.exit(1);
    }
    const entry = { id, title, order: index };
    reqs.set(id, entry);
    order.push(entry);
    index += 1;
  }
  return { reqs, order };
}

function walkDir(dirPath, onFile) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
      continue;
    }
    if (entry.name === 'app.spec.ts-snapshots') {
      continue;
    }
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, onFile);
    } else if (entry.isFile()) {
      onFile(fullPath);
    }
  }
}

function collectTestFiles() {
  const testFiles = [];
  const roots = [
    {
      dir: path.join(REPO_ROOT, 'apps', 'web', 'src'),
      match: (file) => file.endsWith('.test.ts') || file.endsWith('.test.tsx'),
    },
    {
      dir: path.join(REPO_ROOT, 'apps', 'web', 'e2e'),
      match: (file) => file.endsWith('.spec.ts'),
    },
    {
      dir: path.join(REPO_ROOT, 'tests'),
      match: (file) => file.endsWith('.test.js'),
    },
  ];

  for (const root of roots) {
    if (!fs.existsSync(root.dir)) {
      continue;
    }
    walkDir(root.dir, (filePath) => {
      if (root.match(filePath)) {
        testFiles.push(filePath);
      }
    });
  }

  return testFiles;
}

function extractTitles(fileContent) {
  const titles = [];
  const titleRegex = /(?:^|[^\w])(?:it|test)\(\s*(['"])([\s\S]*?)\1/g;
  let match;
  while ((match = titleRegex.exec(fileContent)) !== null) {
    titles.push(match[2]);
  }
  return titles;
}

function extractRequirementPrefix(title) {
  const prefixRegex = /^([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{3}):\s/;
  const match = title.match(prefixRegex);
  return match ? match[1] : null;
}

function buildMatrix(specOrder, references) {
  return specOrder.map((req) => {
    const tests = references.get(req.id) || [];
    const sorted = tests
      .slice()
      .sort((a, b) => a.filePath.localeCompare(b.filePath) || a.testTitle.localeCompare(b.testTitle));
    return {
      id: req.id,
      title: req.title,
      tests: sorted,
    };
  });
}

function writeMatrix(output, matrix) {
  fs.mkdirSync(output, { recursive: true });
  const generatedAt = new Date().toISOString();
  const jsonPath = path.join(output, 'matrix.json');
  const mdPath = path.join(output, 'matrix.md');

  const jsonPayload = {
    generatedAt,
    requirements: matrix.map((entry) => ({
      id: entry.id,
      title: entry.title,
      tests: entry.tests,
    })),
  };

  fs.writeFileSync(jsonPath, JSON.stringify(jsonPayload, null, 2));

  const mdLines = ['# Verification Matrix (SPEC.md ↔ tests)', '', `Generated: ${generatedAt}`, ''];
  for (const entry of matrix) {
    mdLines.push(`## ${entry.id} — ${entry.title}`);
    mdLines.push(`Tests (${entry.tests.length}):`);
    if (entry.tests.length > 0) {
      for (const test of entry.tests) {
        mdLines.push(`- ${test.filePath} — "${test.testTitle}"`);
      }
    }
    mdLines.push('');
  }
  fs.writeFileSync(mdPath, mdLines.join('\n'));

  return { jsonPath, mdPath };
}

function main() {
  ensureFileExists(SPEC_PATH);
  const specContent = fs.readFileSync(SPEC_PATH, 'utf8');
  const { reqs, order } = parseSpec(specContent);

  const testFiles = collectTestFiles();
  const references = new Map();
  const unknownRefs = new Map();

  for (const filePath of testFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const titles = extractTitles(content);
    for (const title of titles) {
      const reqId = extractRequirementPrefix(title);
      if (!reqId) {
        continue;
      }
      const relPath = toPosixPath(path.relative(REPO_ROOT, filePath));
      const entry = { reqId, testTitle: title, filePath: relPath };
      if (!references.has(reqId)) {
        references.set(reqId, []);
      }
      references.get(reqId).push({ filePath: relPath, testTitle: title });
      if (!reqs.has(reqId)) {
        if (!unknownRefs.has(reqId)) {
          unknownRefs.set(reqId, []);
        }
        unknownRefs.get(reqId).push(entry);
      }
    }
  }

  if (unknownRefs.size > 0) {
    console.error('Unknown requirement IDs referenced by tests:');
    const ids = Array.from(unknownRefs.keys()).sort();
    for (const id of ids) {
      const entries = unknownRefs.get(id) || [];
      for (const entry of entries) {
        console.error(`- ${id} (${entry.filePath}: "${entry.testTitle}")`);
      }
    }
    process.exit(1);
  }

  const matrix = buildMatrix(order, references);
  const { jsonPath, mdPath } = writeMatrix(outputDir, matrix);
  console.log(`Wrote verification matrix to ${toPosixPath(path.relative(REPO_ROOT, mdPath))}`);
  console.log(`Wrote verification matrix JSON to ${toPosixPath(path.relative(REPO_ROOT, jsonPath))}`);
}

main();
