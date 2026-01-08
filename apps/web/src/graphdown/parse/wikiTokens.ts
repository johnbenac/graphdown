const RECORD_REF_PATTERN = /^([A-Za-z0-9][A-Za-z0-9_-]*):([A-Za-z0-9][A-Za-z0-9_-]*)$/;
const BLOB_REF_PATTERN = /^gdblob:sha256-([0-9a-f]{64})$/;

function extractTokens(text: string): string[] {
  const results: string[] = [];
  const regex = /\[\[([^\]]+?)\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    results.push(match[1]);
  }
  return results;
}

export function extractRecordRefs(text: string): string[] {
  const tokens = extractTokens(text);
  const refs: string[] = [];
  for (const token of tokens) {
    const trimmed = token.trim();
    if (BLOB_REF_PATTERN.test(trimmed)) {
      continue; // blob refs are not record relationships
    }
    const match = trimmed.match(RECORD_REF_PATTERN);
    if (!match) continue;
    if (match[1] === 'gdblob') {
      continue; // explicit guard: gdblob is reserved for blob references
    }
    refs.push(`${match[1]}:${match[2]}`);
  }
  return refs;
}

export function extractBlobRefs(text: string): string[] {
  const tokens = extractTokens(text);
  const refs: string[] = [];
  for (const token of tokens) {
    const trimmed = token.trim();
    const match = trimmed.match(BLOB_REF_PATTERN);
    if (!match) continue;
    refs.push(match[1]);
  }
  return refs;
}
