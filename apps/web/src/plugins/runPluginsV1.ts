import type { DatasetSnapshot, ValidationError, RuntimeApiV1 } from "../graphdown";
import { openRuntimeApiV1 } from "../graphdown";

type Logger = Pick<Console, "log" | "info" | "warn" | "error"> &
  Partial<Pick<Console, "groupCollapsed" | "groupEnd">>;

export type PluginActivationContextV1 = {
  api: RuntimeApiV1;
  pluginId: string;
  recordKey: string;
  datasetLabel?: string;
  logger: Pick<Console, "log" | "info" | "warn" | "error">;
};

export type PluginExecutionResultV1 =
  | {
      status: "ran";
      pluginId: string;
      recordKey: string;
      entryCid: string;
    }
  | {
      status: "skipped";
      pluginId: string;
      recordKey: string;
      reason: string;
    }
  | {
      status: "failed";
      pluginId: string;
      recordKey: string;
      entryCid?: string;
      reason: string;
    };

export type RunPluginsV1Result =
  | { ok: true; executions: PluginExecutionResultV1[] }
  | { ok: false; errors: ValidationError[] };

function makePrefixedLogger(logger: Logger, prefix: string): Pick<Console, "log" | "info" | "warn" | "error"> {
  const wrap =
    (method: "log" | "info" | "warn" | "error") =>
    (...args: unknown[]) => {
      logger[method](prefix, ...args);
    };
  return {
    log: wrap("log"),
    info: wrap("info"),
    warn: wrap("warn"),
    error: wrap("error")
  };
}

function extractFirstWikiLinkTarget(value: string): string | null {
  // Minimal parser for Obsidian-style wiki links used by Graphdown datasets.
  // Examples:
  //   "[[bafk...]]" -> "bafk..."
  //   "[[bafk...|Alias]]" -> "bafk..."
  const match = value.match(/\[\[([^[\]]+)\]\]/);
  if (!match) {
    return null;
  }
  const token = match[1]?.split("|")[0]?.trim();
  return token ? token : null;
}

// React StrictMode can mount/unmount/remount, causing effects to run twice in development.
// This module-level guard prevents duplicate plugin execution within a single page session.
const ranForDatasetKeys = new Set<string>();

/**
 * Discovers and runs dataset plugins using Runtime API v1.
 *
 * Conventions (v1 demo):
 * - Plugin records live under typeId: "gd_plugin"
 * - A plugin record may declare fields:
 *    - pluginId: string (optional; defaults to recordKey)
 *    - enabled: boolean (optional; defaults to true)
 *    - entry: string containing a block CID reference, e.g. "[[bafk...]]" (recommended)
 *
 * NOTE: This executes JavaScript from the dataset. Treat datasets as trusted.
 */
