const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const specPath = path.join(repoRoot, 'SPEC.md');
const outputDir = path.join(repoRoot, 'artifacts', 'spec-trace');
const matrixMdPath = path.join(outputDir, 'matrix.md');
const matrixJsonPath = path.join(outputDir, 'matrix.json');

const specRegex = /<!--\s*req:id=([A-Za-z0-9-]+)\s+title="([^"]+)"\s*-->/g;
const idPrefixRegex = /^([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{3}):\s/;

const testFileRoots = [
  {
    root: path.join(repoRoot, 'apps', 'web', 'src'),
    extensionMatch: (name) => name.endsWith('.test.ts') || name.endsWith('.test.tsx'),
  },
  {
    root: path.join(repoRoot, 'apps', 'web', 'e2e'),
    extensionMatch: (name) => name.endsWith('.spec.ts'),
  },
  {
    root: path.join(repoRoot, 'tests'),
    extensionMatch: (name) => name.endsWith('.test.js'),
  },
];

const ignoredDirNames = new Set(['node_modules', 'dist', '.git']);
const ignoredSnapshotsDir = path.join(
  repoRoot,
  'apps',
  'web',
  'e2e',
  'app.spec.ts-snapshots'
);

const readSpecRequirements = () => {
  const specContents = fs.readFileSync(specPath, 'utf8');
  const scrubbedContents = specContents.replace(/```[\s\S]*?```/g, '');
  const requirements = new Map();
  const ordered = [];
  let match;

  while ((match = specRegex.exec(scrubbedContents)) !== null) {
    const id = match[1];
    const title = match[2];

    if (requirements.has(id)) {
      throw new Error(`Duplicate requirement ID in SPEC.md: ${id}`);
    }

    const entry = { id, title, order: ordered.length };
    requirements.set(id, entry);
    ordered.push(entry);
  }

  return { requirements, ordered };
};

const walkDir = (dir, results, extensionMatch) => {
  if (!fs.existsSync(dir)) {
    return;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (fullPath.startsWith(ignoredSnapshotsDir)) {
      continue;
    }

    if (entry.isDirectory()) {
      if (ignoredDirNames.has(entry.name)) {
        continue;
      }
      walkDir(fullPath, results, extensionMatch);
      continue;
    }

    if (entry.isFile() && extensionMatch(entry.name)) {
      results.push(fullPath);
    }
  }
};

const collectTestFiles = () => {
  const files = [];
  for (const root of testFileRoots) {
    walkDir(root.root, files, root.extensionMatch);
  }
  return files;
};

const extractReferencedRequirements = (filePath) => {
  const contents = fs.readFileSync(filePath, 'utf8');
  const references = [];
  const testTitleRegex = /(?:^|[^\w.])(?:it|test)(?:\.only|\.skip)?\(\s*(["'])(.*?)\1/gs;
  let match;

  while ((match = testTitleRegex.exec(contents)) !== null) {
    const title = match[2];
    const idMatch = title.match(idPrefixRegex);
    if (!idMatch) {
      continue;
    }

    references.push({
      reqId: idMatch[1],
      testTitle: title,
      filePath: path.relative(repoRoot, filePath),
    });
  }

  return references;
};

const writeMatrixOutputs = (orderedRequirements, references) => {
  fs.mkdirSync(outputDir, { recursive: true });

  const referenceMap = new Map();
  for (const ref of references) {
    if (!referenceMap.has(ref.reqId)) {
      referenceMap.set(ref.reqId, []);
    }
    referenceMap.get(ref.reqId).push(ref);
  }

  const generatedAt = new Date().toISOString();
  const markdownLines = [
    '# Verification Matrix (SPEC.md ↔ tests)',
    '',
    `Generated: ${generatedAt}`,
    '',
  ];

  for (const req of orderedRequirements) {
    const reqRefs = referenceMap.get(req.id) || [];
    markdownLines.push(`## ${req.id} — ${req.title}`);
    markdownLines.push(`Tests (${reqRefs.length}):`);

    if (reqRefs.length === 0) {
      markdownLines.push('- (none)');
    } else {
      for (const ref of reqRefs) {
        markdownLines.push(`- ${ref.filePath} — "${ref.testTitle}"`);
      }
    }

    markdownLines.push('');
  }

  fs.writeFileSync(matrixMdPath, `${markdownLines.join('\n')}`);

  const jsonOutput = {
    generatedAt,
    requirements: orderedRequirements.map((req) => ({
      id: req.id,
      title: req.title,
      tests: (referenceMap.get(req.id) || []).map((ref) => ({
        file: ref.filePath,
        title: ref.testTitle,
      })),
    })),
  };

  fs.writeFileSync(matrixJsonPath, `${JSON.stringify(jsonOutput, null, 2)}\n`);
};

const main = () => {
  const { requirements, ordered } = readSpecRequirements();
  const testFiles = collectTestFiles();
  const references = testFiles.flatMap((filePath) => extractReferencedRequirements(filePath));

  writeMatrixOutputs(ordered, references);

  const unknownReferences = references.filter((ref) => !requirements.has(ref.reqId));
  if (unknownReferences.length > 0) {
    const lines = ['Unknown requirement IDs referenced by tests:'];
    for (const ref of unknownReferences) {
      lines.push(`- ${ref.reqId} (${ref.filePath}: "${ref.testTitle}")`);
    }
    console.error(lines.join('\n'));
    process.exitCode = 1;
  }
};

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
