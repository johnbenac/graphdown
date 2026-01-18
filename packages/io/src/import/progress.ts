export type ImportProgress =
  | { phase: "fetching_repo" }
  | { phase: "listing_files" }
  | { phase: "downloading_files"; completed: number; total: number; detail?: string }
  | { phase: "reading_zip" }
  | { phase: "unzipping_zip" }
  | { phase: "selecting_files" };
