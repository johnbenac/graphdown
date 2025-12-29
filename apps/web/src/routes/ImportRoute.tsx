import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import type { ImportProgress } from "../state/DatasetContext";
import { useDataset } from "../state/DatasetContext";

const PROGRESS_STEPS: Array<{ phase: ImportProgress["phase"]; label: string }> = [
  { phase: "validating_url", label: "Validating URL" },
  { phase: "fetching_repo", label: "Fetching repo metadata" },
  { phase: "listing_files", label: "Listing dataset files" },
  { phase: "downloading_files", label: "Downloading files" },
  { phase: "validating_dataset", label: "Validating dataset" },
  { phase: "building_graph", label: "Building graph" },
  { phase: "persisting", label: "Saving offline" }
];

function getStepIndex(phase: ImportProgress["phase"]) {
  return PROGRESS_STEPS.findIndex((step) => step.phase === phase);
}

export default function ImportRoute() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string>("");
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const navigate = useNavigate();
  const {
    importDatasetZip,
    importDatasetFromGitHub,
    status,
    error,
    progress,
    activeDataset
  } = useDataset();

  useEffect(() => {
    if (shouldNavigate && status === "ready" && activeDataset) {
      setShouldNavigate(false);
      navigate("/datasets");
    }
  }, [shouldNavigate, status, activeDataset, navigate]);

  const progressItems = useMemo(() => {
    const currentIndex = getStepIndex(progress.phase);
    return PROGRESS_STEPS.map((step, index) => {
      const isActive = index === currentIndex;
      const isComplete = currentIndex > -1 && index < currentIndex;
      return { ...step, isActive, isComplete };
    });
  }, [progress.phase]);

  const hasProgress = progress.phase !== "idle" && status === "loading";

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
        <p>Paste a GitHub repository URL to import a dataset.</p>
        <label className="input-field">
          GitHub URL
          <input
            type="text"
            placeholder="https://github.com/owner/repo"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={status === "loading"}
          />
        </label>
        <div className="import-actions">
          <Button
            type="button"
            disabled={!url.trim() || status === "loading"}
            onClick={async () => {
              setShouldNavigate(true);
              await importDatasetFromGitHub(url);
            }}
          >
            {status === "loading" ? "Importing..." : "Import from GitHub"}
          </Button>
        </div>

        {hasProgress ? (
          <ol className="import-progress">
            {progressItems.map((step) => (
              <li
                key={step.phase}
                className={`import-progress__item${step.isActive ? " is-active" : ""}${
                  step.isComplete ? " is-complete" : ""
                }`}
              >
                <span>{step.label}</span>
                {step.phase === "downloading_files" && progress.phase === "downloading_files" ? (
                  <span className="import-progress__detail">
                    {progress.completed} / {progress.total}
                    {progress.detail ? ` — ${progress.detail}` : ""}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}

        {error ? (
          <div className="import-error-panel">
            <h2>{error.title}</h2>
            <p>{error.message}</p>
            {"hint" in error && error.hint ? <p className="import-error-hint">{error.hint}</p> : null}
            {error.category === "dataset_invalid" ? (
              <div className="import-error-details">
                <p>
                  {error.errors.length} issue{error.errors.length === 1 ? "" : "s"} found.
                </p>
                <div className="import-error-group">
                  <h3>Structural issues</h3>
                  <ul>
                    {error.errors
                      .filter((item) => !item.file)
                      .map((item, index) => (
                        <li key={`struct-${index}`}>
                          <strong>{item.code}</strong>: {item.message}
                        </li>
                      ))}
                  </ul>
                </div>
                <div className="import-error-group">
                  <h3>File issues</h3>
                  <ul>
                    {error.errors
                      .filter((item) => item.file)
                      .map((item, index) => (
                        <li key={`file-${index}`}>
                          <strong>{item.code}</strong>: {item.file} — {item.message}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <details className="import-zip">
          <summary>Import from zip (advanced)</summary>
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
          <Button
            type="button"
            disabled={!file || status === "loading"}
            onClick={async () => {
              if (!file) {
                return;
              }
              setShouldNavigate(true);
              await importDatasetZip(file);
            }}
          >
            {status === "loading" ? "Importing..." : "Import zip"}
          </Button>
        </details>
      </section>
    </AppShell>
  );
}
