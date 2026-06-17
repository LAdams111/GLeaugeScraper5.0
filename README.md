# G-League-Scraper 5.0

Scrapes NBA G League player season stats from [Basketball Reference](https://www.basketball-reference.com/gleague/) and ingests them into [Hoop Central](https://hoopcentral-50-production.up.railway.app).

## Setup

```bash
npm install
cp .env.example .env
npm run build
```

## Tests (no BRef requests)

```bash
npm run test:build
```

## Single-player test (Seth Curry)

Dry-run first (hits BRef with 6s pacing — 1 player page + team pages):

```bash
npm run scrape:dry-run -- --player-slug curryse01d
```

Live ingest to production:

```bash
npm run scrape -- --player-slug curryse01d
```

Verify: https://hoopcentral-50-production.up.railway.app/players/278

## Health check

```bash
npm run scrape -- --health
```

## Backfill (after single-player test passes)

```bash
npm run scrape:backfill -- --resume
```

## Behavior

- **Stats only** — season per-game table `#nbdl_per_game-reg`
- **NBA overlap** — minimal `player-bio` + `linkTo`, then season POSTs with existing profile bio pass-through (does not wipe BIO-scraper fields)
- **G League-only players** — created via season ingest with `displayName` only; enrich bios later with BIO-Scraper
- **Rate limiting** — 6s/player, 10s/index letter, jitter, 429 backoff (mirrors BIO-Scraper)
