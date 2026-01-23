# Persistence layer

Persistence logic now lives in `@graphmd/persistence`, including snapshot
serialization and schemas. The IndexedDB-backed store is provided by
`@graphmd/storage-idb`. This folder retains only web-facing tests that
exercise persistence behavior via the shared package.
