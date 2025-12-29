import { spawnSync } from 'node:child_process';
import path from 'node:path';

const args = process.argv.slice(2);
const validateScript = path.resolve(__dirname, '..', 'validateDataset.js');

const result = spawnSync('node', [validateScript, ...args], {
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
