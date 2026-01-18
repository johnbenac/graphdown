import type { ImportProgress as IoImportProgress } from "@graphdown/io";

export type ImportPhase =
  | "idle"
  | "validating_url"
  | "validating_dataset"
  | "opening_runtime"
  | "persisting"
  | "done";

export type ImportProgress =
  | IoImportProgress
  | { phase: "idle"; detail?: string }
  | { phase: "validating_url"; detail?: string }
  | { phase: "validating_dataset"; detail?: string }
  | { phase: "opening_runtime"; detail?: string }
  | { phase: "persisting"; detail?: string }
  | { phase: "done"; detail?: string };
