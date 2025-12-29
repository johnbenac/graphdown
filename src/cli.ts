#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';

const args = process.argv.slice(2);
const usage = `Usage: graphdown validate <datasetPath>
       graphdown <datasetPath>`;

function printUsageAndExit() {
  console.error(usage);
  process.exit(1);
}

if (args.length === 0) {
  printUsageAndExit();
}

const normalizedArgs = [...args];
if (normalizedArgs[0] === 'validate') {
  normalizedArgs.shift();
}

if (normalizedArgs.length === 0) {
  printUsageAndExit();
}

const datasetPath = normalizedArgs[0];
const validatorPath = path.resolve(__dirname, '..', 'validateDataset.js');

const child = spawn(process.execPath, [validatorPath, datasetPath], {
  stdio: 'inherit',
});

child.on('close', (code) => {
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(`Failed to run validator: ${error.message}`);
  process.exit(1);
});
