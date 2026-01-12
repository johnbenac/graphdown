import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ValidationError } from "@graphdown/core";
import { makeError } from "@graphdown/core";
import { canonicalizeDatasetSnapshot } from "@graphdown/core";
import { buildRecordLinkGraphFromSnapshot } from "@graphdown/core";
import { parseMarkdownRecord, serializeMarkdownRecord } from "@graphdown/core";
import type { DatasetSnapshot } from "@graphdown/core";
import { validateDatasetSnapshot } from "@graphdown/core";
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

export type DatasetContextValue = {
  status: "idle" | "loading" | "ready" | "error";
  progress: ImportProgress;
  activeDataset?: LoadedDataset;
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

async function buildRecordLinkGraphOrThrow(snapshot: DatasetSnapshot) {
  const result = buildRecordLinkGraphFromSnapshot(snapshot);
  if (!result.ok) {
    const errorMessages = result.errors.map((error) => error.message).join("\n");
    throw new Error(`Record Link Graph build failed:\n${errorMessages}`);
  }
  return result.graph;
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

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<DatasetContextValue["status"]>("idle");
  const [activeDataset, setActiveDataset] = useState<LoadedDataset | undefined>(undefined);
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
      setActiveDataset(dataset);
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
        setStatus("ready");
        setProgress({ phase: "idle" });
      }
    };
  }, [persistence]);

  const saveActiveDataset = useCallback(
    async (
      label: string,
      datasetSnapshot: DatasetSnapshot,
      recordLinkGraph: Awaited<ReturnType<typeof buildRecordLinkGraphOrThrow>>,
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
      await persistence.saveActiveDataset({ meta, datasetSnapshot, recordLinkGraph });
      setActiveDataset({ meta, datasetSnapshot, recordLinkGraph });
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
        const validation = validateDatasetSnapshot(rawSnapshot);
        if (!validation.ok) {
          setStatus("error");
          setError({
            category: "dataset_invalid",
            title: "Dataset invalid",
            message: "This dataset does not meet the required structure.",
            errors: validation.errors
          });
          return;
        }
        const datasetSnapshot = canonicalizeDatasetSnapshot(rawSnapshot);
        const importReport = buildImportReport({
          rawSnapshot,
          canonicalSnapshot: datasetSnapshot,
          ignored
        });
        setProgress({ phase: "building_record_link_graph" });
        const recordLinkGraphResult = buildRecordLinkGraphFromSnapshot(datasetSnapshot);
        if (!recordLinkGraphResult.ok) {
          setStatus("error");
          setError({
            category: "dataset_invalid",
            title: "Dataset invalid",
            message: "Dataset records could not be parsed.",
            errors: recordLinkGraphResult.errors
          });
          return;
        }
        setProgress({ phase: "persisting" });
        persisted = true;
        await saveActiveDataset(file.name, datasetSnapshot, recordLinkGraphResult.graph, importReport);
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
        const validation = validateDatasetSnapshot(rawSnapshot);
        if (!validation.ok) {
          setStatus("error");
          setError({
            category: "dataset_invalid",
            title: "Dataset invalid",
            message: "This dataset does not meet the required structure.",
            errors: validation.errors
          });
          return;
        }

        const datasetSnapshot = canonicalizeDatasetSnapshot(rawSnapshot);
        const importReport: ImportReport = buildImportReport({
          rawSnapshot,
          canonicalSnapshot: datasetSnapshot,
          ignored
        });
        setProgress({ phase: "building_record_link_graph" });
        const recordLinkGraphResult = buildRecordLinkGraphFromSnapshot(datasetSnapshot);
        if (!recordLinkGraphResult.ok) {
          setStatus("error");
          setError({
            category: "dataset_invalid",
            title: "Dataset invalid",
            message: "Dataset records could not be parsed.",
            errors: recordLinkGraphResult.errors
          });
          return;
        }

        setProgress({ phase: "persisting" });
        persisted = true;
        await saveActiveDataset(parsed.value.canonicalRepoUrl, datasetSnapshot, recordLinkGraphResult.graph, importReport);
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
    setStatus("ready");
    setProgress({ phase: "idle" });
  }, [persistence]);

  const commitSnapshot = useCallback(
    async (
      nextSnapshot: DatasetSnapshot
    ): Promise<
      | { ok: true; recordLinkGraph: Awaited<ReturnType<typeof buildRecordLinkGraphOrThrow>> }
      | { ok: false; errors: ValidationError[] }
    > => {
      const validation = validateDatasetSnapshot(nextSnapshot);
      if (!validation.ok) {
        return { ok: false, errors: validation.errors } as const;
      }
      const recordLinkGraphResult = buildRecordLinkGraphFromSnapshot(nextSnapshot);
      if (!recordLinkGraphResult.ok) {
        return { ok: false, errors: recordLinkGraphResult.errors } as const;
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
        datasetSnapshot: nextSnapshot,
        recordLinkGraph: recordLinkGraphResult.graph
      });
      setActiveDataset({ meta: nextMeta, datasetSnapshot: nextSnapshot, recordLinkGraph: recordLinkGraphResult.graph });
      return { ok: true, recordLinkGraph: recordLinkGraphResult.graph } as const;
    },
    [activeDataset, persistence]
  );

  const updateRecord = useCallback<DatasetContextValue["updateRecord"]>(
    async (input: {
      recordKey: string;
      nextFields: Record<string, unknown>;
      nextBody: string;
    }) => {
      if (!activeDataset?.recordLinkGraph) {
        return { ok: false, errors: [makeError("E_INTERNAL", "No active dataset is loaded.")] } as const;
      }
      const node = activeDataset.recordLinkGraph.nodesByIdentity.get(input.recordKey);
      if (!node || node.kind !== "record") {
        return { ok: false, errors: [makeError("E_INTERNAL", "Record not found.")] } as const;
      }
      const currentBytes = activeDataset.datasetSnapshot.files.get(node.file);
      if (!currentBytes) {
        return {
          ok: false,
          errors: [makeError("E_INTERNAL", "Record file missing from snapshot.", node.file)]
        } as const;
      }
      const parsed = parseMarkdownRecord(decodeBytes(currentBytes), node.file);
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
      nextFiles.set(node.file, encodeText(nextText));
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
      if (!activeDataset?.recordLinkGraph) {
        return { ok: false, errors: [makeError("E_INTERNAL", "No active dataset is loaded.")] } as const;
      }
      const trimmedRecordId = input.recordId.trim();
      if (!trimmedRecordId) {
        return { ok: false, errors: [makeError("E_USAGE", "Record ID is required.")] } as const;
      }
      if (!activeDataset.recordLinkGraph.typesById.has(input.typeId)) {
        return {
          ok: false,
          errors: [makeError("E_UNKNOWN_RECORD_DIR", "Unknown record type.", input.typeId)]
        } as const;
      }
      const recordKey = `${input.typeId}:${trimmedRecordId}`;
      if (activeDataset.recordLinkGraph.nodesByIdentity.has(recordKey)) {
        return {
          ok: false,
          errors: [makeError("E_DUPLICATE_ID", `Record id ${trimmedRecordId} already exists.`)]
        } as const;
      }
      const safeId = trimmedRecordId.replace(/[^A-Za-z0-9_-]+/g, "-");
      let filePath = `records/${input.typeId}/record--${safeId}.md`;
      let counter = 1;
      while (activeDataset.datasetSnapshot.files.has(filePath)) {
        counter += 1;
        filePath = `records/${input.typeId}/record--${safeId}-${counter}.md`;
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
