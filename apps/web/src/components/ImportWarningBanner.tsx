import type { ImportReport } from "../persistence/types";

function WarningList({ title, sample }: { title: string; sample: string[] }) {
  if (!sample.length) {
    return null;
  }
  return (
    <details className="warning-banner__details">
      <summary>{title}</summary>
      <ul className="warning-banner__list">
        {sample.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </details>
  );
}

export function hasImportWarnings(report?: ImportReport | null): report is ImportReport {
  if (!report) return false;
  return (
    report.ignoredFileCount > 0 ||
    report.droppedBlobCount > 0 ||
    report.pluginWarningCount > 0
  );
}

export default function ImportWarningBanner({ report }: { report?: ImportReport | null }) {
  const ignoredFileCount = report?.ignoredFileCount ?? 0;
  const ignoredFileSample = report?.ignoredFileSample ?? [];
  const droppedBlobCount = report?.droppedBlobCount ?? 0;
  const droppedBlobSample = report?.droppedBlobSample ?? [];
  const pluginWarningCount = report?.pluginWarningCount ?? 0;
  const pluginWarningSample = report?.pluginWarningSample ?? [];

  if (!report || (!ignoredFileCount && !droppedBlobCount && !pluginWarningCount)) {
    return null;
  }

  return (
    <div className="warning-banner" role="status" data-testid="import-warning">
      <div className="warning-banner__header">
        <span>Import warnings</span>
      </div>
      <div className="warning-banner__body">
        {ignoredFileCount > 0 ? (
          <div className="warning-banner__item">
            <p>
              Ignored {ignoredFileCount} non-dataset file
              {ignoredFileCount === 1 ? "" : "s"} during import.
            </p>
            <WarningList
              title={`View sample (${ignoredFileSample.length} shown)`}
              sample={ignoredFileSample}
            />
          </div>
        ) : null}
        {droppedBlobCount > 0 ? (
          <div className="warning-banner__item">
            <p>
              Dropped {droppedBlobCount} unreferenced blob
              {droppedBlobCount === 1 ? "" : "s"} during canonicalization.
            </p>
            <WarningList
              title={`View sample (${droppedBlobSample.length} shown)`}
              sample={droppedBlobSample}
            />
          </div>
        ) : null}
        {pluginWarningCount > 0 ? (
          <div className="warning-banner__item">
            <p>
              Encountered {pluginWarningCount} plugin warning
              {pluginWarningCount === 1 ? "" : "s"} during import.
            </p>
            <WarningList
              title={`View sample (${pluginWarningSample.length} shown)`}
              sample={pluginWarningSample}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
