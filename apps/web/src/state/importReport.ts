import type { DatasetSnapshot } from "../graphdown";
import type { ImportReport } from "../persistence/types";

const SAMPLE_LIMIT = 20;

function listBlocks(snapshot: DatasetSnapshot): string[] {
  return [...snapshot.files.keys()].filter((path) => path.startsWith("blocks/"));
}

export function buildImportReport(input: {
  rawSnapshot: DatasetSnapshot;
  canonicalSnapshot: DatasetSnapshot;
  ignored: string[];
}): ImportReport {
  const { rawSnapshot, canonicalSnapshot, ignored } = input;
  const canonicalBlocks = new Set(listBlocks(canonicalSnapshot));
  const droppedBlocks = listBlocks(rawSnapshot).filter((path) => !canonicalBlocks.has(path));

  return {
    ignoredFileCount: ignored.length,
    ignoredFileSample: ignored.slice(0, SAMPLE_LIMIT),
    droppedBlockCount: droppedBlocks.length,
    droppedBlockSample: droppedBlocks.slice(0, SAMPLE_LIMIT)
  };
}
