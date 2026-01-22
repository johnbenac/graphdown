import { describe, expect, it } from "vitest";
import { validateDatasetSnapshot } from "@graphdown/dataset";
import { openRuntimeApiV1 } from "@graphdown/runtime";
import { snapshotFromTextFiles } from "../../harness";

describe("integration: core validation -> runtime hierarchy", () => {
  it("indexes parent/child/root relationships correctly", async () => {
    const snapshot = snapshotFromTextFiles([
      [
        "types/note.md",
        ["---", "typeId: note", "fields: {}", "---", "# Note Type", ""].join("\n")
      ],
      [
        "records/note/one.md",
        [
          "---",
          "typeId: note",
          "recordId: one",
          "fields:",
          '  title: "One"',
          "---",
          "",
          "# One",
          ""
        ].join("\n")
      ],
      [
        "records/note/two.md",
        [
          "---",
          "typeId: note",
          "recordId: two",
          'parent: "note:one"',
          "fields:",
          '  title: "Two"',
          "---",
          "",
          "# Two",
          ""
        ].join("\n")
      ]
    ]);

    const validation = validateDatasetSnapshot(snapshot);
    expect(validation.ok).toBe(true);

    const runtimeResult = await openRuntimeApiV1({ snapshot });
    expect(runtimeResult.ok).toBe(true);
    if (!runtimeResult.ok) return;

    const api = runtimeResult.value;

    // Basic listing is deterministic
    expect(await api.listTypeIds()).toEqual(["note"]);
    expect(await api.listRecordKeysByType("note")).toEqual(["note:one", "note:two"]);

    // Root/child behavior
    expect(await api.listRootRecordKeysByType("note")).toEqual(["note:one"]);
    expect(await api.listChildRecordKeys("note:one")).toEqual(["note:two"]);
    expect(await api.listChildRecordKeys("note:two")).toEqual([]);

    // Parent pointers
    expect(await api.getParentRecordKey("note:one")).toBe(null);
    expect(await api.getParentRecordKey("note:two")).toBe("note:one");

    // Record view also reflects parent
    const recTwo = await api.getRecord("note:two");
    expect(recTwo).not.toBeNull();
    expect(recTwo?.parent).toBe("note:one");
    expect(recTwo?.fields).toEqual({ title: "Two" });
  });

  it("rejects parent cycles (core + runtime both surface E_PARENT_CYCLE)", async () => {
    const snapshot = snapshotFromTextFiles([
      [
        "types/note.md",
        ["---", "typeId: note", "fields: {}", "---", "# Note Type", ""].join("\n")
      ],
      [
        "records/note/one.md",
        [
          "---",
          "typeId: note",
          "recordId: one",
          'parent: "note:two"',
          "fields: {}",
          "---",
          "",
          "# One",
          ""
        ].join("\n")
      ],
      [
        "records/note/two.md",
        [
          "---",
          "typeId: note",
          "recordId: two",
          'parent: "note:one"',
          "fields: {}",
          "---",
          "",
          "# Two",
          ""
        ].join("\n")
      ]
    ]);

    const validation = validateDatasetSnapshot(snapshot);
    expect(validation.ok).toBe(false);
    if (validation.ok) return;

    expect(validation.errors.some((e) => e.code === "E_PARENT_CYCLE")).toBe(true);

    const runtimeResult = await openRuntimeApiV1({ snapshot });
    expect(runtimeResult.ok).toBe(false);
    if (runtimeResult.ok) return;

    expect(runtimeResult.errors.some((e) => e.code === "E_PARENT_CYCLE")).toBe(true);
  });
});
