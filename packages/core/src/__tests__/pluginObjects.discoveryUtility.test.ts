import { describe, expect, it } from 'vitest';

import type { DatasetSnapshot } from '..';
import { discoverPluginObjects } from '..';

const encoder = new TextEncoder();

function manifest(lines: string[]): Uint8Array {
  return encoder.encode(['---', ...lines, '---', ''].join('\n'));
}

describe('plugin object discovery utility', () => {
  it('PLUG-UTIL-001: discovers plugin manifests + resolves bundle paths deterministically (sorted by manifest path)', () => {
    const snap: DatasetSnapshot = {
      files: new Map<string, Uint8Array>([
        [
          'extensions/b/plugin.md',
          manifest(['pluginId: b', 'gdApiVersion: 1', 'entry: entry.js', 'files:', '  - entry.js']),
        ],
        ['extensions/b/entry.js', encoder.encode("console.log('b');\n")],

        [
          'extensions/a/plugin.md',
          manifest(['pluginId: a', 'gdApiVersion: 1', 'entry: entry.js', 'files:', '  - entry.js', '  - ui.md']),
        ],
        ['extensions/a/entry.js', encoder.encode("console.log('a');\n")],
        ['extensions/a/ui.md', encoder.encode('# ui\n')],
      ]),
    };

    const result = discoverPluginObjects(snap);

    // Deterministic list, sorted by manifest path.
    expect(result.plugins.map((p) => p.manifest.file)).toEqual([
      'extensions/a/plugin.md',
      'extensions/b/plugin.md',
    ]);

    // Manifest paths set includes both.
    expect([...result.pluginManifestPaths].sort()).toEqual(['extensions/a/plugin.md', 'extensions/b/plugin.md']);

    // Bundle resolution includes expected resolved paths.
    expect([...result.pluginBundlePaths].sort()).toEqual([
      'extensions/a/entry.js',
      'extensions/a/ui.md',
      'extensions/b/entry.js',
    ]);

    // Resolved mapping preserves declared relpath → resolved path.
    const a = result.plugins[0];
    expect(a.resolvedFiles.get('entry.js')).toBe('extensions/a/entry.js');
    expect(a.resolvedFiles.get('ui.md')).toBe('extensions/a/ui.md');
  });
});
