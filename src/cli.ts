#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';

function printUsage(): void {
  console.error('Usage: graphdown validate <datasetPath>');
  console.error('       graphdown <datasetPath>');
}

const args = process.argv.slice(2);

if (args.length === 0) {
  printUsage();
  process.exit(1);
}

let commandArgs = args;
if (commandArgs[0] === 'validate') {
  commandArgs = commandArgs.slice(1);
}

if (commandArgs.length === 0) {
  printUsage();
  process.exit(1);
}

const validatorPath = path.resolve(__dirname, '..', 'validateDataset.js');
const child = spawn(process.execPath, [validatorPath, ...commandArgs], {
  stdio: 'inherit',
});

child.on('error', (error: Error) => {
  console.error(error.message);
  process.exit(1);
});

child.on('close', (code: number | null) => {
  if (typeof code === 'number') {
    process.exit(code);
  }
  process.exit(1);
});
