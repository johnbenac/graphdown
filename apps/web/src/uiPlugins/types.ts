export type UiCapability = "field.view";

export type UiMatch = Record<string, string>;

export type UiResolutionConfig = {
  capability: UiCapability;
  match: UiMatch;
  use: string;
};

export type DatasetUiConfig = {
  schemaVersion: 1;
  resolutions?: UiResolutionConfig[];
};

export type UiPluginProvider = {
  capability: UiCapability;
  match: UiMatch;
  entry: string;
};

export type UiPluginManifest = {
  schemaVersion: 1;
  id: string;
  version: string;
  main?: string;
  provides: UiPluginProvider[];
};

export type UiPluginWarning = {
  message: string;
};

export type ProviderRef = UiPluginProvider & {
  pluginId: string;
  version: string;
  mainPath: string;
  index: number;
};

export type ResolvedProvider = {
  chosen: ProviderRef;
  candidatesConsidered: ProviderRef[];
  ambiguousTopGroup: ProviderRef[];
  usedResolution: boolean;
};

export type FieldViewContext = {
  typeId: string;
  recordId: string;
  recordKey: string;
  fieldName: string;
  kind?: string;
  value: unknown;
  recordFields: Record<string, unknown>;
  typeFields: Record<string, unknown>;
};
