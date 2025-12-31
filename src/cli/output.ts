import { ValidationError, ValidationErrorCode } from '../core/errors';

const hintMap: Partial<Record<ValidationErrorCode, string>> = {
  E_DIR_MISSING: 'Ensure dataset root contains datasets/, types/, and records/.',
  E_DATASET_FILE_COUNT:
    'datasets/ must contain exactly one .md dataset file directly under datasets/ (no nested dataset manifests).',
  E_FRONT_MATTER_MISSING:
    'Add YAML front matter delimited by --- at the top of the file.',
  E_FRONT_MATTER_UNTERMINATED:
    'Close YAML front matter with a second ---.',
  E_RECORD_TYPE_ID_INVALID:
    'Use a stable identifier like note, project_task, research-paper (no spaces or "/").',
  E_GITHUB_URL_UNSUPPORTED:
    'Clone the repository and validate the local folder path instead.',
  E_USAGE: 'Provide a dataset path and valid flags.',
  E_INTERNAL: 'Re-run with NODE_DEBUG=graphdown or open an issue.'
};

function applyHints(errors: ValidationError[]): ValidationError[] {
  return errors.map((error) => {
    if (error.hint) {
      return error;
    }
    const hint = hintMap[error.code];
    if (!hint) {
      return error;
    }
    return { ...error, hint };
  });
}

function compareErrors(a: ValidationError, b: ValidationError): number {
  const aHasFile = Boolean(a.file);
  const bHasFile = Boolean(b.file);
  if (aHasFile && !bHasFile) return -1;
  if (!aHasFile && bHasFile) return 1;
  if (a.file && b.file && a.file !== b.file) {
    return a.file.localeCompare(b.file);
  }
  if (a.code !== b.code) {
    return a.code.localeCompare(b.code);
  }
  return a.message.localeCompare(b.message);
}

function sortErrors(errors: ValidationError[]): ValidationError[] {
  return [...errors].sort(compareErrors);
}

export function formatPretty(errors: ValidationError[]): string {
  const sorted = sortErrors(applyHints(errors));
  const lines = [`Validation failed with ${sorted.length} error(s):`];
  for (const error of sorted) {
    lines.push(` - [${error.code}] ${error.message}`);
    if (error.file) {
      lines.push(`   file: ${error.file}`);
    }
    if (error.hint) {
      lines.push(`   hint: ${error.hint}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

export function formatJson(result: {
  ok: boolean;
  errors: ValidationError[];
}): string {
  const sorted = sortErrors(applyHints(result.errors)).map((error) => ({
    code: error.code,
    message: error.message,
    file: error.file ?? null,
    hint: error.hint ?? null
  }));
  return `${JSON.stringify({ ok: result.ok, errors: sorted })}\n`;
}
