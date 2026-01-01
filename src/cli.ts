import fs from 'node:fs';
import { main as validateMain } from './validateDatasetCli';

const usage = `Usage: graphdown validate <datasetPath> [--json|--pretty]
       graphdown <datasetPath> [--json|--pretty]`;

const args = process.argv.slice(2);

if (args.length === 0) {
  fs.writeFileSync(2, `${usage}\n`);
  process.exit(2);
}

const [commandOrPath, ...rest] = args;
let forwardedArgs: string[];

if (commandOrPath === 'validate') {
  if (rest.length === 0) {
    fs.writeFileSync(2, `${usage}\n`);
    process.exit(2);
  }
  forwardedArgs = rest;
} else {
  forwardedArgs = [commandOrPath, ...rest];
}

validateMain(forwardedArgs);
