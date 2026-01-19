import {
  deserializeDatasetSnapshotV1,
  serializeDatasetSnapshotV1,
  type SerializedDatasetSnapshotV1
} from "../codec/snapshotCodec";
import type { ImportReport } from "../types";

export const PERSISTED_ACTIVE_DATASET_VERSION = 1 as const;

export type PersistedDatasetMetaV1 = {
  id: string;
  createdAt: number;
  updatedAt: string;
  label?: string;
  source?: string;
  importReport?: ImportReport;
};

export type PersistedActiveDatasetV1 = {
  version: typeof PERSISTED_ACTIVE_DATASET_VERSION;
  snapshot: SerializedDatasetSnapshotV1;
  meta: PersistedDatasetMetaV1;
};

export function encodePersistedActiveDatasetV1(input: {
  snapshot: SerializedDatasetSnapshotV1;
  meta: PersistedDatasetMetaV1;
}): PersistedActiveDatasetV1 {
  return {
    version: PERSISTED_ACTIVE_DATASET_VERSION,
    snapshot: input.snapshot,
    meta: input.meta
  };
}

type DecodeOk = { ok: true; value: PersistedActiveDatasetV1 };

type DecodeErr = { ok: false; error: string };

export function decodePersistedActiveDatasetV1(input: unknown): DecodeOk | DecodeErr {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Expected an object." };
  }
  const record = input as {
    version?: unknown;
    snapshot?: unknown;
    meta?: unknown;
  };
  if (record.version !== PERSISTED_ACTIVE_DATASET_VERSION) {
    return { ok: false, error: "Unsupported version." };
  }
  const snapshotResult = deserializeDatasetSnapshotV1(record.snapshot);
  if (!snapshotResult.ok) {
    return { ok: false, error: `Invalid snapshot: ${snapshotResult.error}` };
  }
  const metaResult = decodePersistedDatasetMetaV1(record.meta);
  if (!metaResult.ok) {
    return { ok: false, error: `Invalid meta: ${metaResult.error}` };
  }
  return {
    ok: true,
    value: {
      version: PERSISTED_ACTIVE_DATASET_VERSION,
      snapshot: serializeDatasetSnapshotV1(snapshotResult.snapshot),
      meta: metaResult.value
    }
  };
}

type MetaDecodeOk = { ok: true; value: PersistedDatasetMetaV1 };

type MetaDecodeErr = { ok: false; error: string };

function decodePersistedDatasetMetaV1(input: unknown): MetaDecodeOk | MetaDecodeErr {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Expected meta to be an object." };
  }
  const meta = input as {
    id?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
    label?: unknown;
    source?: unknown;
    importReport?: unknown;
  };
  if (typeof meta.id !== "string") {
    return { ok: false, error: "Expected meta.id to be a string." };
  }
  if (typeof meta.createdAt !== "number") {
    return { ok: false, error: "Expected meta.createdAt to be a number." };
  }
  if (typeof meta.updatedAt !== "string") {
    return { ok: false, error: "Expected meta.updatedAt to be a string." };
  }
  if (meta.label !== undefined && typeof meta.label !== "string") {
    return { ok: false, error: "Expected meta.label to be a string." };
  }
  if (meta.source !== undefined && typeof meta.source !== "string") {
    return { ok: false, error: "Expected meta.source to be a string." };
  }
  const importReportResult = decodeImportReport(meta.importReport);
  if (!importReportResult.ok) {
    return { ok: false, error: importReportResult.error };
  }
  return {
    ok: true,
    value: {
      id: meta.id,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
      label: meta.label,
      source: meta.source,
      importReport: importReportResult.value
    }
  };
}

type ImportReportDecodeOk = { ok: true; value?: ImportReport };

type ImportReportDecodeErr = { ok: false; error: string };

function decodeImportReport(input: unknown): ImportReportDecodeOk | ImportReportDecodeErr {
  if (input === undefined) {
    return { ok: true, value: undefined };
  }
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Expected importReport to be an object." };
  }
  const report = input as {
    ignoredFileCount?: unknown;
    ignoredFileSample?: unknown;
    droppedBlockCount?: unknown;
    droppedBlockSample?: unknown;
  };
  if (typeof report.ignoredFileCount !== "number") {
    return { ok: false, error: "Expected importReport.ignoredFileCount to be a number." };
  }
  if (!Array.isArray(report.ignoredFileSample) || report.ignoredFileSample.some((s) => typeof s !== "string")) {
    return { ok: false, error: "Expected importReport.ignoredFileSample to be string array." };
  }
  if (typeof report.droppedBlockCount !== "number") {
    return { ok: false, error: "Expected importReport.droppedBlockCount to be a number." };
  }
  if (!Array.isArray(report.droppedBlockSample) || report.droppedBlockSample.some((s) => typeof s !== "string")) {
    return { ok: false, error: "Expected importReport.droppedBlockSample to be string array." };
  }
  return {
    ok: true,
    value: {
      ignoredFileCount: report.ignoredFileCount,
      ignoredFileSample: report.ignoredFileSample,
      droppedBlockCount: report.droppedBlockCount,
      droppedBlockSample: report.droppedBlockSample
    }
  };
}
