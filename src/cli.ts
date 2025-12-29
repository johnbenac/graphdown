#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const usage = `Usage: graphdown validate <datasetPath>\n       graphdown <datasetPath>`;

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(usage);
  process.exit(1);
}

if (args[0] === 'validate') {
  args.shift();
}

const datasetPath = args[0];
if (!datasetPath) {
  console.error(usage);
  process.exit(1);
}

const validatorPath = path.resolve(__dirname, '..', 'validateDataset.js');
const child = spawn(process.execPath, [validatorPath, datasetPath], {
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(`Failed to run validator: ${error.message}`);
  process.exit(1);
});

child.on('close', (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 1);
});
