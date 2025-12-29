#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';

const usage = `Usage: graphdown validate <datasetPath>
       graphdown <datasetPath>`;

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error(usage);
  process.exit(1);
}

const [commandOrPath, ...rest] = args;
let forwardedArgs: string[];

if (commandOrPath === 'validate') {
  if (rest.length === 0) {
    console.error(usage);
    process.exit(1);
  }
  forwardedArgs = rest;
} else {
  forwardedArgs = [commandOrPath, ...rest];
}

const validatorPath = path.resolve(__dirname, '..', 'validateDataset.js');
const child = spawn(process.execPath, [validatorPath, ...forwardedArgs], {
  stdio: 'inherit'
});

child.on('error', (error) => {
  console.error('Failed to run validator:', error.message);
  process.exit(1);
});

child.on('close', (code, signal) => {
  if (signal) {
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
