import type { ImportProgress as ImporterProgress } from "@graphdown/io";

export type ImportPhase =
  | "idle"
  | "validating_url"
  | "validating_dataset"
  | "opening_runtime"
  | "persisting"
  | "done";

export type ImportProgress =
  | ImporterProgress
  | { phase: "idle" }
  | { phase: ImportPhase; detail?: string };
