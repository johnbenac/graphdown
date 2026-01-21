# Graphdown Dataset Authoring Guide
*Practical guidance for writing and maintaining Graphdown datasets (Markdown + YAML front matter).*  
Based on **Graphdown Standard v0.5 (Draft)** (last updated 2026-01-14).

> This guide is intentionally **author-focused**: how to structure content, write files, and avoid common pitfalls.  
> For the exact normative rules, see `SPEC.md` in the Graphdown repo.
>
> Note: Graphdown plugins are now first-class dataset objects. This guide includes a practical, minimal “how to bundle a plugin”
> section, including support for binary bundle assets via `binaryFiles`.

---

## Quickstart: a tiny dataset you can copy-paste

Here’s a minimal dataset with **two types** and a few records. If you understand this example, you understand 80% of Graphdown authoring.

### Repository layout (recommended)

```text
my-dataset/
  types/
    project.md
    task.md
  records/
    project.alpha/alpha.md
    task.t-001/t-001.md
  blocks/
    sha2-256/
      (optional attachments live here)
  plugins/            (optional: plugin bundles; see “Plugins” below)
    <pluginId>/
      manifest.md
      (bundle files live alongside)
```

> Graphdown identities do **not** depend on file paths. `types/`, `records/`, and `blocks/` are the **canonical export shape**.
> Plugins are authored under `plugins/` and exported in the same canonical layout.

### 1) Define a type: `types/task.md`

```md
---
typeId: task
fields:
  fieldDefs:
    title:
      required: true
    status:
      required: false
      # Anything beyond `required` is plugin territory.
      kind: select
      options: [todo, doing, done]
  composition:
    project:
      typeId: project
      required: true
---
```

This says:
- There is a type named `task`.
- Every task record must have a non-empty `fields.title`.
- Every task record must contain at least one outgoing link to a `project` record (more on that soon).

### 2) Define another type: `types/project.md`

```md
---
typeId: project
fields:
  fieldDefs:
    name:
      required: true
---
```

### 3) Create a record: `records/project.alpha/alpha.md`

```md
---
typeId: project
recordId: alpha
fields:
  name: "Alpha launch"
---
```

### 4) Create a record with links: `records/task.t-001/t-001.md`

```md
---
typeId: task
recordId: t-001
fields:
  title: Write the authoring guide
  status: doing
---
This task belongs to [[project:alpha]].
```

That `[[project:alpha]]` is a **relationship link**. It’s also what satisfies the `composition.project` requirement from the `task` type.

---

## The mental model: what Graphdown is optimizing for

Graphdown’s dataset format has a few strong opinions—mostly in service of long-term maintainability:

- **Markdown-first, repo-first.** Your dataset is a folder of `.md` files that work well in Git.
- **Schema-as-data.** Types are authored as data *inside* the dataset. No “per-dataset code” required for basic CRUD.
- **Stable identities.** Records have stable IDs that are safe to reference (`typeId:recordId`). Paths don’t matter.
- **Minimal core semantics.** Core validation is intentionally lightweight:
  - it checks structure, required fields, composition constraints, hierarchy, and block integrity
  - it does **not** enforce rich data types (dates, enums, money, etc.) — that’s plugin territory
- **Human-authored text stays human-authored.** Graphdown avoids rewriting your content just to “normalize” it.

If you keep those in mind, the format tends to feel… pleasantly unsurprising.

---

## The one file format you need to know

Every type and record is a **Markdown file with YAML front matter**.

### Template

```md
---
<yaml object>
---
<body markdown>
```

Rules-of-thumb that save pain:
- The file must start with `---` at **byte 0** (no leading spaces, no BOM).
- YAML must be a **map/object**, not a list.
- The closing `---` matters. If you forget it, the file won’t parse.

---

## IDs: the “naming rules” that make everything composable

### ✅ Allowed identifiers

Both `typeId` and `recordId` are:
- strings
- trimmed (no all-whitespace)
- matching:

