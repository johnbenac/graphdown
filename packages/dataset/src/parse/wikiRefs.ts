import { decodeDaslCidString } from '../cid/daslCid';

const RECORD_REF_PATTERN = /^([A-Za-z0-9][A-Za-z0-9_-]*):([A-Za-z0-9][A-Za-z0-9_-]*)$/;
const CID_SHAPE_PATTERN = /^b[a-z2-7]{58}$/;

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
    const match = trimmed.match(RECORD_REF_PATTERN);
    if (!match) continue;
    refs.push(`${match[1]}:${match[2]}`);
  }
  return refs;
}

export type ExtractCidRefsResult = {
  cids: string[];
  invalidCidTokens: string[];
};

export function extractCidRefs(text: string): ExtractCidRefsResult {
  const tokens = extractTokens(text);
  const cids: string[] = [];
  const invalidCidTokens: string[] = [];
  for (const token of tokens) {
    const trimmed = token.trim();
    if (!CID_SHAPE_PATTERN.test(trimmed)) {
      continue;
    }
    try {
      decodeDaslCidString(trimmed);
      cids.push(trimmed);
    } catch {
      invalidCidTokens.push(trimmed);
    }
  }
  return { cids, invalidCidTokens };
}
