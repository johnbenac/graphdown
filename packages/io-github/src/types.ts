export type GitHubImportProgress =
  | { phase: "fetching_repo" }
  | { phase: "listing_files" }
  | { phase: "downloading_files"; completed: number; total: number; detail?: string };
