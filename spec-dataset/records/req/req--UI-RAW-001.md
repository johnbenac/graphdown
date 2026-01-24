---
typeId: req
recordId: UI-RAW-001
fields:
  title: Schema-agnostic record editor
  order: 6
  testable: true
parent: section:13-ui-requirements
---


The UI MUST provide a single, schema-agnostic editor that works without plugins and without interpreting type schema.

The editor MUST let the user:

* create/edit the record `recordId` (on create),
* edit the record `fields` as a YAML map (key/value data),
* edit the record Markdown body as raw text.

The editor MUST NOT render schema-driven field widgets or any schema-derived UI for record fields.
This includes (but is not limited to) rendering inputs based on `fields.fieldDefs` metadata such as `kind`, `options`, or UI-hint-like keys.
The only required editing surface for record `fields` is raw YAML text.

On save, the submitted YAML map replaces the persisted `fields` map; omitting a key removes it.

On save, the UI MUST validate the resulting dataset snapshot using core validation rules. If validation fails, the UI MUST NOT persist the change and MUST surface the validation errors.

---