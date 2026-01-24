---
typeId: req
recordId: EXP-PLUG-001
fields:
  title: Canonical plugin export layout
  order: 4
  testable: true
  verify: todo
parent: section:12-export-requirements
---


For each plugin object with `pluginId = P`, canonical export MUST include:

1. The plugin manifest file bytes at:

   `plugins/<P>/manifest.md`

2. Each plugin bundle file declared in `files[]` at:

   `plugins/<P>/<relativePath>`

Where `<relativePath>` is exactly the string declared in the manifest.

Export MUST preserve file bytes exactly (no rewriting/reformatting), except for relocating them into the canonical export directory structure.