import { spawnSync } from 'node:child_process';

export function parseYaml(yamlString: string): unknown {
  const result = spawnSync(
    'python',
    [
      '-c',
      [
        'import yaml, json, sys, datetime',
        '# Read YAML from stdin and convert any datetime objects to strings to allow JSON serialisation',
        'def convert(value):',
        '    if isinstance(value, (datetime.date, datetime.datetime)):',
        '        return value.isoformat()',
        '    elif isinstance(value, dict):',
        '        return {k: convert(v) for k, v in value.items()}',
        '    elif isinstance(value, list):',
        '        return [convert(v) for v in value]',
        '    else:',
        '        return value',
        'try:',
        '    data = yaml.safe_load(sys.stdin.read())',
        '    data = convert(data)',
        '    print(json.dumps(data))',
        'except Exception as e:',
        '    print(json.dumps({"__error__": str(e)}))'
      ].join('\n')
    ],
    { input: yamlString, encoding: 'utf-8' }
  );

  if (result.error) {
    throw new Error(result.error.message);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout.trim() || 'null');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Failed to parse YAML via Python: ${message}`);
  }

  if (parsed && typeof parsed === 'object' && '__error__' in parsed) {
    const errorMessage = String((parsed as { __error__: unknown }).__error__);
    throw new Error(errorMessage);
  }

  return parsed;
}

export function parseYamlObject(yamlString: string): Record<string, unknown> {
  const parsed = parseYaml(yamlString);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('YAML front matter is not a valid object');
  }
  return parsed as Record<string, unknown>;
}
