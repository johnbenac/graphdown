import { cleanId } from './ids';

export function extractWikiLinks(body: string): string[] {
  const results: string[] = [];
  const regex = /\[\[([^\]]+)\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) !== null) {
    const raw = match[1];
    const [idPart] = raw.split('|');
    const cleaned = cleanId(idPart);
    if (cleaned) {
      results.push(cleaned);
    }
  }
  return results;
}
