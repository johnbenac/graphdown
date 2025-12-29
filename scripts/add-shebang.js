const fs = require('node:fs');
const path = require('node:path');

const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
const content = fs.readFileSync(cliPath, 'utf8');

if (!content.startsWith('#!')) {
  fs.writeFileSync(cliPath, `#!/usr/bin/env node\n${content}`);
}
