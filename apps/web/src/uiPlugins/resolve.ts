import type {
  DatasetUiConfig,
  ProviderRef,
  ResolvedProvider,
  UiMatch,
  UiPluginWarning,
  UiRequirement
} from "./types";
import type { PluginCatalog, UiResolutionConfig } from "./types";

const SPECIFICITY_SCORES: Record<string, number> = {
  typeId: 100,
  fieldName: 50,
  kind: 10
};

type VersionParts = { major: number; minor: number; patch: number };

function parseVersion(version: string): VersionParts {
  const [major, minor, patch] = version.split(".").map((part) => Number(part));
  return { major, minor, patch };
}

function compareVersions(a: VersionParts, b: VersionParts): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function compareVersionsDesc(a: string, b: string): number {
  return compareVersions(parseVersion(b), parseVersion(a));
}

function matchSelector(selector: Record<string, string>, match: UiMatch): boolean {
  for (const [key, value] of Object.entries(match)) {
    if (!(key in selector)) {
      return false;
    }
    if (selector[key] !== value) {
      return false;
    }
  }
  return true;
}

function specificityScore(match: UiMatch): number {
  let score = 0;
  for (const key of Object.keys(match)) {
    score += SPECIFICITY_SCORES[key] ?? 1;
  }
  return score;
}

function resolveResolution(
  requirement: UiRequirement,
  config: DatasetUiConfig | null
): { resolution: UiResolutionConfig | null; usedResolution: boolean } {
  if (!config?.resolutions?.length) {
    return { resolution: null, usedResolution: false };
  }
  const matches = config.resolutions
    .map((resolution, index) => ({ resolution, index }))
    .filter(({ resolution }) =>
      resolution.capability === requirement.capability && matchSelector(requirement.selector, resolution.match)
    );
  if (!matches.length) {
    return { resolution: null, usedResolution: false };
  }
  matches.sort((a, b) => {
    const scoreDiff = specificityScore(b.resolution.match) - specificityScore(a.resolution.match);
    if (scoreDiff !== 0) return scoreDiff;
    return a.index - b.index;
  });
  return { resolution: matches[0].resolution, usedResolution: true };
}

export function resolveProvider(input: {
  requirement: UiRequirement;
  catalog: PluginCatalog;
  config: DatasetUiConfig | null;
  onWarning?: (warning: UiPluginWarning) => void;
}): ResolvedProvider | null {
  const { requirement, catalog, config, onWarning } = input;

  const matches = catalog.providers.filter(
    (provider) => provider.capability === requirement.capability && matchSelector(requirement.selector, provider.match)
  );
  if (!matches.length) {
    return null;
  }

  let usedResolution = false;
  let candidates: ProviderRef[] = matches;

  const { resolution, usedResolution: hasResolution } = resolveResolution(requirement, config);
  if (hasResolution && resolution) {
    const filtered = matches.filter((provider) => provider.pluginId === resolution.use);
    if (filtered.length > 0) {
      candidates = filtered;
      usedResolution = true;
    } else {
      onWarning?.({
        message: `Resolution for ${requirement.capability} ${JSON.stringify(
          requirement.selector
        )} refers to missing plugin "${resolution.use}"`
      });
    }
  }

  const scored = candidates.map((provider) => ({
    provider,
    score: specificityScore(provider.match),
    version: parseVersion(provider.version)
  }));

  const maxScore = Math.max(...scored.map((entry) => entry.score));
  const topByScore = scored.filter((entry) => entry.score === maxScore);
  const maxVersion = topByScore.reduce((best, entry) =>
    compareVersions(entry.version, best) > 0 ? entry.version : best
  , topByScore[0].version);
  const ambiguousTopGroup = topByScore
    .filter((entry) => compareVersions(entry.version, maxVersion) === 0)
    .map((entry) => entry.provider);

  const sorted = [...scored].sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    const versionDiff = compareVersionsDesc(a.provider.version, b.provider.version);
    if (versionDiff !== 0) return versionDiff;
    const pluginDiff = a.provider.pluginId.localeCompare(b.provider.pluginId);
    if (pluginDiff !== 0) return pluginDiff;
    return a.provider.providerIndex - b.provider.providerIndex;
  });

  return {
    chosen: sorted[0].provider,
    candidatesConsidered: candidates,
    ambiguousTopGroup,
    usedResolution
  };
}
