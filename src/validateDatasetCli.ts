import fs from 'node:fs';
import path from 'node:path';
import { makeError } from './core/errors';
import { loadRepoSnapshotFromFs } from './core/snapshot';
import { validateDatasetSnapshot } from './core/validateDatasetSnapshot';
import { formatJson, formatPretty } from './cli/output';

type ParsedArgs = {
  datasetPath?: string;
  json: boolean;
  pretty: boolean;
  error?: string;
};

const USAGE = `Usage: graphdown validate <datasetPath> [--json|--pretty]
       graphdown <datasetPath> [--json|--pretty]`;

function parseArgs(args: string[]): ParsedArgs {
  let datasetPath: string | undefined;
  let json = false;
  let pretty = false;
  let error: string | undefined;

  for (const arg of args) {
    if (arg === '--json') {
      json = true;
      continue;
    }
    if (arg === '--pretty') {
      pretty = true;
      continue;
    }
    if (arg.startsWith('--')) {
      error = `Unknown option: ${arg}`;
      break;
    }
    if (!datasetPath) {
      datasetPath = arg;
      continue;
    }
    error = `Unexpected argument: ${arg}`;
    break;
  }

  if (!error && !datasetPath) {
    error = 'Missing dataset path.';
  }
  if (!error && json && pretty) {
    error = 'Cannot use --json and --pretty together.';
  }

  return { datasetPath, json, pretty, error };
}

function writeStdout(text: string): void {
  fs.writeFileSync(1, text);
}

function writeStderr(text: string): void {
  fs.writeFileSync(2, text);
}

function printUsage(message?: string): void {
  if (message) {
    writeStderr(`${message}\n`);
  }
  writeStderr(`${USAGE}\n`);
}

function isGithubUrl(value: string): boolean {
  return /^https?:\/\/github\.com\//i.test(value);
}

export function main(argv: string[] = process.argv.slice(2)): void {
  const parsed = parseArgs(argv);
  const outputMode = parsed.json ? 'json' : 'pretty';

  if (parsed.error) {
    const error = makeError('E_USAGE', parsed.error);
    if (outputMode === 'json') {
      writeStdout(formatJson({ ok: false, errors: [error] }));
    } else {
      printUsage(parsed.error);
    }
    process.exit(2);
  }

  const datasetPath = parsed.datasetPath as string;

  if (isGithubUrl(datasetPath)) {
    const error = makeError(
      'E_GITHUB_URL_UNSUPPORTED',
      'Validation of remote GitHub URLs is not supported. Clone the repository locally and provide its path instead.'
    );
    if (outputMode === 'json') {
      writeStdout(formatJson({ ok: false, errors: [error] }));
    } else {
      writeStderr(formatPretty([error]));
    }
    process.exit(2);
  }

  const rootPath = path.resolve(datasetPath);

  if (!fs.existsSync(rootPath) || !fs.statSync(rootPath).isDirectory()) {
    const error = makeError(
      'E_INTERNAL',
      `Dataset path ${rootPath} does not exist or is not a directory`
    );
    if (outputMode === 'json') {
      writeStdout(formatJson({ ok: false, errors: [error] }));
    } else {
      writeStderr(formatPretty([error]));
    }
    process.exit(2);
  }

  try {
    const snapshot = loadRepoSnapshotFromFs(rootPath);
    const result = validateDatasetSnapshot(snapshot);
    if (result.ok) {
      if (outputMode === 'json') {
        writeStdout(formatJson({ ok: true, errors: [] }));
      } else {
        writeStdout('Validation passed: dataset is valid.\n');
      }
      return;
    }
    if (outputMode === 'json') {
      writeStdout(formatJson({ ok: false, errors: result.errors }));
    } else {
      writeStderr(formatPretty(result.errors));
    }
    process.exit(1);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const error = makeError('E_INTERNAL', `Unexpected error: ${message}`);
    if (outputMode === 'json') {
      writeStdout(formatJson({ ok: false, errors: [error] }));
    } else {
      writeStderr(formatPretty([error]));
    }
    process.exit(2);
  }
}
