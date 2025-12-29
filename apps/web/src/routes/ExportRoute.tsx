import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import { downloadZipBytes, exportDatasetOnlyZip, exportWholeSnapshotZip } from "../export/exportZip";
import { useDataset } from "../state/DatasetContext";

function sanitizeLabel(label: string): string {
  const sanitized = label
    .replace(/^https?:\/\//, "")
    .replace(/[\s/:]+/g, "-")
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .toLowerCase();
  return sanitized || "dataset";
}

export default function ExportRoute() {
  const { activeDataset, status } = useDataset();
  const isBusy = status === "loading";
  const datasetLabel = activeDataset?.meta.label ?? activeDataset?.meta.id ?? "dataset";
  const safeLabel = sanitizeLabel(datasetLabel);

  const handleDownloadWhole = () => {
    if (!activeDataset) {
      return;
    }
    const bytes = exportWholeSnapshotZip(activeDataset.repoSnapshot);
    downloadZipBytes(bytes, `graphdown-export--${safeLabel}--whole.zip`);
  };

  const handleDownloadDatasetOnly = () => {
    if (!activeDataset) {
      return;
    }
    const bytes = exportDatasetOnlyZip(activeDataset.repoSnapshot);
    downloadZipBytes(bytes, `graphdown-export--${safeLabel}--dataset-only.zip`);
  };

  return (
    <AppShell
      sidebar={
        activeDataset ? (
          <div>
            <p>Active dataset:</p>
            <strong>{datasetLabel}</strong>
          </div>
        ) : (
          <p>No datasets loaded.</p>
        )
      }
    >
      <section className="export-stack" data-testid="export-screen">
        <h1>Export</h1>
        <p>Exports are built from the currently loaded dataset snapshot (exact paths, exact bytes).</p>
        {activeDataset ? (
          <div className="export-content">
            <div className="export-meta">
              <p>
                <strong>Active dataset:</strong> {datasetLabel}
              </p>
              <p>
                <strong>Stored files:</strong> {activeDataset.repoSnapshot.files.size}
              </p>
            </div>

            <div className="export-options">
              <div className="export-card">
                <h2>Whole snapshot zip</h2>
                <p>Exports every file Graphdown imported and stored, preserving paths.</p>
                <Button type="button" disabled={isBusy} onClick={handleDownloadWhole}>
                  {isBusy ? "Preparing..." : "Download zip (whole snapshot)"}
                </Button>
              </div>
              <div className="export-card">
                <h2>Dataset-only zip</h2>
                <p>Exports only Markdown records under datasets/, types/, and records/.</p>
                <Button type="button" disabled={isBusy} onClick={handleDownloadDatasetOnly}>
                  {isBusy ? "Preparing..." : "Download zip (dataset-only)"}
                </Button>
              </div>
            </div>

            <details className="export-compare">
              <summary>Compare exported zip with a local clone</summary>
              <p>
                The zip contains exactly the files Graphdown imported and stored (same paths, same bytes). To
                compare with a cloned repo:
              </p>
              <pre>
                <code>{`# 1) Clone the repo you imported
git clone https://github.com/<owner>/<repo> repo-clone
cd repo-clone

# 2) Unzip your Graphdown export somewhere (example)
mkdir -p ../graphdown-export
unzip ../graphdown-export--<repo>--whole.zip -d ../graphdown-export

# 3) Diff (exclude .git if present)
diff -ruN --exclude=.git . ../graphdown-export
`}</code>
              </pre>
              <pre>
                <code>{`# If you exported "dataset-only", compare just the dataset structure:
diff -ruN datasets types records ../graphdown-export/datasets ../graphdown-export/types ../graphdown-export/records
`}</code>
              </pre>
            </details>
          </div>
        ) : (
          <EmptyState title={status === "loading" ? "Loading dataset..." : "Import a dataset to export"}>
            <Link to="/import">Go to import</Link>
          </EmptyState>
        )}
      </section>
    </AppShell>
  );
}
