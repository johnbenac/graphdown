import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import { useDataset } from "../state/DatasetContext";

const PROGRESS_STEPS = [
  { phase: "validating_url", label: "Validating URL" },
  { phase: "fetching_repo", label: "Fetching repo metadata" },
  { phase: "listing_files", label: "Listing dataset files" },
  { phase: "downloading_files", label: "Downloading files" },
  { phase: "validating_dataset", label: "Validating dataset" },
  { phase: "building_graph", label: "Building graph" },
  { phase: "persisting", label: "Saving offline" },
  { phase: "done", label: "Ready" }
] as const;

type ProgressPhase = (typeof PROGRESS_STEPS)[number]["phase"];

export default function ImportRoute() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [navigateOnSuccess, setNavigateOnSuccess] = useState(false);
  const navigate = useNavigate();
  const { importDatasetZip, importDatasetFromGitHub, status, error, activeDataset, progress } =
    useDataset();

  useEffect(() => {
    if (navigateOnSuccess && status === "ready" && progress.phase === "done") {
      navigate("/datasets");
      setNavigateOnSuccess(false);
    }
  }, [navigateOnSuccess, status, progress.phase, navigate]);

  const { structuralErrors, fileErrors } = useMemo(() => {
    if (error?.category !== "dataset_invalid") {
      return { structuralErrors: [], fileErrors: [] };
    }
    const structuralErrors = error.errors.filter((item) => !item.file);
    const fileErrors = error.errors.filter((item) => item.file);
    return { structuralErrors, fileErrors };
  }, [error]);

  const currentPhaseIndex = PROGRESS_STEPS.findIndex((step) => step.phase === progress.phase);

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
        <label className="import-field">
          GitHub URL
          <input
            type="text"
            placeholder="https://github.com/owner/repo"
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
            disabled={status === "loading"}
          />
        </label>
        <Button
          type="button"
          disabled={!urlInput.trim() || status === "loading"}
          onClick={async () => {
            setNavigateOnSuccess(true);
            await importDatasetFromGitHub(urlInput);
          }}
        >
          {status === "loading" ? "Importing..." : "Import from GitHub"}
        </Button>

        {status === "loading" ? (
          <div className="import-progress">
            <h2>Progress</h2>
            <ol className="import-progress__steps">
              {PROGRESS_STEPS.map((step, index) => {
                const isActive = progress.phase === step.phase;
                const isComplete = currentPhaseIndex > index;
                return (
                  <li
                    key={step.phase}
                    className={`import-progress__step ${
                      isActive ? "is-active" : isComplete ? "is-complete" : ""
                    }`}
                  >
                    <span>{step.label}</span>
                    {step.phase === "downloading_files" && progress.phase === "downloading_files" ? (
                      <span className="import-progress__detail">
                        {progress.completed} / {progress.total}
                      </span>
                    ) : null}
                    {isActive && "detail" in progress && progress.detail ? (
                      <span className="import-progress__detail">{progress.detail}</span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}

        {error ? (
          <div className="import-error">
            <strong>{error.title}</strong>
            <p>{error.message}</p>
            {error.hint ? <p className="import-error__hint">{error.hint}</p> : null}
            {error.category === "dataset_invalid" ? (
              <div className="import-error__details">
                <p>
                  {error.errors.length} issue{error.errors.length === 1 ? "" : "s"} found.
                </p>
                {structuralErrors.length ? (
                  <div>
                    <h4>Structural issues</h4>
                    <ul>
                      {structuralErrors.map((item, index) => (
                        <li key={`${item.code}-${index}`}>
                          {item.code}: {item.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {fileErrors.length ? (
                  <div>
                    <h4>File issues</h4>
                    <ul>
                      {fileErrors.map((item, index) => (
                        <li key={`${item.code}-${index}`}>
                          {item.file}: {item.code} — {item.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <details className="import-zip">
          <summary>Import from zip (advanced)</summary>
          <div className="import-zip__content">
            <label className="file-input">
              <input
                type="file"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0];
                  setFile(nextFile ?? null);
                  setFileName(nextFile ? nextFile.name : null);
                }}
                disabled={status === "loading"}
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
                setNavigateOnSuccess(true);
                await importDatasetZip(file);
              }}
            >
              {status === "loading" ? "Importing..." : "Import zip"}
            </Button>
          </div>
        </details>
      </section>
    </AppShell>
  );
}
