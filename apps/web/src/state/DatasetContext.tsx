import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { buildGraphFromSnapshot } from "../../../../src/core/graph";
import type { RepoSnapshot } from "../../../../src/core/snapshotTypes";
import { readZipSnapshot } from "../import/readZipSnapshot";
import { createPersistence } from "../persistence/persistence";
import type { LoadedDataset } from "../persistence/types";
import { FORMAT_VERSIONS } from "../persistence/versions";
import { createPersistStore } from "../storage/createPersistStore";

type DatasetContextValue = {
  status: "idle" | "loading" | "ready" | "error";
  activeDataset?: LoadedDataset;
  error?: string;
  importDataset: (file: File) => Promise<void>;
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

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<DatasetContextValue["status"]>("idle");
  const [activeDataset, setActiveDataset] = useState<LoadedDataset | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

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
    try {
      const dataset = await persistence.loadActiveDataset();
      setActiveDataset(dataset);
      setStatus("ready");
    } catch (err) {
      console.warn("Failed to load persisted dataset.", err);
      setActiveDataset(undefined);
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to load dataset.");
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
      }
    };
  }, [persistence]);

  const importDataset = useCallback(
    async (file: File) => {
      setStatus("loading");
      setError(undefined);
      try {
        const repoSnapshot = await readZipSnapshot(file);
        const parsedGraph = await parseGraph(repoSnapshot);
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
        await persistence.saveDataset({ datasetId, meta, repoSnapshot, parsedGraph });
        await persistence.setActiveDatasetId(datasetId);
        setActiveDataset({ meta, repoSnapshot, parsedGraph });
        setStatus("ready");
      } catch (err) {
        console.warn("Failed to import dataset.", err);
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to import dataset.");
      }
    },
    [persistence]
  );

  const clearPersistence = useCallback(async () => {
    await persistence.clearAll();
    setActiveDataset(undefined);
    setStatus("ready");
  }, [persistence]);

  return (
    <DatasetContext.Provider value={{ status, activeDataset, error, importDataset, clearPersistence }}>
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
