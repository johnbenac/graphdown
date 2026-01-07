import type { Graph } from "../core/graph";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import { discoverPlugins } from "./discoverPlugins";
import { loadUiConfig } from "./loadConfig";
import { resolveProvider } from "./resolve";
import { renderFieldProvider, renderRecordProvider } from "./runtime";
import type {
  FieldViewContext,
  ProviderRef,
  RecordViewContext,
  UiPluginHost,
  UiRequirement,
  UiPluginWarning
} from "./types";

function buildRequirement(ctx: FieldViewContext): UiRequirement {
  return {
    capability: "field.view",
    selector: {
      typeId: ctx.typeId,
      fieldName: ctx.fieldName,
      ...(ctx.kind ? { kind: ctx.kind } : {})
    }
  };
}

function buildRecordRequirement(ctx: RecordViewContext): UiRequirement {
  return {
    capability: "record.view",
    selector: {
      typeId: ctx.typeId,
      recordId: ctx.recordId,
      recordKey: ctx.recordKey
    }
  };
}

export function createUiPluginHost(snapshot: DatasetSnapshot, graph: Graph): UiPluginHost {
  const { config } = loadUiConfig(snapshot);
  const { catalog } = discoverPlugins(snapshot);
  const moduleCache = new Map<string, Promise<Record<string, unknown>> | null>();

  return {
    renderField(ctx: FieldViewContext) {
      const requirement = buildRequirement(ctx);
      const resolved = resolveProvider({ requirement, catalog, config });
      if (!resolved) {
        return null;
      }
      const manifest = catalog.manifestsById.get(resolved.chosen.pluginId);
      if (!manifest) {
        return null;
      }
      const warn = (warning: UiPluginWarning) => {
        console.warn("UI plugin warning:", warning.message);
      };
      return renderFieldProvider({ snapshot, manifest, provider: resolved.chosen, ctx, cache: moduleCache, onWarning: warn });
    },
    listRecordViews(ctx: RecordViewContext) {
      const requirement = buildRecordRequirement(ctx);
      const matches = catalog.providers
        .filter(
          (provider) =>
            provider.capability === requirement.capability &&
            Object.entries(provider.match).every(([k, v]) => requirement.selector[k] === v)
        )
        .sort((a, b) => {
          if (a.pluginId !== b.pluginId) return a.pluginId.localeCompare(b.pluginId);
          if (a.providerIndex !== b.providerIndex) return a.providerIndex - b.providerIndex;
          if (a.providerId !== b.providerId) return a.providerId.localeCompare(b.providerId);
          return a.entry.localeCompare(b.entry);
        });
      return matches;
    },
    resolveRecordView(ctx: RecordViewContext) {
      const requirement = buildRecordRequirement(ctx);
      return resolveProvider({ requirement, catalog, config });
    },
    renderRecordView(ctx: RecordViewContext, provider: ProviderRef) {
      const manifest = catalog.manifestsById.get(provider.pluginId);
      if (!manifest) {
        return null;
      }
      const warn = (warning: UiPluginWarning) => {
        console.warn("UI plugin warning:", warning.message);
      };
      return renderRecordProvider({ snapshot, manifest, provider, ctx, cache: moduleCache, onWarning: warn });
    }
  };
}
