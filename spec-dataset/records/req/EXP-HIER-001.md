---
typeId: req
recordId: EXP-HIER-001
fields:
  title: Canonical parent-based export layout
  order: 2
  testable: true
parent: section:12-export-requirements
---
The canonical dataset export (EXP-003) MUST produce a deterministic directory tree rooted at `types/` and `records/` derived solely from object identities and record `parent` pointers (HIER-001).

Type objects:
* A type object with `typeId = T` MUST be exported at: `types/T.md`

Record objects:
* Each record object has identity `K = typeId:recordId`.
* Define the directory name for `K` as: `dirName(K) = "<typeId>.<recordId>"`
  * The literal `.` separator is safe because `typeId` and `recordId` do not allow `.` per ID-001.
* Define the record file name as: `<recordId>.md`
* If a record is a hierarchy root (HIER-001), it MUST be exported at:
  * `records/<dirName(K)>/<recordId>.md`
* If a record has `parent = P`, it MUST be exported under its parent’s directory:
  * `<exportDir(P)>/<dirName(K)>/<recordId>.md`
  * where `<exportDir(P)>` is the directory containing the parent’s `<parentRecordId>.md` file.

Reachable blocks:
* The canonical dataset export MUST include reachable block files per EXP-006, preserving canonical block store paths (BLOCK-LAYOUT-001).
