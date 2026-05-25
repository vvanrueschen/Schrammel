import { NextRequest, NextResponse } from "next/server";
import { voteOnSong } from "@/lib/db";
import { broadcastUpdate } from "@/lib/events";
import { getVoterFingerprint } from "@/lib/fingerprint";

const MAX_STRING_LENGTH = 255;

export async function POST(request: NextRequest) {
  const body = await request.formData();
  const azuracastId = (body.get("azuracastId") as string)?.trim();
  const title = (body.get("title") as string)?.trim();
  const artist = (body.get("artist") as string)?.trim();
  const vote = body.get("vote") as string;
  const deviceId = (body.get("deviceId") as string)?.trim();

  if (!azuracastId || !artist || !title || !vote || !deviceId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (artist.length > MAX_STRING_LENGTH || title.length > MAX_STRING_LENGTH) {
    return NextResponse.json({ error: "Input too long" }, { status: 400 });
  }

  if (vote !== "+" && vote !== "-") {
    return NextResponse.json({ error: "Invalid vote value" }, { status: 400 });
  }

  const voterId = getVoterFingerprint(request, deviceId);

  const value = vote === "+" ? 1 : -1;

  const result = await voteOnSong(azuracastId, artist, title, value, voterId);

  if (result.success) {
    broadcastUpdate();
  }

  return NextResponse.json({ message: result.message, success: result.success });
}