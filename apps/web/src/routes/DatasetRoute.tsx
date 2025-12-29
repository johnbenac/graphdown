import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";
import { useDataset } from "../state/DatasetContext";

export default function DatasetRoute() {
  const { activeDataset, error } = useDataset();
  const sidebar = (
    <div>
      {error ? <p className="warning-text">{error}</p> : null}
      {activeDataset ? (
        <div>
          <strong>Active dataset</strong>
          <p>{activeDataset.meta.label ?? activeDataset.id}</p>
        </div>
      ) : (
        <p>No datasets loaded.</p>
      )}
    </div>
  );

  return (
    <AppShell sidebar={sidebar}>
      <section data-testid="dataset-screen">
        <h1>Datasets</h1>
        {activeDataset ? (
          <div className="dataset-summary">
            <p>
              <strong>Dataset:</strong> {activeDataset.meta.label ?? activeDataset.id}
            </p>
            <p>
              <strong>Files:</strong> {activeDataset.repoSnapshot.files.size}
            </p>
            <p>
              <strong>Graph nodes:</strong> {activeDataset.parsedGraph?.nodesById.size ?? 0}
            </p>
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
