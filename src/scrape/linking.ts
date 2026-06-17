import type { HcPlayerStatus } from "../types.js";
import {
  buildBdlLookup,
  loadLinkCache,
  matchBdlExternalId,
  saveLinkCache,
  type LinkCache,
} from "./checkpoint.js";

export interface LinkResolver {
  resolveBdlExternalId(
    gleagueSlug: string,
    displayName: string,
    birthDate: string | null,
  ): Promise<string | null>;
  rememberLink(gleagueSlug: string, bdlExternalId: string): void;
}

export function createLinkResolver(options: {
  gleagueLinkCachePath: string;
  nbaBrefLinkCachePath: string;
  loadCompletionStatus: () => Promise<HcPlayerStatus[]>;
}): LinkResolver {
  const gleagueCache = loadLinkCache(options.gleagueLinkCachePath);
  const nbaCache = loadLinkCache(options.nbaBrefLinkCachePath);
  let bdlLookup: Map<string, HcPlayerStatus[]> | null = null;

  async function getBdlLookup(): Promise<Map<string, HcPlayerStatus[]>> {
    if (!bdlLookup) {
      const players = await options.loadCompletionStatus();
      bdlLookup = buildBdlLookup(players);
    }
    return bdlLookup;
  }

  return {
    async resolveBdlExternalId(gleagueSlug, displayName, birthDate) {
      const cached = gleagueCache.mappings[gleagueSlug];
      if (cached) return cached;

      const nbaSlugHint = gleagueSlug.endsWith("d") ? gleagueSlug.slice(0, -1) : null;
      if (nbaSlugHint && nbaCache.mappings[nbaSlugHint]) {
        return nbaCache.mappings[nbaSlugHint];
      }

      const lookup = await getBdlLookup();
      return matchBdlExternalId(displayName, birthDate, lookup);
    },

    rememberLink(gleagueSlug, bdlExternalId) {
      gleagueCache.mappings[gleagueSlug] = bdlExternalId;
      saveLinkCache(options.gleagueLinkCachePath, gleagueCache);
    },
  };
}

export function minimalBioPayload(
  gleagueSlug: string,
  displayName: string,
  bdlExternalId: string,
) {
  return {
    source: "basketball-reference-gleague" as const,
    externalId: gleagueSlug,
    player: { displayName },
    linkTo: {
      source: "balldontlie",
      externalId: bdlExternalId,
    },
  };
}
