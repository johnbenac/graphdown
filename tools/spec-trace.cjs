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
  'app.e2e.spec.js-snapshots',
  'app.e2e.spec.ts-snapshots',
  '__fixtures__',
]);

const PLAYWRIGHT_SNAPSHOT_DIR_POSIXES = [
  path.join('apps', 'web', 'e2e', 'app.e2e.spec.js-snapshots'),
  path.join('apps', 'web', 'e2e', 'app.e2e.spec.ts-snapshots'),
].map(toPosixPath);
const ENFORCE_TESTABLE =
  process.env.TRACE_ENFORCE_TESTABLE &&
  process.env.TRACE_ENFORCE_TESTABLE.toLowerCase() === 'true';
const ALLOWLIST_PATH = path.join(__dirname, 'spec-trace.allowlist.json');

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) {
    return { pathMatchers: [], titleMatchers: [] };
  }
  const raw = fs.readFileSync(ALLOWLIST_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  const paths = Array.isArray(parsed.paths) ? parsed.paths : [];
  const titles = Array.isArray(parsed.titles) ? parsed.titles : [];
  return {
    pathMatchers: compileGlobList(paths),
    titleMatchers: compileGlobList(titles),
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function globToRegex(glob) {
  const normalized = toPosixPath(glob);
  let regex = '^';
  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const next = normalized[i + 1];
    if (char === '*' && next === '*') {
      regex += '.*';
      i += 1;
      continue;
    }
    if (char === '*') {
      regex += '[^/]*';
      continue;
    }
    regex += escapeRegex(char);
  }
  regex += '$';
  return new RegExp(regex);
}

function compileGlobList(globs) {
  return globs.map((glob) => ({ glob, regex: globToRegex(glob) }));
}

function matchesAllowlist(test, allowlist) {
  const path = test.filePath;
  const title = test.testTitle;
  if (allowlist.pathMatchers.some((entry) => entry.regex.test(path))) return true;
  if (allowlist.titleMatchers.some((entry) => entry.regex.test(title))) return true;
  return false;
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
  if (PLAYWRIGHT_SNAPSHOT_DIR_POSIXES.some((dir) => posix.includes(dir))) return true;

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

function collectPackageSrcTargets() {
  const packagesDir = path.join(REPO_ROOT, 'packages');
  if (!fs.existsSync(packagesDir)) return [];

  const packageNames = fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  return packageNames.flatMap((name) => {
    const srcDir = path.join(packagesDir, name, 'src');
    if (!fs.existsSync(srcDir)) return [];
    return [
      {
        dir: srcDir,
        match: (filePath) => /\.test\.tsx?$/.test(filePath),
      },
    ];
  });
}

function collectTestFiles() {
  const targets = [
    {
      dir: path.join(REPO_ROOT, 'apps', 'web', 'src'),
      match: (filePath) => /\.test\.tsx?$/.test(filePath),
    },
    ...collectPackageSrcTargets(),
    {
      dir: path.join(REPO_ROOT, 'apps', 'web', 'e2e'),
      match: (filePath) => /\.e2e\.spec\.(js|ts)$/.test(filePath),
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
  const allTests = [];

  testFiles.forEach((filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');

    // Important: TEST_TITLE_REGEX is /g, so reset state per file.
    TEST_TITLE_REGEX.lastIndex = 0;

    let match;
    while ((match = TEST_TITLE_REGEX.exec(content)) !== null) {
      const title = match[2];
      const prefixMatch = title.match(REQ_PREFIX_REGEX);
      const relativePath = toPosixPath(path.relative(REPO_ROOT, filePath));

      allTests.push({
        testTitle: title,
        filePath: relativePath,
        hasReqPrefix: Boolean(prefixMatch),
      });

      if (!prefixMatch) continue;

      const reqId = prefixMatch[1];

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

  return { references, allTests };
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

function collectUntracedTests(allTests, allowlist) {
  const untraced = allTests.filter((test) => !test.hasReqPrefix && !matchesAllowlist(test, allowlist));
  untraced.sort(
    (a, b) =>
      a.filePath.localeCompare(b.filePath) ||
      a.testTitle.localeCompare(b.testTitle),
  );
  return untraced;
}

function buildMatrixData(
  generatedAt,
  specReqs,
  order,
  references,
  unknownRefs,
  missingTestable,
  untracedTests,
) {
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
    untracedTests,
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

  if (matrixData.untracedTests.length > 0) {
    markdownLines.push('## Tests missing requirement references');
    matrixData.untracedTests.forEach((test) => {
      markdownLines.push(`- ${test.filePath}: "${test.testTitle}"`);
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

function reportUntracedTests(untracedTests) {
  if (untracedTests.length === 0) return;

  console.error('Tests missing requirement references (allowlist with tools/spec-trace.allowlist.json):');
  untracedTests.forEach((test) => {
    console.error(`- ${test.filePath}: "${test.testTitle}"`);
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
  const allowlist = loadAllowlist();
  const { references, allTests } = extractReferencedRequirements(testFiles);
  const unknownRefs = collectUnknownReferences(references, specReqs);
  const missingTestable = collectMissingTestable(specReqs, references);
  const untracedTests = collectUntracedTests(allTests, allowlist);

  const matrixData = buildMatrixData(
    generatedAt,
    specReqs,
    order,
    references,
    unknownRefs,
    missingTestable,
    untracedTests,
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
    untracedTests,
    outputDir,
  };
}

function main() {
  const outputDir = parseOutputDir();
  const { matrixData } = generateSpecTrace({ outputDir, writeFiles: true });

  // Fail only on unknown IDs (not on missing coverage).
  reportUnknownIds(matrixData.unknownReferences);
  reportMissingTestable(matrixData.missingTestable);
  reportUntracedTests(matrixData.untracedTests);

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
