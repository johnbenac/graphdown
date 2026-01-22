#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const targetRoot = path.join(rootDir, 'packages', 'dataset', 'src');

const EXTENSIONS_TO_SKIP = new Set(['.js', '.json', '.mjs', '.cjs', '.node']);

function hasKnownExtension(specifier) {
  return EXTENSIONS_TO_SKIP.has(path.extname(specifier));
}

function resolveCandidate(baseDir, specifier) {
  const fullPath = path.resolve(baseDir, specifier);
  const candidates = [
    `${fullPath}.ts`,
    `${fullPath}.tsx`,
    path.join(fullPath, 'index.ts'),
    path.join(fullPath, 'index.tsx'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function updateSpecifier(filePath, specifier) {
  if (hasKnownExtension(specifier)) {
    return specifier;
  }

  const baseDir = path.dirname(filePath);
  const resolved = resolveCandidate(baseDir, specifier);
  if (!resolved) {
    console.warn(`[codemod] Warning: could not resolve target for ${specifier} in ${filePath}`);
  }
  return `${specifier}.js`;
}

function transformSource(filePath, source) {
  let updated = source;
  const patterns = [
    /(\bfrom\s+['"])(\.{1,2}\/[^'\"]+)(['"])/g,
    /(\bimport\s*\(\s*['"])(\.{1,2}\/[^'\"]+)(['"]\s*\))/g,
  ];

  for (const pattern of patterns) {
    updated = updated.replace(pattern, (match, prefix, specifier, suffix) => {
      const nextSpecifier = updateSpecifier(filePath, specifier);
      return `${prefix}${nextSpecifier}${suffix}`;
    });
  }

  return updated;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      const original = fs.readFileSync(fullPath, 'utf8');
      const transformed = transformSource(fullPath, original);
      if (transformed !== original) {
        fs.writeFileSync(fullPath, transformed);
      }
    }
  }
}

if (!fs.existsSync(targetRoot)) {
  console.error(`[codemod] Target root not found: ${targetRoot}`);
  process.exit(1);
}

walk(targetRoot);
console.log('[codemod] Completed adding .js extensions for dataset relative imports.');
