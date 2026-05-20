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

  const nowPlaying = await prisma.nowPlaying.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (nowPlaying) {
    const hasVoted = await checkHasVoted(nowPlaying.artist, nowPlaying.title, voterIp);
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

async function backfillAzuracastId(artist: string, title: string, azuracastId: string): Promise<void> {
  if (!azuracastId) return;
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
