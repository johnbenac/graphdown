import type { ImportErrorInfo } from "./types";

export class ImportError extends Error {
  readonly info: ImportErrorInfo;

  constructor(info: ImportErrorInfo) {
    super(info.message);
    this.name = "ImportError";
    this.info = info;
  }
}

export function isImportError(error: unknown): error is ImportError {
  if (!error || typeof error !== "object") {
    return false;
  }
  const maybe = error as { info?: unknown };
  if (!maybe.info || typeof maybe.info !== "object") {
    return false;
  }
  const info = maybe.info as { source?: unknown; code?: unknown; message?: unknown };
  return (
    (info.source === "zip" || info.source === "github") &&
    typeof info.code === "string" &&
    typeof info.message === "string"
  );
}
