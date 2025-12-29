import { spawnSync } from 'node:child_process';

export function parseYaml(yamlString: string): unknown {
  const script = [
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
  ].join('\n');
  const candidates = ['python3', 'python'];
  let result;
  let sawMissingPython = false;
  for (const command of candidates) {
    result = spawnSync(command, ['-c', script], {
      input: yamlString,
      encoding: 'utf8'
    });
    if (result.error) {
      if ('code' in result.error && result.error.code === 'ENOENT') {
        sawMissingPython = true;
        continue;
      }
      throw new Error(result.error.message);
    }
    if (result.status !== 0) {
      const stderr = result.stderr.trim();
      const details = stderr ? `: ${stderr}` : '';
      throw new Error(`YAML parse failed via ${command}${details}`);
    }
    break;
  }
  if (!result || (result.error && sawMissingPython)) {
    throw new Error('Python not found; install python3 and PyYAML');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout.trim() || 'null');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse YAML via Python: ${message}`);
  }
  if (
    parsed &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    '__error__' in parsed
  ) {
    const errValue = (parsed as { __error__?: string }).__error__;
    throw new Error(errValue || 'Unknown YAML parse error');
  }
  return parsed;
}

export function parseYamlObject(yamlString: string): Record<string, unknown> {
  const parsed = parseYaml(yamlString);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('YAML front matter is not a valid object');
  }
  return parsed as Record<string, unknown>;
}
