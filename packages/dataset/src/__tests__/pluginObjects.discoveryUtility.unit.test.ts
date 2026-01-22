import { describe, expect, it } from 'vitest';

import type { DatasetSnapshot } from "../index.js";
import { discoverPluginObjects } from "../index.js";

const encoder = new TextEncoder();

function manifest(lines: string[]): Uint8Array {
  return encoder.encode(['---', ...lines, '---', ''].join('\n'));
}

describe('plugin object discovery utility', () => {
  it('PLUG-UTIL-001: discovers plugin manifests + resolves bundle paths deterministically (sorted by manifest path)', () => {
    const snap: DatasetSnapshot = {
      files: new Map<string, Uint8Array>([
        [
          'plugins/b/manifest.md',
          manifest(['pluginId: b', 'gdApiVersion: 1', 'entry: entry.js', 'files:', '  - entry.js']),
        ],
        ['plugins/b/entry.js', encoder.encode("console.log('b');\n")],

        [
          'plugins/a/manifest.md',
          manifest(['pluginId: a', 'gdApiVersion: 1', 'entry: entry.js', 'files:', '  - entry.js', '  - ui.md']),
        ],
        ['plugins/a/entry.js', encoder.encode("console.log('a');\n")],
        ['plugins/a/ui.md', encoder.encode('# ui\n')],
      ]),
    };

    const result = discoverPluginObjects(snap);

    // Deterministic list, sorted by manifest path.
    expect(result.plugins.map((p) => p.manifest.file)).toEqual([
      'plugins/a/manifest.md',
      'plugins/b/manifest.md',
    ]);

    // Manifest paths set includes both.
    expect([...result.pluginManifestPaths].sort()).toEqual(['plugins/a/manifest.md', 'plugins/b/manifest.md']);

    // Bundle resolution includes expected resolved paths.
    expect([...result.pluginBundlePaths].sort()).toEqual([
      'plugins/a/entry.js',
      'plugins/a/ui.md',
      'plugins/b/entry.js',
    ]);

    // Resolved mapping preserves declared relpath → resolved path.
    const a = result.plugins[0];
    expect(a.resolvedFiles.get('entry.js')).toBe('plugins/a/entry.js');
    expect(a.resolvedFiles.get('ui.md')).toBe('plugins/a/ui.md');
  });
});
