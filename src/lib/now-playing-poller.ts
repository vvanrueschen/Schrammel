import { broadcastUpdate } from "./events";
import { prisma } from "./prisma";

const AZURACAST_API_URL = process.env.AZURACAST_API_URL || "http://vinceberrypi";
const AZURACAST_API_TOKEN = process.env.AZURACAST_API_TOKEN || "";
const STATION_ID = 1;
const POLL_INTERVAL_MS = 5000;

interface CachedNowPlaying {
  artist: string;
  title: string;
  azuracastId: string | null;
}

let cache: CachedNowPlaying | null = null;
let pollerStarted = false;

export function getNowPlayingCache(): CachedNowPlaying | null {
  ensurePollerStarted();
  return cache;
}

function ensurePollerStarted(): void {
  if (pollerStarted) return;
  pollerStarted = true;

  console.log("[now-playing-poller] Starting background poller");

  const poll = async () => {
    try {
      const response = await fetch(
        `${AZURACAST_API_URL}/api/station/${STATION_ID}/nowplaying`,
        {
          headers: { "X-API-Key": AZURACAST_API_TOKEN },
        }
      );

      if (!response.ok) return;

      const data = await response.json();
      const song = data.now_playing?.song;
      if (!song) return;

      const artist = song.artist || "Unknown Artist";
      let title = song.title || song.text || "Unknown Title";

      const prefix = `${artist} - `;
      if (title.startsWith(prefix)) {
        title = title.slice(prefix.length);
      }

      const azuracastId = song.id;

      const changed =
        !cache ||
        cache.artist !== artist ||
        cache.title !== title ||
        cache.azuracastId !== azuracastId;

      if (changed) {
        cache = { artist, title, azuracastId };
        await backfillAzuracastId(artist, title, azuracastId);
        broadcastUpdate(JSON.stringify({ artist, title, azuracastId }));
        console.log(`[now-playing-poller] Now playing: ${artist} — ${title}`);
      }
    } catch {
      // Silently fail, keep cached data
    }
  };

  poll();
  setInterval(poll, POLL_INTERVAL_MS);
}

async function backfillAzuracastId(
  artist: string,
  title: string,
  azuracastId: string | undefined
): Promise<void> {
  if (!azuracastId) return;
  try {
    const existingSong = await prisma.song.findFirst({
      where: { artist, title },
    });

    if (!existingSong) return;
    if (existingSong.azuracastId === azuracastId) {
      if (existingSong.artist !== artist || existingSong.title !== title) {
        await prisma.song.update({
          where: { azuracastId },
          data: { artist, title },
        });
      }
      return;
    }

    if (existingSong.azuracastId && existingSong.azuracastId.startsWith("local-")) {
      await prisma.$transaction([
        prisma.vote.updateMany({
          where: { songId: existingSong.azuracastId },
          data: { songId: azuracastId },
        }),
        prisma.wish.updateMany({
          where: { songId: existingSong.azuracastId },
          data: { songId: azuracastId },
        }),
        prisma.song.delete({ where: { azuracastId: existingSong.azuracastId } }),
      ]);
    } else {
      await prisma.song.update({
        where: { azuracastId: existingSong.azuracastId },
        data: { azuracastId, artist, title },
      });
    }
  } catch {
    // Best-effort
  }
}
