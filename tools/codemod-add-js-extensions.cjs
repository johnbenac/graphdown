#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const targetDir = path.join(root, 'packages', 'dataset', 'src');

const allowedExtensions = new Set(['.js', '.json', '.node', '.cjs', '.mjs']);

function shouldAppendJs(specifier) {
  const ext = path.extname(specifier);
  if (!ext) return true;
  return !allowedExtensions.has(ext);
}

function maybeResolveTarget(fileDir, specifier) {
  const resolved = path.resolve(fileDir, specifier);
  const candidates = [
    `${resolved}.ts`,
    path.join(resolved, 'index.ts'),
  ];
  return candidates.some((candidate) => fs.existsSync(candidate));
}

function updateSpecifier(fileDir, specifier, missing) {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return specifier;
  if (!shouldAppendJs(specifier)) return specifier;
  if (!maybeResolveTarget(fileDir, specifier)) {
    missing.add(specifier);
    return specifier;
  }
  return `${specifier}.js`;
}

function transformContent(filePath, content, missing) {
  const fileDir = path.dirname(filePath);
  let updated = content;

  updated = updated.replace(
    /(from\s+['"])(\.{1,2}\/[^'"\n]+)(['"])/g,
    (match, prefix, specifier, suffix) => {
      const next = updateSpecifier(fileDir, specifier, missing);
      return `${prefix}${next}${suffix}`;
    }
  );

  updated = updated.replace(
    /(import\s*\(\s*['"])(\.{1,2}\/[^'"\n]+)(['"]\s*\))/g,
    (match, prefix, specifier, suffix) => {
      const next = updateSpecifier(fileDir, specifier, missing);
      return `${prefix}${next}${suffix}`;
    }
  );

  return updated;
}

function walk(dir, visitor) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, visitor);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      visitor(full);
    }
  }
}

const missing = new Set();
let changed = 0;

walk(targetDir, (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const updated = transformContent(filePath, content, missing);
  if (updated !== content) {
    fs.writeFileSync(filePath, updated);
    changed += 1;
  }
});

if (missing.size > 0) {
  console.warn('[codemod] Missing targets for relative imports:');
  for (const specifier of Array.from(missing).sort()) {
    console.warn(`  - ${specifier}`);
  }
}

console.log(`[codemod] Updated ${changed} files.`);
