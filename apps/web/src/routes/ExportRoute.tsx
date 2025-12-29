import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import { exportDatasetOnlyZip, exportWholeSnapshotZip, downloadZipBytes } from "../export/exportZip";
import { useDataset } from "../state/DatasetContext";

function sanitizeFilenameSegment(input: string): string {
  const withoutProtocol = input.replace(/^https?:\/\//i, "");
  const normalized = withoutProtocol
    .replace(/[\s/:]+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "dataset";
}

export default function ExportRoute() {
  const { activeDataset, status } = useDataset();
  const isBusy = status === "loading";
  const datasetLabel = activeDataset?.meta.label ?? activeDataset?.meta.id ?? "dataset";
  const sanitizedLabel = sanitizeFilenameSegment(datasetLabel);
  const wholeFilename = `graphdown-export--${sanitizedLabel}--whole.zip`;
  const datasetFilename = `graphdown-export--${sanitizedLabel}--dataset-only.zip`;

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
      <section className="export-stack" data-testid="export-screen">
        <header>
          <h1>Export</h1>
          <p>Exports reflect the currently loaded dataset snapshot, preserving stored paths and bytes.</p>
        </header>

        {!activeDataset ? (
          <EmptyState title={isBusy ? "Loading dataset..." : "Import a dataset to export"}>
            <Link to="/import">Go to import</Link>
          </EmptyState>
        ) : (
          <>
            <div className="export-meta">
              <p>
                <strong>Active dataset:</strong> {datasetLabel}
              </p>
              <p>
                <strong>Stored files:</strong> {activeDataset.repoSnapshot.files.size}
              </p>
            </div>

            <div className="export-cards">
              <div className="export-card">
                <h2>Whole snapshot zip</h2>
                <p>Exports every file Graphdown imported and stored, preserving paths.</p>
                <Button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    const bytes = exportWholeSnapshotZip(activeDataset.repoSnapshot);
                    downloadZipBytes(bytes, wholeFilename);
                  }}
                >
                  Download zip (whole snapshot)
                </Button>
              </div>

              <div className="export-card">
                <h2>Dataset-only zip</h2>
                <p>Exports only Markdown records under datasets/, types/, records/.</p>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isBusy}
                  onClick={() => {
                    const bytes = exportDatasetOnlyZip(activeDataset.repoSnapshot);
                    downloadZipBytes(bytes, datasetFilename);
                  }}
                >
                  Download zip (dataset-only)
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
diff -ruN --exclude=.git . ../graphdown-export`}</code>
              </pre>
              <pre>
                <code>{`# If you exported "dataset-only", compare just the dataset structure:
diff -ruN datasets types records ../graphdown-export/datasets ../graphdown-export/types ../graphdown-export/records`}</code>
              </pre>
            </details>
          </>
        )}
      </section>
    </AppShell>
  );
}
