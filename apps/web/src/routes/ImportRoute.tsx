import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import Panel from "../components/Panel";
import { useDataset } from "../state/DatasetContext";
import type { ImportProgress } from "../state/importTypes";

export default function ImportRoute() {
  const [githubUrl, setGithubUrl] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const navigate = useNavigate();
  const { importDatasetZip, importDatasetFromGitHub, status, progress, error, activeDataset } =
    useDataset();

  const progressSteps = useMemo(
    () => [
      { phase: "validating_url", label: "Validating URL" },
      { phase: "fetching_repo", label: "Fetching repo metadata" },
      { phase: "listing_files", label: "Listing dataset files" },
      { phase: "downloading_files", label: "Downloading files" },
      { phase: "validating_dataset", label: "Validating dataset" },
      { phase: "building_graph", label: "Building graph" },
      { phase: "persisting", label: "Saving offline" }
    ],
    []
  );

  useEffect(() => {
    if (status === "ready" && progress.phase === "done") {
      navigate("/datasets");
    }
  }, [navigate, progress.phase, status]);

  const activeIndex = progressSteps.findIndex((step) => step.phase === progress.phase);
  const resolvedIndex = activeIndex === -1 ? (progress.phase === "done" ? progressSteps.length : -1) : activeIndex;

  const renderProgressDetail = (current: ImportProgress) => {
    if (current.phase === "downloading_files") {
      return `(${current.completed}/${current.total}) ${current.detail ?? ""}`.trim();
    }
    return current.detail ?? "";
  };

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
        <Panel title="Import from GitHub">
          <div className="import-field">
            <label htmlFor="github-url">GitHub URL</label>
            <input
              id="github-url"
              type="text"
              placeholder="https://github.com/owner/repo"
              value={githubUrl}
              onChange={(event) => setGithubUrl(event.target.value)}
              disabled={status === "loading"}
            />
          </div>
          <Button
            type="button"
            disabled={!githubUrl.trim() || status === "loading"}
            onClick={async () => {
              await importDatasetFromGitHub(githubUrl.trim());
            }}
          >
            {status === "loading" ? "Importing..." : "Import"}
          </Button>
        </Panel>
        {status === "loading" && progress.phase !== "idle" ? (
          <Panel title="Progress">
            <ol className="import-progress">
              {progressSteps.map((step, index) => {
                const state =
                  resolvedIndex === -1
                    ? "pending"
                    : index < resolvedIndex
                      ? "complete"
                      : index === resolvedIndex
                        ? "active"
                        : "pending";
                const detail = step.phase === progress.phase ? renderProgressDetail(progress) : "";
                return (
                  <li key={step.phase} className={`import-progress__step ${state}`}>
                    <span>{step.label}</span>
                    {detail ? <small>{detail}</small> : null}
                  </li>
                );
              })}
            </ol>
          </Panel>
        ) : null}
        {error ? (
          <Panel title="Import error">
            <div className="import-error">
              <h2>{error.title}</h2>
              <p>{error.message}</p>
              {"hint" in error && error.hint ? <p className="import-error__hint">{error.hint}</p> : null}
              {"status" in error && error.status ? (
                <p className="import-error__meta">Status: {error.status}</p>
              ) : null}
              {error.category === "dataset_invalid" ? (
                <div className="import-error__details">
                  <p>Found {error.errors.length} validation issue(s).</p>
                  <div className="import-error__group">
                    <h3>Structural issues</h3>
                    <ul>
                      {error.errors
                        .filter((issue) => !issue.file)
                        .map((issue, index) => (
                          <li key={`struct-${index}`}>
                            <strong>{issue.code}</strong>: {issue.message}
                          </li>
                        ))}
                      {!error.errors.some((issue) => !issue.file) ? <li>None</li> : null}
                    </ul>
                  </div>
                  <div className="import-error__group">
                    <h3>File issues</h3>
                    <ul>
                      {error.errors
                        .filter((issue) => issue.file)
                        .map((issue, index) => (
                          <li key={`file-${index}`}>
                            <strong>{issue.file}</strong> — <strong>{issue.code}</strong>: {issue.message}
                          </li>
                        ))}
                      {!error.errors.some((issue) => issue.file) ? <li>None</li> : null}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          </Panel>
        ) : null}
        <details className="import-advanced">
          <summary>Import from zip (advanced)</summary>
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
