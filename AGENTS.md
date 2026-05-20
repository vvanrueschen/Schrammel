<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-overview -->
# Schrammel Reloaded

Next.js 16 radio stream website with voting, wishlist, and Azuracast integration.

## Tech Stack

- **Framework:** Next.js 16.2.6 (App Router) + React 19
- **Database:** SQLite via Prisma 6
- **Styling:** Tailwind CSS 4 (neon theme)
- **Testing:** Playwright (E2E)
- **Deployment:** Docker Compose

## Scripts

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — ESLint
- `npm run db:seed` — Seed database
- `npm run db:studio` — Open Prisma Studio
- `npm run db:migrate` — Run migrations
- `npm run test:e2e` — Run Playwright E2E tests

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/now-playing` | GET | Current song from Azuracast API + DB fallback, returns `{ artist, title, hasVoted }` |
| `/api/vote` | POST | Vote +/- on a song (creates song if not exists), returns `{ success, message }` |
| `/api/ranking` | GET | Top 10 songs by rating |
| `/api/songs` | GET | All songs sorted by artist/title |
| `/api/wish` | GET | All wishes |
| `/api/wish` | POST | Create a new wish |
| `/api/wish/rate` | POST | Rate a wish (0-10) |

## Database Schema (Prisma/SQLite)

- **Song** — `id, artist, title, filePath, rating, plays` (unique: `[artist, title]`)
- **Vote** — `id, songId, voterIp, value, createdAt` (one vote per IP per song)
- **Wish** — `id, songId?, artist, title, weblink, rating, createdAt`
- **NowPlaying** — `id, artist, title, updatedAt` (legacy fallback)

## Key Behaviors

- **Now Playing:** Fetched from Azuracast API (`/api/station/1/nowplaying`) with DB fallback. Polls every 10s.
- **Voting:** If song doesn't exist in DB, it's created automatically. One vote per IP per song.
- **Vote state:** `/api/now-playing` returns `hasVoted` based on the caller's IP. Vote buttons are disabled + visually grayed out when `hasVoted` is true.
- **Top 10:** Refreshes automatically after a successful vote via `refreshKey` prop.
<!-- END:project-overview -->

<!-- BEGIN:azuracast -->
# Azuracast Development Instance

- **Stream URL:** `http://vinceberrypi/listen/schrammel_stream/schrammel`
- **API Docs:** `http://vinceberrypi/docs/api/`
- **API Token:** `39fa34357bc4ab5c:69bc5de693c9fc2a9aa01b8e29a10331`
- **Station ID:** `1`

## Environment Variables

- `AZURACAST_API_URL` — Base URL of the Azuracast instance
- `AZURACAST_API_TOKEN` — API key for authenticated requests
<!-- END:azuracast -->
