import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { buildGraphFromSnapshot, parseMarkdownRecord } from "../../../../src/core/graph";
import { makeError, type ValidationError } from "../../../../src/core/errors";
import { serializeMarkdownRecord } from "../../../../src/core/markdownRecord";
import type { RepoSnapshot } from "../../../../src/core/snapshotTypes";
import { isObject } from "../../../../src/core/types";
import { validateDatasetSnapshot } from "../../../../src/core/validateDatasetSnapshot";
import { loadGitHubSnapshot } from "../import/github/loadGitHubSnapshot";
import { GitHubImportError } from "../import/github/mapGitHubError";
import { parseGitHubUrl } from "../import/github/parseGitHubUrl";
import { readZipSnapshot } from "../import/readZipSnapshot";
import { createPersistence } from "../persistence/persistence";
import type { LoadedDataset } from "../persistence/types";
import { FORMAT_VERSIONS } from "../persistence/versions";
import { createPersistStore } from "../storage/createPersistStore";

export type ImportErrorCategory =
  | "invalid_url"
  | "not_found"
  | "auth_required"
  | "rate_limited"
  | "dataset_invalid"
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

export type ImportPhase =
  | "idle"
  | "validating_url"
  | "fetching_repo"
  | "listing_files"
  | "downloading_files"
  | "validating_dataset"
  | "building_graph"
  | "persisting"
  | "done";

export type ImportProgress =
  | { phase: "idle" }
  | { phase: Exclude<ImportPhase, "downloading_files">; detail?: string }
  | { phase: "downloading_files"; completed: number; total: number; detail?: string };

type DatasetContextValue = {
  status: "idle" | "loading" | "ready" | "error";
  progress: ImportProgress;
  activeDataset?: LoadedDataset;
  error?: ImportErrorState;
  importDatasetZip: (file: File) => Promise<void>;
  importDatasetFromGitHub: (url: string) => Promise<void>;
  clearPersistence: () => Promise<void>;
  updateRecord: (input: {
    recordId: string;
    nextFields: Record<string, unknown>;
    nextBody: string;
  }) => Promise<{ ok: true } | { ok: false; errors: ValidationError[] }>;
  createRecord: (input: {
    recordTypeId: string;
    id: string;
    fields: Record<string, unknown>;
    body: string;
  }) => Promise<{ ok: true; id: string } | { ok: false; errors: ValidationError[] }>;
};

const DatasetContext = createContext<DatasetContextValue | undefined>(undefined);