```text
^[A-Za-z0-9][A-Za-z0-9_-]*$
```

So:
- start with a letter or number
- then letters/numbers/underscore/hyphen

Examples that work:
- `person`
- `task`
- `t-001`
- `NASA_payload`
- `2026_goals`

### 🚫 Not allowed

- `:` (colon) is reserved for `typeId:recordId`
- spaces (`"my record"`)
- dots in IDs (`alpha.v2` — use `alpha-v2`)
- leading hyphen (`-bad`)
- empty strings

Dots are fine in folder names; the common `records/<typeId>.<recordId>/` convention uses a dot as a separator, but the IDs themselves can’t contain dots.

**Practical tip:** treat IDs as “permanent URLs.” If you rename them, you’re doing a migration.

---

## Types: defining your model (without over-designing it)

A **type object** is any record file whose YAML contains:
- `typeId`
- `fields` (a YAML map)

…and **does not** contain `recordId`.

### Minimal type example

```md
---
typeId: note
fields: {}
---
```

Yes, an empty `fields: {}` is valid. You can start tiny.

### Put human-facing names in `fields`, not as top-level keys

Top-level YAML keys are intentionally limited. You **can’t** do this:

```yaml
typeId: task
title: Task   # ❌ forbidden top-level key
fields: {}
```

Instead:

```yaml
typeId: task
fields:
  title: Task   # ✅ allowed (core treats it as opaque)
```

This is one of the core extensibility patterns: **top-level is fixed; `fields` is open.**

---

## Records: instances of types

A **record object** is any record file whose YAML contains:
- `typeId`
- `recordId`
- `fields` (a YAML map)
- optional `parent`

### Minimal record example

```md
---
typeId: note
recordId: n-001
fields: {}
---
Hello world.
```

### Records can store any YAML shapes inside `fields`

`fields` is a free-form YAML object. These are all fine:

```yaml
fields:
  title: "Example"
  done: false
  tags: [writing, specs, v0-5]
  metadata:
    created: 2026-01-09
    estimateMinutes: 30
  checklist:
    - "Draft"
    - "Review"
    - "Ship"
```

Core won’t validate those shapes semantically. Your plugin can.

---

## Relationships: linking records the Graphdown way

### The only core relationship syntax is a wiki-link token

```text
[[typeId:recordId]]
```

Example:

```md
See also [[person:johnny]] and [[project:alpha]].
```

If you want Graphdown core to recognize a relationship, use that exact bracket form.

### Where relationships are extracted from

Graphdown extracts relationship targets from:
- the record **body**
- **any string value** anywhere inside the record `fields` map (even nested)

Note: relationships are extracted from **record objects only**. Type files are not scanned for relationships.

Example: links in fields

```md
---
typeId: task
recordId: t-002
fields:
  title: "Call [[person:johnny]]"
  related:
    - "[[task:t-001]]"
    - "Depends on [[task:t-003]]"
---
```

That produces outgoing relationships to:
- `person:johnny`
- `task:t-001`
- `task:t-003`

### What does *not* create a core relationship

These won’t be treated as relationships by core:

```yaml
fields:
  assignee:
    typeId: person
    recordId: johnny
```

That structure is allowed (it’s valid YAML), but **core won’t interpret it** as a relationship.

This is a feature: plugins can invent richer shapes without forcing everyone to adopt them.

### Unresolved links are usually okay

If you write `[[project:does-not-exist]]`, core treats it like an “uncreated note” link:
- it’s not a dataset-invalid error by itself
- **but** unresolved links do **not** satisfy composition requirements (more below)

---

## Hierarchy: nesting records with `parent`

You can organize records into a tree using a single top-level key: `parent`.

### Example: a task nested under a project

```md
---
typeId: task
recordId: t-003
parent: project:alpha
fields:
  title: "Make launch checklist"
---
This task belongs to [[project:alpha]].
```

