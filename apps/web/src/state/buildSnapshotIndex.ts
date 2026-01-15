import type { DatasetSnapshot, ValidationError } from "@graphdown/core";
import { makeError, parseMarkdownRecord } from "@graphdown/core";

export type SnapshotIndex = {
  typeFileById: Map<string, string>;
  recordFileByKey: Map<string, string>;
};

const textDecoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8") : null;

function decodeBytes(raw: Uint8Array): string {
  if (textDecoder) {
    return textDecoder.decode(raw);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(raw).toString("utf8");
  }
  return String.fromCharCode(...raw);
}

export function buildSnapshotIndex(
  snapshot: DatasetSnapshot
): { ok: true; index: SnapshotIndex } | { ok: false; errors: ValidationError[] } {
  const typeFileById = new Map<string, string>();
  const recordFileByKey = new Map<string, string>();
  const errors: ValidationError[] = [];

  for (const [filePath, bytes] of snapshot.files.entries()) {
    let text = "";
    try {
      text = decodeBytes(bytes);
    } catch (err) {
      errors.push(
        makeError(
          "E_INTERNAL",
          err instanceof Error ? err.message : "Failed to decode UTF-8 contents.",
          filePath
        )
      );
      continue;
    }

    const parsed = parseMarkdownRecord(text, filePath);
    if (!parsed.ok) {
      errors.push(parsed.error);
      continue;
    }

    const { typeId, recordId } = parsed.yaml;
    if (typeof typeId !== "string") {
      continue;
    }

    if (typeof recordId === "string") {
      const recordKey = `${typeId}:${recordId}`;
      if (recordFileByKey.has(recordKey)) {
        errors.push(makeError("E_DUPLICATE_ID", `Duplicate record identity: ${recordKey}.`, filePath));
        continue;
      }
      recordFileByKey.set(recordKey, filePath);
      continue;
    }

    if (typeFileById.has(typeId)) {
      errors.push(makeError("E_DUPLICATE_ID", `Duplicate type identity: ${typeId}.`, filePath));
      continue;
    }
    typeFileById.set(typeId, filePath);
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    index: {
      typeFileById,
      recordFileByKey
    }
  };
}