export async function runPluginsV1(input: {
  datasetSnapshot: DatasetSnapshot;
  datasetKey?: string;
  datasetLabel?: string;
  logger?: Logger;
}): Promise<RunPluginsV1Result> {
  const logger: Logger = input.logger ?? console;

  const opened = await openRuntimeApiV1({ snapshot: input.datasetSnapshot });
  if (!opened.ok) {
    return { ok: false, errors: opened.errors };
  }

  const api = opened.value;

  if (input.datasetKey) {
    if (ranForDatasetKeys.has(input.datasetKey)) {
      logger.info(`[plugins] Plugins already executed for datasetKey="${input.datasetKey}". Skipping.`);
      return { ok: true, executions: [] };
    }
    ranForDatasetKeys.add(input.datasetKey);
  }

  const pluginTypeId = "gd_plugin";
  let pluginRecordKeys: string[] = [];
  try {
    pluginRecordKeys = await api.listRecordKeysByType(pluginTypeId);
  } catch (err) {
    // If typeId is invalid, Runtime API will throw; if the type doesn't exist in the dataset, it returns [].
    logger.warn(`[plugins] Failed to list plugin records for typeId "${pluginTypeId}". Skipping plugins.`, err);
    return { ok: true, executions: [] };
  }

  if (pluginRecordKeys.length === 0) {
    return { ok: true, executions: [] };
  }

  const labelSuffix = input.datasetLabel ? ` (${input.datasetLabel})` : "";
  logger.groupCollapsed?.(`[plugins] Running ${pluginRecordKeys.length} plugin(s)${labelSuffix}`);

  const executions: PluginExecutionResultV1[] = [];

  for (const recordKey of pluginRecordKeys) {
    const record = await api.getRecord(recordKey);
    if (!record) {
      executions.push({
        status: "skipped",
        pluginId: recordKey,
        recordKey,
        reason: "Plugin record not found."
      });
      continue;
    }

    const fields = record.fields;
    const pluginIdRaw = fields["pluginId"];
    const pluginId =
      typeof pluginIdRaw === "string" && pluginIdRaw.trim().length > 0 ? pluginIdRaw.trim() : recordKey;

    const enabledRaw = fields["enabled"];
    if (enabledRaw === false) {
      executions.push({ status: "skipped", pluginId, recordKey, reason: "enabled=false" });
      continue;
    }
    if (enabledRaw !== undefined && typeof enabledRaw !== "boolean") {
      executions.push({
        status: "skipped",
        pluginId,
        recordKey,
        reason: "fields.enabled must be boolean when present."
      });
      logger.warn(`[plugins] ${pluginId}: skipping (fields.enabled must be boolean when present).`, {
        recordKey,
        enabled: enabledRaw
      });
      continue;
    }

    // Prefer an explicit fields.entry (recommended), fall back to "first CID referenced anywhere in the record".
    const entryField = fields["entry"];
    let entryCid: string | null = null;

    if (typeof entryField === "string") {
      const maybeCid = extractFirstWikiLinkTarget(entryField);
      if (maybeCid) {
        try {
          if (await api.hasBlock(maybeCid)) {
            entryCid = maybeCid;
          } else {
            logger.warn(`[plugins] ${pluginId}: fields.entry references a missing block.`, {
              recordKey,
              entry: maybeCid
            });
          }
        } catch (err) {
          // Not a valid CID token (Runtime API enforces CID format).
          logger.warn(`[plugins] ${pluginId}: fields.entry is not a valid CID reference.`, {
            recordKey,
            entry: maybeCid,
            err
          });
        }
      }
    }

    if (!entryCid) {
      const referenced = await api.listBlockCidsReferencedByRecord(recordKey);
      entryCid = referenced[0] ?? null;
    }

    if (!entryCid) {
      executions.push({
        status: "skipped",
        pluginId,
        recordKey,
        reason: 'No entry block CID found. Add fields.entry: "[[<cid>]]" to the gd_plugin record.'
      });
      logger.warn(`[plugins] ${pluginId}: no entry CID found; skipping.`, { recordKey });
      continue;
    }

    // Load and execute
    try {
      const bytes = await api.getBlockBytes(entryCid);
      if (!bytes) {
        throw new Error("getBlockBytes returned null (unexpected)");
      }

      let source: string;
      if (typeof TextDecoder !== "undefined") {
        source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } else {
        // very old fallback; not expected in our supported browsers
        source = Array.from(bytes)
          .map((b) => String.fromCharCode(b))
          .join("");
      }

      if (typeof Blob === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
        throw new Error("Blob/URL.createObjectURL not available in this environment.");
      }

      const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));

      try {
        const mod: unknown = await import(/* @vite-ignore */ url);
        const defaultExport = (mod as { default?: unknown }).default;
        const namedActivate = (mod as { activate?: unknown }).activate;
        const activate = defaultExport ?? namedActivate;

        if (typeof activate !== "function") {
          throw new Error("Plugin entry must export a function (default export recommended).");
        }

        const ctx: PluginActivationContextV1 = {
          api,
          pluginId,
          recordKey,
          datasetLabel: input.datasetLabel,
          logger: makePrefixedLogger(logger, `[plugin:${pluginId}]`)
        };

        await (activate as (ctx: PluginActivationContextV1) => unknown)(ctx);

        executions.push({ status: "ran", pluginId, recordKey, entryCid });
        logger.info(`[plugins] ${pluginId}: ran successfully.`);
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      executions.push({
        status: "failed",
        pluginId,
        recordKey,
        entryCid,
        reason: err instanceof Error ? err.message : String(err)
      });
      logger.error(`[plugins] ${pluginId}: failed to execute.`, err);
    }
  }

  logger.groupEnd?.();

  return { ok: true, executions };
}
