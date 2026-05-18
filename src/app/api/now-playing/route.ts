import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as fs from "fs";
import * as path from "path";

export async function GET() {
  const xmlPath = path.join(process.cwd(), "Website", "playingnow.xml");

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
