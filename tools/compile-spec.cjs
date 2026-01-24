#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const { discoverGraphMDObjects, validateDatasetSnapshot } = require('@graphmd/dataset');

const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_DATASET_DIR = path.join(REPO_ROOT, 'spec-dataset');
const DEFAULT_OUTPUT_PATH = path.join(REPO_ROOT, 'SPEC.md');

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function walkDir(dir, onFile) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath, onFile);
        return;
      }
      if (entry.isFile()) {
        onFile(fullPath);
      }
    });
}

function loadDatasetSnapshot(datasetDir) {
  const root = path.resolve(datasetDir);
  if (!fs.existsSync(root)) {
    throw new Error(`Dataset directory not found: ${root}`);
  }

  const allowedRoots = ['types', 'records', 'blocks', 'plugins'];
  const files = new Map();

  for (const dirName of allowedRoots) {
    const dirPath = path.join(root, dirName);
    if (!fs.existsSync(dirPath)) continue;
    walkDir(dirPath, (filePath) => {
      const rel = toPosix(path.relative(root, filePath));
      const bytes = fs.readFileSync(filePath);
      files.set(rel, bytes);
    });
  }

  return { files };
}

function validateSnapshot(snapshot) {
  const validation = validateDatasetSnapshot(snapshot);
  if (validation.ok) return;

  console.error('Spec dataset validation failed:');
  validation.errors.forEach((error) => {
    console.error(`- [${error.code}] ${error.message} (${error.path})`);
  });
  process.exit(1);
}

function parseDataset(snapshot) {
  const parsed = discoverGraphMDObjects(snapshot);
  if (parsed.errors.length > 0) {
    console.error('Spec dataset parse errors:');
    parsed.errors.forEach((error) => {
      console.error(`- [${error.code}] ${error.message} (${error.path})`);
    });
    process.exit(1);
  }
  return parsed;
}

function recordKey(record) {
  return `${record.typeId}:${record.recordId}`;
}

function normalizeOrder(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

function compareSiblings(a, b) {
  const orderA = normalizeOrder(a.fields.order);
  const orderB = normalizeOrder(b.fields.order);
  if (orderA !== null && orderB !== null && orderA !== orderB) {
    return orderA - orderB;
  }
  if (orderA !== null && orderB === null) return -1;
  if (orderA === null && orderB !== null) return 1;
  return a.recordId.localeCompare(b.recordId);
}

function buildHierarchy(records) {
  const byKey = new Map();
  records.forEach((record) => {
    byKey.set(recordKey(record), record);
  });

  const children = new Map();
  records.forEach((record) => {
    if (!record.parent) return;
    const parentKey = record.parent;
    if (!children.has(parentKey)) {
      children.set(parentKey, []);
    }
    children.get(parentKey).push(record);
  });

  for (const [, list] of children.entries()) {
    list.sort(compareSiblings);
  }

  return { byKey, children };
}

function formatSpec(specRecord, childrenMap) {
  const lines = [];
  const title = specRecord.fields.title;
  if (!title) {
    throw new Error('Spec record missing fields.title');
  }

  lines.push(`# ${title}`);
  lines.push('');
  if (specRecord.fields.version) {
    lines.push(`**Spec Version:** ${specRecord.fields.version}`);
  }
  if (specRecord.fields.lastUpdated) {
    lines.push(`**Last Updated:** ${specRecord.fields.lastUpdated}`);
  }
  if (specRecord.fields.status) {
    lines.push(`**Status:** ${specRecord.fields.status}`);
  }
  lines.push('');

  if (specRecord.body) {
    const body = trimBlankLines(specRecord.body);
    if (body) {
      lines.push(body);
      lines.push('');
    }
  }

  const rootKey = recordKey(specRecord);
  const rootChildren = childrenMap.get(rootKey) ?? [];
  rootChildren.forEach((child) => {
    appendRecord(lines, child, childrenMap);
  });

  return lines.join('\n').trimEnd() + '\n';
}

function trimBlankLines(text) {
  const lines = text.split('\n');
  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }
  return lines.join('\n');
}

function sectionHeadingLevel(section) {
  const level = section.fields.level;
  if (typeof level === 'number' && level >= 2 && level <= 6) return level;
  if (typeof level === 'string') {
    const parsed = Number.parseInt(level, 10);
    if (!Number.isNaN(parsed) && parsed >= 2 && parsed <= 6) return parsed;
  }
  return 2;
}

function requirementHeadingLevel(parentSection) {
  if (!parentSection) return 3;
  const parentLevel = sectionHeadingLevel(parentSection);
  return Math.min(6, Math.max(3, parentLevel + 1));
}

function formatReqComment(req) {
  const attrs = [];
  if (typeof req.fields.testable === 'boolean') {
    attrs.push(`testable=${req.fields.testable}`);
  }
  if (req.fields.verify) {
    attrs.push(`verify=${req.fields.verify}`);
  }
  const attrText = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
  return `<!-- req:id=${req.recordId} title="${req.fields.title}"${attrText} -->`;
}

function appendRecord(lines, record, childrenMap, parentSection = null) {
  if (record.typeId === 'section') {
    const level = sectionHeadingLevel(record);
    lines.push(`${'#'.repeat(level)} ${record.fields.title}`);
    lines.push('');
    if (record.body) {
      const body = trimBlankLines(record.body);
      if (body) {
        lines.push(body);
        lines.push('');
      }
    }

    const children = childrenMap.get(recordKey(record)) ?? [];
    children.forEach((child) => {
      appendRecord(lines, child, childrenMap, record);
    });
    return;
  }

  if (record.typeId === 'req') {
    lines.push(formatReqComment(record));
    const level = requirementHeadingLevel(parentSection);
    const headingTitle = record.fields.heading ?? record.fields.title;
    lines.push(`${'#'.repeat(level)} ${record.recordId} — ${headingTitle}`);
    lines.push('');
    if (record.body) {
      const body = trimBlankLines(record.body);
      if (body) {
        lines.push(body);
        lines.push('');
      }
    }
    return;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    datasetDir: DEFAULT_DATASET_DIR,
    outputPath: DEFAULT_OUTPUT_PATH,
    check: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dataset') {
      options.datasetDir = path.resolve(REPO_ROOT, args[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--output') {
      options.outputPath = path.resolve(REPO_ROOT, args[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--check') {
      options.check = true;
      continue;
    }
  }

  return options;
}

function main() {
  const { datasetDir, outputPath, check } = parseArgs();
  const snapshot = loadDatasetSnapshot(datasetDir);
  validateSnapshot(snapshot);

  const { recordObjects } = parseDataset(snapshot);
  const specRecords = recordObjects.filter((record) => record.typeId === 'spec');
  if (specRecords.length !== 1) {
    console.error(`Expected exactly one spec record, found ${specRecords.length}.`);
    process.exit(1);
  }

  const specRecord = specRecords[0];
  const eligible = recordObjects.filter((record) =>
    record.typeId === 'spec' || record.typeId === 'section' || record.typeId === 'req'
  );

  const { children } = buildHierarchy(eligible);
  const output = formatSpec(specRecord, children);

  if (check) {
    const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';
    if (current !== output) {
      console.error(`SPEC.md is out of date. Run: node tools/compile-spec.cjs`);
      process.exit(1);
    }
    console.log('SPEC.md is up to date.');
    return;
  }

  fs.writeFileSync(outputPath, output);
  console.log(`Wrote ${path.relative(REPO_ROOT, outputPath)}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  loadDatasetSnapshot,
  formatSpec,
};
