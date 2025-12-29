import { spawnSync } from 'node:child_process';
import path from 'node:path';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: graphdown <datasetPath>');
  process.exit(1);
}

const scriptPath = path.resolve(__dirname, '..', 'validateDataset.js');
const result = spawnSync(process.execPath, [scriptPath, ...args], {
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
