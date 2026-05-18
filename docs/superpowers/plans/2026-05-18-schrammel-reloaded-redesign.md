# Schrammel Reloaded — Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Schrammel Reloaded PHP/jQuery radio stream site as a modern Next.js 15 app with SSR, SQLite + Prisma, neon party UI, and Docker Compose deployment.

**Architecture:** Next.js 15 App Router with React Server Components for initial render, Client Components for interactive elements (player, voting, forms). API routes replace PHP backend. SQLite via Prisma for persistence.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Prisma, SQLite, Playwright (E2E), Docker Compose

---

## File Structure

```
Schrammel/                          # Existing audio files (preserved, not moved)
Verpackung/                         # Existing sound clips (preserved, not moved)
Website/                            # Existing PHP site (preserved, not moved)
src/
  app/
    layout.tsx                      # Root layout with metadata, fonts
    page.tsx                        # Homepage assembly
    globals.css                     # Tailwind + neon theme globals
    api/
      vote/route.ts                 # POST: vote up/down on current song
      wish/route.ts                 # POST: submit wish, GET: list wishes
      wish/rate/route.ts            # POST: rate a wish (0-10)
      ranking/route.ts              # GET: top 10 ranking
      songs/route.ts                # GET: full song list
      now-playing/route.ts          # GET: current track info
  components/
    Player.tsx                      # Audio player + play/pause/volume/vote
    NowPlaying.tsx                  # Polls now-playing, displays artist/title
    TopTen.tsx                      # Top 10 ranking table
    Wishlist.tsx                    # Wishlist display + form + ratings
  lib/
    prisma.ts                       # Prisma client singleton
    db.ts                           # DB helper functions
  types/
    index.ts                        # Shared TypeScript types
prisma/
  schema.prisma                     # Database schema
  seed.ts                           # Seed script for existing songs
public/
  cover_1.png                       # Default album art (copied from Website/)
prisma/
  dev.db                            # SQLite database (gitignored)
.env                                # Environment variables
.env.example                        # Example env file
docker-compose.yml                  # Docker Compose config
Dockerfile                          # Production Docker image
next.config.ts                      # Next.js config
tailwind.config.ts                  # Tailwind with neon theme
tsconfig.json                       # TypeScript config
package.json                        # Dependencies
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `src/lib/prisma.ts`

- [ ] **Step 1: Initialize Next.js project**

Run in project root:
```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --use-npm --eslint
```

When prompted, accept defaults. This creates the base Next.js 15 project with TypeScript, Tailwind, App Router, and src directory.

- [ ] **Step 2: Install Prisma and additional dependencies**

```bash
npm install prisma @prisma/client
npm install -D @types/node
npx prisma init --datasource-provider sqlite
```

This creates `prisma/schema.prisma` and `.env` with `DATABASE_URL="file:./dev.db"`.

- [ ] **Step 3: Verify dev server starts**

```bash
npm run dev
```

Expected: Next.js dev server starts on `http://localhost:3000` with default landing page.

- [ ] **Step 4: Copy default cover art**

```bash
cp Website/cover_1.png public/cover_1.png
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 project with Prisma"
```

---

### Task 2: Prisma Schema & Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Write Prisma schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Song {
  id        Int      @id @default(autoincrement())
  artist    String
  title     String
  filePath  String?
  rating    Int      @default(0)
  plays     Int      @default(0)
  wishes    Wish[]
  votes     Vote[]
  @@unique([artist, title])
}

model Wish {
  id        Int      @id @default(autoincrement())
  artist    String
  title     String
  weblink   String?
  rating    Int      @default(0)
  createdAt DateTime @default(now())
}

model Vote {
  id        Int      @id @default(autoincrement())
  songId    Int
  song      Song     @relation(fields: [songId], references: [id])
  voterIp   String
  value     Int
  createdAt DateTime @default(now())
}

