---
typeId: req
recordId: "API-RLG-001"
parent: "section:1-read-access-to-derived-structures"
fields:
  title: "Record Link Graph adjacency is readable"
  order: 0
  testable: false
---


The Runtime API MUST provide read access to **Record Link Graph** adjacency derived per REL-001/REL-002/REL-003/REL-007.

At minimum, it MUST provide:

* outgoing record link targets for a given `recordKey`
* incoming record link sources for a given `recordKey`

Returned adjacency lists MUST be deterministic and SHOULD be sorted lexicographically by `recordKey`.

Notes:

* Outgoing link extraction MUST be derived only from wiki-link tokens `[[typeId:recordId]]` found in record bodies and record `fields` strings (REL-002).
* Type objects MUST NOT be scanned for record relationships (REL-002).
* Unresolved links are allowed and are not import-failing (NR-LINK-001); adjacency MAY include unresolved targets.

---
