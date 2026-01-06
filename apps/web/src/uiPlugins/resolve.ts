import type {
  ProviderRef,
  ResolvedProvider,
  UiMatch,
  UiPluginWarning,
  UiRequirement,
  UiResolutionConfig
} from "./types";

const SCORE_BY_KEY: Record<string, number> = {
  typeId: 100,
  fieldName: 50,
  kind: 10
};

function matchesSelector(match: UiMatch, selector: Record<string, string>): boolean {
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

function scoreMatch(match: UiMatch): number {
  return Object.keys(match).reduce((total, key) => total + (SCORE_BY_KEY[key] ?? 1), 0);
}

function parseVersion(version: string): [number, number, number] {
  const parts = version.split(".").map((value) => Number(value));
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

function compareVersionDesc(a: string, b: string): number {
  const [aMajor, aMinor, aPatch] = parseVersion(a);
  const [bMajor, bMinor, bPatch] = parseVersion(b);
  if (aMajor !== bMajor) return bMajor - aMajor;
  if (aMinor !== bMinor) return bMinor - aMinor;
  return bPatch - aPatch;
}

function compareProviders(a: ProviderRef, b: ProviderRef, scores: Map<ProviderRef, number>): number {
  const scoreA = scores.get(a) ?? 0;
  const scoreB = scores.get(b) ?? 0;
  if (scoreA !== scoreB) {
    return scoreB - scoreA;
  }
  const versionCompare = compareVersionDesc(a.version, b.version);
  if (versionCompare !== 0) {
    return versionCompare;
  }
  if (a.pluginId !== b.pluginId) {
    return a.pluginId.localeCompare(b.pluginId);
  }
  return a.index - b.index;
}

function pickResolution(
  resolutions: UiResolutionConfig[] | undefined,
  requirement: UiRequirement
): UiResolutionConfig | null {
  if (!resolutions || resolutions.length === 0) {
    return null;
  }
  let selected: UiResolutionConfig | null = null;
  let bestScore = -1;
  let bestIndex = -1;
  resolutions.forEach((resolution, index) => {
    if (resolution.capability !== requirement.capability) {
      return;
    }
    if (!matchesSelector(resolution.match, requirement.selector)) {
      return;
    }
    const score = scoreMatch(resolution.match);
    if (score > bestScore || (score === bestScore && (bestIndex === -1 || index < bestIndex))) {
      bestScore = score;
      bestIndex = index;
      selected = resolution;
    }
  });
  return selected;
}

export function resolveProvider(input: {
  requirement: UiRequirement;
  providers: ProviderRef[];
  resolutions?: UiResolutionConfig[];
  onWarning?: (warning: UiPluginWarning) => void;
}): ResolvedProvider | null {
  const { requirement, resolutions, onWarning } = input;
  let candidates = input.providers.filter(
    (provider) => provider.capability === requirement.capability && matchesSelector(provider.match, requirement.selector)
  );

  const selectedResolution = pickResolution(resolutions, requirement);
  let usedResolution = false;
  if (selectedResolution) {
    const filtered = candidates.filter((provider) => provider.pluginId === selectedResolution.use);
    if (filtered.length > 0) {
      candidates = filtered;
      usedResolution = true;
    } else {
      onWarning?.({
        message: `UI resolution for ${requirement.capability} (${JSON.stringify(
          requirement.selector
        )}) refers to missing plugin "${selectedResolution.use}".`
      });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  const scores = new Map<ProviderRef, number>();
  for (const provider of candidates) {
    scores.set(provider, scoreMatch(provider.match));
  }

  const sorted = [...candidates].sort((a, b) => compareProviders(a, b, scores));
  const chosen = sorted[0];

  let ambiguousTopGroup: ProviderRef[] = [];
  const highestScore = Math.max(...candidates.map((provider) => scores.get(provider) ?? 0));
  const highestScoreProviders = candidates.filter(
    (provider) => (scores.get(provider) ?? 0) === highestScore
  );
  const topVersion = highestScoreProviders.reduce((current, provider) => {
    if (!current) {
      return provider.version;
    }
    return compareVersionDesc(provider.version, current) < 0 ? provider.version : current;
  }, "");
  const topGroup = highestScoreProviders.filter(
    (provider) => compareVersionDesc(provider.version, topVersion) === 0
  );
  if (!usedResolution && topGroup.length > 1) {
    ambiguousTopGroup = topGroup;
  }

  return {
    chosen,
    candidatesConsidered: candidates,
    ambiguousTopGroup,
    usedResolution
  };
}
