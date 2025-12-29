import { spawn } from 'node:child_process';
import path from 'node:path';

const usage = `Usage: graphdown validate <datasetPath|githubUrl> [--json|--pretty] [--ref <ref>] [--subdir <path>]
       graphdown <datasetPath|githubUrl> [--json|--pretty] [--ref <ref>] [--subdir <path>]`;

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error(usage);
  process.exit(2);
}

const [commandOrPath, ...rest] = args;
let forwardedArgs: string[];

if (commandOrPath === 'validate') {
  if (rest.length === 0) {
    console.error(usage);
    process.exit(2);
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
  process.exit(2);
});

child.on('close', (code, signal) => {
  if (signal) {
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
