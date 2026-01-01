#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SPEC_PATH = path.join(REPO_ROOT, 'SPEC.md');

const REQ_LINE_REGEX =
  /(?:@--|<!--)\s*req:id=([A-Za-z0-9-]+)\s+title="([^"]+)"([^>-]*)(?:--|-->)/;
const REQ_ATTR_REGEX = /([a-zA-Z0-9_]+)=("([^"]*)"|([^\s"->]+))/g;

// Matches: it("TITLE", ...) / test("TITLE", ...) / it.only("TITLE", ...) / test.skip("TITLE", ...)
const TEST_TITLE_REGEX = /\b(?:it|test)(?:\.only|\.skip)?\s*\(\s*(['"])(.*?)\1/g;

// Pattern A: "REQ-ID-001: rest of title"
const REQ_PREFIX_REGEX = /^([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{3}):\s/;

const SKIP_DIR_NAMES = new Set([
  '.git',
  'node_modules',
  'dist',
  'artifacts',
  'test-results',
  'playwright-report',
  'app.spec.ts-snapshots',
]);

const PLAYWRIGHT_SNAPSHOT_DIR_POSIX = toPosixPath(
  path.join('apps', 'web', 'e2e', 'app.spec.ts-snapshots'),
);
const ENFORCE_TESTABLE =
  process.env.TRACE_ENFORCE_TESTABLE &&
  process.env.TRACE_ENFORCE_TESTABLE.toLowerCase() === 'true';

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function parseOutputDir() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    return path.join(REPO_ROOT, 'artifacts', 'spec-trace');
  }

  const writeIndex = args.indexOf('--write');
  if (writeIndex !== -1) {
    const next = args[writeIndex + 1];
    if (!next) {
      console.error('Missing output directory after --write');
      process.exit(1);
    }
    return path.resolve(REPO_ROOT, next);
  }

  console.error('Usage: node tools/spec-trace.cjs [--write <outputDir>]');
  process.exit(1);
}

function readSpecRequirements(specPath) {
  const content = fs.readFileSync(specPath, 'utf8');
  const lines = content.split(/\r?\n/);

  const specReqs = new Map(); // id -> { title, order, testable, verify }
  const order = []; // [id...]
  const duplicates = [];

  let inCodeBlock = false;

  lines.forEach((line, index) => {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      return;
    }
    if (inCodeBlock) return;

    const match = line.match(REQ_LINE_REGEX);
    if (!match) return;

    const [, id, title, rawAttrs] = match;
    const attrs = {};
    if (rawAttrs && rawAttrs.trim().length > 0) {
      REQ_ATTR_REGEX.lastIndex = 0;
      let attrMatch;
      while ((attrMatch = REQ_ATTR_REGEX.exec(rawAttrs)) !== null) {
        const key = attrMatch[1];
        const value = attrMatch[3] ?? attrMatch[4] ?? '';
        attrs[key] = value;
      }
    }

    const testable =
      attrs.testable === undefined
        ? undefined
        : attrs.testable.toLowerCase() === 'true';
    const verify = attrs.verify;

    if (specReqs.has(id)) {
      duplicates.push({ id, line: index + 1 });
      return;
    }

    specReqs.set(id, { title, order: order.length, testable, verify });
    order.push(id);
  });

  if (duplicates.length > 0) {
    console.error('Duplicate requirement IDs found in SPEC.md:');
    duplicates.forEach((dup) => {
      console.error(`- ${dup.id} (line ${dup.line})`);
    });
    process.exit(1);
  }

  return { specReqs, order };
}

function shouldSkipDir(fullPath, name) {
  if (SKIP_DIR_NAMES.has(name)) return true;

  // Also skip if path contains the snapshots dir (handles nested paths robustly)
  const posix = toPosixPath(fullPath);
  if (posix.includes(PLAYWRIGHT_SNAPSHOT_DIR_POSIX)) return true;

  return false;
}

function walkDir(rootDir, onFile) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  entries
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((entry) => {
      const fullPath = path.join(rootDir, entry.name);

      if (entry.isDirectory()) {
        if (shouldSkipDir(fullPath, entry.name)) return;
        walkDir(fullPath, onFile);
        return;
      }

      if (entry.isFile()) {
        onFile(fullPath);
      }
    });
}

