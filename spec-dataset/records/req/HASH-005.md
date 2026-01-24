---
typeId: "req"
recordId: "HASH-005"
parent: "section:3-1-dataset-identity-hashes"
fields:
  title: "Block content is committed by reference CIDs"
  testable: true
  order: 4
---

Block store file bytes are not included directly in dataset fingerprints.

Instead, blocks are committed by reference:

* record objects reference blocks via CID-shaped references validated by VAL-BLOCK-001/002, and
* plugin objects may declare block dependencies via `blocks[]` in plugin manifests; these blocks are committed by CID reference and MUST be present and valid in the block store (VAL-PLUG-008).

Dataset fingerprints (HASH-002/HASH-003) are computed over:

* type objects,
* record objects,
* plugin manifests, and
* plugin bundle files

only (per HASH-001 and HASH-003).
