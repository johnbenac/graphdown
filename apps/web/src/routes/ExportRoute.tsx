import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import { exportDatasetZipBytes } from "../core/export";
import { downloadZipBytes } from "../export/downloadZip";
import { useDataset } from "../state/DatasetContext";

function sanitizeLabel(label: string): string {
  const sanitized = label
    .replace(/^https?:\/\//, "")
    .replace(/[/:\s]+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return sanitized || "dataset";
}

export default function ExportRoute() {
  const { activeDataset, status } = useDataset();
  const label = activeDataset?.meta.label ?? "dataset";
  const safeLabel = sanitizeLabel(label);
  const disabled = status === "loading" || !activeDataset;

  return (
    <AppShell
      sidebar={
        activeDataset ? (
          <div>
            <p>Active dataset:</p>
            <strong>{activeDataset.meta.label ?? "Dataset"}</strong>
          </div>
        ) : (
          <p>No datasets loaded.</p>
        )
      }
    >
      <section className="export-screen" data-testid="export-screen">
        <h1>Export</h1>
        <p>Exports are generated from the currently loaded dataset snapshot.</p>

        {activeDataset ? (
          <>
            <div className="export-summary">
              <div>
                <strong>{activeDataset.meta.label ?? "Dataset"}</strong>
                <p>Stored files: {activeDataset.datasetSnapshot.files.size}</p>
              </div>
            </div>

            <div className="export-options">
              <div className="export-card">
                <h2>Dataset zip</h2>
                <p>Exports the dataset (types/records + referenced blobs) in canonical layout.</p>
                <Button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (!activeDataset) {
                      return;
                    }
                    const bytes = exportDatasetZipBytes(activeDataset.datasetSnapshot);
                    downloadZipBytes(bytes, `graphdown-export--${safeLabel}.zip`);
                  }}
                >
                  Download dataset zip
                </Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState title={status === "loading" ? "Loading dataset..." : "Import a dataset to export"}>
            <Link to="/import">Go to import</Link>
          </EmptyState>
        )}
      </section>
    </AppShell>
  );
}
