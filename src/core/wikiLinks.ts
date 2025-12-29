import { cleanId } from './ids';

export function extractWikiLinks(body: string): string[] {
  const results: string[] = [];
  const regex = /\[\[([^\]]+)\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) !== null) {
    const raw = match[1];
    const [candidate] = raw.split('|');
    const cleaned = cleanId(candidate);
    if (cleaned) {
      results.push(cleaned);
    }
  }
  return results;
}
