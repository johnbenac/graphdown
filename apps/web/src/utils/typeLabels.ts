import type { GraphTypeDef } from "../../../../src/core/graph";

export function getTypeLabel(type: GraphTypeDef): string {
  const fields = type.fields ?? {};
  const pluralName = typeof fields.pluralName === "string" ? fields.pluralName : null;
  const displayName = typeof fields.displayName === "string" ? fields.displayName : null;
  const name = typeof fields.name === "string" ? fields.name : null;
  return pluralName ?? displayName ?? name ?? type.recordTypeId;
}
