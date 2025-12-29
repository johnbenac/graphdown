export type ValidationErrorCode =
  | 'E_DIR_MISSING'
  | 'E_DATASET_FILE_COUNT'
  | 'E_FRONT_MATTER_MISSING'
  | 'E_FRONT_MATTER_UNTERMINATED'
  | 'E_YAML_INVALID'
  | 'E_YAML_NOT_OBJECT'
  | 'E_REQUIRED_FIELD_MISSING'
  | 'E_ID_PREFIX_INVALID'
  | 'E_DATASET_ID_MISMATCH'
  | 'E_TYPEID_MISMATCH'
  | 'E_UNKNOWN_RECORD_DIR'
  | 'E_DUPLICATE_ID'
  | 'E_DUPLICATE_RECORD_TYPE_ID'
  | 'E_DATASET_FIELDS_MISSING'
  | 'E_GITHUB_URL_INVALID_FORMAT'
  | 'E_GITHUB_NOT_FOUND'
  | 'E_GITHUB_AUTH_REQUIRED'
  | 'E_GITHUB_RATE_LIMITED'
  | 'E_GITHUB_REF_NOT_FOUND'
  | 'E_GITHUB_FETCH_FAILED'
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