function collectTestFiles() {
  const targets = [
    {
      dir: path.join(REPO_ROOT, 'apps', 'web', 'src'),
      match: (filePath) => /\.test\.tsx?$/.test(filePath),
    },
    {
      dir: path.join(REPO_ROOT, 'apps', 'web', 'e2e'),
      match: (filePath) => /\.spec\.ts$/.test(filePath),
    },
    {
      dir: path.join(REPO_ROOT, 'tests'),
      match: (filePath) => /\.test\.js$/.test(filePath),
    },
  ];

  const files = [];

  targets.forEach((target) => {
    if (!fs.existsSync(target.dir)) return;

    walkDir(target.dir, (filePath) => {
      if (target.match(filePath)) {
        files.push(filePath);
      }
    });
  });

  // Deterministic output
  files.sort((a, b) => toPosixPath(a).localeCompare(toPosixPath(b)));
  return files;
}

function extractReferencedRequirements(testFiles) {
  const references = new Map(); // reqId -> [{ reqId, testTitle, filePath }...]

  testFiles.forEach((filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');

    // Important: TEST_TITLE_REGEX is /g, so reset state per file.
    TEST_TITLE_REGEX.lastIndex = 0;

    let match;
    while ((match = TEST_TITLE_REGEX.exec(content)) !== null) {
      const title = match[2];
      const prefixMatch = title.match(REQ_PREFIX_REGEX);
      if (!prefixMatch) continue;

      const reqId = prefixMatch[1];
      const relativePath = toPosixPath(path.relative(REPO_ROOT, filePath));

      if (!references.has(reqId)) {
        references.set(reqId, []);
      }

      references.get(reqId).push({
        reqId,
        testTitle: title,
        filePath: relativePath,
      });
    }
  });

  // Deterministic per-req ordering
  for (const [, tests] of references.entries()) {
    tests.sort(
      (a, b) =>
        a.filePath.localeCompare(b.filePath) ||
        a.testTitle.localeCompare(b.testTitle),
    );
  }

  return references;
}

function collectUnknownReferences(references, specReqs) {
  const unknown = [];

  for (const [reqId, tests] of references.entries()) {
    if (specReqs.has(reqId)) continue;
    tests.forEach((t) => unknown.push(t));
  }

  unknown.sort(
    (a, b) =>
      a.reqId.localeCompare(b.reqId) ||
      a.filePath.localeCompare(b.filePath) ||
      a.testTitle.localeCompare(b.testTitle),
  );

  return unknown;
}

function collectMissingTestable(specReqs, references) {
  const missing = [];
  for (const [id, spec] of specReqs.entries()) {
    if (spec.testable !== true) continue;
    const tests = references.get(id);
    if (!tests || tests.length === 0) {
      missing.push({ id, title: spec.title });
    }
  }
  missing.sort((a, b) => a.id.localeCompare(b.id));
  return missing;
}

function buildMatrixData(generatedAt, specReqs, order, references, unknownRefs, missingTestable) {
  return {
    generatedAt,
    requirements: order.map((id) => {
      const spec = specReqs.get(id);
      return {
        id,
        title: spec.title,
        testable: spec.testable ?? null,
        verify: spec.verify ?? null,
        tests: references.get(id) ?? [],
      };
    }),
    unknownReferences: unknownRefs,
    missingTestable,
  };
}

