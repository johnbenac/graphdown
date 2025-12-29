import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import { buildGraphFromSnapshot } from "../persistence/graph";
import { createDatasetMeta, getPersistence } from "../persistence/persistenceClient";
import { loadRepoSnapshotFromZipBytes } from "../persistence/zipSnapshot";

export default function ImportRoute() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setFileName(file ? file.name : null);
    setError(null);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      return;
    }
    setIsImporting(true);
    setError(null);
    try {
      const bytes = new Uint8Array(await selectedFile.arrayBuffer());
      const repoSnapshot = loadRepoSnapshotFromZipBytes(bytes);
      const parsedGraph = buildGraphFromSnapshot(repoSnapshot);
      const datasetId = crypto.randomUUID();
      const meta = createDatasetMeta({
        id: datasetId,
        label: selectedFile.name,
        source: "import",
      });
      const persistence = await getPersistence();
      await persistence.saveDataset({ datasetId, meta, repoSnapshot, parsedGraph });
      await persistence.setActiveDatasetId(datasetId);
      navigate("/datasets");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <AppShell sidebar={<p>No datasets loaded.</p>}>
      <section className="import-stack" data-testid="import-screen">
        <h1>Import</h1>
        <p>Upload a dataset zip to browse.</p>
        <label className="file-input">
          <input
            type="file"
            accept=".zip"
            onChange={handleFileChange}
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
              setFileName(null);
              setSelectedFile(null);
              setError(null);
            }}
            disabled={!fileName || isImporting}
          >
            Clear
          </Button>
        </div>
        {error ? <p className="error-text">Import failed: {error}</p> : null}
        <Button type="button" disabled={!selectedFile || isImporting} onClick={handleImport}>
          {isImporting ? "Importing..." : "Import"}
        </Button>
      </section>
    </AppShell>
  );
}
