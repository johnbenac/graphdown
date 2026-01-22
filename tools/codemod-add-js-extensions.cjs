#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const targetDir = path.join(__dirname, '..', 'packages', 'dataset', 'src');

const allowedExtensions = new Set(['.js', '.cjs', '.mjs', '.json', '.node']);

function hasKnownExtension(specifier) {
  const ext = path.posix.extname(specifier);
  return allowedExtensions.has(ext);
}

function resolveUpdatedSpecifier(specifier, fileDir) {
  if (hasKnownExtension(specifier)) {
    return specifier;
  }

  const absoluteBase = path.resolve(fileDir, specifier);
  const directTs = `${absoluteBase}.ts`;
  if (fs.existsSync(directTs)) {
    return `${specifier}.js`;
  }

  const indexTs = path.join(absoluteBase, 'index.ts');
  if (fs.existsSync(indexTs)) {
    return path.posix.join(specifier, 'index.js');
  }

  return specifier;
}

function updateFile(filePath) {
  const fileDir = path.dirname(filePath);
  const source = fs.readFileSync(filePath, 'utf8');
  const updated = source.replace(/(\bfrom\s+['"])(\.\.?\/[^'"]+)(['"])/g, (_match, start, specifier, end) => {
    const replacement = resolveUpdatedSpecifier(specifier, fileDir);
    return `${start}${replacement}${end}`;
  });

  if (updated !== source) {
    fs.writeFileSync(filePath, updated);
    return true;
  }

  return false;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      updateFile(fullPath);
    }
  }
}

walk(targetDir);
