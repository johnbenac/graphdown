---
typeId: req
recordId: HASH-001
fields:
  title: Canonical dataset hashing (gdhash-v1)
  order: 1
parent: section:3-1-dataset-identity-hashes
---


Core implementations MUST be able to compute deterministic hashes over GraphMD **semantic dataset files**.

Semantic files are:

* type object record files (FR-MD-021),
* record object record files (FR-MD-023),
* plugin manifest files (PLUG-FR-002), and
* plugin bundle files referenced by plugin manifests (PLUG-LAYOUT-002).

Block store files are not hashed directly (HASH-005).

1. **Discover included semantic files**
   * Discover type/record files per LAYOUT-001 and classify them via FR-MD-021/023.
   * Discover plugin manifests per PLUG-LAYOUT-001 (YAML object with `pluginId` and `gdApiVersion`).
   * Discover plugin bundle files by resolving each manifest’s `files[]` list per PLUG-LAYOUT-002.

2. **Normalize each included semantic file**
   For each included semantic file:
   * Read the entire file as bytes.
   * Type objects, record objects, and plugin manifest files MUST decode as UTF-8 text.
   * Plugin bundle files listed in `binaryFiles[]` MUST be hashed as raw bytes (no decoding, no line-ending normalization).
   * Plugin bundle files not listed in `binaryFiles[]` MUST decode as UTF-8 text.
   * Hashing MUST fail if UTF-8 decoding fails.
   * For UTF-8 decoded files only, normalize line endings by converting all `\r\n` and bare `\r` to `\n`.

3. **Determine the identity string for hashing**
   Determine a stable identity string for each included semantic file:

   * type objects: `identity = typeId`
   * record objects: `identity = typeId:recordId`
   * plugin manifests: `identity = plugin.<pluginId>`
   * plugin bundle files: `identity = plugin.<pluginId>/<relativePath>`

   Where:
   * `<pluginId>` satisfies PLUG-ID-001
   * `<relativePath>` is exactly the `files[]` entry string as declared in the manifest

   If two included semantic files share the same identity string, hashing MUST fail.

4. **Sort**
   Sort included semantic files by the UTF-8 bytes of the identity string in ascending lexicographic order.

5. **Build the byte stream**
   Build the byte stream to hash as:

   * prefix: the UTF-8 bytes of the literal string `graphmd:gdhash:v1` followed by a single NUL byte (`0x00`)
   * then, for each file in sorted order, append:

     * the identity string as UTF-8 bytes, then NUL (`0x00`)
     * the decimal byte length of the normalized file content (ASCII digits), then NUL (`0x00`)
     * the normalized file content bytes
     * NUL (`0x00`)

6. **Digest**
   Compute `SHA-256` over the resulting byte stream.

The resulting digest MUST be wrapped as a DASL CIDv1 string (raw codec).