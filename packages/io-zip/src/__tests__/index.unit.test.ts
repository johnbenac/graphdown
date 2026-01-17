import { expect, it } from "vitest";

import {
  buildDatasetZipBytes,
  buildZipBytesFromSnapshot,
  loadDatasetSnapshotFromZipBytes,
  readZipSnapshotFromBytes
} from "../index";

it("exports zip IO entrypoints", () => {
  expect(typeof buildDatasetZipBytes).toBe("function");
  expect(typeof buildZipBytesFromSnapshot).toBe("function");
  expect(typeof loadDatasetSnapshotFromZipBytes).toBe("function");
  expect(typeof readZipSnapshotFromBytes).toBe("function");
});