Notes:
- `parent` must be either:
  - missing (root)
  - `null` (root)
  - a string exactly like `typeId:recordId`
- `parent` **must point to an existing record**
- parent pointers must not create cycles

### Important gotcha: `parent` is not a relationship link

Core treats hierarchy separately from relationships. So:

- `parent: project:alpha` does **not** count as “linking to a project” for composition constraints.
- If your type requires a relationship link (composition), include an explicit `[[project:alpha]]` somewhere in body/fields.

That separation is deliberate:
- `parent` is structural navigation (“where this record lives in the tree”)
- wiki-links are semantic relationships (“what this record references”)

---

## Required fields: lightweight validation that stays out of your way

If a type defines:

```yaml
fields:
  fieldDefs:
    title:
      required: true
```

…then every record of that type must include:

- `fields.title` present
- not `null`
- not an all-whitespace string

Examples:

✅ valid

```yaml
fields:
  title: "A real title"
```

❌ invalid (missing)

```yaml
fields: {}
```

❌ invalid (null)

```yaml
fields:
  title: null
```

❌ invalid (blank string)

```yaml
fields:
  title: "   "
```

**Good practice:** start with only the required fields you’re truly confident about. You can always add more later.

---

## Composition: “records of this type must link to…”

Composition is a simple way to enforce that certain records aren’t “floating” without key connections.

### Example: every `task` must link to a `project`

Type definition:

```yaml
fields:
  composition:
    project:
      typeId: project
      required: true
```

Record that satisfies it:

```md
---
typeId: task
recordId: t-004
fields:
  title: "Write release notes"
---
For [[project:alpha]].
```

Record that fails it:

```md
---
typeId: task
recordId: t-005
fields:
  title: "Random task"
---
No links here.
```

What counts:
- Any outgoing relationship link `[[project:<something>]]` found in body/fields
- The referenced record must actually exist (unresolved links don’t count)

What doesn’t count:
- `parent: project:alpha`
- structured YAML relationship shapes (unless they’re strings containing wiki-links)

**Design intention:** composition is a small, reliable constraint you can use for “minimum completeness” without locking you into heavy schema systems.

---

## Blocks: attachments and binary content

Sometimes you need to reference bytes: images, PDFs, audio, etc. Graphdown does this with **content-addressed blocks**.

### What it looks like in a record

```md
Here’s the screenshot: [[bafkreibm6jg3ux5qumhcn2b3flc3tyu6dmlb4xa7u5bf44yegnrjhc4yeq]]
```

That token is a **CID** (content identifier). It points to a file in the block store.

### Where the block file lives

Block files are stored under:

```text
blocks/sha2-256/<prefix>/<cid>
```

Where:
- `<cid>` is the exact CID string
- `<prefix>` is the first byte of the block’s SHA-256 digest, as two lowercase hex characters

Example (for the CID above):

```text
blocks/sha2-256/2c/bafkreibm6jg3ux5qumhcn2b3flc3tyu6dmlb4xa7u5bf44yegnrjhc4yeq
```

### What validation enforces

- Every block reference `[[<cid>]]` must resolve to a matching block file.
- Every block file under `blocks/` must have bytes matching its CID digest.
- Unreferenced block files are allowed (they’re considered “garbage,” but not invalid).

### Practical workflow advice

- Prefer adding attachments through Graphdown tooling/UI when available (so CIDs and paths are handled for you).
- If you generate blocks yourself, build a tiny helper script in your plugin/tooling that:
  1) hashes bytes
  2) builds the CID
  3) writes the file to the canonical path
  4) inserts `[[<cid>]]` into the record

One more nuance:
- **Dataset attachments** (images/PDFs/audio that are part of the dataset’s content) should generally be **blocks**.
- **Plugin-local assets** (icons/fonts/wasm/zips used by the plugin itself) may be shipped as **plugin bundle files**.
  If a plugin bundle file is binary, it must be declared in the plugin manifest’s `binaryFiles[]` list (see next section).

