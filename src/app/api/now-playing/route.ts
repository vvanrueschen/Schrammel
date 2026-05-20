import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const AZURACAST_API_URL = process.env.AZURACAST_API_URL || "http://vinceberrypi";
const AZURACAST_API_TOKEN = process.env.AZURACAST_API_TOKEN || "";
const STATION_ID = 1;

export async function GET() {
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
        return NextResponse.json({
          artist: nowPlaying.artist || "Unknown Artist",
          title: nowPlaying.text || nowPlaying.title || "Unknown Title",
        });
      }
    }
  } catch {
    // Fall through to DB
  }

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
