import { extractFrontMatter, buildFrontMatter } from './frontMatter';
import { makeError, type ValidationError } from './errors';
import { stringifyYamlObject, parseYamlObject } from './yaml';

export function parseMarkdownRecord(
  text: string,
  file: string
): { ok: true; yaml: Record<string, unknown>; body: string } | { ok: false; error: ValidationError } {
  try {
    const { yaml, body } = extractFrontMatter(text);
    const yamlObj = parseYamlObject(yaml);
    return { ok: true, yaml: yamlObj, body };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = message.includes('Missing closing YAML front matter delimiter')
      ? 'E_FRONT_MATTER_UNTERMINATED'
      : message.includes('Missing YAML front matter delimiter')
        ? 'E_FRONT_MATTER_MISSING'
        : message === 'YAML front matter is not a valid object'
          ? 'E_YAML_NOT_OBJECT'
          : 'E_YAML_INVALID';
    return { ok: false, error: makeError(code, message, file) };
  }
}

export function serializeMarkdownRecord(input: { yaml: Record<string, unknown>; body: string }): string {
  const yamlText = stringifyYamlObject(input.yaml);
  return buildFrontMatter(yamlText, input.body ?? '');
}
