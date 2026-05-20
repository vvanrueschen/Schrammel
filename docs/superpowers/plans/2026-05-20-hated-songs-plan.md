# Hated Songs / Bottom 10 & Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Bottom 10" most-hated songs display and an automated weekly cleanup that deletes the 3 worst songs (meeting threshold) from both the local SQLite DB and AzuraCast.

**Architecture:** New API routes for bottom-ten and cleanup, a new React component for display, schema migration for azuracastId on Song, and a Docker cron service for scheduling.

**Tech Stack:** Next.js 16 App Router, Prisma/SQLite, React 19, Tailwind CSS 4, Docker Compose, AzuraCast REST API.

---

### Task 1: Add azuracastId to Song schema and run migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add azuracastId field to Song model**

Edit `prisma/schema.prisma:13-22` to add the `azuracastId` field:

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

- [ ] **Step 2: Run Prisma migration**

Run: `npx prisma migrate dev --name add_azuracast_id_to_song`

Expected: Migration created and applied successfully.

- [ ] **Step 3: Regenerate Prisma client**

Run: `npx prisma generate`

Expected: Prisma Client generated.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add azuracastId to Song model for AzuraCast deletion"
```

---

### Task 2: Backfill azuracastId in now-playing API

**Files:**
- Modify: `src/app/api/now-playing/route.ts`

- [ ] **Step 1: Add backfill logic to now-playing route**

Edit `src/app/api/now-playing/route.ts`. After extracting `nowPlaying` data (around line 24-30), add a backfill call. Replace the existing `GET` function:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const AZURACAST_API_URL = process.env.AZURACAST_API_URL || "http://vinceberrypi";
const AZURACAST_API_TOKEN = process.env.AZURACAST_API_TOKEN || "";
const STATION_ID = 1;

export async function GET(request: NextRequest) {
  const voterIp = request.headers.get("x-forwarded-for") || "127.0.0.1";

  try {
    const response = await fetch(
      `${AZURACAST_API_URL}/api/station/${STATION_ID}/nowplaying`,
      {
        headers: {
          "X-API-Key": AZURACAST_API_TOKEN,
        },
        next: { revalidate: 10 },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const nowPlaying = data.now_playing?.song;

      if (nowPlaying) {
        const artist = nowPlaying.artist || "Unknown Artist";
        const title = nowPlaying.text || nowPlaying.title || "Unknown Title";
        const azuracastId = nowPlaying.id;

        // Backfill azuracastId for matching song in our DB
        await backfillAzuracastId(artist, title, azuracastId);

        const hasVoted = await checkHasVoted(artist, title, voterIp);
        return NextResponse.json({ artist, title, hasVoted });
      }
    }
  } catch {
    // Fall through to DB
  }

  const nowPlayingDb = await prisma.nowPlaying.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (nowPlayingDb) {
    const hasVoted = await checkHasVoted(nowPlayingDb.artist, nowPlayingDb.title, voterIp);
    return NextResponse.json({
      artist: nowPlayingDb.artist,
      title: nowPlayingDb.title,
      hasVoted,
    });
  }

  return NextResponse.json({
    artist: "Der Schrammel.Reloaded.Stream",
    title: "No track info available",
    hasVoted: false,
  });
}

async function backfillAzuracastId(artist: string, title: string, azuracastId: string): Promise<void> {
  try {
    await prisma.song.updateMany({
      where: {
        artist,
        title,
        azuracastId: null,
      },
      data: { azuracastId },
    });
  } catch {
    // Ignore errors — backfill is best-effort
  }
}

async function checkHasVoted(artist: string, title: string, voterIp: string): Promise<boolean> {
  const song = await prisma.song.findUnique({
    where: { artist_title: { artist, title } },
  });

  if (!song) return false;

  const vote = await prisma.vote.findFirst({
    where: { songId: song.id, voterIp },
  });

  return !!vote;
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/now-playing/route.ts
git commit -m "feat: backfill azuracastId on now-playing fetch"
```

---

### Task 3: Add getBottomRankings DB function and bottom-ten API

**Files:**
- Modify: `src/lib/db.ts`
- Create: `src/app/api/bottom-ten/route.ts`

- [ ] **Step 1: Add getBottomRankings to db.ts**

Append to `src/lib/db.ts` after `getAllSongs`:

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

- [ ] **Step 2: Create bottom-ten API route**

Create `src/app/api/bottom-ten/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getBottomRankings } from "@/lib/db";

export async function GET() {
  const rankings = await getBottomRankings(10);
  return NextResponse.json(rankings);
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db.ts src/app/api/bottom-ten/route.ts
git commit -m "feat: add bottom-ten API and getBottomRankings DB function"
```

