import type { DatasetSnapshot } from '../../model/snapshotTypes';

export function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function makeSnapshot(files: Record<string, string | Uint8Array> = {}): DatasetSnapshot {
  return {
    files: new Map<string, Uint8Array>(
      Object.entries(files).map(([path, contents]) => [path, typeof contents === 'string' ? utf8(contents) : contents])
    )
  };
}

export function typeFile(typeId: string, body = ''): string {
  return ['---', `typeId: ${typeId}`, 'fields: {}', '---', body].join('\n');
}

export function recordFile(
  typeId: string,
  recordId: string,
  body = '',
  extraYamlLines: string[] = []
): string {
  return ['---', `typeId: ${typeId}`, `recordId: ${recordId}`, 'fields: {}', ...extraYamlLines, '---', body].join('\n');
}

export function validDatasetMinimal(): DatasetSnapshot {
  return makeSnapshot({
    'types/note.md': typeFile('note'),
    'records/note-one.md': recordFile('note', 'one')
  });
}

export function validDatasetWeirdPaths(): DatasetSnapshot {
  return makeSnapshot({
    'jan/anything/types/note.md': typeFile('note'),
    'feb/something/records/r1.md': recordFile('note', 'one')
  });
}

export function invalidDataset_missingFields(): DatasetSnapshot {
  return makeSnapshot({
    'types/note.md': typeFile('note'),
    'records/broken.md': ['---', 'typeId: note', 'recordId: one', '---', ''].join('\n')
  });
}

export function invalidDataset_unknownTopLevelKey(): DatasetSnapshot {
  return makeSnapshot({
    'types/note.md': ['---', 'typeId: note', 'fields: {}', 'extra: nope', '---', ''].join('\n')
  });
}

export function invalidDataset_missingTypeForRecord(): DatasetSnapshot {
  return makeSnapshot({
    'records/missing.md': recordFile('missing', 'one')
  });
}

export function invalidDataset_badBlockPathUnderBlocks(): DatasetSnapshot {
  return makeSnapshot({
    'types/note.md': typeFile('note'),
    'records/note-one.md': recordFile('note', 'one'),
    'blocks/readme.md': 'not a block'
  });
}
