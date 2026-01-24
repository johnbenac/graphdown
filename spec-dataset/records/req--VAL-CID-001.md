---
typeId: req
recordId: "VAL-CID-001"
parent: "section:4-plugin-validity-and-integrity-rules"
fields:
  title: "Invalid CID-shaped block reference tokens fail validation"
  order: 8
  testable: true
---


When extracting block references per CID-REF-001/CID-REF-002, validators MUST treat any wiki-link token whose inner text matches the CID lexical shape:

`^b[a-z2-7]{58}$`

but does not decode as a valid DASL CIDv1 string as an import-failing error.

Validation MUST fail with error code `E_CID_INVALID`, attributing the error to the containing record file.
