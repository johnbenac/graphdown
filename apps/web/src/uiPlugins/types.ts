import type React from "react";

export type UiCapability = string;

export type UiMatch = Record<string, string>;

export type UiResolutionConfig = {
  capability: UiCapability;
  match: UiMatch;
  use: string;
  providerId?: string;
};

export type DatasetUiConfig = {
  resolutions: UiResolutionConfig[];
};

export type UiPluginProvider = {
  id: string;
  capability: UiCapability;
  match: UiMatch;
  title?: string;
};

export type UiPluginManifest = {
  id: string;
  version: string;
  entry: string;
  providers: UiPluginProvider[];
};

export type UiPluginWarning = {
  message: string;
  path?: string;
  pluginId?: string;
};

export type ProviderRef = {
  pluginId: string;
  version: string;
  entry: string;
  capability: UiCapability;
  match: UiMatch;
  providerId: string;
  title?: string;
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

export type RecordViewContext = {
  typeId: string;
  recordId: string;
  recordKey: string;
  recordFields: Record<string, unknown>;
  recordBody: string;
  typeFields: Record<string, unknown>;
  outgoingLinks: string[];
  incomingLinks: string[];
  graph?: unknown;
};

export type UiPluginHost = {
  renderField: (ctx: FieldViewContext) => React.ReactNode | null;
  listRecordViews: (ctx: RecordViewContext) => ProviderRef[];
  resolveRecordView: (ctx: RecordViewContext) => ResolvedProvider | null;
  renderRecordView: (ctx: RecordViewContext, provider: ProviderRef) => React.ReactNode | null;
};
