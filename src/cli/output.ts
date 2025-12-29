import type { ValidationError, ValidationErrorCode } from '../core/errors';

type ValidationResult = { ok: boolean; errors: ValidationError[] };

type NormalizedError = {
  code: ValidationErrorCode;
  message: string;
  file: string | null;
  hint: string | null;
};

const hintByCode: Partial<Record<ValidationErrorCode, string>> = {
  E_DIR_MISSING: 'Ensure dataset root contains datasets/, types/, and records/.',
  E_DATASET_FILE_COUNT: 'datasets/ must contain exactly one .md dataset file.',
  E_FRONT_MATTER_MISSING: 'Add YAML front matter delimited by --- at the top of the file.',
  E_FRONT_MATTER_UNTERMINATED: 'Close YAML front matter with a second ---.',
  E_INTERNAL: 'Re-run with NODE_DEBUG=... or open an issue.',
  E_USAGE: 'Run the CLI with a dataset path and choose at most one output mode.'
};

function withHints(errors: ValidationError[]): ValidationError[] {
  return errors.map((error) => {
    if (error.hint || !hintByCode[error.code]) {
      return error;
    }
    return { ...error, hint: hintByCode[error.code] };
  });
}

function sortErrors(errors: ValidationError[]): ValidationError[] {
  return [...errors].sort((a, b) => {
    const aHasFile = a.file !== undefined;
    const bHasFile = b.file !== undefined;
    if (aHasFile !== bHasFile) {
      return aHasFile ? -1 : 1;
    }
    if (aHasFile && bHasFile && a.file !== b.file) {
      return (a.file ?? '').localeCompare(b.file ?? '');
    }
    if (a.code !== b.code) {
      return a.code.localeCompare(b.code);
    }
    return a.message.localeCompare(b.message);
  });
}

function normalizeErrors(errors: ValidationError[]): NormalizedError[] {
  return sortErrors(withHints(errors)).map((error) => ({
    code: error.code,
    message: error.message,
    file: error.file ?? null,
    hint: error.hint ?? null
  }));
}

export function formatPretty(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return 'Validation passed: dataset is valid.\n';
  }
  const normalized = sortErrors(withHints(errors));
  const lines = [`Validation failed with ${normalized.length} error(s):`];
  for (const error of normalized) {
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

export function formatJson(result: ValidationResult): string {
  const payload = {
    ok: result.ok,
    errors: normalizeErrors(result.errors)
  };
  return `${JSON.stringify(payload)}\n`;
}
