import { buildFrontMatter } from './frontMatter';
import { stringifyYamlObject } from './yaml';

export function serializeMarkdownRecord(input: { yaml: Record<string, unknown>; body: string }): string {
  const yamlText = stringifyYamlObject(input.yaml);
  return buildFrontMatter(yamlText, input.body ?? '');
}
