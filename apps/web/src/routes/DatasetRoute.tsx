import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";
import Button from "../components/Button";
import { useDataset } from "../state/DatasetContext";

export default function DatasetRoute() {
  const { state, actions } = useDataset();

  const sidebar =
    state.status === "ready" ? (
      <div className="sidebar-stack">
        <p className="sidebar-label">Active dataset</p>
        <p className="sidebar-value">{state.dataset.meta.label ?? state.dataset.meta.id}</p>
        <p className="sidebar-meta">{state.dataset.parsedGraph.summary}</p>
      </div>
    ) : (
      <p>No datasets loaded.</p>
    );

  return (
    <AppShell sidebar={sidebar}>
      <section data-testid="dataset-screen">
        <h1>Datasets</h1>
        {state.status === "ready" ? (
          <div className="dataset-details">
            <div>
              <h2>{state.dataset.meta.label ?? "Imported dataset"}</h2>
              <p className="dataset-meta">
                Imported {new Date(state.dataset.repoSnapshot.importedAt).toLocaleString()}
              </p>
              <p className="dataset-meta">{state.dataset.parsedGraph.summary}</p>
            </div>
            <Button type="button" variant="secondary" onClick={actions.clearPersistence}>
              Clear local data
            </Button>
          </div>
        ) : state.status === "loading" ? (
          <p>Loading persisted dataset…</p>
        ) : state.status === "error" ? (
          <EmptyState title="Unable to load datasets">
            <p>Try re-importing a dataset.</p>
            <Link to="/import">Go to import</Link>
          </EmptyState>
        ) : (
          <EmptyState title="Import a dataset to begin">
            <Link to="/import">Go to import</Link>
          </EmptyState>
        )}
      </section>
    </AppShell>
  );
}
