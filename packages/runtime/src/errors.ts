import type { ValidationErrorCode } from '@graphdown/dataset';

export type RuntimeApiError = {
  code: ValidationErrorCode;
  message: string;
  op: string;
  file?: string;
  hint?: string;
  details?: Record<string, unknown>;
  stack?: string;
};

function captureStack(message: string): string | undefined {
  const error = new Error(message);
  return typeof error.stack === 'string' ? error.stack : undefined;
}

export function makeRuntimeApiError(
  input: Omit<RuntimeApiError, 'stack'> & { stack?: string }
): RuntimeApiError {
  return {
    ...input,
    stack: input.stack ?? captureStack(`${input.op}: ${input.message}`)
  };
}

export function isRuntimeApiError(value: unknown): value is RuntimeApiError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.code === 'string' &&
    typeof record.message === 'string' &&
    typeof record.op === 'string'
  );
}

export function fail(
  op: string,
  code: ValidationErrorCode,
  message: string,
  extras?: Omit<RuntimeApiError, 'op' | 'code' | 'message'>
): never {
  throw makeRuntimeApiError({ op, code, message, ...extras });
}
