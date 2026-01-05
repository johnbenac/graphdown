import type {
  DatasetUiConfig,
  PluginCatalog,
  ProviderRef,
  ResolvedProvider,
  UiMatch,
  UiPluginWarning,
  UiRequirement
} from "./types";

type Semver = { major: number; minor: number; patch: number };

function parseSemver(version: string): Semver {
  const [major, minor, patch] = version.split(".").map((part) => Number(part));
  return { major, minor, patch };
}

function compareSemverDesc(a: string, b: string): number {
  const va = parseSemver(a);
  const vb = parseSemver(b);
  if (va.major !== vb.major) return vb.major - va.major;
  if (va.minor !== vb.minor) return vb.minor - va.minor;
  return vb.patch - va.patch;
}

function getSpecificityScore(match: UiMatch): number {
  let score = 0;
  for (const key of Object.keys(match)) {
    if (key === "typeId") score += 100;
    else if (key === "fieldName") score += 50;
    else if (key === "kind") score += 10;
    else score += 1;
  }
  return score;
}

function matchSelector(match: UiMatch, selector: UiMatch): boolean {
  return Object.entries(match).every(([key, value]) => selector[key] === value);
}

function pickResolution(
  requirement: UiRequirement,
  config: DatasetUiConfig | null
): { resolution: NonNullable<DatasetUiConfig["resolutions"]>[number] | null; usedResolution: boolean } {
  if (!config?.resolutions?.length) {
    return { resolution: null, usedResolution: false };
  }
  const matching = config.resolutions
    .map((resolution, index) => ({ resolution, index }))
    .filter(
      (entry) =>
        entry.resolution.capability === requirement.capability &&
        matchSelector(entry.resolution.match, requirement.selector)
    );
  if (!matching.length) {
    return { resolution: null, usedResolution: false };
  }
  matching.sort((a, b) => {
    const scoreDiff = getSpecificityScore(b.resolution.match) - getSpecificityScore(a.resolution.match);
    if (scoreDiff !== 0) return scoreDiff;
    return a.index - b.index;
  });
  return { resolution: matching[0].resolution, usedResolution: true };
}

export function resolveProvider(
  requirement: UiRequirement,
  catalog: PluginCatalog,
  config: DatasetUiConfig | null,
  warnings?: UiPluginWarning[]
): ResolvedProvider | null {
  let candidates = catalog.providers.filter(
    (provider) =>
      provider.capability === requirement.capability &&
      matchSelector(provider.match, requirement.selector)
  );

  if (!candidates.length) {
    return null;
  }

  const { resolution, usedResolution } = pickResolution(requirement, config);
  let resolvedWithConfig = false;
  if (resolution) {
    const filtered = candidates.filter((provider) => provider.pluginId === resolution.use);
    if (!filtered.length) {
      warnings?.push({
        message: `UI resolution for ${requirement.capability} with selector ${JSON.stringify(
          requirement.selector
        )} refers to missing plugin "${resolution.use}".`
      });
    } else {
      candidates = filtered;
      resolvedWithConfig = true;
    }
  }

  const scored = candidates.map((provider) => ({
    provider,
    score: getSpecificityScore(provider.match)
  }));
  const maxScore = Math.max(...scored.map((entry) => entry.score));
  const topScoreGroup = scored.filter((entry) => entry.score === maxScore).map((entry) => entry.provider);
  const maxVersion = topScoreGroup
    .map((provider) => provider.version)
    .sort(compareSemverDesc)[0];
  const topGroup = topScoreGroup.filter((provider) => provider.version === maxVersion);

  candidates.sort((a, b) => {
    const scoreDiff = getSpecificityScore(b.match) - getSpecificityScore(a.match);
    if (scoreDiff !== 0) return scoreDiff;
    const versionDiff = compareSemverDesc(a.version, b.version);
    if (versionDiff !== 0) return versionDiff;
    const pluginDiff = a.pluginId.localeCompare(b.pluginId);
    if (pluginDiff !== 0) return pluginDiff;
    return a.providerIndex - b.providerIndex;
  });

  return {
    chosen: candidates[0],
    candidatesConsidered: candidates,
    ambiguousTopGroup: topGroup,
    usedResolution: resolvedWithConfig
  };
}
