import type { ReactNode } from "react";
import type { Graph } from "../core/graph";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import { discoverPlugins } from "./discoverPlugins";
import { loadDatasetUiConfig } from "./loadConfig";
import { resolveProvider } from "./resolve";
import { invokeFieldView } from "./runtime";
import type { FieldViewContext } from "./types";

export function createUiPluginHost(snapshot: DatasetSnapshot, graph: Graph) {
  const configResult = loadDatasetUiConfig(snapshot);
  const catalog = discoverPlugins(snapshot);

  return {
    renderField(ctx: FieldViewContext): ReactNode | null {
      const requirement = {
        capability: "field.view" as const,
        selector: {
          typeId: ctx.typeId,
          fieldName: ctx.fieldName,
          ...(ctx.kind ? { kind: ctx.kind } : {})
        }
      };
      const { resolved } = resolveProvider({
        requirement,
        providers: catalog.providers,
        config: configResult.config
      });
      if (!resolved) {
        return null;
      }
      const manifest = catalog.manifestsById.get(resolved.chosen.pluginId);
      if (!manifest) {
        return null;
      }
      const { node } = invokeFieldView(snapshot, manifest, resolved.chosen, ctx);
      return node ?? null;
    }
  };
}

export type UiPluginHost = ReturnType<typeof createUiPluginHost>;
