# Schrammel Reloaded — Redesign Spec

**Date:** 2026-05-18
**Status:** Draft

## Overview

Rebuild the Schrammel Reloaded radio stream website from plain PHP + jQuery into a modern Next.js 15 application with SSR, SQLite + Prisma, and a neon party-themed UI. Deploy via Docker Compose on Windows.

## Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | React Server Components + Client Components (interactive only) |
| Styling | Tailwind CSS + custom neon theme |
| Database | SQLite + Prisma ORM |
| Streaming | Icecast (existing: `schrammelstream.ddns.net:8000/schrammel`) |
| Deployment | Docker Compose (Windows) |

### System Diagram

```
┌─────────────────────────────────────────────────┐
│                   Next.js App                    │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Pages    │  │ API      │  │  Components   │  │
│  │  (SSR)    │  │ Routes   │  │  (RSC + CC)   │  │
│  └────┬─────┘  └────┬─────┘  └───────┬───────┘  │
│       │              │                │           │
│       └──────────────┼────────────────┘           │
│                      │                            │
│              ┌───────▼───────┐                    │
│              │   Prisma      │                    │
│              │   (SQLite)    │                    │
│              └───────────────┘                    │
└──────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
  ┌──────────────┐            ┌──────────────────┐
  │ Icecast      │            │ playingnow.xml   │
  │ Stream       │            │ (polled client)  │
  └──────────────┘            └──────────────────┘
```

## Pages & Routes

### `/` — Homepage

- **Server-rendered** initial page with Top 10 and Wishlist
- **Client components** for: Player, voting, now-playing polling, wish form
- Layout: Hero player card → Two-column grid (Top 10 | Wishlist)

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/vote` | POST | Vote up/down on current song |
| `/api/wish` | POST | Submit song request |
| `/api/wish/rate` | POST | Rate a wish (0-10) |
| `/api/ranking` | GET | Get Top 10 ranking |
| `/api/songs` | GET | Get full song list |
| `/api/wishes` | GET | Get wishlist |
| `/api/now-playing` | GET | Get current track (from XML or DB) |

## Data Model

```prisma
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
  value     Int      // +1 or -1
  createdAt DateTime @default(now())
}

model NowPlaying {
  id        Int      @id @default(autoincrement())
  artist    String
  title     String
  updatedAt DateTime @updatedAt
}
```

## Components

### Player (Client Component)

- Audio element streaming from Icecast URL
- Play/pause toggle, volume slider
- Vote up/down buttons (disabled after voting)
- Reacts to now-playing changes (resets vote buttons)

### NowPlaying Display (Client Component)

- Polls `/api/now-playing` every 5 seconds
- Shows artist, title, album art placeholder
- Triggers vote button reset on song change

### TopTen (Server Component, revalidated)

- Fetches top 10 songs by rating
- Displays rank, artist, title, vote count
- Revalidates on vote submission

### Wishlist (Server + Client)

- Server: renders existing wishes
- Client: form for new wishes (artist, title, weblink)
- Client: rating widget (0-10) per wish
- Validates required fields before submission

## Visual Design

### Theme: Neon Party

- **Background:** `#0a0a1a` (deep dark blue-black)
- **Primary accent:** `#ff006e` (neon pink)
- **Secondary accent:** `#3a86ff` (neon blue)
- **Tertiary accent:** `#8338ec` (neon purple)
- **Text:** `#ffffff` primary, `#888888` secondary
- **Borders:** `rgba(255, 255, 255, 0.06)` subtle
- **Cards:** `rgba(255, 255, 255, 0.03)` with subtle borders
- **Gradients:** `linear-gradient(135deg, #ff006e, #8338ec, #3a86ff)` for CTAs
- **Shadows:** Glow effects using `box-shadow` with accent colors

### Typography

- Sans-serif system font stack (Inter or similar via Google Fonts)
- Bold headings, regular body text
- Uppercase section labels with letter-spacing

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Stream unavailable | Offline indicator, auto-retry every 30s |
| Duplicate vote | "Du hast diesen Titel bereits bewertet." alert |
| Duplicate wish | "Title already exists" alert |
| Missing form fields | "Nicht alle Felder sind ausgefüllt" alert |
| Invalid rating | "Es muss eine Bewertung von 0 bis 10 abgegeben werden." |
| DB unavailable | Graceful error page, retry option |

## Testing

- **Unit:** API route handlers, vote/wish validation logic
- **Integration:** Prisma queries, DB migrations
- **E2E:** Playwright — play stream, vote, submit wish, verify ranking

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |
| `npm run db:seed` | Seed DB with existing songs |
| `docker compose up` | Full production deployment |

## Migration Plan

1. Create Next.js project with TypeScript, Tailwind, Prisma
2. Define Prisma schema and run initial migration
3. Build components: Player, NowPlaying, TopTen, Wishlist
4. Implement API routes: vote, wish, ranking, songs
5. Style with neon party theme
6. Add Docker Compose configuration
7. Test locally, then deploy via Docker on Windows

## Existing Assets to Preserve

- `Schrammel/` — Audio file collection (referenced, not moved)
- `Verpackung/` — Sound clips (referenced, not moved)
- `playingnow.xml` — Now-playing data source
- `radiodj2/NowPlaying.txt` — Backup now-playing source
- Stream URL: `http://schrammelstream.ddns.net:8000/schrammel`
