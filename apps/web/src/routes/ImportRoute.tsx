import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import { useDataset } from "../state/DatasetContext";

export default function ImportRoute() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { state, actions } = useDataset();
  const navigate = useNavigate();

  const sidebar = useMemo(() => {
    if (state.status === "ready") {
      return (
        <div className="sidebar-stack">
          <p className="sidebar-label">Active dataset</p>
          <p className="sidebar-value">{state.dataset.meta.label ?? state.dataset.meta.id}</p>
          <p className="sidebar-meta">{state.dataset.parsedGraph.summary}</p>
        </div>
      );
    }
    if (state.status === "loading") {
      return <p>Loading dataset…</p>;
    }
    return <p>No datasets loaded.</p>;
  }, [state]);

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
              setErrorMessage(null);
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
              setFileName(null);
              setFile(null);
            }}
            disabled={!fileName}
          >
            Clear
          </Button>
        </div>
        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
        <Button
          type="button"
          disabled={!file || state.status === "loading"}
          onClick={async () => {
            if (!file) {
              return;
            }
            setErrorMessage(null);
            const success = await actions.importDataset(file);
            if (success) {
              navigate("/datasets");
            } else {
              setErrorMessage("Import failed. Please try again.");
            }
          }}
        >
          {state.status === "loading" ? "Importing…" : "Import"}
        </Button>
      </section>
    </AppShell>
  );
}
