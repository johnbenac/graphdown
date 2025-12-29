const fs = require('fs');
const path = require('path');

const cliPath = path.resolve(__dirname, '..', 'dist', 'cli.js');
const shebang = '#!/usr/bin/env node';

if (!fs.existsSync(cliPath)) {
  console.warn(`CLI output not found at ${cliPath}`);
  process.exit(0);
}

const contents = fs.readFileSync(cliPath, 'utf8');
if (contents.startsWith(shebang)) {
  process.exit(0);
}

fs.writeFileSync(cliPath, `${shebang}\n${contents}`, 'utf8');
