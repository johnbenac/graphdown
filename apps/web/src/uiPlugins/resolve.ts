import type {
  DatasetUiConfig,
  ProviderRef,
  ResolvedProvider,
  UiCapability,
  UiMatch
} from "./types";

export type UiRequirement = {
  capability: UiCapability;
  selector: UiMatch;
};

function parseSemver(version: string): [number, number, number] {
  const [major, minor, patch] = version.split(".").map((part) => Number(part));
  return [major ?? 0, minor ?? 0, patch ?? 0];
}

function compareSemver(a: string, b: string): number {
  const [am, ami, ap] = parseSemver(a);
  const [bm, bmi, bp] = parseSemver(b);
  if (am !== bm) return am - bm;
  if (ami !== bmi) return ami - bmi;
  return ap - bp;
}

export function specificityScore(match: UiMatch): number {
  let score = 0;
  for (const key of Object.keys(match)) {
    if (key === "typeId") {
      score += 100;
    } else if (key === "fieldName") {
      score += 50;
    } else if (key === "kind") {
      score += 10;
    } else {
      score += 1;
    }
  }
  return score;
}

export function matchesSelector(requirement: UiRequirement, match: UiMatch): boolean {
  for (const [key, value] of Object.entries(match)) {
    if (requirement.selector[key] !== value) {
      return false;
    }
  }
  return true;
}

type ResolutionChoice = { resolution: DatasetUiConfig["resolutions"][number]; score: number; index: number };

function resolveConfigOverride(
  requirement: UiRequirement,
  config: DatasetUiConfig | null
): ResolutionChoice | null {
  if (!config?.resolutions?.length) {
    return null;
  }
  const candidates: ResolutionChoice[] = [];
  config.resolutions.forEach((resolution, index) => {
    if (resolution.capability !== requirement.capability) {
      return;
    }
    if (!matchesSelector(requirement, resolution.match)) {
      return;
    }
    candidates.push({ resolution, score: specificityScore(resolution.match), index });
  });
  if (!candidates.length) {
    return null;
  }
  candidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.index - b.index;
  });
  return candidates[0];
}

export function resolveProvider(input: {
  requirement: UiRequirement;
  providers: ProviderRef[];
  config: DatasetUiConfig | null;
}): { resolved: ResolvedProvider | null; warnings: string[] } {
  const { requirement, providers, config } = input;
  const warnings: string[] = [];
  const matching = providers.filter(
    (provider) => provider.capability === requirement.capability && matchesSelector(requirement, provider.match)
  );
  if (!matching.length) {
    return { resolved: null, warnings };
  }

  const chosenResolution = resolveConfigOverride(requirement, config);
  let filtered = matching;
  let usedResolution = false;
  if (chosenResolution) {
    const targetPlugin = chosenResolution.resolution.use;
    const resolved = matching.filter((provider) => provider.pluginId === targetPlugin);
    if (resolved.length) {
      filtered = resolved;
      usedResolution = true;
    } else {
      warnings.push(
        `UI resolution for ${requirement.capability} refers to missing plugin "${targetPlugin}".`
      );
    }
  }

  const scored = filtered.map((provider) => ({
    provider,
    score: specificityScore(provider.match)
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const versionCompare = compareSemver(b.provider.version, a.provider.version);
    if (versionCompare !== 0) {
      return versionCompare;
    }
    const idCompare = a.provider.pluginId.localeCompare(b.provider.pluginId);
    if (idCompare !== 0) {
      return idCompare;
    }
    return a.provider.index - b.provider.index;
  });

  const chosen = scored[0]?.provider;
  if (!chosen) {
    return { resolved: null, warnings };
  }

  const topScore = scored[0].score;
  const topVersion = scored[0].provider.version;
  const ambiguousTopGroup = scored
    .filter((entry) => entry.score === topScore && entry.provider.version === topVersion)
    .map((entry) => entry.provider);

  return {
    resolved: {
      chosen,
      candidatesConsidered: matching,
      ambiguousTopGroup: usedResolution ? [] : ambiguousTopGroup,
      usedResolution
    },
    warnings
  };
}
