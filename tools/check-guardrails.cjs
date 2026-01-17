const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function fail(message) {
  console.error(`Guardrail violation: ${message}`);
  process.exitCode = 1;
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function walk(dir, callback) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, callback);
    } else if (entry.isFile()) {
      callback(fullPath);
    }
  }
}

const forbiddenDocs = ['docs/spec/dataset-validity.md', 'docs/debt', 'docs/memos'];
for (const forbidden of forbiddenDocs) {
  if (exists(forbidden)) {
    fail(`Remove ${forbidden}; tombstone/debt/memo docs are not allowed.`);
  }
}

const docsRoot = path.join(repoRoot, 'docs');
if (fs.existsSync(docsRoot)) {
  walk(docsRoot, (filePath) => {
    const relative = path.relative(repoRoot, filePath).split(path.sep).join('/');
    const baseName = path.basename(filePath);
    if (baseName.startsWith('oom-')) {
      fail(`Remove ${relative}; OOM handoff artifacts are not allowed.`);
    }
  });
}

const forbiddenImportChecks = [
  {
    regex: /^@graphdown\/core\//,
    message: 'Use @graphdown/core barrel imports only.'
  },
  {
    regex: /core\/src/,
    message: 'Do not import core/src via deep paths.'
  },
  {
    regex: /packages\/core\/src/,
    message: 'Do not import packages/core/src directly.'
  }
];

function extractImportSpecifiers(contents) {
  const specifiers = [];
  const importRegex =
    /\bimport\s+[^'"]*?\s+from\s+['"]([^'"]+)['"]|\bimport\s+['"]([^'"]+)['"]|\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = importRegex.exec(contents)) !== null) {
    const specifier = match[1] || match[2] || match[3];
    if (specifier) {
      specifiers.push(specifier);
    }
  }
  return specifiers;
}

const sourceRoots = ['apps/web/src', 'packages/runtime/src'];
for (const root of sourceRoots) {
  const absoluteRoot = path.join(repoRoot, root);
  if (!fs.existsSync(absoluteRoot)) {
    continue;
  }
  walk(absoluteRoot, (filePath) => {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
      return;
    }
    const contents = fs.readFileSync(filePath, 'utf8');
    const specifiers = extractImportSpecifiers(contents);
    for (const specifier of specifiers) {
      for (const { regex, message } of forbiddenImportChecks) {
        if (regex.test(specifier)) {
          const relative = path.relative(repoRoot, filePath).split(path.sep).join('/');
          fail(`${message} Offending file: ${relative}.`);
        }
      }
    }
  });
}

if (!process.exitCode) {
  console.log('Guardrails: ok');
}
