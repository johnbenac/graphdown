import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { buildGraphFromSnapshot } from "../../../../src/core/graph";
import type { RepoSnapshot } from "../../../../src/core/snapshotTypes";
import { validateDatasetSnapshot } from "../../../../src/core/validateDatasetSnapshot";
import { loadGitHubSnapshot, GitHubApiError } from "../import/github/loadGitHubSnapshot";
import { mapGitHubError } from "../import/github/mapGitHubError";
import { parseGitHubUrl } from "../import/github/parseGitHubUrl";
import { readZipSnapshot } from "../import/readZipSnapshot";
import { createPersistence } from "../persistence/persistence";
import type { LoadedDataset } from "../persistence/types";
import { FORMAT_VERSIONS } from "../persistence/versions";
import { createPersistStore } from "../storage/createPersistStore";
import type { ImportErrorState, ImportProgress } from "./importTypes";

type DatasetContextValue = {
  status: "idle" | "loading" | "ready" | "error";
  progress: ImportProgress;
  activeDataset?: LoadedDataset;
  error?: ImportErrorState;
  importDatasetZip: (file: File) => Promise<void>;
  importDatasetFromGitHub: (url: string) => Promise<void>;
  clearPersistence: () => Promise<void>;
};

const DatasetContext = createContext<DatasetContextValue | undefined>(undefined);

function createDatasetId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `dataset-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function parseGraph(snapshot: RepoSnapshot) {
  const result = buildGraphFromSnapshot(snapshot);
  if (!result.ok) {
    const errorMessages = result.errors.map((error) => error.message).join("\n");
    throw new Error(`Graph parsing failed:\n${errorMessages}`);
  }
  return result.graph;
}

function buildGitHubLabel(parsed: { owner: string; repo: string; ref?: string }) {
  const base = `${parsed.owner}/${parsed.repo}`;
  if (parsed.ref) {
    return `${base}@${parsed.ref}`;
  }
  return base;
}

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<DatasetContextValue["status"]>("idle");
  const [progress, setProgress] = useState<ImportProgress>({ phase: "idle" });
  const [activeDataset, setActiveDataset] = useState<LoadedDataset | undefined>(undefined);
  const [error, setError] = useState<ImportErrorState | undefined>(undefined);

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
        setError(undefined);
      }
    };
  }, [persistence]);

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
            message: "The uploaded dataset does not meet the spec requirements.",
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
            message: "Dataset records failed to parse.",
            errors: graphResult.errors
          });
          return;
        }
        setProgress({ phase: "persisting" });
        const datasetId = createDatasetId();
        const now = Date.now();
        const meta = {
          id: datasetId,
          createdAt: now,
          updatedAt: now,
          snapshotFormatVersion: FORMAT_VERSIONS.snapshot,
          graphFormatVersion: FORMAT_VERSIONS.graph,
          uiStateFormatVersion: FORMAT_VERSIONS.uiState,
          label: file.name,
          source: "import"
        };
        await persistence.saveDataset({ datasetId, meta, repoSnapshot, parsedGraph: graphResult.graph });
        await persistence.setActiveDatasetId(datasetId);
        setActiveDataset({ meta, repoSnapshot, parsedGraph: graphResult.graph });
        setProgress({ phase: "done" });
        setStatus("ready");
      } catch (err) {
        console.warn("Failed to import dataset.", err);
        setStatus("error");
        setProgress({ phase: "idle" });
        setError({
          category: "unknown",
          title: "Import failed",
          message: err instanceof Error ? err.message : "Failed to import dataset."
        });
      }
    },
    [persistence]
  );

  const importDatasetFromGitHub = useCallback(
    async (url: string) => {
      setStatus("loading");
      setError(undefined);
      setProgress({ phase: "validating_url" });

      const parsed = parseGitHubUrl(url);
      if (!parsed.ok) {
        setStatus("error");
        setProgress({ phase: "idle" });
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
          onProgress: setProgress
        });

        setProgress({ phase: "validating_dataset" });
        const validation = validateDatasetSnapshot(repoSnapshot);
        if (!validation.ok) {
          setStatus("error");
          setError({
            category: "dataset_invalid",
            title: "Dataset invalid",
            message: "The repository does not meet the dataset spec requirements.",
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
            message: "Dataset records failed to parse.",
            errors: graphResult.errors
          });
          return;
        }

        setProgress({ phase: "persisting" });
        const datasetId = createDatasetId();
        const now = Date.now();
        const meta = {
          id: datasetId,
          createdAt: now,
          updatedAt: now,
          snapshotFormatVersion: FORMAT_VERSIONS.snapshot,
          graphFormatVersion: FORMAT_VERSIONS.graph,
          uiStateFormatVersion: FORMAT_VERSIONS.uiState,
          label: buildGitHubLabel(parsed.value),
          source: parsed.value.canonicalRepoUrl
        };
        await persistence.saveDataset({ datasetId, meta, repoSnapshot, parsedGraph: graphResult.graph });
        await persistence.setActiveDatasetId(datasetId);
        setActiveDataset({ meta, repoSnapshot, parsedGraph: graphResult.graph });
        setProgress({ phase: "done" });
        setStatus("ready");
      } catch (err) {
        console.warn("Failed to import dataset from GitHub.", err);
        setStatus("error");
        setProgress({ phase: "idle" });
        if (err instanceof GitHubApiError) {
          if (err.stage !== "repo" && err.status === 404) {
            setError({
              category: "dataset_invalid",
              title: "Dataset invalid",
              message: "Required dataset files were not found in the repository.",
              errors: [
                {
                  code: "E_DIR_MISSING",
                  message: "Repository is missing required dataset directories."
                }
              ]
            });
            return;
          }
          setError(mapGitHubError({ status: err.status, headers: err.headers, message: err.message }));
          return;
        }
        if (err instanceof TypeError) {
          setError({
            category: "network",
            title: "Network error",
            message: "Network request failed. Check your connection and try again."
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
    [persistence]
  );

  const clearPersistence = useCallback(async () => {
    await persistence.clearAll();
    setActiveDataset(undefined);
    setStatus("ready");
    setProgress({ phase: "idle" });
    setError(undefined);
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
        clearPersistence
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