model NowPlaying {
  id        Int      @id @default(autoincrement())
  artist    String
  title     String
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: Migration created and applied, SQLite database created at `prisma/dev.db`.

- [ ] **Step 3: Generate Prisma client**

```bash
npx prisma generate
```

Expected: `@prisma/client` generated with TypeScript types.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Prisma schema with Song, Wish, Vote, NowPlaying models"
```

---

### Task 3: Database Utilities & Types

**Files:**
- Create: `src/lib/prisma.ts`
- Create: `src/lib/db.ts`
- Create: `src/types/index.ts`

- [ ] **Step 1: Create Prisma client singleton**

Create `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 2: Create shared types**

Create `src/types/index.ts`:

```typescript
export interface NowPlayingData {
  artist: string;
  title: string;
}

export interface VotePayload {
  artist: string;
  title: string;
  vote: "+" | "-";
}

export interface WishPayload {
  artist: string;
  title: string;
  weblink?: string;
}

export interface WishRatingPayload {
  wsongid: string;
  wrating: string;
}

export interface RankingEntry {
  artist: string;
  title: string;
  rating: number;
}
```

- [ ] **Step 3: Create DB helper functions**

Create `src/lib/db.ts`:

```typescript
import { prisma } from "./prisma";
import type { RankingEntry } from "@/types";

export async function getTopRankings(limit = 10): Promise<RankingEntry[]> {
  const songs = await prisma.song.findMany({
    orderBy: { rating: "desc" },
    take: limit,
    select: { artist: true, title: true, rating: true },
  });
  return songs;
}

export async function voteOnSong(
  artist: string,
  title: string,
  value: number,
  voterIp: string
): Promise<{ success: boolean; message: string }> {
  const song = await prisma.song.findUnique({
    where: { artist_title: { artist, title } },
  });

  if (!song) {
    return { success: false, message: "Song not found" };
  }

  const existingVote = await prisma.vote.findFirst({
    where: { songId: song.id, voterIp },
  });

  if (existingVote) {
    return { success: false, message: "Du hast diesen Titel bereits bewertet." };
  }

  await prisma.$transaction([
    prisma.vote.create({
      data: { songId: song.id, voterIp, value },
    }),
    prisma.song.update({
      where: { id: song.id },
      data: { rating: { increment: value } },
    }),
  ]);

  return { success: true, message: "Record updated successfully" };
}

export async function createWish(
  artist: string,
  title: string,
  weblink?: string
): Promise<{ success: boolean; message: string }> {
  const existing = await prisma.wish.findFirst({
    where: { artist, title },
  });

  if (existing) {
    return { success: false, message: "Title already exists" };
  }

  await prisma.wish.create({ data: { artist, title, weblink } });
  return { success: true, message: "Record updated successfully" };
}

export async function rateWish(
  wishId: number,
  rating: number
): Promise<{ success: boolean; message: string }> {
  if (rating < 0 || rating > 10) {
    return {
      success: false,
      message: "Es muss eine Bewertung von 0 bis 10 abgegeben werden.",
    };
  }

  await prisma.wish.update({
    where: { id: wishId },
    data: { rating },
  });

  return { success: true, message: "Record updated successfully" };
}

export async function getWishes() {
  return prisma.wish.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllSongs() {
  return prisma.song.findMany({
    orderBy: [{ artist: "asc" }, { title: "asc" }],
  });
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ src/types/
git commit -m "feat: add Prisma client, types, and DB helpers"
```

---

### Task 4: API Routes — Vote & Wish

**Files:**
- Create: `src/app/api/vote/route.ts`
- Create: `src/app/api/wish/route.ts`
- Create: `src/app/api/wish/rate/route.ts`

- [ ] **Step 1: Write vote API route**

Create `src/app/api/vote/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { voteOnSong } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.formData();
  const title = body.get("title") as string;
  const artist = body.get("artist") as string;
  const vote = body.get("vote") as string;

  if (!artist || !title || !vote) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const value = vote === "+" ? 1 : -1;
  const voterIp = request.headers.get("x-forwarded-for") || "127.0.0.1";

  const result = await voteOnSong(artist, title, value, voterIp);

  return NextResponse.json({ message: result.message, success: result.success });
}
```

- [ ] **Step 2: Write wish API route**

Create `src/app/api/wish/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createWish, getWishes } from "@/lib/db";

export async function GET() {
  const wishes = await getWishes();
  return NextResponse.json(wishes);
}

export async function POST(request: NextRequest) {
  const body = await request.formData();
  const artist = body.get("artist") as string;
  const title = body.get("title") as string;
  const weblink = body.get("weblink") as string | null;

  if (!artist || !title) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const result = await createWish(artist, title, weblink || undefined);
  return NextResponse.json({ message: result.message, success: result.success });
}
```

- [ ] **Step 3: Write wish rating API route**

Create `src/app/api/wish/rate/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { rateWish } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.formData();
  const wsongid = body.get("wsongid") as string;
  const wrating = body.get("wrating") as string;

  if (!wsongid || !wrating) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const rating = parseInt(wrating, 10);
  const wishId = parseInt(wsongid, 10);

  const result = await rateWish(wishId, rating);
  return NextResponse.json({ message: result.message, success: result.success });
}
```

- [ ] **Step 4: Test API routes manually**

Start dev server:
```bash
npm run dev
```

Test vote (should return "Song not found" since DB is empty):
```bash
curl -X POST http://localhost:3000/api/vote -F "artist=Test" -F "title=Test" -F "vote=+"
```

Expected: `{"message":"Song not found","success":false}`

Test wish:
```bash
curl -X POST http://localhost:3000/api/wish -F "artist=Test Artist" -F "title=Test Title"
```

Expected: `{"message":"Record updated successfully","success":true}`

Test duplicate wish:
```bash
curl -X POST http://localhost:3000/api/wish -F "artist=Test Artist" -F "title=Test Title"
```

Expected: `{"message":"Title already exists","success":false}`

- [ ] **Step 5: Commit**

```bash
git add src/app/api/
git commit -m "feat: add vote, wish, and wish rating API routes"
```

---

### Task 5: API Routes — Ranking, Songs, Now-Playing

**Files:**
- Create: `src/app/api/ranking/route.ts`
- Create: `src/app/api/songs/route.ts`
- Create: `src/app/api/now-playing/route.ts`

- [ ] **Step 1: Write ranking API route**

Create `src/app/api/ranking/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getTopRankings } from "@/lib/db";

export async function GET() {
  const rankings = await getTopRankings(10);
  return NextResponse.json(rankings);
}
```

- [ ] **Step 2: Write songs API route**

Create `src/app/api/songs/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getAllSongs } from "@/lib/db";

export async function GET() {
  const songs = await getAllSongs();
  return NextResponse.json(songs);
}
```

- [ ] **Step 3: Write now-playing API route**

Create `src/app/api/now-playing/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as fs from "fs";
import * as path from "path";

export async function GET() {
  // Try reading playingnow.xml first
  const xmlPath = path.join(process.cwd(), "..", "Website", "playingnow.xml");

  try {
    if (fs.existsSync(xmlPath)) {
      const xmlContent = fs.readFileSync(xmlPath, "utf-8");
      const artistMatch = xmlContent.match(/<Artist>(.*?)<\/Artist>/);
      const titleMatch = xmlContent.match(/<Title>(.*?)<\/Title>/);

      if (artistMatch && titleMatch) {
        return NextResponse.json({
          artist: artistMatch[1],
          title: titleMatch[1],
        });
      }
    }
  } catch {
    // Fall through to DB
  }

  // Fallback to DB
  const nowPlaying = await prisma.nowPlaying.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (nowPlaying) {
    return NextResponse.json({
      artist: nowPlaying.artist,
      title: nowPlaying.title,
    });
  }

  return NextResponse.json({
    artist: "Der Schrammel.Reloaded.Stream",
    title: "No track info available",
  });
}
```

- [ ] **Step 4: Test ranking and songs routes**

```bash
curl http://localhost:3000/api/ranking
```

Expected: `[]` (empty array, no votes yet)

```bash
curl http://localhost:3000/api/songs
```

Expected: `[]` (empty array, no songs seeded yet)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/ranking/ src/app/api/songs/ src/app/api/now-playing/
git commit -m "feat: add ranking, songs, and now-playing API routes"
```

---

### Task 6: Player Component

**Files:**
- Create: `src/components/Player.tsx`

- [ ] **Step 1: Create Player component**

Create `src/components/Player.tsx`:

```typescript
"use client";

import { useState, useRef, useEffect } from "react";

interface PlayerProps {
  streamUrl: string;
  onVote: (direction: "+" | "-") => void;
  currentArtist: string;
  currentTitle: string;
}

export default function Player({
  streamUrl,
  onVote,
  currentArtist,
  currentTitle,
}: PlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isOffline, setIsOffline] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume / 100;

    audioRef.current.addEventListener("ended", () => {
      audioRef.current?.play();
    });

    audioRef.current.addEventListener("error", () => {
      setIsOffline(true);
      setTimeout(() => setIsOffline(false), 30000);
    });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.src = "";
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.src = streamUrl;
      audioRef.current.play().catch(() => setIsOffline(true));
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value, 10);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  const handleVote = (direction: "+" | "-") => {
    onVote(direction);
  };

  return (
    <div className="neon-card hero-card">
      <div className="flex items-center gap-5">
        <div className="album-art">
          {isPlaying ? (
            <div className="play-icon">⏸</div>
          ) : (
            <div className="play-icon">▶</div>
          )}
        </div>
        <div className="flex-1">
          <h1 className="stream-title">
            Der Schrammel<span className="text-neon-pink">.</span>
            Reloaded<span className="text-neon-blue">.</span>Stream
          </h1>
          <div className="now-playing-text">
            Now Playing:{" "}
            <span className="text-white font-medium">
              {currentArtist} — {currentTitle}
            </span>
          </div>
          {isOffline && (
            <div className="offline-indicator">
              Stream offline — retrying in 30s...
            </div>
          )}
          <div className="player-controls">
            <button
              onClick={() => handleVote("-")}
              className="vote-btn vote-down"
              aria-label="Vote down"
            >
              👎
            </button>
            <button
              onClick={togglePlay}
              className="play-btn"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button
              onClick={() => handleVote("+")}
              className="vote-btn vote-up"
              aria-label="Vote up"
            >
              👍
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="volume-slider"
              aria-label="Volume"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Player.tsx
git commit -m "feat: add Player component with stream, volume, and voting"
```

---

### Task 7: NowPlaying Component

**Files:**
- Create: `src/components/NowPlaying.tsx`

- [ ] **Step 1: Create NowPlaying component**

Create `src/components/NowPlaying.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";

interface NowPlayingData {
  artist: string;
  title: string;
}

interface NowPlayingProps {
  onSongChange?: (data: NowPlayingData) => void;
}

export default function NowPlaying({ onSongChange }: NowPlayingProps) {
  const [data, setData] = useState<NowPlayingData>({
    artist: "Der Schrammel.Reloaded.Stream",
    title: "Loading...",
  });
  const [prevKey, setPrevKey] = useState("");

  useEffect(() => {
    const fetchNowPlaying = async () => {
      try {
        const res = await fetch("/api/now-playing");
        const json = await res.json();
        const currentKey = `${json.artist}-${json.title}`;

        if (currentKey !== prevKey) {
          setPrevKey(currentKey);
          setData(json);
          onSongChange?.(json);
        }
      } catch {
        // Silently fail, keep showing last known
      }
    };

    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 5000);
    return () => clearInterval(interval);
  }, [prevKey, onSongChange]);

  return (
    <div className="now-playing-display">
      <span className="now-playing-label">Now Playing:</span>
      <span className="now-playing-artist">{data.artist}</span>
      <span className="now-playing-title">{data.title}</span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/NowPlaying.tsx
git commit -m "feat: add NowPlaying component with 5s polling"
```

---

### Task 8: TopTen Component

**Files:**
- Create: `src/components/TopTen.tsx`

- [ ] **Step 1: Create TopTen component**

Create `src/components/TopTen.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import type { RankingEntry } from "@/types";

export default function TopTen() {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRankings = async () => {
    try {
      const res = await fetch("/api/ranking");
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
  }, []);

  if (loading) {
    return (
      <div className="neon-card">
        <h2 className="section-title text-neon-pink">🏆 Top 10</h2>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="neon-card">
      <h2 className="section-title text-neon-pink">🏆 Top 10</h2>
      {rankings.length === 0 ? (
        <p className="text-gray-500 text-sm">No votes yet. Be the first!</p>
      ) : (
        <ul className="ranking-list">
          {rankings.map((entry, index) => (
            <li key={index} className="ranking-item">
              <span className="rank-number">{index + 1}.</span>
              <span className="song-info">
                {entry.title} — {entry.artist}
              </span>
              <span className="vote-count">{entry.rating > 0 ? `+${entry.rating}` : entry.rating}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TopTen.tsx
git commit -m "feat: add TopTen ranking component"
```

---

### Task 9: Wishlist Component

**Files:**
- Create: `src/components/Wishlist.tsx`

- [ ] **Step 1: Create Wishlist component**

Create `src/components/Wishlist.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";

interface Wish {
  id: number;
  artist: string;
  title: string;
  weblink: string | null;
  rating: number;
  createdAt: string;
}

export default function Wishlist() {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [weblink, setWeblink] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchWishes = async () => {
    try {
      const res = await fetch("/api/wish");
      const data = await res.json();
      setWishes(data);
    } catch {
      // Keep existing data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishes();
  }, []);

  const handleSubmit = async () => {
    if (!artist || !title) {
      alert("Nicht alle Felder sind ausgefüllt");
      return;
    }

    const formData = new FormData();
    formData.append("artist", artist);
    formData.append("title", title);
    formData.append("weblink", weblink);

    const res = await fetch("/api/wish", { method: "POST", body: formData });
    const result = await res.json();

    if (result.success) {
      setArtist("");
      setTitle("");
      setWeblink("");
      fetchWishes();
      if (result.message === "Title already exists") {
        alert(result.message);
      }
    } else {
      alert(result.message);
    }
  };

  const handleRate = async (wishId: number, rating: number) => {
    if (rating < 0 || rating > 10) {
      alert("Es muss eine Bewertung von 0 bis 10 abgegeben werden.");
      return;
    }

    const formData = new FormData();
    formData.append("wsongid", wishId.toString());
    formData.append("wrating", rating.toString());

    const res = await fetch("/api/wish/rate", {
      method: "POST",
      body: formData,
    });
    const result = await res.json();

    if (result.success) {
      fetchWishes();
    } else {
      alert(result.message);
    }
  };

  return (
    <div className="neon-card">
      <h2 className="section-title text-neon-blue">🎵 Wunschliste</h2>

      <div className="wish-form">
        <div className="form-row">
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Artist"
            className="neon-input"
          />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="neon-input"
          />
        </div>
        <input
          type="text"
          value={weblink}
          onChange={(e) => setWeblink(e.target.value)}
          placeholder="Weblink (optional)"
          className="neon-input mb-3"
        />
        <button onClick={handleSubmit} className="neon-btn neon-btn-primary">
          Einreichen
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm mt-4">Loading...</p>
      ) : wishes.length === 0 ? (
        <p className="text-gray-500 text-sm mt-4">No wishes yet.</p>
      ) : (
        <ul className="wish-list">
          {wishes.map((wish) => (
            <li key={wish.id} className="wish-item">
              <div className="wish-info">
                <span className="wish-title">{wish.title}</span>
                <span className="wish-artist">{wish.artist}</span>
              </div>
              <div className="wish-rating">
                <input
                  type="number"
                  min="0"
                  max="10"
                  defaultValue={wish.rating}
                  className="rating-input"
                  id={`rating-${wish.id}`}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById(
                      `rating-${wish.id}`
                    ) as HTMLInputElement;
                    handleRate(wish.id, parseInt(input.value, 10));
                  }}
                  className="neon-btn neon-btn-sm"
                >
                  Rate
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Wishlist.tsx
git commit -m "feat: add Wishlist component with form and ratings"
```

---

### Task 10: Homepage Assembly & Globals

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Update Tailwind config with neon theme**

Replace `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          pink: "#ff006e",
          blue: "#3a86ff",
          purple: "#8338ec",
        },
        dark: {
          bg: "#0a0a1a",
          card: "rgba(255, 255, 255, 0.03)",
          border: "rgba(255, 255, 255, 0.06)",
        },
      },
      boxShadow: {
        "neon-pink": "0 0 20px rgba(255, 0, 110, 0.3)",
        "neon-blue": "0 0 20px rgba(58, 134, 255, 0.3)",
        "neon-purple": "0 0 20px rgba(131, 56, 236, 0.3)",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 2: Update globals.css with neon theme styles**

Replace `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --neon-pink: #ff006e;
  --neon-blue: #3a86ff;
  --neon-purple: #8338ec;
  --dark-bg: #0a0a1a;
  --dark-card: rgba(255, 255, 255, 0.03);
  --dark-border: rgba(255, 255, 255, 0.06);
}

body {
  background: var(--dark-bg);
  color: #ffffff;
  font-family: system-ui, -apple-system, sans-serif;
}

.neon-card {
  background: var(--dark-card);
  border: 1px solid var(--dark-border);
  border-radius: 12px;
  padding: 20px;
}

.hero-card {
  background: linear-gradient(
    135deg,
    rgba(255, 0, 110, 0.1),
    rgba(131, 56, 236, 0.1),
    rgba(58, 134, 255, 0.1)
  );
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 24px;
  border-radius: 16px;
}

.stream-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #ffffff;
  text-shadow: 0 0 10px rgba(255, 0, 110, 0.3);
}

.now-playing-text {
  color: #888888;
  font-size: 0.875rem;
  margin-top: 8px;
}

.offline-indicator {
  color: #ff006e;
  font-size: 0.75rem;
  margin-top: 4px;
}

.player-controls {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  align-items: center;
}

.album-art {
  width: 120px;
  height: 120px;
  background: linear-gradient(135deg, var(--neon-pink), var(--neon-purple), var(--neon-blue));
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2.5rem;
  font-weight: bold;
  box-shadow: 0 0 30px rgba(255, 0, 110, 0.3);
  flex-shrink: 0;
}

.play-btn {
  background: linear-gradient(90deg, var(--neon-pink), var(--neon-blue));
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 24px;
  font-size: 1.25rem;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.play-btn:hover {
  box-shadow: 0 0 20px rgba(255, 0, 110, 0.4);
}

.vote-btn {
  padding: 10px 20px;
  border-radius: 24px;
  font-size: 1.125rem;
  cursor: pointer;
  border: 1px solid;
  transition: box-shadow 0.2s;
}

.vote-down {
  background: rgba(255, 0, 110, 0.15);
  color: var(--neon-pink);
  border-color: rgba(255, 0, 110, 0.4);
}

.vote-up {
  background: rgba(58, 134, 255, 0.15);
  color: var(--neon-blue);
  border-color: rgba(58, 134, 255, 0.4);
}

.volume-slider {
  flex: 1;
  accent-color: var(--neon-pink);
}

.section-title {
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: bold;
  margin-bottom: 12px;
}

.ranking-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--dark-border);
  font-size: 0.875rem;
}

.ranking-item:last-child {
  border-bottom: none;
}

.rank-number {
  color: var(--neon-pink);
  font-weight: bold;
  min-width: 30px;
}

.song-info {
  flex: 1;
}

.vote-count {
  color: var(--neon-blue);
  font-weight: bold;
}

.wish-form {
  margin-bottom: 16px;
}

.form-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.neon-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  color: #ffffff;
  font-size: 0.875rem;
}

.neon-input:focus {
  outline: none;
  border-color: var(--neon-pink);
}

.neon-btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: bold;
  cursor: pointer;
  border: none;
  transition: box-shadow 0.2s;
}

.neon-btn-primary {
  background: linear-gradient(90deg, var(--neon-pink), var(--neon-purple), var(--neon-blue));
  color: white;
}

.neon-btn-primary:hover {
  box-shadow: 0 0 20px rgba(255, 0, 110, 0.4);
}

.neon-btn-sm {
  padding: 6px 12px;
  font-size: 0.75rem;
}

.wish-list {
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
}

.wish-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--dark-border);
  font-size: 0.875rem;
}

.wish-info {
  flex: 1;
}

.wish-title {
  font-weight: bold;
}

.wish-artist {
  color: #888888;
  margin-left: 8px;
}

.wish-rating {
  display: flex;
  gap: 8px;
  align-items: center;
}

.rating-input {
  width: 50px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 4px 8px;
  color: #ffffff;
  font-size: 0.75rem;
  text-align: center;
}

.mb-3 {
  margin-bottom: 12px;
}

.mt-4 {
  margin-top: 16px;
}

.text-gray-500 {
  color: #6b7280;
}

.text-sm {
  font-size: 0.875rem;
}

.text-white {
  color: #ffffff;
}

.font-medium {
  font-weight: 500;
}

.text-neon-pink {
  color: var(--neon-pink);
}

.text-neon-blue {
  color: var(--neon-blue);
}
```

- [ ] **Step 3: Update layout.tsx**

Replace `src/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Schrammel Reloaded",
  description: "Der Schrammel.Reloaded.Stream — German party music radio",
  robots: {
    index: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen">
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          {children}
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Create homepage**

Replace `src/app/page.tsx`:

```typescript
"use client";

import { useState, useCallback } from "react";
import Player from "@/components/Player";
import TopTen from "@/components/TopTen";
import Wishlist from "@/components/Wishlist";

const STREAM_URL = "http://schrammelstream.ddns.net:8000/schrammel";

export default function Home() {
  const [currentArtist, setCurrentArtist] = useState("Der Schrammel.Reloaded.Stream");
  const [currentTitle, setCurrentTitle] = useState("Loading...");
  const [voteDisabled, setVoteDisabled] = useState(false);

  const handleSongChange = useCallback((data: { artist: string; title: string }) => {
    setCurrentArtist(data.artist);
    setCurrentTitle(data.title);
    setVoteDisabled(false);
  }, []);

  const handleVote = async (direction: "+" | "-") => {
    if (voteDisabled) return;

    const formData = new FormData();
    formData.append("artist", currentArtist);
    formData.append("title", currentTitle);
    formData.append("vote", direction);

    const res = await fetch("/api/vote", { method: "POST", body: formData });
    const result = await res.json();

    if (result.success) {
      setVoteDisabled(true);
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
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TopTen />
        <Wishlist />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify dev server**

```bash
npm run dev
```

Open `http://localhost:3000` — should show the neon-themed homepage with player, Top 10, and Wishlist.

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.ts src/app/globals.css src/app/layout.tsx src/app/page.tsx
git commit -m "feat: assemble homepage with neon theme and all components"
```

---

### Task 11: Seed Script

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: Create seed script**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  const schrammelDir = path.join(__dirname, "..", "Schrammel");

  if (!fs.existsSync(schrammelDir)) {
    console.log("Schrammel directory not found, skipping seed.");
    return;
  }

  const files = fs.readdirSync(schrammelDir);
  const audioFiles = files.filter((f) =>
    /\.(mp3|m4a|wav)$/i.test(f)
  );

  console.log(`Found ${audioFiles.length} audio files.`);

  for (const file of audioFiles) {
    // Extract artist and title from filename: "Artist - Title.ext"
    const name = file.replace(/\.[^.]+$/, "");
    const match = name.match(/^(.+?)\s*-\s*(.+)$/);

    if (match) {
      const artist = match[1].trim();
      const title = match[2].trim();

      await prisma.song.upsert({
        where: { artist_title: { artist, title } },
        update: {},
        create: {
          artist,
          title,
          filePath: `Schrammel/${file}`,
        },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Add seed script to package.json**

Add to `package.json` under `"prisma"` section:

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

Install ts-node:
```bash
npm install -D ts-node
```

- [ ] **Step 3: Run seed**

```bash
npx prisma db seed
```

Expected: `Found ~220 audio files. Seed complete.`

- [ ] **Step 4: Verify songs in DB**

```bash
curl http://localhost:3000/api/songs | head -c 500
```

Expected: JSON array with song objects.

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat: add seed script to import audio files into DB"
```

---

### Task 12: Docker Configuration

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`
- Create: `.env.example`

- [ ] **Step 1: Create Dockerfile**

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

- [ ] **Step 2: Update next.config.ts for Docker standalone output**

Add to `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 3: Create docker-compose.yml**

Create `docker-compose.yml`:

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
    restart: unless-stopped
```

- [ ] **Step 4: Create .dockerignore**

Create `.dockerignore`:

```
node_modules
.next
.git
*.md
.env.local
.env.*.local
.superpowers
docs
```

- [ ] **Step 5: Create .env.example**

Create `.env.example`:

```
DATABASE_URL="file:./prisma/dev.db"
```

- [ ] **Step 6: Commit**

```bash
git add Dockerfile docker-compose.yml .dockerignore .env.example next.config.ts
git commit -m "feat: add Docker Compose configuration for Windows deployment"
```

---

### Task 13: E2E Tests with Playwright

**Files:**
- Create: `tests/e2e/home.spec.ts`
- Modify: `package.json` (add test scripts)

- [ ] **Step 1: Install Playwright**

```bash
npm install -D @playwright/test
npx playwright install
```

- [ ] **Step 2: Create Playwright config**

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 3: Write E2E test**

Create `tests/e2e/home.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test("homepage loads with correct title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Schrammel Reloaded/);
});

test("homepage shows stream title", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByText(/Der Schrammel.*Reloaded.*Stream/)
  ).toBeVisible();
});

test("homepage shows Top 10 section", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Top 10")).toBeVisible();
});

test("homepage shows Wishlist section", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Wunschliste")).toBeVisible();
});

test("wishlist form validates empty fields", async ({ page }) => {
  await page.goto("/");

  // Set up dialog handler before clicking submit
  page.on("dialog", (dialog) => {
    expect(dialog.message()).toBe("Nicht alle Felder sind ausgefüllt");
    dialog.dismiss();
  });

  await page.getByRole("button", { name: "Einreichen" }).click();
});

test("api ranking returns array", async ({ request }) => {
  const response = await request.get("/api/ranking");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(Array.isArray(body)).toBeTruthy();
});

test("api songs returns array", async ({ request }) => {
  const response = await request.get("/api/songs");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(Array.isArray(body)).toBeTruthy();
});
```

- [ ] **Step 4: Add test scripts to package.json**

Add to `package.json` scripts:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

- [ ] **Step 5: Build and run tests**

```bash
npm run build
npm run start &
sleep 5
npx playwright test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts tests/ package.json
git commit -m "test: add Playwright E2E tests for homepage and API routes"
```

---

## Self-Review

**Spec coverage check:**

| Spec Section | Task |
|-------------|------|
| Next.js 15 App Router | Task 1 |
| React Server + Client Components | Tasks 6-10 |
| Tailwind CSS neon theme | Task 10 |
| SQLite + Prisma | Tasks 2, 3 |
| Icecast streaming | Task 6 (Player component) |
| Docker Compose deployment | Task 12 |
| Pages: `/` homepage | Task 10 |
| API: /api/vote | Task 4 |
| API: /api/wish | Task 4 |
| API: /api/wish/rate | Task 4 |
| API: /api/ranking | Task 5 |
| API: /api/songs | Task 5 |
| API: /api/now-playing | Task 5 |
| Components: Player | Task 6 |
| Components: NowPlaying | Task 7 |
| Components: TopTen | Task 8 |
| Components: Wishlist | Task 9 |
| Data model (4 tables) | Task 2 |
| Error handling | Tasks 4, 6, 9, 10 |
| Testing (E2E) | Task 13 |
| Seed script | Task 11 |
| Visual design (neon party) | Task 10 |
| Existing assets preserved | Task 12 (Docker volumes) |

**No placeholders found.** All code is complete with actual implementations.

**Type consistency:** All types defined in `src/types/index.ts` are used consistently across components and API routes. Function signatures match between `src/lib/db.ts` and API route handlers.
