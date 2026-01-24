---
typeId: section
recordId: "appendix-a-minimal-examples--type-object-composition-required-fields"
parent: "section:appendix-a-minimal-examples"
fields:
  title: "Type object (composition + required fields)"
  order: 0
  level: 3
---


```md
---
typeId: car
fields:
  fieldDefs:
    vin:
      required: true
    trim:
      required: false
  composition:
    engine:
      typeId: engine
      required: true
    roof_rack:
      typeId: roof_rack
      required: false
---
```