---

## Plugins

Plugins let you ship **behavior + UI + supporting files** alongside a dataset.

This authoring guide focuses on the **packaging rules** (what files go where, what the manifest looks like, and what’s valid).
The details of *what plugin code can do at runtime* are evolving and should be treated as “check the current app/runtime docs.”

### Plugin bundle layout (authoring)

In a repo you author directly, a plugin typically lives under:

```text
plugins/<pluginId>/
  manifest.md            # plugin manifest (Markdown + YAML front matter)
  entry.js             # entrypoint JS (must be listed in files[])
  ui.md                # optional docs/metadata the plugin uses
  assets/
    logo.bin           # example binary asset
```

When Graphdown exports a **canonical** dataset zip/snapshot, tools may rewrite plugins into a canonical layout (for example,
placing the manifest at `plugins/<pluginId>/manifest.md`). Don’t panic if you see `plugins/` in exports — it’s the same plugin,
just in canonical shape.

### Plugin manifest (what you must write)

The plugin manifest is a Markdown file with YAML front matter.

Example: `plugins/demo/manifest.md`

```md
---
pluginId: demo
gdApiVersion: 1
entry: entry.js
files:
  - entry.js
  - ui.md
  - assets/logo.bin

# NEW in v0.5: declare which bundle files are binary (hashed/validated as raw bytes)
binaryFiles:
  - assets/logo.bin

# Optional keys (core mostly treats these as opaque except blocks reachability)
meta: {}
config: {}
requires: []
blocks: []
---

Plugin manifest body text (optional).
```

Key rules you should internalize:

- `files[]` is the list of **bundle files** (relative paths) that are part of the plugin.
- `entry` **must appear** in `files[]`.
- `binaryFiles[]` is optional. If present:
  - it must be a list of strings,
  - every entry must be a **safe relative path**,
  - every entry must also appear in `files[]` (exact string match).
- For each file in `files[]`:
  - if the path is **not** in `binaryFiles[]`, the file must be **UTF-8 decodable**
  - if the path **is** in `binaryFiles[]`, it may be **any bytes**

Practical takeaway: keep your JS/MD/etc as UTF-8 text; put images/fonts/wasm/zips in `binaryFiles`.

### Blocks declared by plugins

If your plugin needs blocks that are not referenced by any record (for example, plugin-owned assets stored as blocks),
it may declare them explicitly in the manifest:

```yaml
blocks:
  - bafkrei...
  - bafkrei...
```

This ensures they’re considered reachable for validation/export/GC workflows.

### Hashing behavior for plugin bundle files

This matters for determinism and “why did my dataset hash change?” debugging:

- **Text plugin bundle files** (not in `binaryFiles[]`) are hashed as UTF-8 text with line ending normalization.
  - `\n` vs `\r\n` does *not* change the hash.
- **Binary plugin bundle files** (listed in `binaryFiles[]`) are hashed as **raw bytes**.
  - any byte change changes the dataset hash.

### Common plugin authoring errors (and fixes)

- `E_PLUGIN_UTF8_INVALID` for a plugin file like `logo.png` / `font.ttf` / `plugin.wasm`  
  → Add that path to `binaryFiles[]` in the manifest (and ensure it is also listed in `files[]`).

- `E_PLUGIN_KEYS_INVALID` complaining that a `binaryFiles` entry “must be listed in files”  
  → Add the missing file path to `files[]` or remove it from `binaryFiles[]`.

- Validation complaining about **reserved export paths** (for example: you listed `manifest.md` in `files[]`)  
  → Rename the bundle file and update `files[]`. `manifest.md` is reserved for canonical export (`plugins/<pluginId>/manifest.md`).

---

## Recommended repository structure and conventions

Even though identity doesn’t depend on paths, a consistent layout makes collaboration calmer.

### Suggested structure

