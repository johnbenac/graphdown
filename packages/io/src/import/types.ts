import type { DatasetSnapshot } from "@graphdown/core";

export type ImportSource = "zip" | "github";

export type ImportResult = {
  snapshot: DatasetSnapshot;
  ignored: string[];
};

export type ImportErrorCode =
  | "not_found"
  | "auth_required"
  | "rate_limited"
  | "missing_files"
  | "invalid_input"
  | "unknown";

export type ImportErrorInfo = {
  source: ImportSource;
  code: ImportErrorCode;
  message: string;
  httpStatus?: number;
  missingPaths?: string[];
  retryAfterSeconds?: number;
};
