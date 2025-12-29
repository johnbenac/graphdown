import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";
import { getPersistence } from "../persistence/persistenceClient";
import type { PersistedParsedGraph, RepoSnapshot } from "../persistence/types";

type LoadedDataset = {
  meta: {
    label?: string;
    updatedAt: number;
  };
  repoSnapshot: RepoSnapshot;
  parsedGraph?: PersistedParsedGraph;
};

export default function DatasetRoute() {
  const [dataset, setDataset] = useState<LoadedDataset | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const persistence = await getPersistence();
      const active = await persistence.loadActiveDataset();
      if (!cancelled) {
        setDataset(active ?? null);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sidebar = dataset ? (
    <div>
      <p className="sidebar-title">Active dataset</p>
      <p className="sidebar-label">{dataset.meta.label ?? "Untitled dataset"}</p>
      <p className="sidebar-meta">
        Files: {dataset.repoSnapshot.files.size}
        <br />
        Updated: {new Date(dataset.meta.updatedAt).toLocaleString()}
      </p>
    </div>
  ) : (
    <p>No datasets loaded.</p>
  );

  return (
    <AppShell sidebar={sidebar}>
      <section data-testid="dataset-screen">
        <h1>Datasets</h1>
        {dataset ? (
          <div className="dataset-summary">
            <h2>{dataset.meta.label ?? "Imported dataset"}</h2>
            <p>Files loaded: {dataset.repoSnapshot.files.size}</p>
            <p>Graph nodes: {dataset.parsedGraph?.nodes.length ?? 0}</p>
          </div>
        ) : (
          <EmptyState title="Import a dataset to begin">
            <Link to="/import">Go to import</Link>
          </EmptyState>
        )}
      </section>
    </AppShell>
  );
}
