import type { ReactNode } from "react";
import type { Graph } from "../core/graph";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import { discoverPlugins } from "./discoverPlugins";
import { loadUiConfig } from "./loadConfig";
import { resolveProvider } from "./resolve";
import { createUiPluginRuntime } from "./runtime";
import type { FieldViewContext, UiRequirement } from "./types";

export type UiPluginHost = {
  renderField: (ctx: FieldViewContext) => ReactNode | null;
};

export function createUiPluginHost(snapshot: DatasetSnapshot, graph: Graph): UiPluginHost {
  const { config } = loadUiConfig(snapshot);
  const { catalog } = discoverPlugins(snapshot);
  const runtime = createUiPluginRuntime(snapshot, catalog);

  return {
    renderField(ctx: FieldViewContext) {
      const requirement: UiRequirement = {
        capability: "field.view",
        selector: {
          typeId: ctx.typeId,
          fieldName: ctx.fieldName,
          ...(ctx.kind ? { kind: ctx.kind } : {})
        }
      };
      const resolved = resolveProvider(requirement, catalog, config ?? null);
      if (!resolved) {
        return null;
      }
      return runtime.invokeFieldView(resolved.chosen, ctx);
    }
  };
}
