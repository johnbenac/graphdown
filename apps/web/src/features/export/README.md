# Export helpers

This directory contains browser-only export helpers that take dataset bytes and
prompt the user to download a zip file.

## Files

- `downloadZip.ts`
  - Converts `Uint8Array` data into an `ArrayBuffer` and wraps it in a `Blob`.
  - Creates a temporary object URL, triggers a download via a synthetic `<a>`
    element, and cleans up the URL after the click.

## Tests

- `exportZip.unit.test.ts` exercises the export workflow with the `@graphdown/core` zip helpers
  to ensure exported datasets match canonical expectations.
- `exportZip.plugins.integration.test.ts` covers plugin-aware export behavior.
