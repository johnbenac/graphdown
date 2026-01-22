#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..', 'packages', 'dataset', 'src');
const extsToSkip = new Set(['.js', '.mjs', '.cjs', '.json', '.node']);

function shouldSkip(specifier) {
  const ext = path.extname(specifier);
  return extsToSkip.has(ext);
}

function targetExists(fileDir, specifier) {
  const rawPath = path.resolve(fileDir, specifier);
  if (fs.existsSync(rawPath + '.ts')) return true;
  if (fs.existsSync(rawPath + '/index.ts')) return true;
  return false;
}

function addJsExtension(filePath, contents) {
  const fileDir = path.dirname(filePath);
  let updated = contents;

  const fromRegex = /from\s+(['"])(\.\.\/|\.\/)[^'\"]+\1/g;
  updated = updated.replace(fromRegex, (match, quote) => {
    const specifierMatch = match.match(/from\s+(['"])([^'\"]+)\1/);
    if (!specifierMatch) return match;
    const specifier = specifierMatch[2];
    if (shouldSkip(specifier)) return match;
    if (!targetExists(fileDir, specifier)) return match;
    return match.replace(specifier, `${specifier}.js`);
  });

  const importRegex = /import\s+(['"])(\.\.\/|\.\/)[^'\"]+\1/g;
  updated = updated.replace(importRegex, (match, quote) => {
    const specifierMatch = match.match(/import\s+(['"])([^'\"]+)\1/);
    if (!specifierMatch) return match;
    const specifier = specifierMatch[2];
    if (shouldSkip(specifier)) return match;
    if (!targetExists(fileDir, specifier)) return match;
    return match.replace(specifier, `${specifier}.js`);
  });

  return updated;
}

function walk(dir, callback) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, callback);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      callback(full);
    }
  }
}

let changedFiles = 0;
walk(rootDir, (filePath) => {
  const before = fs.readFileSync(filePath, 'utf8');
  const after = addJsExtension(filePath, before);
  if (before !== after) {
    fs.writeFileSync(filePath, after);
    changedFiles += 1;
  }
});

console.log(`[codemod] Updated ${changedFiles} file(s).`);
