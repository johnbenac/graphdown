import { cleanId } from './ids';

export function extractWikiLinks(body: string): string[] {
  const results: string[] = [];
  const regex = /\[\[([^\]]+?)\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) !== null) {
    const raw = match[1];
    const beforeAlias = raw.split('|')[0];
    const cleaned = cleanId(beforeAlias);
    if (cleaned) {
      results.push(cleaned);
    }
  }
  return results;
}
