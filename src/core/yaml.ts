import { parse, stringify } from 'yaml';

export function parseYaml(yamlString: string): unknown {
  try {
    return parse(yamlString);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(message);
  }
}

export function parseYamlObject(yamlString: string): Record<string, unknown> {
  const parsed = parseYaml(yamlString);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('YAML front matter is not a valid object');
  }
  return parsed as Record<string, unknown>;
}

export function stringifyYaml(value: unknown): string {
  try {
    return stringify(value);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(message);
  }
}

export function stringifyYamlObject(obj: Record<string, unknown>): string {
  return stringifyYaml(obj).trimEnd();
}
