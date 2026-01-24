---
typeId: "req"
recordId: "NR-PLUG-LINK-001"
parent: "section:2-explicit-non-requirements"
fields:
  title: "No relationship or CID extraction from plugin files"
  testable: true
  verify: "ci"
  order: 5
---

Core MUST NOT extract record relationships (REL-001/REL-002) or block references (CID-REF-001/002) from:

* plugin manifest bodies, or
* plugin bundle file contents.

Core MUST NOT extract record relationships or block references from any plugin manifest YAML values other than `blocks[]`, which is interpreted only as a list of CID strings for reachability/validation.

Only record objects participate in relationship and CID reference extraction, and plugins declare block dependencies only via plugin manifest `blocks[]` (PLUG-FR-002).
