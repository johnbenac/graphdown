import type { ValidationError } from "../../../../src/core/errors";

export type ImportErrorCategory =
  | "invalid_url"
  | "not_found"
  | "auth_required"
  | "rate_limited"
  | "dataset_invalid"
  | "network"
  | "unknown";

export type ImportErrorState =
  | {
      category: Exclude<ImportErrorCategory, "dataset_invalid">;
      title: string;
      message: string;
      hint?: string;
      status?: number;
    }
  | {
      category: "dataset_invalid";
      title: string;
      message: string;
      errors: ValidationError[];
    };

export type ImportPhase =
  | "idle"
  | "validating_url"
  | "fetching_repo"
  | "listing_files"
  | "downloading_files"
  | "validating_dataset"
  | "building_graph"
  | "persisting"
  | "done";

export type ImportProgress =
  | { phase: "idle" }
  | { phase: Exclude<ImportPhase, "downloading_files">; detail?: string }
  | { phase: "downloading_files"; completed: number; total: number; detail?: string };