```text
types/
  <typeId>.md

records/
  <typeId>.<recordId>/
    <recordId>.md
    (optional supporting files that are not record files)

blocks/
  sha2-256/
    <prefix>/
      <cid>

plugins/                      (optional plugins, authoring layout)
  <pluginId>/
    manifest.md
    (bundle files listed in files[])
```

### Naming conventions that age well

- **typeId:** singular noun (`person`, `project`, `invoice`)
- **recordId:** stable slug (`johnny`, `alpha`, `2026-q1`, `t-001`)
- Avoid encoding volatile state in IDs (`task-done`, `project-old`)—put that in fields.

---


## Real-world dataset patterns (with mini examples)

These are a few patterns that show up a lot in “content-rich” datasets.

### Pattern: a research library (papers + authors + attached PDFs)

- Types: `paper`, `author`, `tag`
- Records: one file per paper/author/tag
- Relationships:
  - `paper` links to its `author`(s) using `[[author:...]]`
  - `paper` links to `tag` records using `[[tag:...]]`
- Attachments:
  - store the PDF bytes as a block file under `blocks/sha2-256/...`
  - reference it from the paper body with `[[<cid>]]`

Example (paper record):

```md
---
typeId: paper
recordId: attention-is-all-you-need
fields:
  title: "Attention Is All You Need"
  year: 2017
  authors:
    - "[[author:vaswani]]"
    - "[[author:shazeer]]"
---
PDF: [[<cid-of-pdf-bytes>]]

Notes:
- Key idea: ...
```

### Pattern: “chapters in a book” hierarchy

Use `parent` when you want a clean navigation tree.

```md
---
typeId: chapter
recordId: intro
fields:
  title: "Introduction"
---
```

```md
---
typeId: section
recordId: why-graphdown
parent: chapter:intro
fields:
  title: "Why Graphdown?"
---
(Body content here.)
```

### Pattern: product/parts catalogs with completeness constraints

Composition is great when you want “every X must include at least one Y”.

Example: every `car` record must link to an `engine` record.

```yaml
fields:
  composition:
    engine:
      typeId: engine
      required: true
```

Then, inside each `car` record, include at least one `[[engine:...]]` link.

---


## Plugin-friendly authoring patterns

Graphdown core is deliberately conservative about semantics. That’s good news for plugin authors: you can define rich conventions without breaking core compatibility.

### 1) Put plugin metadata under `fields` (never top-level)

Top-level YAML is reserved. So instead of:

```yaml
title: Task        # ❌ forbidden (top-level)
widget: select     # ❌ forbidden (top-level)
```

Do this:

```yaml
fields:
  title: Task
  ui:
    widget: select
```

### 2) Consider namespacing plugin data

If multiple plugins might touch the same dataset, a simple convention prevents collisions:

```yaml
fields:
  plugins:
    myPlugin:
      version: 1
      config:
        showTimeline: true
```

Core ignores it. Your plugin can evolve it.

### 3) Avoid “accidental relationships” in plugin strings

Core scans **all record field strings** for wiki-links.

That’s usually what you want… until you store display text that happens to contain `[[typeId:recordId]]`.

If you *don’t* want core relationships:
- store references as structured objects (core ignores non-strings), or
- store `typeId:recordId` as a plain string **without** `[[...]]`, or
- put the value in a non-string shape (e.g. `{ key: "project:alpha" }`)

If you *do* want core relationships *and* extra metadata, an easy pattern is:

```yaml
fields:
  blockedBy:
    - "UI label: Payment, link: [[invoice:inv-102]]"
```

Your plugin can parse the string; core still sees the relationship.

### 4) Keep core constraints minimal; enforce richer rules in the plugin

Core supports:
- required fields (presence/blank checks)
- composition (must link to at least one record of a type)
- hierarchy integrity
- block integrity

Everything else (date formats, enums, ranges, “status must be one of…”) belongs in the plugin or author tooling.

That tends to produce datasets that stay usable even when plugins change.

---

