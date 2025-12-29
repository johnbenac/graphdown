import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import { useDataset } from "../state/DatasetContext";

export default function ImportRoute() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const navigate = useNavigate();
  const { importDataset, status, error, activeDataset } = useDataset();

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
            disabled={!fileName || status === "loading"}
          >
            Clear
          </Button>
        </div>
        {error ? <p className="import-error">{error}</p> : null}
        <Button
          type="button"
          disabled={!file || status === "loading"}
          onClick={async () => {
            if (!file) {
              return;
            }
            await importDataset(file);
            navigate("/datasets");
          }}
        >
          {status === "loading" ? "Importing..." : "Import"}
        </Button>
      </section>
    </AppShell>
  );
}
