import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import type { ImportErrorState, ImportProgress } from "../state/importTypes";
import { useDataset } from "../state/DatasetContext";

const STEP_LABELS: Array<{ phase: ImportProgress["phase"]; label: string }> = [
  { phase: "validating_url", label: "Validating URL" },
  { phase: "fetching_repo", label: "Fetching repo metadata" },
  { phase: "listing_files", label: "Listing dataset files" },
  { phase: "downloading_files", label: "Downloading files" },
  { phase: "validating_dataset", label: "Validating dataset" },
  { phase: "building_graph", label: "Building graph" },
  { phase: "persisting", label: "Saving offline" },
  { phase: "done", label: "Done" }
];

function formatPhaseLabel(progress: ImportProgress) {
  if (progress.phase === "downloading_files") {
    return `Downloading files (${progress.completed} / ${progress.total})`;
  }
  const step = STEP_LABELS.find((item) => item.phase === progress.phase);
  return step?.label ?? "";
}

function ErrorPanel({ error }: { error: ImportErrorState }) {
  if (error.category === "dataset_invalid") {
    const structural = error.errors.filter((err) => !err.file);
    const fileIssues = error.errors.filter((err) => err.file);
    return (
      <div className="import-error">
        <strong>{error.title}</strong>
        <p>{error.message}</p>
        <p>
          Found {error.errors.length} issue{error.errors.length === 1 ? "" : "s"}.
        </p>
        {structural.length ? (
          <div className="import-error__group">
            <h3>Structural issues</h3>
            <ul>
              {structural.map((issue, index) => (
                <li key={`${issue.code}-${index}`}>
                  <code>{issue.code}</code> {issue.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {fileIssues.length ? (
          <div className="import-error__group">
            <h3>File issues</h3>
            <ul>
              {fileIssues.map((issue, index) => (
                <li key={`${issue.code}-${issue.file ?? "file"}-${index}`}>
                  <code>{issue.code}</code> {issue.file}: {issue.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="import-error">
      <strong>{error.title}</strong>
      <p>{error.message}</p>
      {error.hint ? <p className="import-error__hint">{error.hint}</p> : null}
    </div>
  );
}

function ProgressPanel({ progress }: { progress: ImportProgress }) {
  const activeIndex = useMemo(
    () => STEP_LABELS.findIndex((step) => step.phase === progress.phase),
    [progress.phase]
  );
  if (progress.phase === "idle") {
    return null;
  }

  return (
    <div className="import-progress">
      <strong>Import progress</strong>
      <ol>
        {STEP_LABELS.map((step, index) => {
          const isActive = index === activeIndex;
          const isComplete = index < activeIndex;
          return (
            <li
              key={step.phase}
              className={`import-progress__step${isActive ? " is-active" : ""}${
                isComplete ? " is-complete" : ""
              }`}
            >
              <span>{step.label}</span>
            </li>
          );
        })}
      </ol>
      <p className="import-progress__detail">{formatPhaseLabel(progress)}</p>
      {"detail" in progress && progress.detail ? (
        <p className="import-progress__detail import-progress__detail--path">{progress.detail}</p>
      ) : null}
    </div>
  );
}

export default function ImportRoute() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [githubUrl, setGitHubUrl] = useState("");
  const [pendingNavigation, setPendingNavigation] = useState(false);
  const navigate = useNavigate();
  const { importDatasetZip, importDatasetFromGitHub, status, error, progress, activeDataset } =
    useDataset();

  useEffect(() => {
    if (pendingNavigation && status === "ready" && activeDataset) {
      navigate("/datasets");
      setPendingNavigation(false);
    }
    if (status === "error") {
      setPendingNavigation(false);
    }
  }, [pendingNavigation, status, activeDataset, navigate]);

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
        <label className="import-input">
          <span className="import-input__label">GitHub repository URL</span>
          <input
            type="text"
            value={githubUrl}
            onChange={(event) => setGitHubUrl(event.target.value)}
            placeholder="https://github.com/owner/repo"
            disabled={status === "loading"}
          />
        </label>
        <Button
          type="button"
          disabled={!githubUrl.trim() || status === "loading"}
          onClick={async () => {
            setPendingNavigation(true);
            await importDatasetFromGitHub(githubUrl);
          }}
        >
          {status === "loading" ? "Importing..." : "Import from GitHub"}
        </Button>

        <ProgressPanel progress={progress} />
        {error ? <ErrorPanel error={error} /> : null}

        <details className="import-advanced">
          <summary>Import from zip (advanced)</summary>
          <div className="import-advanced__content">
            <p>Upload a local dataset zip to browse.</p>
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
                setPendingNavigation(true);
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
