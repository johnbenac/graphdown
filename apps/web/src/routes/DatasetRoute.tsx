import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";
import { useDataset } from "../state/DatasetContext";

export default function DatasetRoute() {
  const { activeDataset, status } = useDataset();

  return (
    <AppShell
      sidebar={
        activeDataset ? (
          <div>
            <p>Active dataset:</p>
            <strong>{activeDataset.meta.label ?? activeDataset.meta.id}</strong>
          </div>
        ) : (
          <p>No datasets loaded.</p>
        )
      }
    >
      <section data-testid="dataset-screen">
        <h1>Datasets</h1>
        {activeDataset ? (
          <div className="dataset-summary">
            <p>
              <strong>{activeDataset.meta.label ?? "Imported dataset"}</strong>
            </p>
            <p>Imported at: {new Date(activeDataset.meta.createdAt).toLocaleString()}</p>
            <p>Stored files: {activeDataset.repoSnapshot.files.size}</p>
            <Link to="/import">Import another dataset</Link>
          </div>
        ) : (
          <EmptyState title={status === "loading" ? "Loading dataset..." : "Import a dataset to begin"}>
            <Link to="/import">Go to import</Link>
          </EmptyState>
        )}
      </section>
    </AppShell>
  );
}
