const fs = require('fs');
const path = require('path');

const REQ_LINE_REGEX =
  /(?:@--|<!--)\s*req:id=([A-Za-z0-9-]+)\s+title="([^"]+)"\s*(?:--|-->)/;
const TEST_TITLE_REGEX = /\b(?:it|test)\s*\(\s*(['"])(.*?)\1/g;
const REQ_PREFIX_REGEX = /^([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{3}):\s/;

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function readSpecRequirements(specPath) {
  const content = fs.readFileSync(specPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const specReqs = new Map();
  const order = [];
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
    const [, id, title] = match;
    if (specReqs.has(id)) {
      duplicates.push({ id, line: index + 1 });
      return;
    }
    specReqs.set(id, { title, order: order.length });
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
  if (['node_modules', 'dist', '.git'].includes(name)) return true;
  const snapshotDir = path.join('apps', 'web', 'e2e', 'app.spec.ts-snapshots');
  if (toPosixPath(fullPath).includes(snapshotDir)) return true;
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
      } else if (entry.isFile()) {
        onFile(fullPath);
      }
    });
}

function collectTestFiles(repoRoot) {
  const targets = [
    {
      dir: path.join(repoRoot, 'apps', 'web', 'src'),
      match: (filePath) => /\.test\.tsx?$/.test(filePath),
    },
    {
      dir: path.join(repoRoot, 'apps', 'web', 'e2e'),
      match: (filePath) => /\.spec\.ts$/.test(filePath),
    },
    {
      dir: path.join(repoRoot, 'tests'),
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
  return files;
}

function extractReferencedRequirements(repoRoot, testFiles) {
  const references = new Map();

  testFiles.forEach((filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    let match;
    while ((match = TEST_TITLE_REGEX.exec(content)) !== null) {
      const title = match[2];
      const prefixMatch = title.match(REQ_PREFIX_REGEX);
      if (!prefixMatch) continue;
      const reqId = prefixMatch[1];
      const relativePath = toPosixPath(path.relative(repoRoot, filePath));
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

  return references;
}

function parseOutputDir(repoRoot) {
  const args = process.argv.slice(2);
  const writeIndex = args.indexOf('--write');
  if (writeIndex !== -1) {
    const next = args[writeIndex + 1];
    if (!next) {
      console.error('Missing output directory after --write');
      process.exit(1);
    }
    return path.resolve(repoRoot, next);
  }
  return path.join(repoRoot, 'artifacts', 'spec-trace');
}

function writeMatrix(outputDir, generatedAt, specReqs, order, references) {
  fs.mkdirSync(outputDir, { recursive: true });

  const requirements = order.map((id) => {
    const spec = specReqs.get(id);
    return {
      id,
      title: spec.title,
      tests: references.get(id) ?? [],
    };
  });

  const jsonOutput = {
    generatedAt,
    requirements,
  };

  const markdownLines = [
    '# Verification Matrix (SPEC.md ↔ tests)',
    '',
    `Generated: ${generatedAt}`,
    '',
  ];

  requirements.forEach((req) => {
    markdownLines.push(`## ${req.id} — ${req.title}`);
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

function reportUnknownIds(references, specReqs) {
  const unknownEntries = [];
  for (const [reqId, tests] of references.entries()) {
    if (!specReqs.has(reqId)) {
      tests.forEach((test) => unknownEntries.push(test));
    }
  }

  if (unknownEntries.length === 0) return;

  console.error('Unknown requirement IDs referenced by tests:');
  unknownEntries.forEach((entry) => {
    console.error(`- ${entry.reqId} (${entry.filePath}: "${entry.testTitle}")`);
  });
  process.exit(1);
}

function main() {
  const repoRoot = process.cwd();
  const specPath = path.join(repoRoot, 'SPEC.md');
  if (!fs.existsSync(specPath)) {
    console.error(`SPEC.md not found at ${specPath}`);
    process.exit(1);
  }

  const { specReqs, order } = readSpecRequirements(specPath);
  const testFiles = collectTestFiles(repoRoot);
  const references = extractReferencedRequirements(repoRoot, testFiles);
  const outputDir = parseOutputDir(repoRoot);
  const generatedAt = new Date().toISOString();

  writeMatrix(outputDir, generatedAt, specReqs, order, references);
  reportUnknownIds(references, specReqs);

  console.log(`Spec trace completed. Matrix written to ${toPosixPath(outputDir)}.`);
}

main();
