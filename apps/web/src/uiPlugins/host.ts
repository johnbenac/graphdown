import type { Graph } from "../core/graph";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import { discoverPlugins } from "./discoverPlugins";
import { loadUiConfig } from "./loadConfig";
import { resolveProvider } from "./resolve";
import { invokeFieldView } from "./runtime";
import type { FieldViewContext, UiPluginHost, UiRequirement, UiPluginWarning } from "./types";

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

export function createUiPluginHost(snapshot: DatasetSnapshot, graph: Graph): UiPluginHost {
  const { config } = loadUiConfig(snapshot);
  const { catalog } = discoverPlugins(snapshot);
  const exportCache = new Map<string, Record<string, unknown> | null>();

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
      return invokeFieldView({ snapshot, manifest, provider: resolved.chosen, ctx, cache: exportCache, onWarning: warn });
    }
  };
}
