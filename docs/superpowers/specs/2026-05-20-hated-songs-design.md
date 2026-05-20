# Hated Songs / Bottom 10 & Cleanup Design

**Date:** 2026-05-20
**Status:** Approved

## Overview

Add a "Bottom 10" section showing the most negatively rated songs, and an automated weekly cleanup that deletes the 3 worst songs from both the local SQLite database and the AzuraCast station library.

## Section 1: Database Changes

### Schema Update

Add `azuracastId` field to the `Song` model in `prisma/schema.prisma`:

```prisma
model Song {
  id           Int      @id @default(autoincrement())
  artist       String
  title        String
  filePath     String?
  azuracastId  String?  // AzuraCast media ID for deletion via API
  rating       Int      @default(0)
  plays        Int      @default(0)
  wishes       Wish[]
  votes        Vote[]
  @@unique([artist, title])
}
```

### Backfill Strategy

The `azuracastId` gets populated:
- **On now-playing fetch:** When `/api/now-playing` returns a song, look up the Song in our DB by artist+title. If found and `azuracastId` is null, update it with the AzuraCast song ID from the now-playing response. This runs on every poll (every 10s), so songs naturally get their ID populated as they play.

### Migration

Run `npx prisma migrate dev` to generate and apply the migration.

## Section 2: Bottom 10 Component & API

### API Route: `GET /api/bottom-ten`

Returns the 10 songs with the lowest rating, sorted ascending:

```typescript
// Response: RankingEntry[]
[
  { artist: "...", title: "...", rating: -15 },
  { artist: "...", title: "...", rating: -12 },
  // ...
]
```

### DB Function: `getBottomRankings(limit = 10)`

Added to `src/lib/db.ts`:

```typescript
export async function getBottomRankings(limit = 10): Promise<RankingEntry[]> {
  const songs = await prisma.song.findMany({
    orderBy: { rating: "asc" },
    take: limit,
    select: { artist: true, title: true, rating: true },
  });
  return songs;
}
```

### Component: `BottomTen.tsx`

Mirrors `TopTen.tsx` structure:
- Fetches from `/api/bottom-ten`
- Displays ranked list with negative ratings
- Uses red/dark neon styling (e.g. `text-red-500` or a custom `text-neon-red`)
- Shows "💀" or similar icon to distinguish from Top 10's "🏆"

### Page Integration

Add `BottomTen` to `page.tsx` below the existing Top 10 / Wishlist grid:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <TopTen refreshKey={topTenRefreshKey} />
  <Wishlist />
</div>
<div className="mt-6">
  <BottomTen />
</div>
```

## Section 3: Cleanup API & Scheduler

### Deletion Threshold

A song is only eligible for deletion if **both** conditions are met:
- **Minimum vote count:** at least 3 votes total
- **Minimum negative rating:** rating ≤ -5

This prevents songs with few votes from being deleted prematurely. With ~15 users, this means roughly 1/3 of the userbase must have downvoted a song for it to qualify.

### API Route: `POST /api/cleanup-worst-songs`

Protected endpoint — requires `X-Cleanup-Token` header matching `CLEANUP_SECRET_TOKEN` env var. The cron container passes this token.

**Logic:**
1. Find bottom songs by rating (ascending order) that meet the deletion threshold
2. Take up to 3 from the eligible set
3. For each song:
   - If `azuracastId` exists, call AzuraCast API:
     `DELETE /api/station/1/file/{azuracastId}`
   - Delete all Votes for the song from our DB
   - Delete the Song from our DB
4. Return summary: `{ deleted: [{ artist, title, azuracastDeleted }], count }`

**Error handling:**
- If AzuraCast deletion fails, still delete from local DB (log the failure)
- If fewer than 3 eligible songs exist, delete what's available
- If no songs meet the threshold, return `{ deleted: [], count: 0 }`

### DB Function: `cleanupWorstSongs(count = 3)`

Added to `src/lib/db.ts`:
- Uses a transaction to atomically fetch bottom N songs, delete votes, delete songs
- Returns deleted song info for the API response

### Docker Compose Cron Container

Add a cron service to `docker-compose.yml`:

```yaml
cron:
  image: alpine:latest
  volumes:
    - ./cron/schrammel-crontab:/etc/crontabs/root
  command: crond -f
  networks:
    - app-network
  restart: unless-stopped
```

Crontab entry (`cron/schrammel-crontab`):
```
0 3 * * 0 curl -s -X POST http://app:3000/api/cleanup-worst-songs
```

Runs every Sunday at 3:00 AM.

## Data Flow

```
User votes (-) on song
  → Song.rating decreases
  → Bottom 10 updates automatically

Weekly cron fires
  → POST /api/cleanup-worst-songs
  → Find up to 3 songs meeting threshold (≥3 votes, rating ≤ -5)
  → For each: DELETE from AzuraCast (if azuracastId exists)
  → DELETE votes + song from SQLite
  → Bottom 10 refreshes on next page load
```

## Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `azuracastId` to Song |
| `src/lib/db.ts` | Add `getBottomRankings`, `cleanupWorstSongs`, backfill logic |
| `src/app/api/now-playing/route.ts` | Backfill `azuracastId` on fetch |
| `src/app/api/bottom-ten/route.ts` | New GET endpoint |
| `src/app/api/cleanup-worst-songs/route.ts` | New POST endpoint |
| `src/components/BottomTen.tsx` | New component |
| `src/app/page.tsx` | Add BottomTen to layout |
| `docker-compose.yml` | Add cron service |
| `cron/schrammel-crontab` | New crontab file |
