import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVoterFingerprint } from "@/lib/fingerprint";
import { getNowPlayingCache } from "@/lib/now-playing-poller";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rawDeviceId = request.nextUrl.searchParams.get("deviceId") || "";
  const voterId = getVoterFingerprint(request, rawDeviceId);

  const cached = getNowPlayingCache();

  if (cached) {
    const hasVoted = await checkHasVoted(cached.azuracastId, voterId);
    return NextResponse.json({
      artist: cached.artist,
      title: cached.title,
      azuracastId: cached.azuracastId,
      hasVoted,
    });
  }

  return NextResponse.json({
    artist: "Der Schrammel.Reloaded.Stream",
    title: "No track info available",
    azuracastId: null,
    hasVoted: false,
  });
}

async function checkHasVoted(azuracastId: string | null, voterId: string): Promise<boolean> {
  if (!azuracastId) return false;

  const vote = await prisma.vote.findFirst({
    where: { songId: azuracastId, deviceId: voterId },
  });

  return !!vote;
}
