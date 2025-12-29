import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import { parseGraphFromSnapshot } from "../persistence/parseGraph";
import { loadRepoSnapshotFromZip } from "../persistence/zipSnapshot";
import { useDataset } from "../state/DatasetContext";

export default function ImportRoute() {
  const navigate = useNavigate();
  const { activeDataset, error, importDataset, status } = useDataset();
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

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

  const handleImport = async () => {
    if (!file) {
      return;
    }
    setImporting(true);
    setImportError(null);
    try {
      const buffer = await file.arrayBuffer();
      const snapshot = loadRepoSnapshotFromZip(new Uint8Array(buffer));
      const parsedGraph = parseGraphFromSnapshot(snapshot);
      await importDataset({
        label: file.name,
        source: "import",
        repoSnapshot: snapshot,
        parsedGraph,
      });
      navigate("/datasets");
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Import failed.";
      setImportError(message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppShell sidebar={sidebar}>
      <section className="import-stack" data-testid="import-screen">
        <h1>Import</h1>
        <p>Upload a dataset zip to browse.</p>
        <label className="file-input">
          <input
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setFile(file ?? null);
              setFileName(file ? file.name : null);
            }}
          />
        </label>
        <div className="file-row">
          <span className="file-name">
            {fileName ? `Selected file: ${fileName}` : "No file selected"}
          </span>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setFile(null);
              setFileName(null);
            }}
            disabled={!fileName}
          >
            Clear
          </Button>
        </div>
        {importError ? <p className="warning-text">{importError}</p> : null}
        <Button type="button" onClick={handleImport} disabled={!file || importing || status === "loading"}>
          {importing ? "Importing..." : "Import"}
        </Button>
      </section>
    </AppShell>
  );
}
