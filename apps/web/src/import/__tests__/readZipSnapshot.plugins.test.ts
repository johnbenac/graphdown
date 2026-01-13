import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readZipSnapshot } from "../readZipSnapshot";

function addFixtureEntries(
  dir: string,
  relativeBase: string,
  entries: Record<string, Uint8Array>
): void {
  for (const dirent of readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = join(dir, dirent.name);
    const relativePath = relativeBase ? `${relativeBase}/${dirent.name}` : dirent.name;
    if (dirent.isDirectory()) {
      addFixtureEntries(absolutePath, relativePath, entries);
    } else {
      entries[relativePath] = new Uint8Array(readFileSync(absolutePath));
    }
  }
}

function resolveFixturePath(url: URL): string {
  if (url.protocol === "file:") {
    return fileURLToPath(url);
  }
  const sanitizedPath = url.pathname.startsWith("/@fs/")
    ? url.pathname.replace("/@fs/", "/")
    : url.pathname;
  return fileURLToPath(new URL(sanitizedPath, pathToFileURL(`${process.cwd()}/`)));
}

describe("readZipSnapshot plugin support", () => {
  it("IMP-PLUG-001: includes plugin manifest and bundle files in the snapshot", async () => {
    const fixtureDirUrl = new URL(
      "../../../../../packages/core/src/__fixtures__/plugin-valid-dataset/",
      import.meta.url
    );
    const fixtureDir = resolveFixturePath(fixtureDirUrl);
    const entries: Record<string, Uint8Array> = {};
    addFixtureEntries(fixtureDir, "", entries);
    entries["docs/readme.md"] = new Uint8Array(strToU8("# ignored"));

    const zipBytes = zipSync(entries);
    const buffer = Uint8Array.from(zipBytes).buffer;
    const file = {
      arrayBuffer: async () => buffer
    } as File;
    const { snapshot, ignored } = await readZipSnapshot(file);

    expect(snapshot.files.has("extensions/demo/plugin.md")).toBe(true);
    expect(snapshot.files.has("extensions/demo/entry.js")).toBe(true);
    expect(snapshot.files.has("extensions/demo/ui.md")).toBe(true);
    expect(ignored).toContain("docs/readme.md");
    expect(ignored).not.toContain("extensions/demo/entry.js");
    expect(ignored).not.toContain("extensions/demo/ui.md");
  });
});
