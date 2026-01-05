import { describe, expect, it } from "vitest";
import { validateDatasetSnapshot } from "../../core";

const encoder = new TextEncoder();

function snapshot(entries: Array<[string, string]>) {
  return { files: new Map(entries.map(([path, content]) => [path, encoder.encode(content)])) };
}

function record(path: string, yamlLines: string[], body = "") {
  return [path, ["---", ...yamlLines, "---", body].join("\n")] as [string, string];
}

describe("core composition", () => {
  it("VAL-COMP-002: required component link resolves to correct type", () => {
    const result = validateDatasetSnapshot(
      snapshot([
        record("any/engine.md", ["typeId: engine", "fields: {}"]),
        record("any/car.md", [
          "typeId: car",
          "fields:",
          "  composition:",
          "    engine:",
          "      typeId: engine",
          "      required: true"
        ]),
        record("records/engine/e1.md", ["typeId: engine", "recordId: e1", "fields: {}"]),
        record(
          "records/car/c1.md",
          ["typeId: car", "recordId: c1", "fields: {}"],
          "Has [[engine:e1]]."
        )
      ])
    );
    expect(result.ok).toBe(true);
  });

  it("VAL-COMP-002: missing required component link fails", () => {
    const result = validateDatasetSnapshot(
      snapshot([
        record("types/engine.md", ["typeId: engine", "fields: {}"]),
        record("types/car.md", [
          "typeId: car",
          "fields:",
          "  composition:",
          "    engine:",
          "      typeId: engine",
          "      required: true"
        ]),
        record("records/car/c1.md", ["typeId: car", "recordId: c1", "fields: {}"], "No links here.")
      ])
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "E_COMPOSITION_CONSTRAINT_VIOLATION")).toBe(true);
    }
  });

  it("VAL-COMP-002: link to wrong type does not satisfy requirement", () => {
    const result = validateDatasetSnapshot(
      snapshot([
        record("types/engine.md", ["typeId: engine", "fields: {}"]),
        record("types/car.md", [
          "typeId: car",
          "fields:",
          "  composition:",
          "    engine:",
          "      typeId: engine",
          "      required: true"
        ]),
        record("records/car/c1.md", ["typeId: car", "recordId: c1", "fields: {}"], "Points to [[car:self]]")
      ])
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "E_COMPOSITION_CONSTRAINT_VIOLATION")).toBe(true);
    }
  });

  it("VAL-COMP-001: composition referenced types must exist", () => {
    const result = validateDatasetSnapshot(
      snapshot([
        record("types/car.md", [
          "typeId: car",
          "fields:",
          "  composition:",
          "    engine:",
          "      typeId: engine",
          "      required: true"
        ]),
        record("records/car/c1.md", ["typeId: car", "recordId: c1", "fields: {}"])
      ])
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === "E_COMPOSITION_UNKNOWN_TYPE")).toBe(true);
    }
  });

  it("TYPE-COMP-001: composition must be a map with only typeId + required", () => {
    const invalid = validateDatasetSnapshot(
      snapshot([record("types/car.md", ["typeId: car", "fields:", "  composition: []"])])
    );
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.errors.some((error) => error.code === "E_COMPOSITION_SCHEMA_INVALID")).toBe(true);
    }

    const extraKey = validateDatasetSnapshot(
      snapshot([
        record("types/car.md", [
          "typeId: car",
          "fields:",
          "  composition:",
          "    engine:",
          "      typeId: engine",
          "      required: true",
          "      max: 2"
        ])
      ])
    );
    expect(extraKey.ok).toBe(false);
    if (!extraKey.ok) {
      expect(extraKey.errors.some((error) => error.code === "E_COMPOSITION_SCHEMA_INVALID")).toBe(true);
    }
  });

  it("TYPE-COMP-001: composition component must include required boolean", () => {
    const missingRequired = validateDatasetSnapshot(
      snapshot([
        record("types/car.md", [
          "typeId: car",
          "fields:",
          "  composition:",
          "    engine:",
          "      typeId: engine"
        ])
      ])
    );
    expect(missingRequired.ok).toBe(false);
    if (!missingRequired.ok) {
      expect(missingRequired.errors.some((error) => error.code === "E_COMPOSITION_SCHEMA_INVALID")).toBe(true);
    }
  });
});
