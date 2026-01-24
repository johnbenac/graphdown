---
typeId: req
recordId: "PLUG-LAYOUT-002"
parent: "section:repository-layout-requirements"
fields:
  title: "Plugin bundle files are resolved from the manifest"
  order: 9
  testable: true
  verify: "todo"
---


For each discovered plugin manifest file at dataset path `M`:

* Define `manifestDir(M)` as:
  * `""` if `M` contains no `/` (manifest is at dataset root), otherwise
  * the substring of `M` up to (but not including) the final `/`.

* The plugin manifest MUST declare `files: [ ... ]` as a list of relative paths (PLUG-FR-002).

* Each declared file path `p` MUST be resolved to a dataset-relative path string `resolve(M, p)` as:

  * If `manifestDir(M) == ""`: `resolve(M, p) = p`
  * Otherwise: `resolve(M, p) = manifestDir(M) + "/" + p`

`resolve(M,p)` MUST be a dataset-relative path and MUST NOT begin with `/`.

The resolved set of files is the plugin object’s **bundle file set**.

Bundle file resolution MUST be deterministic and MUST NOT depend on repo layout beyond the manifest’s own location and its declared relative paths.
