export const GLEAGUE_SOURCE = "basketball-reference-gleague" as const;

export interface GLeaguePlayerMeta {
  slug: string;
  displayName: string;
  birthDate: string | null;
}

export interface GLeagueSeasonRow {
  seasonLabel: string;
  teamAbbreviation: string;
  teamSeasonYear: number;
  gamesPlayed: number;
  pointsPerGame: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  stealsPerGame: number;
  blocksPerGame: number;
}

export interface GLeaguePlayerSeasonRecord {
  source: typeof GLEAGUE_SOURCE;
  externalId: string;
  displayName: string;
  leagueSlug: "g-league";
  leagueName: "NBA G League";
  teamSlug: string;
  teamName: string;
  teamAbbreviation: string;
  seasonLabel: string;
  stats: {
    gamesPlayed: number;
    pointsPerGame: number;
    reboundsPerGame: number;
    assistsPerGame: number;
    stealsPerGame: number;
    blocksPerGame: number;
  };
}

export interface HoopCentralIngestPayload {
  source: typeof GLEAGUE_SOURCE;
  externalId: string;
  player: {
    displayName: string;
    birthDate?: string | null;
    position?: string | null;
    heightCm?: number | null;
    weightKg?: number | null;
    hometown?: string | null;
    headshotUrl?: string | null;
  };
  league: {
    slug: "g-league";
    name: "NBA G League";
  };
  team: {
    slug: string;
    name: string;
    abbreviation: string;
  };
  season: {
    label: string;
  };
  stats: {
    gamesPlayed: number;
    pointsPerGame: number;
    reboundsPerGame: number;
    assistsPerGame: number;
    stealsPerGame?: number | null;
    blocksPerGame?: number | null;
  };
}

export interface HoopCentralIngestResponse {
  ok: true;
  playerId: number;
  created: {
    player: boolean;
    league: boolean;
    team: boolean;
    season: boolean;
    stint: boolean;
    stats: boolean;
  };
}

export interface HoopCentralBioPayload {
  source: typeof GLEAGUE_SOURCE;
  externalId: string;
  player: {
    displayName: string;
  };
  linkTo?: {
    source: string;
    externalId: string;
  };
}

export interface HoopCentralBioResponse {
  ok: true;
  playerId: number;
  created: {
    player: boolean;
    identity: boolean;
  };
  linkedVia: "linkTo" | "identity" | "fuzzy" | "created";
}

export interface HcPlayerStatus {
  playerId: number;
  externalId: string;
  displayName: string;
  birthDate: string | null;
  seasons: Array<{
    seasonLabel: string;
    gamesPlayed: number;
    pointsPerGame: number;
    reboundsPerGame: number;
    assistsPerGame: number;
  }>;
}

export interface ScrapeOptions {
  backfill: boolean;
  dryRun: boolean;
  resume: boolean;
  health?: boolean;
  limit?: number;
  playerSlug?: string;
  requestDelayMs: number;
  indexDelayMs: number;
  checkpointPath: string;
  logPath: string;
  gleagueLinkCachePath: string;
  nbaBrefLinkCachePath: string;
  slugCachePath: string;
  teamCachePath: string;
}

export interface ScrapeSummary {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  linked: number;
  seasonRows: number;
}
