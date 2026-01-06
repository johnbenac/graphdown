import type { Graph } from "../core/graph";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import { loadDatasetUiConfig } from "./loadConfig";
import { discoverPlugins } from "./discoverPlugins";
import { resolveProvider } from "./resolve";
import { invokeFieldView } from "./runtime";
import type { FieldViewContext, UiRequirement } from "./types";

export type UiPluginHost = {
  renderField: (ctx: FieldViewContext) => React.ReactNode | null;
};

export function createUiPluginHost(snapshot: DatasetSnapshot, _graph?: Graph | undefined): UiPluginHost {
  const { config } = loadDatasetUiConfig(snapshot);
  const { catalog } = discoverPlugins(snapshot);

  return {
    renderField(ctx) {
      const requirement: UiRequirement = {
        capability: "field.view",
        selector: {
          typeId: ctx.typeId,
          fieldName: ctx.fieldName,
          ...(ctx.kind ? { kind: ctx.kind } : {})
        }
      };
      const resolved = resolveProvider({
        requirement,
        providers: catalog.providers,
        resolutions: config?.resolutions
      });
      if (!resolved) {
        return null;
      }
      return invokeFieldView({
        snapshot,
        manifest: catalog.manifestsById.get(resolved.chosen.pluginId),
        provider: resolved.chosen,
        ctx
      });
    }
  };
}
