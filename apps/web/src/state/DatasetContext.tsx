import type { Graph, RepoSnapshot } from "@graphdown/core";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { parseGraphFromSnapshot } from "../persistence/parseGraph";
import { createPersistStore } from "../storage/createPersistStore";
import {
  createDatasetMeta,
  createPersistence,
  type DatasetMeta,
  type Persistence,
  type PersistedUiState,
} from "../persistence/persistence";

export interface ActiveDataset {
  id: string;
  meta: DatasetMeta;
  repoSnapshot: RepoSnapshot;
  parsedGraph?: Graph;
  uiState?: PersistedUiState;
}

interface DatasetContextValue {
  activeDataset: ActiveDataset | null;
  status: "loading" | "ready";
  error: string | null;
  importDataset: (input: {
    label?: string;
    source?: string;
    repoSnapshot: RepoSnapshot;
    parsedGraph: Graph;
  }) => Promise<void>;
  clearPersistence: () => Promise<void>;
}

const DatasetContext = createContext<DatasetContextValue | undefined>(undefined);

function buildDatasetId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `dataset-${Math.random().toString(16).slice(2)}`;
}

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [persistence, setPersistence] = useState<Persistence | null>(null);
  const [activeDataset, setActiveDataset] = useState<ActiveDataset | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const store = await createPersistStore();
      const persistenceService = createPersistence(store, { parseGraph: parseGraphFromSnapshot });

      if (cancelled) {
        return;
      }

      setPersistence(persistenceService);

      try {
        const loaded = await persistenceService.loadActiveDataset();
        if (!cancelled) {
          setActiveDataset(
            loaded
              ? {
                  id: loaded.meta.id,
                  meta: loaded.meta,
                  repoSnapshot: loaded.repoSnapshot,
                  parsedGraph: loaded.parsedGraph,
                  uiState: loaded.uiState,
                }
              : null
          );
        }
      } catch (loadError) {
        console.warn("Unable to restore dataset.", loadError);
        if (!cancelled) {
          setError("Unable to restore the last dataset.");
        }
      } finally {
        if (!cancelled) {
          setStatus("ready");
        }
      }

      if (!cancelled && typeof window !== "undefined") {
        window.__graphdownDebug = {
          clearPersistence: async () => {
            await persistenceService.clearAll();
            setActiveDataset(null);
          },
        };
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<DatasetContextValue>(() => {
    const importDataset = async (input: {
      label?: string;
      source?: string;
      repoSnapshot: RepoSnapshot;
      parsedGraph: Graph;
    }) => {
      if (!persistence) {
        throw new Error("Persistence not ready.");
      }
      const datasetId = buildDatasetId();
      const meta = createDatasetMeta({
        id: datasetId,
        label: input.label,
        source: input.source,
      });
      await persistence.saveDataset({
        datasetId,
        meta,
        repoSnapshot: input.repoSnapshot,
        parsedGraph: input.parsedGraph,
      });
      setActiveDataset({
        id: datasetId,
        meta,
        repoSnapshot: input.repoSnapshot,
        parsedGraph: input.parsedGraph,
      });
      setError(null);
    };

    const clearPersistence = async () => {
      if (!persistence) {
        return;
      }
      await persistence.clearAll();
      setActiveDataset(null);
    };

    return {
      activeDataset,
      status,
      error,
      importDataset,
      clearPersistence,
    };
  }, [activeDataset, error, persistence, status]);

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export function useDataset(): DatasetContextValue {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error("useDataset must be used within DatasetProvider");
  }
  return context;
}
