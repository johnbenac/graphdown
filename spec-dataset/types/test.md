---
typeId: test
fields:
  fieldDefs:
    title: { required: true }
    file: { required: false }
    kind: { required: false }
    status: { required: false }
  composition:
    verifies:
      typeId: req
      required: true
---
