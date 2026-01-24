---
typeId: section
recordId: type-object-composition-required-fields
fields:
  title: Type object (composition + required fields)
  order: 1
  level: 3
parent: section:appendix-a-minimal-examples
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