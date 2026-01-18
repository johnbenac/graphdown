import type { ImportProgress as SourceImportProgress } from "@graphdown/io";

export type ImportPhase =
  | "idle"
  | "validating_url"
  | "validating_dataset"
  | "opening_runtime"
  | "persisting"
  | "done"
  | SourceImportProgress["phase"];

export type ImportProgress =
  | { phase: "idle" }
  | {
      phase: "validating_url" | "validating_dataset" | "opening_runtime" | "persisting" | "done";
      detail?: string;
    }
  | SourceImportProgress;
