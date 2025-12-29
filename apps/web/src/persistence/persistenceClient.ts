import { createPersistStore } from "../storage/createPersistStore";
import { buildGraphFromSnapshot } from "./graph";
import { createPersistence } from "./persistence";
import type { Persistence } from "./persistence";
import { FORMAT_VERSIONS } from "./versions";
import type { DatasetMeta, RepoSnapshot } from "./types";

let persistencePromise: Promise<Persistence> | null = null;

function shouldForceMemory(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get("storage") === "memory";
}

export async function getPersistence(): Promise<Persistence> {
  if (!persistencePromise) {
    persistencePromise = createPersistStore({ forceMemory: shouldForceMemory() }).then((store) =>
      createPersistence(store, {
        parseGraph: async (snapshot: RepoSnapshot) => buildGraphFromSnapshot(snapshot),
      })
    );
  }
  return persistencePromise;
}

export function createDatasetMeta(input: { id: string; label?: string; source?: string }): DatasetMeta {
  const now = Date.now();
  return {
    id: input.id,
    label: input.label,
    source: input.source,
    createdAt: now,
    updatedAt: now,
    snapshotFormatVersion: FORMAT_VERSIONS.snapshot,
    graphFormatVersion: FORMAT_VERSIONS.graph,
    uiStateFormatVersion: FORMAT_VERSIONS.uiState,
  };
}

export function registerPersistenceDebugHelpers() {
  if (typeof window === "undefined") {
    return;
  }
  if (!import.meta.env.DEV) {
    return;
  }
  const debug = window as Window & {
    __graphdownDebug?: {
      clearPersistence: () => Promise<void>;
    };
  };

  debug.__graphdownDebug = {
    clearPersistence: async () => {
      const persistence = await getPersistence();
      await persistence.clearAll();
    },
  };
}
