import type { Graph } from "../core/graph";
import { isObject } from "../core/types";
import type { DatasetSnapshot } from "../core/snapshotTypes";
import { discoverPlugins } from "./discoverPlugins";
import { loadDatasetUiConfig } from "./loadConfig";
import { resolveProvider } from "./resolve";

export function collectUiPluginWarnings(snapshot: DatasetSnapshot, graph: Graph): string[] {
  const warnings: string[] = [];
  const configResult = loadDatasetUiConfig(snapshot);
  warnings.push(...configResult.warnings.map((warning) => warning.message));
  const catalog = discoverPlugins(snapshot);
  warnings.push(...catalog.warnings.map((warning) => warning.message));

  for (const typeDef of graph.typesById.values()) {
    const fieldDefs = isObject(typeDef.fields) ? typeDef.fields.fieldDefs : undefined;
    if (!isObject(fieldDefs)) {
      continue;
    }
    for (const [fieldName, def] of Object.entries(fieldDefs)) {
      if (!isObject(def)) {
        continue;
      }
      const kind = typeof def.kind === "string" ? def.kind : undefined;
      const selector = {
        typeId: typeDef.typeId,
        fieldName,
        ...(kind ? { kind } : {})
      };
      const { resolved, warnings: resolutionWarnings } = resolveProvider({
        requirement: { capability: "field.view", selector },
        providers: catalog.providers,
        config: configResult.config
      });
      warnings.push(...resolutionWarnings);

      if (resolved && resolved.ambiguousTopGroup.length > 1 && !resolved.usedResolution) {
        const competitorIds = Array.from(
          new Set(resolved.ambiguousTopGroup.map((provider) => provider.pluginId))
        ).filter((id) => id !== resolved.chosen.pluginId);
        if (competitorIds.length > 0) {
          warnings.push(
            `Ambiguous UI plugin selection for capability "${resolved.chosen.capability}" selector ${JSON.stringify(
              selector
            )}. Chose plugin "${resolved.chosen.pluginId}" over ${competitorIds.join(", ")}.`
          );
        }
      }
    }
  }

  return warnings;
}
