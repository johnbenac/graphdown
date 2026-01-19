# Persistence layer

Persistence logic now lives in `@graphdown/persistence`, including snapshot
serialization, schemas, and the IndexedDB-backed store. This folder retains
only web-facing tests that exercise persistence behavior via the shared package.
