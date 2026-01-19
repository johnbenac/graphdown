const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const root = process.cwd();

const forbiddenFiles = [
  'docs/spec/dataset-validity.md',
  'docs/oom-bundle-2026-01-16.txt',
  'docs/oom-handoff-2026-01-16.md'
];

const forbiddenDirs = ['docs/debt', 'docs/memos'];

const errors = [];

for (const relPath of forbiddenFiles) {
  const fullPath = path.join(root, relPath);
  if (fs.existsSync(fullPath)) {
    errors.push(`Forbidden file exists: ${relPath}`);
  }
}

for (const relDir of forbiddenDirs) {
  const fullDir = path.join(root, relDir);
  if (fs.existsSync(fullDir)) {
    errors.push(`Forbidden directory exists: ${relDir}`);
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(fullPath));
      continue;
    }
    if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

function collectImports(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const imports = [];
  const importRegex = /import\s+[^;]*?\s+from\s+['"]([^'"]+)['"]/g;
  const dynamicImportRegex = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
  const requireRegex = /require\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const regex of [importRegex, dynamicImportRegex, requireRegex]) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      imports.push({ spec: match[1], index: match.index });
    }
  }
  return imports;
}

function isForbiddenImport(spec) {
  if (spec.startsWith('@graphdown/core/')) {
    return true;
  }
  if (spec.includes('packages/core/src')) {
    return true;
  }
  if (/(^|\/)core\/src\//.test(spec)) {
    return true;
  }
  return false;
}

const importRoots = ['apps/web/src', 'packages/runtime/src'];
for (const importRoot of importRoots) {
  const fullRoot = path.join(root, importRoot);
  if (!fs.existsSync(fullRoot)) {
    continue;
  }
  const files = walk(fullRoot).filter((file) => file.endsWith('.ts') || file.endsWith('.tsx'));
  for (const file of files) {
    const imports = collectImports(file);
    for (const entry of imports) {
      if (isForbiddenImport(entry.spec)) {
        errors.push(`Forbidden deep import in ${path.relative(root, file)}: ${entry.spec}`);
      }
    }
  }
}

function listTrackedSourceFiles() {
  const output = execSync('git ls-files', { encoding: 'utf8' }).trim();
  if (!output) {
    return [];
  }
  return output
    .split('\n')
    .filter((file) => file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs'))
    .filter((file) => !file.startsWith('packages/io-zip/'));
}

const zipModuleName = ['ff', 'late'].join('');
const zipModuleImportRegexes = [
  new RegExp(`from\\s+['"]${zipModuleName}['"]`),
  new RegExp(`require\\(\\s*['"]${zipModuleName}['"]\\s*\\)`)
];
const zipModuleViolations = [];
for (const file of listTrackedSourceFiles()) {
  const fullPath = path.join(root, file);
  const text = fs.readFileSync(fullPath, 'utf8');
  if (zipModuleImportRegexes.some((regex) => regex.test(text))) {
    zipModuleViolations.push(file);
  }
}

if (zipModuleViolations.length > 0) {
  for (const file of zipModuleViolations) {
    errors.push(`Forbidden ${zipModuleName} import outside packages/io-zip: ${file}`);
  }
}

if (errors.length > 0) {
  console.error('Repository guardrails failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Repository guardrails: ok');
