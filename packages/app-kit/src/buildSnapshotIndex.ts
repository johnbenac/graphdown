import type { DatasetSnapshot, ValidationError } from "@graphdown/core";
import { makeError, parseMarkdownRecord } from "@graphdown/core";

export type SnapshotIndex = {
  typeFileById: Map<string, string>;
  recordFileByKey: Map<string, string>;
};

const textDecoder =
  typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8", { fatal: true }) : null;

function dirNamePosix(filePath: string): string {
  const lastSlash = filePath.lastIndexOf("/");
  if (lastSlash === -1) {
    return "";
  }
  return filePath.slice(0, lastSlash);
}

function joinPosix(dir: string, rel: string): string {
  if (!dir) {
    return rel;
  }
  return `${dir}/${rel}`;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function listPluginFilesToSkip(snapshot: DatasetSnapshot): Set<string> {
  const skip = new Set<string>();

  for (const [filePath, bytes] of snapshot.files.entries()) {
    const decoded = decodeBytes(bytes, filePath);
    if (!decoded.ok) {
      continue;
    }
    const parsed = parseMarkdownRecord(decoded.text, filePath);
    if (!parsed.ok) {
      continue;
    }
    if (typeof parsed.yaml.pluginId !== "string") {
      continue;
    }
    skip.add(filePath);
    const dir = dirNamePosix(filePath);
    const files = isStringArray(parsed.yaml.files) ? parsed.yaml.files : [];
    const binaryFiles = isStringArray(parsed.yaml.binaryFiles) ? parsed.yaml.binaryFiles : [];
    for (const rel of [...files, ...binaryFiles]) {
      if (!rel || rel.startsWith("/") || rel.includes("..")) {
        continue;
      }
      skip.add(joinPosix(dir, rel));
    }
  }

  return skip;
}

function decodeBytes(
  bytes: Uint8Array,
  filePath: string
): { ok: true; text: string } | { ok: false; error: ValidationError } {
  if (textDecoder) {
    try {
      return { ok: true, text: textDecoder.decode(bytes) };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to decode UTF-8 bytes";
      return { ok: false, error: makeError("E_INTERNAL", message, filePath) };
    }
  }
  if (typeof Buffer !== "undefined") {
    return { ok: true, text: Buffer.from(bytes).toString("utf8") };
  }
  return { ok: false, error: makeError("E_INTERNAL", "TextDecoder not available", filePath) };
}

export function buildSnapshotIndex(
  snapshot: DatasetSnapshot
): { ok: true; index: SnapshotIndex } | { ok: false; errors: ValidationError[] } {
  const typeFileById = new Map<string, string>();
  const recordFileByKey = new Map<string, string>();
  const errors: ValidationError[] = [];

  const pluginSkip = listPluginFilesToSkip(snapshot);
  const entries = [...snapshot.files.entries()].sort(([a], [b]) => a.localeCompare(b));

  for (const [filePath, bytes] of entries) {
    if (pluginSkip.has(filePath)) {
      continue;
    }
    const decoded = decodeBytes(bytes, filePath);
    if (!decoded.ok) {
      errors.push(decoded.error);
      continue;
    }
    const parsed = parseMarkdownRecord(decoded.text, filePath);
    if (!parsed.ok) {
      continue;
    }
    const typeId = typeof parsed.yaml.typeId === "string" ? parsed.yaml.typeId : null;
    const recordId = typeof parsed.yaml.recordId === "string" ? parsed.yaml.recordId : null;
    if (!typeId) {
      continue;
    }
    if (recordId) {
      const recordKey = `${typeId}:${recordId}`;
      if (recordFileByKey.has(recordKey)) {
        errors.push(makeError("E_DUPLICATE_ID", `Duplicate record identity ${recordKey}`, filePath));
        continue;
      }
      recordFileByKey.set(recordKey, filePath);
      continue;
    }
    if (typeFileById.has(typeId)) {
      errors.push(makeError("E_DUPLICATE_ID", `Duplicate typeId ${typeId}`, filePath));
      continue;
    }
    typeFileById.set(typeId, filePath);
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return { ok: true, index: { typeFileById, recordFileByKey } };
}