---

### Task 4: Create BottomTen component and add to page

**Files:**
- Create: `src/components/BottomTen.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create BottomTen component**

Create `src/components/BottomTen.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import type { RankingEntry } from "@/types";

interface BottomTenProps {
  refreshKey?: number;
}

export default function BottomTen({ refreshKey = 0 }: BottomTenProps) {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRankings = async () => {
    try {
      const res = await fetch("/api/bottom-ten");
      const data = await res.json();
      setRankings(data);
    } catch {
      // Keep existing data on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="neon-card">
        <h2 className="section-title text-red-500">💀 Bottom 10</h2>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="neon-card">
      <h2 className="section-title text-red-500">💀 Bottom 10</h2>
      {rankings.length === 0 ? (
        <p className="text-gray-500 text-sm">No negative votes yet.</p>
      ) : (
        <ul className="ranking-list">
          {rankings.map((entry, index) => (
            <li key={index} className="ranking-item">
              <span className="rank-number">{index + 1}.</span>
              <span className="song-info">
                {entry.title} — {entry.artist}
              </span>
              <span className="vote-count">{entry.rating}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add BottomTen to page.tsx**

Edit `src/app/page.tsx`. Add the import and the component to the layout:

```typescript
"use client";

import { useState, useCallback, useEffect } from "react";
import Player from "@/components/Player";
import TopTen from "@/components/TopTen";
import BottomTen from "@/components/BottomTen";
import Wishlist from "@/components/Wishlist";

const STREAM_URL = "http://vinceberrypi/listen/schrammel_stream/schrammel";

export default function Home() {
  const [currentArtist, setCurrentArtist] = useState("Der Schrammel.Reloaded.Stream");
  const [currentTitle, setCurrentTitle] = useState("Loading...");
  const [hasVoted, setHasVoted] = useState(false);
  const [topTenRefreshKey, setTopTenRefreshKey] = useState(0);
  const [bottomTenRefreshKey, setBottomTenRefreshKey] = useState(0);

  const fetchNowPlaying = useCallback(async () => {
    try {
      const res = await fetch("/api/now-playing");
      if (res.ok) {
        const data = await res.json();
        setCurrentArtist(data.artist);
        setCurrentTitle(data.title);
        setHasVoted(data.hasVoted ?? false);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 10000);
    return () => clearInterval(interval);
  }, [fetchNowPlaying]);

  const handleVote = async (direction: "+" | "-") => {
    if (hasVoted) return;

    const formData = new FormData();
    formData.append("artist", currentArtist);
    formData.append("title", currentTitle);
    formData.append("vote", direction);

    const res = await fetch("/api/vote", { method: "POST", body: formData });
    const result = await res.json();

    if (result.success) {
      setHasVoted(true);
      setTopTenRefreshKey((k) => k + 1);
      setBottomTenRefreshKey((k) => k + 1);
    } else {
      alert(result.message);
    }
  };

  return (
    <div className="space-y-6">
      <Player
        streamUrl={STREAM_URL}
        onVote={handleVote}
        currentArtist={currentArtist}
        currentTitle={currentTitle}
        hasVoted={hasVoted}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TopTen refreshKey={topTenRefreshKey} />
        <Wishlist />
      </div>

      <BottomTen refreshKey={bottomTenRefreshKey} />
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/BottomTen.tsx src/app/page.tsx
git commit -m "feat: add BottomTen component to homepage"
```

---

### Task 5: Add cleanupWorstSongs DB function and cleanup API

**Files:**
- Modify: `src/lib/db.ts`
- Create: `src/app/api/cleanup-worst-songs/route.ts`
- Modify: `.env`

- [ ] **Step 1: Add cleanupWorstSongs to db.ts**

Append to `src/lib/db.ts` after `getBottomRankings`:

```typescript
const DELETION_MIN_VOTES = 3;
const DELETION_MAX_RATING = -5;

export async function cleanupWorstSongs(count = 3): Promise<{
  deleted: { artist: string; title: string; azuracastDeleted: boolean }[];
  count: number;
}> {
  const AZURACAST_API_URL = process.env.AZURACAST_API_URL || "http://vinceberrypi";
  const AZURACAST_API_TOKEN = process.env.AZURACAST_API_TOKEN || "";
  const STATION_ID = 1;

  // Find eligible songs: at least DELETION_MIN_VOTES votes AND rating <= DELETION_MAX_RATING
  const eligibleSongs = await prisma.song.findMany({
    where: {
      rating: { lte: DELETION_MAX_RATING },
      votes: {
        some: {}, // ensures at least one vote exists
      },
    },
    orderBy: { rating: "asc" },
    take: count,
    include: {
      _count: {
        select: { votes: true },
      },
    },
  });

  // Filter to only songs with enough votes
  const filteredSongs = eligibleSongs.filter(
    (s) => s._count.votes >= DELETION_MIN_VOTES
  );

  const deleted: { artist: string; title: string; azuracastDeleted: boolean }[] = [];

  for (const song of filteredSongs) {
    let azuracastDeleted = false;

    // Try to delete from AzuraCast first
    if (song.azuracastId) {
      try {
        const response = await fetch(
          `${AZURACAST_API_URL}/api/station/${STATION_ID}/file/${song.azuracastId}`,
          {
            method: "DELETE",
            headers: {
              "X-API-Key": AZURACAST_API_TOKEN,
            },
          }
        );
        azuracastDeleted = response.ok;
      } catch {
        // Log but continue — we still delete from local DB
        console.error(
          `Failed to delete song "${song.artist} - ${song.title}" from AzuraCast`
        );
      }
    }

    // Delete from local DB (votes first due to foreign key)
    await prisma.$transaction([
      prisma.vote.deleteMany({ where: { songId: song.id } }),
      prisma.song.delete({ where: { id: song.id } }),
    ]);

    deleted.push({
      artist: song.artist,
      title: song.title,
      azuracastDeleted,
    });
  }

  return { deleted, count: deleted.length };
}
```

- [ ] **Step 2: Create cleanup API route**

Create `src/app/api/cleanup-worst-songs/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cleanupWorstSongs } from "@/lib/db";

export async function POST(request: NextRequest) {
  const cleanupToken = process.env.CLEANUP_SECRET_TOKEN || "";
  const providedToken = request.headers.get("X-Cleanup-Token");

  if (!cleanupToken || providedToken !== cleanupToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await cleanupWorstSongs(3);
  return NextResponse.json(result);
}
```

- [ ] **Step 3: Add CLEANUP_SECRET_TOKEN to .env**

Append to `.env`:

```
CLEANUP_SECRET_TOKEN="change-me-to-a-secret-value"
```

- [ ] **Step 4: Verify build**

Run: `npm run build`

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.ts src/app/api/cleanup-worst-songs/route.ts .env
git commit -m "feat: add cleanup-worst-songs API with AzuraCast integration"
```

---

### Task 6: Add Docker cron service

**Files:**
- Modify: `docker-compose.yml`
- Create: `cron/schrammel-crontab`
- Modify: `.env`

- [ ] **Step 1: Create crontab file**

Create `cron/schrammel-crontab`:

```
0 3 * * 0 curl -s -X POST -H "X-Cleanup-Token: change-me-to-a-secret-value" http://schrammel:3000/api/cleanup-worst-songs
```

Note: The service name in docker-compose is `schrammel`, so the URL uses `http://schrammel:3000`.

- [ ] **Step 2: Add cron service to docker-compose.yml**

Edit `docker-compose.yml` to add the cron service:

```yaml
services:
  schrammel:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./prisma:/app/prisma
      - ./Schrammel:/app/Schrammel:ro
      - ./Verpackung:/app/Verpackung:ro
      - ./Website:/app/Website:ro
    environment:
      - DATABASE_URL=file:./prisma/dev.db
      - NODE_ENV=production
      - CLEANUP_SECRET_TOKEN=${CLEANUP_SECRET_TOKEN}
    restart: unless-stopped

  cron:
    image: alpine:latest
    volumes:
      - ./cron/schrammel-crontab:/etc/crontabs/root
    command: crond -f
    restart: unless-stopped
```

- [ ] **Step 3: Update .env with the secret token**

Edit `.env` to set the cleanup token (replace the placeholder):

```
CLEANUP_SECRET_TOKEN="change-me-to-a-secret-value"
```

This should match the value in `cron/schrammel-crontab`.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml cron/schrammel-crontab .env
git commit -m "feat: add Docker cron service for weekly song cleanup"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run full build**

Run: `npm run build`

Expected: Build succeeds with no errors.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: No lint errors.

- [ ] **Step 3: Run database migration**

Run: `npx prisma migrate dev`

Expected: Migration is already applied, no changes detected.

- [ ] **Step 4: Commit any remaining changes**

```bash
git status
git add -A
git commit -m "chore: final verification cleanup"
```
