---
typeId: "req"
recordId: "EXP-PLUG-001"
parent: "section:12-export-requirements"
fields:
  title: "Canonical plugin export layout"
  testable: true
  verify: "todo"
  order: 3
---

For each plugin object with `pluginId = P`, canonical export MUST include:

1. The plugin manifest file bytes at:

   `plugins/<P>/manifest.md`

2. Each plugin bundle file declared in `files[]` at:

   `plugins/<P>/<relativePath>`

Where `<relativePath>` is exactly the string declared in the manifest.

Export MUST preserve file bytes exactly (no rewriting/reformatting), except for relocating them into the canonical export directory structure.
