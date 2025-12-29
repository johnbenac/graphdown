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
  const pythonCommands = ['python3', 'python'];
  let result:
    | ReturnType<typeof spawnSync>
    | undefined;
  let missingPython = false;
  for (const command of pythonCommands) {
    const attempt = spawnSync(command, ['-c', script], {
      input: yamlString,
      encoding: 'utf8'
    });
    if (attempt.error) {
      const err = attempt.error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        missingPython = true;
        continue;
      }
      throw new Error(`Failed to run ${command}: ${err.message}`);
    }
    if (attempt.status !== 0) {
      const stderr = attempt.stderr.trim();
      const detail = stderr ? `: ${stderr}` : '';
      throw new Error(`Python YAML parse failed${detail}`);
    }
    result = attempt;
    break;
  }
  if (!result) {
    if (missingPython) {
      throw new Error('Python not found; install python3 and PyYAML');
    }
    throw new Error('Failed to run Python');
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
