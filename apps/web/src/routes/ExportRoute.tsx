import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import {
  downloadZipBytes,
  exportDatasetOnlyZip,
  exportWholeSnapshotZip
} from "../export/exportZip";
import { useDataset } from "../state/DatasetContext";

function sanitizeLabel(label: string): string {
  const withoutProtocol = label.replace(/^https?:\/\//, "");
  const replaced = withoutProtocol.replace(/[\s/:]+/g, "-");
  const stripped = replaced.replace(/[^a-zA-Z0-9._-]/g, "");
  const collapsed = stripped.replace(/-+/g, "-").replace(/^-|-$/g, "");
  return collapsed || "dataset";
}

function buildExportFilename(label: string, variant: "whole" | "dataset-only"): string {
  const safeLabel = sanitizeLabel(label);
  return `graphdown-export--${safeLabel}--${variant}.zip`;
}

export default function ExportRoute() {
  const { activeDataset, status } = useDataset();
  const isLoading = status === "loading";
  const datasetLabel = activeDataset?.meta.label ?? activeDataset?.meta.id ?? "dataset";

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
      <section className="export-screen" data-testid="export-screen">
        <h1>Export</h1>
        <p>Exports mirror the currently loaded dataset snapshot in Graphdown.</p>

        {activeDataset ? (
          <div className="export-content">
            <div className="export-summary">
              <p>
                <strong>{datasetLabel}</strong>
              </p>
              <p>Stored files: {activeDataset.repoSnapshot.files.size}</p>
            </div>

            <div className="export-options">
              <div className="export-card">
                <div>
                  <h2>Whole snapshot zip</h2>
                  <p>Exports every file Graphdown imported and stored, preserving paths.</p>
                </div>
                <Button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    const zipBytes = exportWholeSnapshotZip(activeDataset.repoSnapshot);
                    downloadZipBytes(zipBytes, buildExportFilename(datasetLabel, "whole"));
                  }}
                >
                  Download zip (whole snapshot)
                </Button>
              </div>

              <div className="export-card">
                <div>
                  <h2>Dataset-only zip</h2>
                  <p>Exports only Markdown records under datasets/, types/, records/.</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isLoading}
                  onClick={() => {
                    const zipBytes = exportDatasetOnlyZip(activeDataset.repoSnapshot);
                    downloadZipBytes(zipBytes, buildExportFilename(datasetLabel, "dataset-only"));
                  }}
                >
                  Download zip (dataset-only)
                </Button>
              </div>
            </div>

            <details className="export-compare">
              <summary>Compare exported zip with a local clone</summary>
              <p>
                The zip contains exactly the files Graphdown imported and stored (same paths, same
                bytes).
              </p>
              <pre>
                <code>{`# 1) Clone the repo you imported\ngit clone https://github.com/<owner>/<repo> repo-clone\ncd repo-clone\n\n# 2) Unzip your Graphdown export somewhere (example)\nmkdir -p ../graphdown-export\nunzip ../graphdown-export--<repo>--whole.zip -d ../graphdown-export\n\n# 3) Diff (exclude .git if present)\ndiff -ruN --exclude=.git . ../graphdown-export`}</code>
              </pre>
              <pre>
                <code>{`# If you exported "dataset-only", compare just the dataset structure:\ndiff -ruN datasets types records ../graphdown-export/datasets ../graphdown-export/types ../graphdown-export/records`}</code>
              </pre>
            </details>
          </div>
        ) : (
          <EmptyState title={isLoading ? "Loading dataset..." : "Import a dataset to export"}>
            <Link to="/import">Go to import</Link>
          </EmptyState>
        )}
      </section>
    </AppShell>
  );
}
