#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const SPEC_PATH = path.resolve(process.cwd(), 'SPEC.md');
const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), 'artifacts', 'spec-trace');

function parseArgs() {
  const args = process.argv.slice(2);
  const outputDirIndex = args.indexOf('--write');
  if (outputDirIndex !== -1 && args[outputDirIndex + 1]) {
    return path.resolve(process.cwd(), args[outputDirIndex + 1]);
  }
  return DEFAULT_OUTPUT_DIR;
}

function readSpec(specPath) {
  if (!fs.existsSync(specPath)) {
    throw new Error(`SPEC.md not found at ${specPath}`);
  }
  const content = fs.readFileSync(specPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const specReqs = new Map();
  const order = [];
  const reqRegex = /(?:@--|<!--)\s*req:id=([A-Za-z0-9-]+)\s+title="([^"]+)"\s*(?:--|-->)/;
  let inCodeBlock = false;
  lines.forEach((line, index) => {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
    }
    if (inCodeBlock) {
      return;
    }
    const match = line.match(reqRegex);
    if (!match) {
      return;
    }
    const [, id, title] = match;
    if (specReqs.has(id)) {
      throw new Error(`Duplicate requirement ID in SPEC.md: ${id} (line ${index + 1})`);
    }
    const entry = { id, title, order: order.length };
    specReqs.set(id, entry);
    order.push(entry);
  });
  return { specReqs, order };
}

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git']);
const IGNORE_PATHS = [
  path.join('apps', 'web', 'e2e', 'app.spec.ts-snapshots'),
];

function shouldIgnoreDir(dirPath) {
  const parts = dirPath.split(path.sep);
  if (parts.some((part) => IGNORE_DIRS.has(part))) {
    return true;
  }
  return IGNORE_PATHS.some((ignorePath) => dirPath.includes(ignorePath));
}

function collectTestFiles(rootDir, fileMatcher) {
  const results = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !fs.existsSync(current)) {
      continue;
    }
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      if (shouldIgnoreDir(current)) {
        continue;
      }
      const entries = fs.readdirSync(current, { withFileTypes: true });
      entries.forEach((entry) => {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(fullPath);
        } else if (entry.isFile() && fileMatcher(fullPath)) {
          results.push(fullPath);
        }
      });
    } else if (stat.isFile() && fileMatcher(current)) {
      results.push(current);
    }
  }
  return results;
}

function gatherTestFiles() {
  const root = process.cwd();
  const files = [];
  const pushFiles = (dir, matcher) => {
    files.push(...collectTestFiles(path.join(root, dir), matcher));
  };
  pushFiles(path.join('apps', 'web', 'src'), (filePath) =>
    filePath.endsWith('.test.ts') || filePath.endsWith('.test.tsx')
  );
  pushFiles(path.join('apps', 'web', 'e2e'), (filePath) => filePath.endsWith('.spec.ts'));
  pushFiles('tests', (filePath) => filePath.endsWith('.test.js'));
  return files;
}

function extractTestReferences(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const titleRegex = /\b(?:it|test)\(\s*(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g;
  const requirementRegex = /^([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{3}):\s/;
  const references = [];
  let match;
  while ((match = titleRegex.exec(content)) !== null) {
    const title = match[2];
    const reqMatch = title.match(requirementRegex);
    if (!reqMatch) {
      continue;
    }
    references.push({
      reqId: reqMatch[1],
      testTitle: title,
      filePath,
    });
  }
  return references;
}

function buildMatrix(order, referencesById) {
  const matrix = order.map((entry) => {
    const references = referencesById.get(entry.id) ?? [];
    const sortedReferences = [...references].sort((a, b) => {
      if (a.filePath === b.filePath) {
        return a.testTitle.localeCompare(b.testTitle);
      }
      return a.filePath.localeCompare(b.filePath);
    });
    return {
      id: entry.id,
      title: entry.title,
      tests: sortedReferences.map((ref) => ({
        filePath: ref.filePath,
        testTitle: ref.testTitle,
      })),
    };
  });
  return matrix;
}

function formatMarkdown(matrix) {
  const lines = [];
  lines.push('# Verification Matrix (SPEC.md ↔ tests)');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  matrix.forEach((entry) => {
    lines.push(`## ${entry.id} — ${entry.title}`);
    lines.push(`Tests (${entry.tests.length}):`);
    if (entry.tests.length === 0) {
      lines.push('- (none)');
    } else {
      entry.tests.forEach((test) => {
        lines.push(`- ${test.filePath} — "${test.testTitle}"`);
      });
    }
    lines.push('');
  });
  return lines.join('\n');
}

function writeOutputs(outputDir, matrix) {
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'matrix.json');
  const mdPath = path.join(outputDir, 'matrix.md');
  fs.writeFileSync(jsonPath, JSON.stringify(matrix, null, 2));
  fs.writeFileSync(mdPath, formatMarkdown(matrix));
  return { jsonPath, mdPath };
}

function toRelative(filePath) {
  return path.relative(process.cwd(), filePath).split(path.sep).join('/');
}

function main() {
  const outputDir = parseArgs();
  const { specReqs, order } = readSpec(SPEC_PATH);
  const testFiles = gatherTestFiles();
  const references = [];
  testFiles.forEach((filePath) => {
    references.push(...extractTestReferences(filePath));
  });

  const referencesById = new Map();
  const unknownReferences = [];

  references.forEach((ref) => {
    const reqEntry = specReqs.get(ref.reqId);
    const relativeFilePath = toRelative(ref.filePath);
    const reference = {
      ...ref,
      filePath: relativeFilePath,
    };
    if (!reqEntry) {
      unknownReferences.push(reference);
      return;
    }
    if (!referencesById.has(ref.reqId)) {
      referencesById.set(ref.reqId, []);
    }
    referencesById.get(ref.reqId).push(reference);
  });

  const matrix = buildMatrix(order, referencesById);
  writeOutputs(outputDir, matrix);

  if (unknownReferences.length > 0) {
    console.error('Unknown requirement IDs referenced by tests:');
    unknownReferences
      .sort((a, b) => {
        if (a.reqId === b.reqId) {
          return a.filePath.localeCompare(b.filePath);
        }
        return a.reqId.localeCompare(b.reqId);
      })
      .forEach((ref) => {
        console.error(`- ${ref.reqId} (${ref.filePath}: "${ref.testTitle}")`);
      });
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
