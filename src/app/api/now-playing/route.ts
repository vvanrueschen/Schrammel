import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const AZURACAST_API_URL = process.env.AZURACAST_API_URL || "http://vinceberrypi";
const AZURACAST_API_TOKEN = process.env.AZURACAST_API_TOKEN || "";
const STATION_ID = 1;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("deviceId") || "";

  try {
    const response = await fetch(
      `${AZURACAST_API_URL}/api/station/${STATION_ID}/nowplaying`,
      {
        headers: {
          "X-API-Key": AZURACAST_API_TOKEN,
        },
      }
    );

    if (!response.ok) {
      console.error(`[now-playing] Azuracast returned ${response.status}`);
    } else {
      const data = await response.json();
      const nowPlaying = data.now_playing?.song;

      if (!nowPlaying) {
        console.warn("[now-playing] Azuracast response missing now_playing.song:", JSON.stringify(data).slice(0, 200));
      }

      if (nowPlaying) {
        const artist = nowPlaying.artist || "Unknown Artist";
        let title = nowPlaying.title || nowPlaying.text || "Unknown Title";

        // Azuracast often includes "Artist - " prefix in both title and text fields
        const prefix = `${artist} - `;
        if (title.startsWith(prefix)) {
          title = title.slice(prefix.length);
        }

        const azuracastId = nowPlaying.id;

        // Backfill azuracastId for matching song in our DB
        await backfillAzuracastId(artist, title, azuracastId);

        const hasVoted = await checkHasVoted(artist, title, deviceId);
        return NextResponse.json({ artist, title, hasVoted });
      }
    }
  } catch {
    // Fall through to DB
  }

  const nowPlaying = await prisma.nowPlaying.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (nowPlaying) {
    const hasVoted = await checkHasVoted(nowPlaying.artist, nowPlaying.title, deviceId);
    return NextResponse.json({
      artist: nowPlaying.artist,
      title: nowPlaying.title,
      hasVoted,
    });
  }

  return NextResponse.json({
    artist: "Der Schrammel.Reloaded.Stream",
    title: "No track info available",
    hasVoted: false,
  });
}

async function backfillAzuracastId(artist: string, title: string, azuracastId: string | undefined): Promise<void> {
  if (!azuracastId) return;
  try {
    const existingSong = await prisma.song.findFirst({
      where: { artist, title },
    });

    if (!existingSong) return;

    if (existingSong.azuracastId === azuracastId) return;

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
        data: { azuracastId },
      });
    }
  } catch {
    // Ignore errors — backfill is best-effort
  }
}

async function checkHasVoted(artist: string, title: string, deviceId: string): Promise<boolean> {
  const song = await prisma.song.findFirst({
    where: { artist, title },
  });

  if (!song) return false;

  const vote = await prisma.vote.findFirst({
    where: { songId: song.azuracastId, deviceId },
  });

  return !!vote;
}
