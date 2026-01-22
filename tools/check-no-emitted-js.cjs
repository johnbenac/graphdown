#!/usr/bin/env node

/**
 * Fails if emitted .js files are present in packages/core/src or packages/dataset/src (excluding fixtures).
 * Prevents accidental CJS build outputs from being committed alongside sources.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targetDirs = [
  path.join(root, 'packages', 'core', 'src'),
  path.join(root, 'packages', 'dataset', 'src')
];
const ignoreDirs = new Set(['__fixtures__']);
const emitted = [];

function walk(dir, targetDir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoreDirs.has(entry.name)) continue;
      walk(fullPath, targetDir);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) {
      emitted.push(path.relative(targetDir, fullPath));
    }
  }
}

for (const targetDir of targetDirs) {
  if (fs.existsSync(targetDir)) {
    walk(targetDir, targetDir);
  }
}

if (emitted.length > 0) {
  const list = emitted.map((f) => `  - ${f}`).join('\n');
  console.error('Found emitted .js files in packages/core/src or packages/dataset/src:\n' + list);
  process.exit(1);
}
