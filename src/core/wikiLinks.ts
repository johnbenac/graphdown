import { cleanId } from './ids';

export function extractWikiLinks(body: string): string[] {
  const matches = body.matchAll(/\[\[([^\]]+)\]\]/g);
  const results: string[] = [];
  for (const match of matches) {
    const raw = match[1];
    const [candidate] = raw.split('|');
    const cleaned = cleanId(candidate);
    if (cleaned) {
      results.push(cleaned);
    }
  }
  return results;
}
