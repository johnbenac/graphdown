type DatasetWarningsProps = {
  ignoredFileCount?: number;
  ignoredFileSample?: string[];
  droppedBlobCount?: number;
  droppedBlobSample?: string[];
};

export default function DatasetWarnings({
  ignoredFileCount,
  ignoredFileSample,
  droppedBlobCount,
  droppedBlobSample
}: DatasetWarningsProps) {
  const hasIgnored = Boolean(ignoredFileCount && ignoredFileCount > 0);
  const hasDropped = Boolean(droppedBlobCount && droppedBlobCount > 0);

  if (!hasIgnored && !hasDropped) {
    return null;
  }

  return (
    <div className="import-warning-panel" role="status">
      <h2>Import warnings</h2>
      {hasIgnored ? (
        <div>
          <p>
            Ignored {ignoredFileCount} non-dataset file{ignoredFileCount === 1 ? "" : "s"} during import.
          </p>
          {ignoredFileSample && ignoredFileSample.length ? (
            <details>
              <summary>View ignored sample</summary>
              <ul>
                {ignoredFileSample.map((path) => (
                  <li key={path}>{path}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
      {hasDropped ? (
        <div>
          <p>
            Dropped {droppedBlobCount} unreferenced blob{droppedBlobCount === 1 ? "" : "s"}.
          </p>
          {droppedBlobSample && droppedBlobSample.length ? (
            <details>
              <summary>View dropped blob sample</summary>
              <ul>
                {droppedBlobSample.map((path) => (
                  <li key={path}>{path}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
