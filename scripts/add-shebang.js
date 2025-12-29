const fs = require('fs');
const path = require('path');

const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');

if (!fs.existsSync(cliPath)) {
  console.error(`Cannot add shebang: ${cliPath} does not exist.`);
  process.exit(1);
}

const content = fs.readFileSync(cliPath, 'utf8');
if (content.startsWith('#!')) {
  process.exit(0);
}

const updated = `#!/usr/bin/env node\n${content}`;
fs.writeFileSync(cliPath, updated);
