# Validation rules

`validate/` implements Graphdown dataset validation and the shared error
structures used throughout the domain layer.

## Key modules

- `errors.ts`
  - Defines `ValidationError`, `ValidationErrorCode`, and the `makeError`
    helper used across parsing, validation, hashing, and graph building.
- `validateDatasetSnapshot.ts`
  - Validates dataset layout, identifiers, parent relationships, required
    fields, composition constraints, and block store integrity.
  - Returns `ValidationError` entries with codes and optional hints for the UI.

## Usage notes

- Validation expects `DatasetSnapshot` inputs; use `parse/` helpers to
  understand parsing expectations and error codes.
