export function extractFrontMatter(markdown: string): { yaml: string; body: string } {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  if (lines.length < 3 || lines[0].trim() !== '---') {
    throw new Error('Missing YAML front matter delimiter at top of file');
  }
  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') {
      endIndex = i;
      break;
    }
  }
  if (endIndex === -1) {
    throw new Error('Missing closing YAML front matter delimiter');
  }
  const yamlLines = lines.slice(1, endIndex).join('\n');
  const bodyLines = lines.slice(endIndex + 1).join('\n');
  return { yaml: yamlLines, body: bodyLines };
}
