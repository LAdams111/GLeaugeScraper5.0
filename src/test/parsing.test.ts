import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isBlockedBrefHtml,
  parsePlayerMetaFromHtml,
  parseTeamNameFromTitleHtml,
} from "../brefClient.js";
import { getStaticTeamName } from "../utils/gleagueTeams.js";
import { parseSeasonRowsFromHtml } from "../scrape/playerSeason.js";
import { feetInchesToCm, lbsToKg } from "../utils/profile.js";
import { nameToSlug } from "../utils/teams.js";
import { round1 } from "../utils/season.js";
import { buildPlayerSeasonRecord } from "../transform.js";
import { toIngestPayload } from "../transform.js";

const SETH_STATS_HTML = `
<html><head><title>Seth Curry G-League Stats | Basketball-Reference.com</title></head>
<body>
<span id="necro-birth" data-birth="1990-08-23"></span>
<table id="nbdl_per_game-reg">
<tbody>
<tr class="full_table"><th>Season</th><th>Team</th><th>G</th><th>PTS</th><th>TRB</th><th>AST</th><th>STL</th><th>BLK</th></tr>
<tr class="full_table">
  <td data-stat="season">2013-14</td>
  <td data-stat="team_id"><a href="/gleague/teams/SCW/2014.html">SCW</a></td>
  <td data-stat="g">38</td>
  <td data-stat="pts_per_g">19.7</td>
  <td data-stat="trb_per_g">3.1</td>
  <td data-stat="ast_per_g">5.8</td>
  <td data-stat="stl_per_g">1.4</td>
  <td data-stat="blk_per_g">0.2</td>
</tr>
<tr class="full_table">
  <td data-stat="season">2014-15</td>
  <td data-stat="team_id"><a href="/gleague/teams/ERI/2015.html">ERI</a></td>
  <td data-stat="g">43</td>
  <td data-stat="pts_per_g">23.8</td>
  <td data-stat="trb_per_g">3.9</td>
  <td data-stat="ast_per_g">4.2</td>
  <td data-stat="stl_per_g">1.4</td>
  <td data-stat="blk_per_g">0.0</td>
</tr>
</tbody>
<tfoot><tr><td>Career</td></tr></tfoot>
</table>
</body></html>
`;

