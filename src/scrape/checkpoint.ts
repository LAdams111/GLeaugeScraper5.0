import { readFileSync, writeFileSync, existsSync } from "node:fs";
import type { HcPlayerStatus } from "../types.js";

export const DEFAULT_CHECKPOINT = "scrape-gleague-backfill.checkpoint.json";
export const DEFAULT_LOG = "scrape-gleague-backfill.log";
export const DEFAULT_GLEAGUE_LINK_CACHE = "bref-gleague-to-bdl.cache.json";
export const DEFAULT_NBA_BREF_LINK_CACHE = "bref-to-bdl.cache.json";

export interface GleagueCheckpoint {
  version: 1;
  completedSlugs: string[];
  allSlugs?: string[];
  updatedAt: string;
}

export interface LinkCache {
  version: 1;
  mappings: Record<string, string>;
  updatedAt: string;
}

export function loadCheckpoint(path: string): GleagueCheckpoint | null {
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as GleagueCheckpoint;
    if (raw.version !== 1 || !Array.isArray(raw.completedSlugs)) return null;
    return raw;
  } catch {
    return null;
  }
}

export function saveCheckpoint(path: string, checkpoint: GleagueCheckpoint): void {
  writeFileSync(path, `${JSON.stringify(checkpoint, null, 2)}\n`, "utf8");
}

export function ensureCheckpoint(checkpoint: GleagueCheckpoint | null): GleagueCheckpoint {
  return (
    checkpoint ?? {
      version: 1,
      completedSlugs: [],
      updatedAt: new Date().toISOString(),
    }
  );
}

export function saveCheckpointSlugs(
  checkpoint: GleagueCheckpoint,
  allSlugs: string[],
  path: string,
): GleagueCheckpoint {
  checkpoint.allSlugs = allSlugs;
  checkpoint.updatedAt = new Date().toISOString();
  saveCheckpoint(path, checkpoint);
  return checkpoint;
}

export function markSlugComplete(
  checkpoint: GleagueCheckpoint,
  slug: string,
  path: string,
): GleagueCheckpoint {
  if (!checkpoint.completedSlugs.includes(slug)) {
    checkpoint.completedSlugs.push(slug);
  }
  checkpoint.updatedAt = new Date().toISOString();
  saveCheckpoint(path, checkpoint);
  return checkpoint;
}

export function loadLinkCache(path: string): LinkCache {
  if (!existsSync(path)) {
    return { version: 1, mappings: {}, updatedAt: new Date().toISOString() };
  }
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as LinkCache;
    if (raw.version !== 1 || typeof raw.mappings !== "object") {
      return { version: 1, mappings: {}, updatedAt: new Date().toISOString() };
    }
    return raw;
  } catch {
    return { version: 1, mappings: {}, updatedAt: new Date().toISOString() };
  }
}

export function saveLinkCache(path: string, cache: LinkCache): void {
  cache.updatedAt = new Date().toISOString();
  writeFileSync(path, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}

export function appendLog(path: string, line: string): void {
  writeFileSync(path, `${line}\n`, { flag: "a" });
}

export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildBdlLookup(players: HcPlayerStatus[]): Map<string, HcPlayerStatus[]> {
  const byName = new Map<string, HcPlayerStatus[]>();

  for (const player of players) {
    const key = normalizeName(player.displayName);
    const existing = byName.get(key) ?? [];
    existing.push(player);
    byName.set(key, existing);
  }

  return byName;
}

export function matchBdlExternalId(
  displayName: string,
  birthDate: string | null,
  byName: Map<string, HcPlayerStatus[]>,
): string | null {
  const key = normalizeName(displayName);
  const candidates = byName.get(key);
  if (!candidates?.length) return null;

  if (birthDate) {
    const dobMatches = candidates.filter((c) => c.birthDate === birthDate);
    if (dobMatches.length === 1) return dobMatches[0].externalId;
    if (dobMatches.length > 1) return null;
  }

  if (candidates.length === 1) return candidates[0].externalId;
  return null;
}
