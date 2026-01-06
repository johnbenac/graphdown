import type React from "react";

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
  path?: string;
  pluginId?: string;
};

export type ProviderRef = {
  pluginId: string;
  version: string;
  main: string;
  capability: UiCapability;
  match: UiMatch;
  entry: string;
  providerIndex: number;
};

export type PluginCatalog = {
  manifestsById: Map<string, UiPluginManifest>;
  providers: ProviderRef[];
};

export type UiRequirement = {
  capability: UiCapability;
  selector: Record<string, string>;
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

export type UiPluginHost = {
  renderField: (ctx: FieldViewContext) => React.ReactNode | null;
};
