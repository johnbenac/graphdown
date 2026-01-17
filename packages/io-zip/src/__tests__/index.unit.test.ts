import { describe, expect, it } from "vitest";
import * as ioZip from "../index";

describe("io-zip public API", () => {
  it("exports zip IO helpers", () => {
    expect(typeof ioZip.loadDatasetSnapshotFromZipBytes).toBe("function");
    expect(typeof ioZip.buildZipBytesFromSnapshot).toBe("function");
    expect(typeof ioZip.buildDatasetZipBytes).toBe("function");
    expect(typeof ioZip.readZipSnapshotFromBytes).toBe("function");
  });
});
