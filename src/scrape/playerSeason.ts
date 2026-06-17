import { load } from "cheerio";
import { BrefClient, uncommentBrefHtml } from "../brefClient.js";
import type { GLeaguePlayerMeta, GLeagueSeasonRow } from "../types.js";
import { round1 } from "../utils/season.js";
import { buildPlayerSeasonRecord } from "../transform.js";
import type { GLeaguePlayerSeasonRecord } from "../types.js";
import {
  getCachedTeam,
  loadTeamCache,
  saveTeamCache,
  setCachedTeam,
  type TeamCache,
} from "./teamCache.js";

function parseNumber(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number.parseFloat(value.trim());
  return Number.isNaN(parsed) ? null : parsed;
}

export function parseSeasonRowsFromHtml(html: string): GLeagueSeasonRow[] {
  const $ = load(html);
  const rows: GLeagueSeasonRow[] = [];

  $("#nbdl_per_game-reg tbody tr.full_table").each((_, row) => {
    const $row = $(row);
    const seasonLabel = $row.find('[data-stat="season"]').text().trim();
    if (!seasonLabel) return;

    const teamCell = $row.find('[data-stat="team_id"]');
    const teamLink = teamCell.find("a").attr("href") ?? "";
    const abbrevMatch = /\/gleague\/teams\/([A-Z0-9]+)\/(\d{4})\.html/i.exec(teamLink);
    const teamAbbreviation =
      abbrevMatch?.[1]?.toUpperCase() ?? teamCell.text().trim().toUpperCase();
    const teamSeasonYear = abbrevMatch?.[2]
      ? Number.parseInt(abbrevMatch[2], 10)
      : seasonLabelToEndYear(seasonLabel);

    const gamesPlayed = parseNumber($row.find('[data-stat="g"]').text());
    if (!gamesPlayed || gamesPlayed <= 0) return;

    const pointsPerGame = parseNumber($row.find('[data-stat="pts_per_g"]').text());
    const reboundsPerGame = parseNumber($row.find('[data-stat="trb_per_g"]').text());
    const assistsPerGame = parseNumber($row.find('[data-stat="ast_per_g"]').text());
    if (
      pointsPerGame == null ||
      reboundsPerGame == null ||
      assistsPerGame == null
    ) {
      return;
    }

    rows.push({
      seasonLabel,
      teamAbbreviation,
      teamSeasonYear: Number.isNaN(teamSeasonYear) ? seasonLabelToEndYear(seasonLabel) : teamSeasonYear,
      gamesPlayed,
      pointsPerGame: round1(pointsPerGame),
      reboundsPerGame: round1(reboundsPerGame),
      assistsPerGame: round1(assistsPerGame),
      stealsPerGame: round1(parseNumber($row.find('[data-stat="stl_per_g"]').text()) ?? 0),
      blocksPerGame: round1(parseNumber($row.find('[data-stat="blk_per_g"]').text()) ?? 0),
    });
  });

  return rows;
}

function seasonLabelToEndYear(label: string): number {
  const match = /^(\d{4})-(\d{2})$/.exec(label.trim());
  if (!match) return new Date().getFullYear();
  const century = match[1].slice(0, 2);
  return Number.parseInt(`${century}${match[2]}`, 10);
}

export async function buildPlayerSeasonRecords(
  bref: BrefClient,
  slug: string,
  html: string,
  meta: GLeaguePlayerMeta,
  teamCachePath: string,
): Promise<GLeaguePlayerSeasonRecord[]> {
  const seasonRows = parseSeasonRowsFromHtml(html);
  const cache = loadTeamCache(teamCachePath);
  const records: GLeaguePlayerSeasonRecord[] = [];

  for (const row of seasonRows) {
    const team = await resolveTeam(bref, cache, row.teamAbbreviation, row.teamSeasonYear, teamCachePath);
    records.push(
      buildPlayerSeasonRecord({
        externalId: slug,
        displayName: meta.displayName,
        teamName: team.fullName,
        teamAbbreviation: team.abbrev,
        seasonLabel: row.seasonLabel,
        stats: {
          gamesPlayed: row.gamesPlayed,
          pointsPerGame: row.pointsPerGame,
          reboundsPerGame: row.reboundsPerGame,
          assistsPerGame: row.assistsPerGame,
          stealsPerGame: row.stealsPerGame,
          blocksPerGame: row.blocksPerGame,
        },
      }),
    );
  }

  return records;
}

async function resolveTeam(
  bref: BrefClient,
  cache: TeamCache,
  abbrev: string,
  seasonYear: number,
  teamCachePath: string,
) {
  const cached = getCachedTeam(cache, abbrev, seasonYear);
  if (cached) return cached;

  const teamHtml = uncommentBrefHtml(await bref.fetchHtml(bref.teamUrl(abbrev, seasonYear)));
  const fullName = bref.parseTeamNameFromTitle(teamHtml);
  const entry = setCachedTeam(cache, abbrev, seasonYear, fullName);
  saveTeamCache(teamCachePath, cache);
  return entry;
}