function writeMatrix(outputDir, matrixData) {
  fs.mkdirSync(outputDir, { recursive: true });

  const jsonOutput = matrixData;

  const markdownLines = [
    '# Verification Matrix (SPEC.md ↔ tests)',
    '',
    `Generated: ${matrixData.generatedAt}`,
    '',
  ];

  if (matrixData.unknownReferences.length > 0) {
    markdownLines.push('## Unknown requirement IDs referenced by tests');
    matrixData.unknownReferences.forEach((ref) => {
      markdownLines.push(`- ${ref.reqId} (${ref.filePath}: "${ref.testTitle}")`);
    });
    markdownLines.push('');
  }

  if (matrixData.missingTestable.length > 0) {
    markdownLines.push('## Testable requirements with no tests');
    matrixData.missingTestable.forEach((req) => {
      markdownLines.push(`- ${req.id} — ${req.title}`);
    });
    markdownLines.push('');
  }

  matrixData.requirements.forEach((req) => {
    const metaParts = [];
    if (req.testable !== null && req.testable !== undefined) {
      metaParts.push(`testable=${req.testable}`);
    }
    if (req.verify) {
      metaParts.push(`verify=${req.verify}`);
    }
    const meta =
      metaParts.length > 0 ? ` (${metaParts.join(', ')})` : '';

    markdownLines.push(`## ${req.id} — ${req.title}${meta}`);
    markdownLines.push(`Tests (${req.tests.length}):`);
    if (req.tests.length === 0) {
      markdownLines.push('- (none)');
    } else {
      req.tests.forEach((test) => {
        markdownLines.push(`- ${test.filePath} — "${test.testTitle}"`);
      });
    }
    markdownLines.push('');
  });

  fs.writeFileSync(
    path.join(outputDir, 'matrix.json'),
    JSON.stringify(jsonOutput, null, 2),
  );
  fs.writeFileSync(path.join(outputDir, 'matrix.md'), markdownLines.join('\n'));
}

function reportUnknownIds(unknownRefs) {
  if (unknownRefs.length === 0) return;

  console.error('Unknown requirement IDs referenced by tests:');
  unknownRefs.forEach((entry) => {
    console.error(`- ${entry.reqId} (${entry.filePath}: "${entry.testTitle}")`);
  });
  process.exit(1);
}

function reportMissingTestable(missingTestable) {
  if (!ENFORCE_TESTABLE) return;
  if (missingTestable.length === 0) return;

  console.error(
    'Testable requirements are missing test references (set TRACE_ENFORCE_TESTABLE=false to skip this gate):',
  );
  missingTestable.forEach((req) => {
    console.error(`- ${req.id} — ${req.title}`);
  });
  process.exit(1);
}

function generateSpecTrace({
  outputDir = path.join(REPO_ROOT, 'artifacts', 'spec-trace'),
  writeFiles = true,
  generatedAt = new Date().toISOString(),
} = {}) {
  if (!fs.existsSync(SPEC_PATH)) {
    throw new Error(`SPEC.md not found at ${SPEC_PATH}`);
  }

  const { specReqs, order } = readSpecRequirements(SPEC_PATH);
  const testFiles = collectTestFiles();
  const references = extractReferencedRequirements(testFiles);
  const unknownRefs = collectUnknownReferences(references, specReqs);
  const missingTestable = collectMissingTestable(specReqs, references);

  const matrixData = buildMatrixData(
    generatedAt,
    specReqs,
    order,
    references,
    unknownRefs,
    missingTestable,
  );

  if (writeFiles) {
    writeMatrix(outputDir, matrixData);
  }

  return {
    matrixData,
    specReqs,
    order,
    references,
    unknownRefs,
    missingTestable,
    outputDir,
  };
}

function main() {
  const outputDir = parseOutputDir();
  const { matrixData } = generateSpecTrace({ outputDir, writeFiles: true });

  // Fail only on unknown IDs (not on missing coverage).
  reportUnknownIds(matrixData.unknownReferences);
  reportMissingTestable(matrixData.missingTestable);

  console.log(
    `Spec trace completed. Matrix written to ${toPosixPath(
      path.relative(REPO_ROOT, outputDir),
    )}.`,
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  generateSpecTrace,
};
