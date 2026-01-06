import type { DatasetSnapshot } from "../core/snapshotTypes";
import type { ImportReport } from "../persistence/types";

const SAMPLE_LIMIT = 20;

function listBlobs(snapshot: DatasetSnapshot): string[] {
  return [...snapshot.files.keys()].filter((path) => path.startsWith("blobs/sha256/"));
}

export function buildImportReport(input: {
  rawSnapshot: DatasetSnapshot;
  canonicalSnapshot: DatasetSnapshot;
  ignored: string[];
  pluginWarnings?: string[];
}): ImportReport {
  const { rawSnapshot, canonicalSnapshot, ignored, pluginWarnings = [] } = input;
  const canonicalBlobs = new Set(listBlobs(canonicalSnapshot));
  const droppedBlobs = listBlobs(rawSnapshot).filter((path) => !canonicalBlobs.has(path));

  return {
    ignoredFileCount: ignored.length,
    ignoredFileSample: ignored.slice(0, SAMPLE_LIMIT),
    droppedBlobCount: droppedBlobs.length,
    droppedBlobSample: droppedBlobs.slice(0, SAMPLE_LIMIT),
    pluginWarningCount: pluginWarnings.length,
    pluginWarningSample: pluginWarnings.slice(0, SAMPLE_LIMIT)
  };
}
