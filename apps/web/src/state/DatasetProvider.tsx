import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { buildParsedGraph } from "../persistence/buildParsedGraph";
import { createPersistence } from "../persistence/persistence";
import { FORMAT_VERSIONS } from "../persistence/versions";
import type { DatasetMeta, ParsedGraph, RepoSnapshot } from "../persistence/types";
import { createPersistStore } from "../storage/createPersistStore";
import { DatasetContext, type DatasetState } from "./DatasetContext";

type DatasetProviderProps = {
  children: ReactNode;
  forceMemory?: boolean;
};

declare global {
  interface Window {
    __appDebug?: {
      clearPersistence: () => Promise<void>;
    };
  }
}

function createDatasetId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `dataset-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

export default function DatasetProvider({ children, forceMemory = false }: DatasetProviderProps) {
  const store = useMemo(() => {
    const shouldForceMemory =
      forceMemory ||
      (typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("storage") === "memory");
    return createPersistStore({ forceMemory: shouldForceMemory });
  }, [forceMemory]);

  const persistence = useMemo(() => createPersistence(store), [store]);
  const [state, setState] = useState<DatasetState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    const loadDataset = async () => {
      try {
        const loaded = await persistence.loadActiveDataset();
        if (!active) {
          return;
        }
        if (!loaded) {
          setState({ status: "empty" });
          return;
        }
        let parsedGraph = loaded.parsedGraph;
        let meta = loaded.meta;
        if (!parsedGraph) {
          parsedGraph = buildParsedGraph(loaded.repoSnapshot);
          meta = {
            ...loaded.meta,
            updatedAt: Date.now(),
            graphFormatVersion: FORMAT_VERSIONS.graph,
          };
          await persistence.saveDataset({
            datasetId: loaded.meta.id,
            meta,
            repoSnapshot: loaded.repoSnapshot,
            parsedGraph,
            uiState: loaded.uiState,
          });
          await persistence.setActiveDatasetId(loaded.meta.id);
        }
        setState({
          status: "ready",
          dataset: {
            meta,
            repoSnapshot: loaded.repoSnapshot,
            parsedGraph,
            uiState: loaded.uiState,
          },
        });
      } catch (error) {
        console.warn("Failed to hydrate dataset from persistence.", error);
        setState({ status: "error", message: "Unable to load stored datasets." });
      }
    };

    loadDataset();
    return () => {
      active = false;
    };
  }, [persistence]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.__appDebug = {
      clearPersistence: async () => {
        await persistence.clearAll();
        setState({ status: "empty" });
      },
    };
  }, [persistence]);

  const importDataset = async (file: File) => {
    setState({ status: "loading" });
    try {
      const buffer = await file.arrayBuffer();
      const snapshot: RepoSnapshot = {
        fileName: file.name,
        bytes: Array.from(new Uint8Array(buffer)),
        importedAt: Date.now(),
      };
      const meta: DatasetMeta = {
        id: createDatasetId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        snapshotFormatVersion: FORMAT_VERSIONS.snapshot,
        graphFormatVersion: FORMAT_VERSIONS.graph,
        uiStateFormatVersion: FORMAT_VERSIONS.uiState,
        label: file.name,
        source: "import",
      };
      const parsedGraph: ParsedGraph = buildParsedGraph(snapshot);

      await persistence.saveDataset({
        datasetId: meta.id,
        meta,
        repoSnapshot: snapshot,
        parsedGraph,
      });
      await persistence.setActiveDatasetId(meta.id);

      setState({
        status: "ready",
        dataset: {
          meta,
          repoSnapshot: snapshot,
          parsedGraph,
        },
      });
      return true;
    } catch (error) {
      console.warn("Failed to import dataset.", error);
      setState({ status: "error", message: "Unable to import dataset." });
      return false;
    }
  };

  const clearPersistence = async () => {
    await persistence.clearAll();
    setState({ status: "empty" });
  };

  return (
    <DatasetContext.Provider value={{ state, actions: { importDataset, clearPersistence } }}>
      {children}
    </DatasetContext.Provider>
  );
}
