import fs from 'node:fs';
import path from 'node:path';

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

const validatorPath = path.resolve(__dirname, '..', 'validateDataset.js');
// validateDataset.js is CommonJS; import dynamically to avoid bundling differences.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const validatorModule = require(validatorPath) as { main?: (argv?: string[]) => void };

if (typeof validatorModule.main === 'function') {
  validatorModule.main(forwardedArgs);
} else {
  fs.writeFileSync(2, 'Failed to load validator module.\n');
  process.exit(2);
}
