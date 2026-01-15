import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ValidationError } from "@graphdown/core";
import { makeError } from "@graphdown/core";
import { canonicalizeDatasetSnapshot } from "@graphdown/core";
import { parseMarkdownRecord, serializeMarkdownRecord } from "@graphdown/core";
import type { DatasetSnapshot } from "@graphdown/core";
import type { RuntimeApiV1 } from "@graphdown/runtime";
import type { ImportProgress } from "../import/types";
export type { ImportProgress } from "../import/types";
import { loadGitHubSnapshot } from "../import/github/loadGitHubSnapshot";
import { GitHubImportError } from "../import/github/mapGitHubError";
import { parseGitHubUrl } from "../import/github/parseGitHubUrl";
import { readZipSnapshot } from "../import/readZipSnapshot";
import { createPersistence } from "../persistence/persistence";
import type { ImportReport, LoadedDataset } from "../persistence/types";
import { createPersistStore } from "../storage/createPersistStore";
import { buildImportReport } from "./importReport";
import { openDatasetSession } from "./openDatasetSession";
import type { SnapshotIndex } from "./openDatasetSession";

export type ImportErrorCategory =
  | "invalid_url"
  | "not_found"
  | "auth_required"
  | "rate_limited"
  | "dataset_invalid"
  | "persistence_unavailable"
  | "network"
  | "unknown";

export type ImportErrorState =
  | {
      category: Exclude<ImportErrorCategory, "dataset_invalid">;
      title: string;
      message: string;
      hint?: string;
      status?: number;
    }
  | {
      category: "dataset_invalid";
      title: string;
      message: string;
      errors: ValidationError[];
    };

type ActiveDataset = LoadedDataset & {
  runtimeApiV1: RuntimeApiV1;
  index: SnapshotIndex;
};

export type DatasetContextValue = {
  status: "idle" | "loading" | "ready" | "error";
  progress: ImportProgress;
  activeDataset?: ActiveDataset;
  error?: ImportErrorState;
  importDatasetZip: (file: File) => Promise<void>;
  importDatasetFromGitHub: (url: string) => Promise<void>;
  clearPersistence: () => Promise<void>;
  updateRecord: (input: {
    recordKey: string;
    nextFields: Record<string, unknown>;
    nextBody: string;
  }) => Promise<{ ok: true } | { ok: false; errors: ValidationError[] }>;
  createRecord: (input: {
    typeId: string;
    recordId: string;
    fields: Record<string, unknown>;
    body: string;
  }) => Promise<{ ok: true; recordKey: string } | { ok: false; errors: ValidationError[] }>;
};

const DatasetContext = createContext<DatasetContextValue | undefined>(undefined);

const textEncoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
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

function encodeText(text: string): Uint8Array {
  if (textEncoder) {
    return textEncoder.encode(text);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(text, "utf8");
  }
  return Uint8Array.from(text.split("").map((char) => char.charCodeAt(0)));
}

function buildPersistenceError(err: unknown): ImportErrorState {
  return {
    category: "persistence_unavailable",
    title: "Browser storage required",
    message:
      err instanceof Error
        ? err.message
        : "IndexedDB failed. Graphdown requires IndexedDB and does not fall back."
  };
}

