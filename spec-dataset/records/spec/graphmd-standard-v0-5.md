---
typeId: spec
recordId: graphmd-standard-v0-5
fields:
  title: "GraphMD Standard: Dataset Repositories"
  version: 0.5 (Draft)
  lastUpdated: 2026-01-14
  status: Normative / single source of truth
---
This document is the **only** authoritative specification for GraphMD. It **absorbs** and **replaces** any separate “dataset validity” documents. If there’s a conflict between documents, **this** one wins.

Unless a future version defines otherwise, the canonical hashing procedure described here is **gdhash-v1**.

This version introduces a breaking identity model: records are identified by `(typeId, recordId)` and record links use `[[typeId:recordId]]`.
