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
  return report.ignoredFileCount > 0 || report.droppedBlockCount > 0;
}

export default function ImportWarningBanner({ report }: { report?: ImportReport | null }) {
  const ignoredFileCount = report?.ignoredFileCount ?? 0;
  const ignoredFileSample = report?.ignoredFileSample ?? [];
  const droppedBlockCount = report?.droppedBlockCount ?? 0;
  const droppedBlockSample = report?.droppedBlockSample ?? [];

  if (!report || (!ignoredFileCount && !droppedBlockCount)) {
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
        {droppedBlockCount > 0 ? (
          <div className="warning-banner__item">
            <p>
              Dropped {droppedBlockCount} unreferenced block
              {droppedBlockCount === 1 ? "" : "s"} during canonicalization.
            </p>
            <WarningList
              title={`View sample (${droppedBlockSample.length} shown)`}
              sample={droppedBlockSample}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
