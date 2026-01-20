# Persistence layer

Persistence logic now lives in `@graphdown/persistence`, including snapshot
serialization and schemas. The IndexedDB-backed store is provided by
`@graphdown/storage-idb`. This folder retains only web-facing tests that
exercise persistence behavior via the shared package.