function createDatasetId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `dataset-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toText(raw: Uint8Array) {
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder("utf-8").decode(raw);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(raw).toString("utf8");
  }
  return String.fromCharCode(...raw);
}

function stripUndefined(input: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

async function parseGraph(snapshot: RepoSnapshot) {
  const result = buildGraphFromSnapshot(snapshot);
  if (!result.ok) {
    const errorMessages = result.errors.map((error) => error.message).join("\n");
    throw new Error(`Graph parsing failed:\n${errorMessages}`);
  }
  return result.graph;
}

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<DatasetContextValue["status"]>("idle");
  const [activeDataset, setActiveDataset] = useState<LoadedDataset | undefined>(undefined);
  const [error, setError] = useState<ImportErrorState | undefined>(undefined);
  const [progress, setProgress] = useState<ImportProgress>({ phase: "idle" });

  const store = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const forceMemory = searchParams.get("storage") === "memory";
    return createPersistStore({ forceMemory, logger: console });
  }, []);

  const persistence = useMemo(
    () => createPersistence({ store, parseGraph, logger: console }),
    [store]
  );

  const loadActive = useCallback(async () => {
    setStatus("loading");
    setError(undefined);
    setProgress({ phase: "idle" });
    try {
      const dataset = await persistence.loadActiveDataset();
      setActiveDataset(dataset);
      setStatus("ready");
    } catch (err) {
      console.warn("Failed to load persisted dataset.", err);
      setActiveDataset(undefined);
      setStatus("error");
      setError({
        category: "unknown",
        title: "Failed to load dataset",
        message: err instanceof Error ? err.message : "Failed to load dataset."
      });
    }
  }, [persistence]);

  useEffect(() => {
    loadActive();
  }, [loadActive]);

  useEffect(() => {
    (window as Window & { __appDebug?: { clearPersistence: () => Promise<void> } }).__appDebug = {
      clearPersistence: async () => {
        await persistence.clearAll();
        setActiveDataset(undefined);
        setStatus("ready");
        setProgress({ phase: "idle" });
      }
    };
  }, [persistence]);

  const saveDataset = useCallback(
    async (label: string, repoSnapshot: RepoSnapshot, parsedGraph: Awaited<ReturnType<typeof parseGraph>>) => {
      const datasetId = createDatasetId();
      const now = Date.now();
      const meta = {
        id: datasetId,
        createdAt: now,
        updatedAt: now,
        snapshotFormatVersion: FORMAT_VERSIONS.snapshot,
        graphFormatVersion: FORMAT_VERSIONS.graph,
        uiStateFormatVersion: FORMAT_VERSIONS.uiState,
        label,
        source: "import"
      };
      await persistence.saveDataset({ datasetId, meta, repoSnapshot, parsedGraph });
      await persistence.setActiveDatasetId(datasetId);
      setActiveDataset({ meta, repoSnapshot, parsedGraph });
    },
    [persistence]
  );

  const commitSnapshot = useCallback(
    async (
      nextSnapshot: RepoSnapshot
    ): Promise<
      | { ok: true; parsedGraph: Awaited<ReturnType<typeof parseGraph>> }
      | { ok: false; errors: ValidationError[] }
    > => {
      if (!activeDataset) {
        return { ok: false, errors: [makeError("E_INTERNAL", "No active dataset loaded.")] };
      }
      const validation = validateDatasetSnapshot(nextSnapshot);
      if (!validation.ok) {
        return { ok: false, errors: validation.errors };
      }
      const graphResult = buildGraphFromSnapshot(nextSnapshot);
      if (!graphResult.ok) {
        return { ok: false, errors: graphResult.errors };
      }
      const datasetId = activeDataset.meta.id;
      const nextMeta = {
        ...activeDataset.meta,
        updatedAt: Date.now()
      };
      await persistence.saveDataset({
        datasetId,
        meta: nextMeta,
        repoSnapshot: nextSnapshot,
        parsedGraph: graphResult.graph
      });
      setActiveDataset({ meta: nextMeta, repoSnapshot: nextSnapshot, parsedGraph: graphResult.graph });
      return { ok: true, parsedGraph: graphResult.graph };
    },
    [activeDataset, persistence]
  );

  const updateRecord = useCallback(
    async (input: {
      recordId: string;
      nextFields: Record<string, unknown>;
      nextBody: string;
    }): Promise<{ ok: true } | { ok: false; errors: ValidationError[] }> => {
      if (!activeDataset) {
        return { ok: false, errors: [makeError("E_INTERNAL", "No active dataset loaded.")] };
      }
      const node = activeDataset.parsedGraph.nodesById.get(input.recordId);
      if (!node || node.kind !== "record") {
        return { ok: false, errors: [makeError("E_INTERNAL", "Record not found.")] };
      }
      const raw = activeDataset.repoSnapshot.files.get(node.file);
      if (!raw) {
        return { ok: false, errors: [makeError("E_INTERNAL", "Record file missing.")] };
      }
      const text = toText(raw);
      const parsed = parseMarkdownRecord(text, node.file);
      if (!parsed.ok) {
        return { ok: false, errors: [parsed.error] };
      }
      const yaml = parsed.yaml;
      const existingFields = isObject(yaml.fields) ? yaml.fields : {};
      const mergedFields = stripUndefined({ ...existingFields, ...input.nextFields });
      const nextYaml: Record<string, unknown> = { ...yaml };
      nextYaml.id = yaml.id;
      nextYaml.datasetId = yaml.datasetId;
      nextYaml.typeId = yaml.typeId;
      nextYaml.createdAt = yaml.createdAt;
      nextYaml.updatedAt = new Date().toISOString();
      nextYaml.fields = mergedFields;
      const markdown = serializeMarkdownRecord({ yaml: nextYaml, body: input.nextBody ?? "" });
      const nextFiles = new Map(activeDataset.repoSnapshot.files);
      nextFiles.set(node.file, new TextEncoder().encode(markdown));
      const nextSnapshot: RepoSnapshot = { files: nextFiles };
      const commit = await commitSnapshot(nextSnapshot);
      if (!commit.ok) {
        return { ok: false, errors: commit.errors };
      }
      return { ok: true };
    },
    [activeDataset, commitSnapshot]
  );

  const createRecord = useCallback(
    async (input: {
      recordTypeId: string;
      id: string;
      fields: Record<string, unknown>;
      body: string;
    }): Promise<{ ok: true; id: string } | { ok: false; errors: ValidationError[] }> => {
      if (!activeDataset) {
        return { ok: false, errors: [makeError("E_INTERNAL", "No active dataset loaded.")] };
      }
      if (!activeDataset.parsedGraph.typesByRecordTypeId.has(input.recordTypeId)) {
        return {
          ok: false,
          errors: [makeError("E_UNKNOWN_RECORD_DIR", "Record type is not defined for this dataset.")]
        };
      }
      const datasetNode = [...activeDataset.parsedGraph.nodesById.values()].find(
        (node) => node.kind === "dataset"
      );
      if (!datasetNode) {
        return { ok: false, errors: [makeError("E_INTERNAL", "Dataset record missing.")] };
      }
      const rawId = input.id.trim();
      const safeId = rawId.replace(/[^A-Za-z0-9_-]+/g, "-") || "record";
      const basePath = `records/${input.recordTypeId}/record--${safeId}`;
      let filePath = `${basePath}.md`;
      let counter = 2;
      while (activeDataset.repoSnapshot.files.has(filePath)) {
        filePath = `${basePath}-${counter}.md`;
        counter += 1;
      }
      const now = new Date().toISOString();
      const yaml: Record<string, unknown> = {
        id: rawId,
        datasetId: datasetNode.id,
        typeId: input.recordTypeId,
        createdAt: now,
        updatedAt: now,
        fields: stripUndefined(input.fields)
      };
      const markdown = serializeMarkdownRecord({ yaml, body: input.body ?? "" });
      const nextFiles = new Map(activeDataset.repoSnapshot.files);
      nextFiles.set(filePath, new TextEncoder().encode(markdown));
      const nextSnapshot: RepoSnapshot = { files: nextFiles };
      const commit = await commitSnapshot(nextSnapshot);
      if (!commit.ok) {
        return { ok: false, errors: commit.errors };
      }
      return { ok: true, id: rawId };
    },
    [activeDataset, commitSnapshot]
  );

  const importDatasetZip = useCallback(
    async (file: File) => {
      setStatus("loading");
      setError(undefined);
      setProgress({ phase: "validating_dataset" });
      try {
        const repoSnapshot = await readZipSnapshot(file);
        const validation = validateDatasetSnapshot(repoSnapshot);
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
        setProgress({ phase: "building_graph" });
        const graphResult = buildGraphFromSnapshot(repoSnapshot);
        if (!graphResult.ok) {
          setStatus("error");
          setError({
            category: "dataset_invalid",
            title: "Dataset invalid",
            message: "Dataset records could not be parsed.",
            errors: graphResult.errors
          });
          return;
        }
        setProgress({ phase: "persisting" });
        await saveDataset(file.name, repoSnapshot, graphResult.graph);
        setStatus("ready");
        setProgress({ phase: "done" });
      } catch (err) {
        console.warn("Failed to import dataset.", err);
        setStatus("error");
        setError({
          category: "unknown",
          title: "Import failed",
          message: err instanceof Error ? err.message : "Failed to import dataset."
        });
      }
    },
    [saveDataset]
  );

  const importDatasetFromGitHub = useCallback(
    async (url: string) => {
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
        const repoSnapshot = await loadGitHubSnapshot({
          owner: parsed.value.owner,
          repo: parsed.value.repo,
          ref: parsed.value.ref,
          onProgress: (progress) => setProgress(progress)
        });

        setProgress({ phase: "validating_dataset" });
        const validation = validateDatasetSnapshot(repoSnapshot);
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

        setProgress({ phase: "building_graph" });
        const graphResult = buildGraphFromSnapshot(repoSnapshot);
        if (!graphResult.ok) {
          setStatus("error");
          setError({
            category: "dataset_invalid",
            title: "Dataset invalid",
            message: "Dataset records could not be parsed.",
            errors: graphResult.errors
          });
          return;
        }

        setProgress({ phase: "persisting" });
        await saveDataset(parsed.value.canonicalRepoUrl, repoSnapshot, graphResult.graph);
        setStatus("ready");
        setProgress({ phase: "done" });
      } catch (err) {
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
    [saveDataset]
  );

  const clearPersistence = useCallback(async () => {
    await persistence.clearAll();
    setActiveDataset(undefined);
    setStatus("ready");
    setProgress({ phase: "idle" });
  }, [persistence]);

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
