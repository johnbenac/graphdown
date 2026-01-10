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
  return `---\ntypeId: ${typeId}\nfields: {}\n---\n${body}`;
}

export function recordFile(
  typeId: string,
  recordId: string,
  body = '',
  extraYamlLines: string[] = []
): string {
  const yamlLines = [`typeId: ${typeId}`, `recordId: ${recordId}`, 'fields: {}', ...extraYamlLines];
  return `---\n${yamlLines.join('\n')}\n---\n${body}`;
}

export function validDatasetMinimal(): DatasetSnapshot {
  return makeSnapshot({
    'types/note.md': typeFile('note'),
    'records/one.md': recordFile('note', 'one'),
  });
}

export function validDatasetWeirdPaths(): DatasetSnapshot {
  return makeSnapshot({
    'jan/anything/types/note.md': typeFile('note'),
    'feb/something/records/r1.md': recordFile('note', 'one'),
  });
}

export function invalidDataset_missingFrontMatter(): DatasetSnapshot {
  return makeSnapshot({
    'broken.md': '---\nfoo: bar\nbody',
  });
}

export function invalidDataset_unknownTopLevelKey(): DatasetSnapshot {
  return makeSnapshot({
    'types/note.md': `---\ntypeId: note\nfields: {}\nextra: nope\n---\n`,
  });
}

export function invalidDataset_missingTypeForRecord(): DatasetSnapshot {
  return makeSnapshot({
    'records/missing.md': recordFile('missing', 'one'),
  });
}

export function invalidDataset_badBlockPathUnderBlocks(): DatasetSnapshot {
  return makeSnapshot({
    'types/note.md': typeFile('note'),
    'records/one.md': recordFile('note', 'one'),
    'blocks/readme.md': 'hello',
  });
}
