import type { ImportProgress as SourceImportProgress } from "@graphdown/io";

type SourceImportPhase = SourceImportProgress["phase"];

type LocalImportPhase =
  | "idle"
  | "validating_url"
  | "validating_dataset"
  | "opening_runtime"
  | "persisting"
  | "done";

export type ImportPhase = SourceImportPhase | LocalImportPhase;

export type ImportProgress =
  | SourceImportProgress
  | { phase: "idle" }
  | { phase: Exclude<LocalImportPhase, "idle">; detail?: string };
