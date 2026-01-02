export type ValidationErrorCode =
  | 'E_DIR_MISSING'
  | 'E_FRONT_MATTER_MISSING'
  | 'E_FRONT_MATTER_UNTERMINATED'
  | 'E_YAML_INVALID'
  | 'E_YAML_NOT_OBJECT'
  | 'E_REQUIRED_FIELD_MISSING'
  | 'E_FORBIDDEN_TOP_LEVEL_KEY'
  | 'E_INVALID_IDENTIFIER'
  | 'E_ID_PREFIX_INVALID'
  | 'E_TYPEID_MISMATCH'
  | 'E_UNKNOWN_RECORD_DIR'
  | 'E_DUPLICATE_ID'
  | 'E_DUPLICATE_RECORD_TYPE_ID'
  | 'E_RECORD_TYPE_ID_INVALID'
  | 'E_COMPOSITION_SCHEMA_INVALID'
  | 'E_COMPOSITION_UNKNOWN_TYPE'
  | 'E_COMPOSITION_CONSTRAINT_VIOLATION'
  | 'E_UTF8_INVALID'
  | 'E_BLOB_PATH_INVALID'
  | 'E_BLOB_DIGEST_MISMATCH'
  | 'E_BLOB_REFERENCE_MISSING'
  | 'E_GITHUB_URL_UNSUPPORTED'
  | 'E_USAGE'
  | 'E_INTERNAL';

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  file?: string;
  hint?: string;
}

export function makeError(
  code: ValidationErrorCode,
  message: string,
  file?: string,
  hint?: string
): ValidationError {
  return { code, message, file, hint };
}