## Common mistakes and quick fixes

### “Why is my file ignored?”

Usually one of these:
- file doesn’t end in `.md`
- file doesn’t start with `---` at byte 0
- YAML doesn’t contain `typeId`

Fix: ensure the very first characters of the file are:

```md
---
typeId: something
fields: {}
---
```

### “Top-level key \"title\" is not allowed”

Fix: move it under `fields`:

```yaml
fields:
  title: "My title"
```

### “fields must be an object”

Fix: `fields` must be a YAML map, not a string/list:

✅

```yaml
fields: {}
```

❌

```yaml
fields: []
```

### “Record references missing typeId …”

Fix: you created records before defining the type. Add a type object with that `typeId`.

### “Parent … does not exist” / “Parent pointer cycle detected”

Fix:
- parent must point to an existing record identity (`typeId:recordId`)
- no self-parenting
- no loops (A → B → A)

### “Block … referenced from … is missing”

Fix: the block file must exist at the canonical path under `blocks/sha2-256/...`

### “Invalid CID reference …”

Fix: avoid CID-shaped tokens that aren’t real CIDs. If you meant a record link, it should be `[[typeId:recordId]]` not a base32 CID.

### “E_PLUGIN_UTF8_INVALID” for a plugin asset

Fix: if the plugin bundle includes non-text bytes (png/ttf/wasm/zip/etc), list that path under `binaryFiles:` in the plugin manifest.
If it’s *not* in `binaryFiles`, Graphdown treats it as text and requires valid UTF-8.

### “binaryFiles entry … must be listed in files”

Fix: every path listed in `binaryFiles:` must also appear in `files:` by exact string equality.

---

## FAQ

### Can I store UI hints, widget definitions, or plugin config in the dataset?

Yes—put them under `fields`, typically inside type objects.

A common pattern:

```yaml
fields:
  ui:
    label: Task
    icon: check-square
  fieldDefs:
    status:
      required: false
      ui:
        widget: select
        options: [todo, doing, done]
```

Core will ignore `ui` entirely; your plugin can interpret it.

### Why are top-level keys restricted?

So the ecosystem doesn’t fragment into “everyone invents their own top-level schema.”  
Keeping top-level small makes datasets more portable and tooling simpler.

### Should I put long prose in `fields`?

Usually no. Put long text in the Markdown body. Use `fields` for structured metadata.

### Do I have to keep records in `records/` and types in `types/`?

Graphdown’s core model doesn’t care about paths for identity, but this layout is the canonical export shape and is the most compatible choice with current tooling and human expectations.

### Can my dataset live in a GitHub subfolder?

If you plan to import via a GitHub URL in Graphdown, assume “dataset = repo root”.  
Subdirectory GitHub URLs (like `/tree/main/some/subdir`) are rejected by design.

Practical workaround: put the dataset at the repo root, or use a dedicated repo per dataset.

### Can I link to a record that doesn’t exist yet?

Yes. Unresolved relationship links are allowed.  
But:
- they won’t satisfy composition requirements
- `parent` pointers must resolve (those are structural)

### How do I rename a typeId or recordId?

Treat it like a migration:
- change the ID in the file
- update every `[[typeId:recordId]]` reference that should point to the new identity
- update any `parent` pointers
- re-validate

If you want stable long-lived links, prefer leaving IDs alone and changing display names in `fields`.

---

## Starter templates and cheat sheets

To make this easier to adopt, here are two small resources:

- **Starter template repository (zip)** — a ready-to-import dataset you can extend.
- **Cheat sheet (PDF)** — quick reference for file templates, IDs, links, and common errors.

You should find download links for both alongside this guide.

---

## Appendix: Copy-paste templates

### New type file

```md
---
typeId: my_type
fields:
  fieldDefs: {}
---
```

### New record file

```md
---
typeId: my_type
recordId: my_record
fields: {}
---
Write content here. Link to [[other_type:other_record]] if needed.
```
