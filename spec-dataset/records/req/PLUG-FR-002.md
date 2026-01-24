---
typeId: "req"
recordId: "PLUG-FR-002"
parent: "section:5-1-plugin-manifest-file-format"
fields:
  title: "Required top-level keys for plugin manifests"
  testable: true
  verify: "ci"
  order: 1
---

A YAML front matter object is a **plugin manifest object** when it defines exactly:

* `pluginId` (string; MUST satisfy PLUG-ID-001)
* `gdApiVersion` (integer; MUST be `>= 1`)
* `entry` (string; required; relative path into the plugin bundle)
* `files` (array of strings; required; each entry is a relative path)

`gdApiVersion` declares the major version of the GraphMD Runtime API the plugin expects.
Dataset validity and hashing/export semantics MUST NOT depend on whether the current host supports that `gdApiVersion`.

Optional keys:

* `meta` (object/map; optional; arbitrary metadata; treated as opaque by core)
* `config` (object/map; optional; arbitrary plugin configuration; treated as opaque by core)
* `requires` (array of strings; optional; host capability identifiers the plugin expects; treated as opaque by core)
* `blocks` (array of strings; optional; each entry is a block CID string)
* `binaryFiles` (array of strings; optional; each entry is a relative path listed in `files`)

The `blocks` list is interpreted by core for block reachability and validation (VAL-PLUG-007/VAL-PLUG-008/GC-001) and is not treated as opaque.
Any bundle file listed in `binaryFiles[]` is treated as binary for hashing (HASH-001). Bundle files not listed are treated as text.

Forbidden keys:

* A plugin manifest MUST NOT define `typeId`.
* A plugin manifest MUST NOT define `recordId`.
* A plugin manifest MUST NOT define `parent`.
* A plugin manifest MUST NOT define `fields`.

No other top-level keys are allowed.