function mapRuntimeOpenFailure(errors: ValidationError[]): ImportErrorState {
  const internal = errors.find((error) => error.code === "E_INTERNAL");
  if (internal) {
    return {
      category: "unknown",
      title: "Runtime unavailable",
      message: internal.message,
      hint: [
        internal.hint,
        "Your dataset is still saved offline in this browser. Update/reload and try again, or clear offline storage if you want to start over."
      ]
        .filter(Boolean)
        .join(" ")
    };
  }
  return {
    category: "dataset_invalid",
    title: "Dataset invalid",
    message:
      "The dataset could not be opened by the runtime session. Your dataset is still saved offline in this browser. Update/reload and try again, or clear offline storage if you want to start over.",
    errors
  };
}

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<DatasetContextValue["status"]>("idle");
  const [activeDataset, setActiveDataset] = useState<ActiveDataset | undefined>(undefined);
  const [error, setError] = useState<ImportErrorState | undefined>(undefined);
  const [progress, setProgress] = useState<ImportProgress>({ phase: "idle" });

  const { store, storeError } = useMemo(() => {
    try {
      return { store: createPersistStore({ logger: console }) };
    } catch (err) {
      return { storeError: err as Error };
    }
  }, []);

  const persistence = useMemo(() => {
    if (!store) {
      return null;
    }
    return createPersistence({ store });
  }, [store]);

  useEffect(() => {
    if (!storeError) {
      return;
    }
    console.error("Persistence is required but failed to initialize/use IndexedDB.", storeError);
    setActiveDataset(undefined);
    setStatus("error");
    setError(buildPersistenceError(storeError));
  }, [storeError]);

  const loadActive = useCallback(async () => {
    if (!persistence) {
      return;
    }
    setStatus("loading");
    setError(undefined);
    setProgress({ phase: "idle" });
    try {
      const dataset = await persistence.loadActiveDataset();
      if (!dataset) {
        setActiveDataset(undefined);
        setStatus((prev) => (prev === "loading" ? "ready" : prev));
        return;
      }
      const session = await openDatasetSession(dataset.datasetSnapshot);
      if (!session.ok) {
        setActiveDataset(undefined);
        setStatus("error");
        setError(mapRuntimeOpenFailure(session.errors));
        return;
      }
      setActiveDataset({ ...dataset, runtimeApiV1: session.runtimeApiV1, index: session.index });
      setStatus((prev) => (prev === "loading" ? "ready" : prev));
    } catch (err) {
      console.error("Persistence is required but failed to initialize/use IndexedDB.", err);
      setActiveDataset(undefined);
      setStatus("error");
      setError(buildPersistenceError(err));
    }
  }, [persistence]);

  useEffect(() => {
    if (persistence) {
      loadActive();
    }
  }, [loadActive]);

  useEffect(() => {
    if (!persistence) {
      return;
    }
    (window as Window & { __appDebug?: { clearPersistence: () => Promise<void> } }).__appDebug = {
      clearPersistence: async () => {
        await persistence.clearActiveDataset();
        setActiveDataset(undefined);
        setError(undefined);
        setStatus("ready");
        setProgress({ phase: "idle" });
      }
    };
  }, [persistence]);

  const saveActiveDataset = useCallback(
    async (
      label: string,
      datasetSnapshot: DatasetSnapshot,
      runtimeApiV1: RuntimeApiV1,
      index: SnapshotIndex,
      importReport?: ImportReport
    ) => {
      if (!persistence) {
        throw new Error("IndexedDB failed. Graphdown requires IndexedDB and does not fall back.");
      }
      const now = Date.now();
      const meta = {
        id: "active",
        createdAt: now,
        updatedAt: now,
        label,
        source: "import",
        importReport
      };
      await persistence.saveActiveDataset({ meta, datasetSnapshot });
      setActiveDataset({ meta, datasetSnapshot, runtimeApiV1, index });
    },
    [persistence]
  );

  const importDatasetZip = useCallback(
    async (file: File) => {
      let persisted = false;
      setStatus("loading");
      setError(undefined);
      setProgress({ phase: "validating_dataset" });
      try {
        const { snapshot: rawSnapshot, ignored } = await readZipSnapshot(file);
        const validationSession = await openDatasetSession(rawSnapshot);
        if (!validationSession.ok) {
          setStatus("error");
          setError(mapRuntimeOpenFailure(validationSession.errors));
          return;
        }
        const datasetSnapshot = canonicalizeDatasetSnapshot(rawSnapshot);
        const importReport = buildImportReport({
          rawSnapshot,
          canonicalSnapshot: datasetSnapshot,
          ignored
        });
        setProgress({ phase: "opening_runtime" });
        const session = await openDatasetSession(datasetSnapshot);
        if (!session.ok) {
          setStatus("error");
          setError(mapRuntimeOpenFailure(session.errors));
          return;
        }
        setProgress({ phase: "persisting" });
        persisted = true;
        await saveActiveDataset(file.name, datasetSnapshot, session.runtimeApiV1, session.index, importReport);
        setStatus("ready");
        setProgress({ phase: "done" });
      } catch (err) {
        if (persisted) {
          console.error("Persistence is required but failed to write to IndexedDB.", err);
          setStatus("error");
          setError(buildPersistenceError(err));
          return;
        }
        console.warn("Failed to import dataset.", err);
        setStatus("error");
        setError({
          category: "unknown",
          title: "Import failed",
          message: err instanceof Error ? err.message : "Failed to import dataset."
        });
      }
    },
    [saveActiveDataset]
  );

  const importDatasetFromGitHub = useCallback(
    async (url: string) => {
      let persisted = false;
      setStatus("loading");
      setError(undefined);
      setProgress({ phase: "validating_url" });

      const parsed = parseGitHubUrl(url);
      if (!parsed.ok) {
        setStatus("error");
        setError({
          category: "invalid_url",
          title: "Invalid GitHub URL",
          message: parsed.message,
          hint: parsed.hint
        });
        return;
      }

      try {
        const { snapshot: rawSnapshot, ignored } = await loadGitHubSnapshot({
          owner: parsed.value.owner,
          repo: parsed.value.repo,
          ref: parsed.value.ref,
          onProgress: (progress) => setProgress(progress)
        });

        setProgress({ phase: "validating_dataset" });
        const validationSession = await openDatasetSession(rawSnapshot);
        if (!validationSession.ok) {
          setStatus("error");
          setError(mapRuntimeOpenFailure(validationSession.errors));
          return;
        }
        const datasetSnapshot = canonicalizeDatasetSnapshot(rawSnapshot);
        const importReport: ImportReport = buildImportReport({
          rawSnapshot,
          canonicalSnapshot: datasetSnapshot,
          ignored
        });
        setProgress({ phase: "opening_runtime" });
        const session = await openDatasetSession(datasetSnapshot);
        if (!session.ok) {
          setStatus("error");
          setError(mapRuntimeOpenFailure(session.errors));
          return;
        }
        setProgress({ phase: "persisting" });
        persisted = true;
        await saveActiveDataset(
          parsed.value.canonicalRepoUrl,
          datasetSnapshot,
          session.runtimeApiV1,
          session.index,
          importReport
        );
        setStatus("ready");
        setProgress({ phase: "done" });
      } catch (err) {
        if (persisted) {
          console.error("Persistence is required but failed to write to IndexedDB.", err);
          setStatus("error");
          setError(buildPersistenceError(err));
          return;
        }
        console.warn("Failed to import dataset from GitHub.", err);
        setStatus("error");
        if (err instanceof GitHubImportError) {
          setError({
            category: err.info.category,
            title: err.info.title,
            message: err.info.message,
            hint: err.info.hint,
            status: err.info.status
          });
          return;
        }
        if (err instanceof TypeError) {
          setError({
            category: "network",
            title: "Network error",
            message: "We could not reach GitHub. Check your connection and try again."
          });
          return;
        }
        setError({
          category: "unknown",
          title: "Import failed",
          message: err instanceof Error ? err.message : "Failed to import dataset."
        });
      }
    },
    [saveActiveDataset]
  );

  const clearPersistence = useCallback(async () => {
    if (!persistence) {
      return;
    }
    await persistence.clearActiveDataset();
    setActiveDataset(undefined);
    setError(undefined);
    setStatus("ready");
    setProgress({ phase: "idle" });
  }, [persistence]);

  const commitSnapshot = useCallback(
    async (
      nextSnapshot: DatasetSnapshot
    ): Promise<{ ok: true } | { ok: false; errors: ValidationError[] }> => {
      const session = await openDatasetSession(nextSnapshot);
      if (!session.ok) {
        return { ok: false, errors: session.errors } as const;
      }
      if (!activeDataset) {
        return {
          ok: false,
          errors: [makeError("E_INTERNAL", "No active dataset is loaded.")]
        } as const;
      }
      if (!persistence) {
        return {
          ok: false,
          errors: [makeError("E_INTERNAL", "Persistence is required but unavailable.")]
        } as const;
      }
      const nextMeta = { ...activeDataset.meta, updatedAt: Date.now() };
      await persistence.saveActiveDataset({
        meta: nextMeta,
        datasetSnapshot: nextSnapshot
      });
      setActiveDataset({
        meta: nextMeta,
        datasetSnapshot: nextSnapshot,
        runtimeApiV1: session.runtimeApiV1,
        index: session.index
      });
      return { ok: true } as const;
    },
    [activeDataset, persistence]
  );

  const updateRecord = useCallback<DatasetContextValue["updateRecord"]>(
    async (input: {
      recordKey: string;
      nextFields: Record<string, unknown>;
      nextBody: string;
    }) => {
      if (!activeDataset) {
        return { ok: false, errors: [makeError("E_INTERNAL", "No active dataset is loaded.")] } as const;
      }
      const filePath = activeDataset.index.recordFileByKey.get(input.recordKey);
      if (!filePath) {
        return { ok: false, errors: [makeError("E_INTERNAL", "Record not found.")] } as const;
      }
      const currentBytes = activeDataset.datasetSnapshot.files.get(filePath);
      if (!currentBytes) {
        return {
          ok: false,
          errors: [makeError("E_INTERNAL", "Record file missing from snapshot.", filePath)]
        } as const;
      }
      const parsed = parseMarkdownRecord(decodeBytes(currentBytes), filePath);
      if (!parsed.ok) {
        return { ok: false, errors: [parsed.error] } as const;
      }
      const nextFields: Record<string, unknown> = { ...input.nextFields };
      for (const [key, value] of Object.entries(nextFields)) {
        if (value === undefined) {
          delete nextFields[key];
        }
      }
      const nextYaml: Record<string, unknown> = {
        typeId: parsed.yaml.typeId,
        recordId: parsed.yaml.recordId,
        ...(Object.prototype.hasOwnProperty.call(parsed.yaml, "parent")
          ? { parent: parsed.yaml.parent }
          : {}),
        fields: nextFields
      };
      const nextText = serializeMarkdownRecord({ yaml: nextYaml, body: input.nextBody ?? "" });
      const nextFiles = new Map(activeDataset.datasetSnapshot.files);
      nextFiles.set(filePath, encodeText(nextText));
      const nextSnapshot = { ...activeDataset.datasetSnapshot, files: nextFiles };
      const commitResult = await commitSnapshot(nextSnapshot);
      if (!commitResult.ok) {
        return { ok: false, errors: commitResult.errors } as const;
      }
      return { ok: true } as const;
    },
    [activeDataset, commitSnapshot]
  );

  const createRecord = useCallback<DatasetContextValue["createRecord"]>(
    async (input: { typeId: string; recordId: string; fields: Record<string, unknown>; body: string }) => {
      if (!activeDataset) {
        return { ok: false, errors: [makeError("E_INTERNAL", "No active dataset is loaded.")] } as const;
      }
      const trimmedRecordId = input.recordId.trim();
      if (!trimmedRecordId) {
        return { ok: false, errors: [makeError("E_USAGE", "Record ID is required.")] } as const;
      }
      const existingType = await activeDataset.runtimeApiV1.getType(input.typeId);
      if (!existingType) {
        return {
          ok: false,
          errors: [makeError("E_UNKNOWN_RECORD_DIR", "Unknown record type.", input.typeId)]
        } as const;
      }
      const recordKey = `${input.typeId}:${trimmedRecordId}`;
      const existingRecord = await activeDataset.runtimeApiV1.getRecord(recordKey);
      if (existingRecord) {
        return {
          ok: false,
          errors: [makeError("E_DUPLICATE_ID", `Record id ${trimmedRecordId} already exists.`)]
        } as const;
      }
      const safeId = trimmedRecordId.replace(/[^A-Za-z0-9_-]+/g, "-");
      const filePath = `records/${input.typeId}.${safeId}/${safeId}.md`;
      if (activeDataset.datasetSnapshot.files.has(filePath)) {
        return {
          ok: false,
          errors: [makeError("E_INTERNAL", "Record file path already exists in snapshot.", filePath)]
        } as const;
      }
      const fields: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(input.fields)) {
        if (value !== undefined) {
          fields[key] = value;
        }
      }
      const yaml: Record<string, unknown> = {
        typeId: input.typeId,
        recordId: trimmedRecordId,
        fields
      };
      const text = serializeMarkdownRecord({ yaml, body: input.body ?? "" });
      const nextFiles = new Map(activeDataset.datasetSnapshot.files);
      nextFiles.set(filePath, encodeText(text));
      const nextSnapshot = { ...activeDataset.datasetSnapshot, files: nextFiles };
      const commitResult = await commitSnapshot(nextSnapshot);
      if (!commitResult.ok) {
        return { ok: false, errors: commitResult.errors } as const;
      }
      return { ok: true, recordKey } as const;
    },
    [activeDataset, commitSnapshot]
  );

  return (
    <DatasetContext.Provider
      value={{
        status,
        progress,
        activeDataset,
        error,
        importDatasetZip,
        importDatasetFromGitHub,
        clearPersistence,
        updateRecord,
        createRecord
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
}

export function useDataset() {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error("useDataset must be used within DatasetProvider");
  }
  return context;
}