describe("G League stats parsing", () => {
  it("parses player meta from page title and birth date", () => {
    const meta = parsePlayerMetaFromHtml("curryse01d", SETH_STATS_HTML);
    assert.equal(meta.displayName, "Seth Curry");
    assert.equal(meta.birthDate, "1990-08-23");
  });

  it("parses Seth Curry expected season rows", () => {
    const rows = parseSeasonRowsFromHtml(SETH_STATS_HTML);
    assert.equal(rows.length, 2);

    assert.equal(rows[0].seasonLabel, "2013-14");
    assert.equal(rows[0].teamAbbreviation, "SCW");
    assert.equal(rows[0].teamSeasonYear, 2014);
    assert.equal(rows[0].gamesPlayed, 38);
    assert.equal(rows[0].pointsPerGame, 19.7);
    assert.equal(rows[0].reboundsPerGame, 3.1);
    assert.equal(rows[0].assistsPerGame, 5.8);
    assert.equal(rows[0].stealsPerGame, 1.4);
    assert.equal(rows[0].blocksPerGame, 0.2);

    assert.equal(rows[1].seasonLabel, "2014-15");
    assert.equal(rows[1].teamAbbreviation, "ERI");
    assert.equal(rows[1].gamesPlayed, 43);
    assert.equal(rows[1].pointsPerGame, 23.8);
  });

  it("skips TOT rows and parses partial_table team rows for multi-team seasons", () => {
    const html = `
<html><body>
<table id="nbdl_per_game-reg">
<tbody>
<tr class="full_table">
  <td data-stat="season">2013-14</td>
  <td data-stat="team_id">TOT</td>
  <td data-stat="g">37</td>
  <td data-stat="pts_per_g">11.8</td>
  <td data-stat="trb_per_g">1.9</td>
  <td data-stat="ast_per_g">2.1</td>
  <td data-stat="stl_per_g">0.5</td>
  <td data-stat="blk_per_g">0.0</td>
</tr>
<tr class="partial_table">
  <td data-stat="season">2013-14</td>
  <td data-stat="team_id"><a href="/gleague/teams/IWA/2014.html">IWA</a></td>
  <td data-stat="g">30</td>
  <td data-stat="pts_per_g">12.5</td>
  <td data-stat="trb_per_g">2.1</td>
  <td data-stat="ast_per_g">2.3</td>
  <td data-stat="stl_per_g">0.5</td>
  <td data-stat="blk_per_g">0.0</td>
</tr>
<tr class="partial_table">
  <td data-stat="season">2013-14</td>
  <td data-stat="team_id"><a href="/gleague/teams/SXF/2014.html">SXF</a></td>
  <td data-stat="g">7</td>
  <td data-stat="pts_per_g">8.6</td>
  <td data-stat="trb_per_g">1.0</td>
  <td data-stat="ast_per_g">1.0</td>
  <td data-stat="stl_per_g">0.4</td>
  <td data-stat="blk_per_g">0.0</td>
</tr>
</tbody>
</table>
</body></html>`;

    const rows = parseSeasonRowsFromHtml(html);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].teamAbbreviation, "IWA");
    assert.equal(rows[1].teamAbbreviation, "SXF");
  });

  it("skips career footer and zero-game rows", () => {
    const html = `${SETH_STATS_HTML.replace("</tbody>", `
<tr class="full_table">
  <td data-stat="season">2015-16</td>
  <td data-stat="team_id">PHX</td>
  <td data-stat="g">0</td>
  <td data-stat="pts_per_g">0.0</td>
  <td data-stat="trb_per_g">0.0</td>
  <td data-stat="ast_per_g">0.0</td>
  <td data-stat="stl_per_g">0.0</td>
  <td data-stat="blk_per_g">0.0</td>
</tr></tbody>`)}`;
    const rows = parseSeasonRowsFromHtml(html);
    assert.equal(rows.length, 2);
  });

  it("parses team title into full name", () => {
    const html = "<html><head><title>2013-14 Santa Cruz Warriors Stats</title></head></html>";
    assert.equal(parseTeamNameFromTitleHtml(html), "Santa Cruz Warriors");
  });

  it("builds ingest payload shape", () => {
    const record = buildPlayerSeasonRecord({
      externalId: "curryse01d",
      displayName: "Seth Curry",
      teamName: "Santa Cruz Warriors",
      teamAbbreviation: "SCW",
      seasonLabel: "2013-14",
      stats: {
        gamesPlayed: 38,
        pointsPerGame: 19.7,
        reboundsPerGame: 3.1,
        assistsPerGame: 5.8,
        stealsPerGame: 1.4,
        blocksPerGame: 0.2,
      },
    });

    const payload = toIngestPayload(record, {
      displayName: "Seth Curry",
      birthDate: "1990-08-23",
      position: "G",
      heightCm: 185,
      weightKg: 84,
      headshotUrl: "https://example.com/headshot.jpg",
    });

    assert.equal(payload.source, "basketball-reference-gleague");
    assert.equal(payload.externalId, "curryse01d");
    assert.equal(payload.league.slug, "g-league");
    assert.equal(payload.team.slug, "santa-cruz-warriors");
    assert.equal(payload.player.birthDate, "1990-08-23");
    assert.equal(payload.stats.pointsPerGame, 19.7);
  });
});

describe("helpers", () => {
  it("rounds stats to one decimal", () => {
    assert.equal(round1(19.74), 19.7);
  });

  it("converts profile height and weight for bio pass-through", () => {
    assert.equal(feetInchesToCm(`6'2"`), 188);
    assert.equal(lbsToKg("185 lbs"), 84);
  });

  it("slugifies team names", () => {
    assert.equal(nameToSlug("Santa Cruz Warriors"), "santa-cruz-warriors");
  });

  it("detects blocked/empty BRef HTML", () => {
    assert.equal(isBlockedBrefHtml(""), true);
    assert.equal(isBlockedBrefHtml("<html></html>"), true);
    assert.equal(isBlockedBrefHtml("<html><head><title>Test</title></head><body>x</body></html>"), true);
    assert.equal(
      isBlockedBrefHtml(`<html><head><title>Test</title></head><body>${"x".repeat(600)}</body></html>`),
      false,
    );
  });

  it("resolves static G League team names", () => {
    assert.equal(getStaticTeamName("IWA"), "Iowa Wolves");
    assert.equal(getStaticTeamName("rgv"), "Rio Grande Valley Vipers");
    assert.equal(getStaticTeamName("ZZZ"), null);
  });
});
