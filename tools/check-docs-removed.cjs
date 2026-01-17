const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const forbiddenPaths = [
  'docs/spec/dataset-validity.md',
  'docs/debt',
  'docs/memos'
];

const violations = [];
for (const rel of forbiddenPaths) {
  const fullPath = path.join(root, rel);
  if (fs.existsSync(fullPath)) {
    violations.push(rel);
  }
}

if (violations.length > 0) {
  console.error('Forbidden docs reintroduced:', violations.join(', '));
  process.exit(1);
}

console.log('Docs tombstone check ok.');
