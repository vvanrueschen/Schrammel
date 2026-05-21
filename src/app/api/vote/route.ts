import { NextRequest, NextResponse } from "next/server";
import { voteOnSong } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.formData();
  const title = body.get("title") as string;
  const artist = body.get("artist") as string;
  const vote = body.get("vote") as string;
  const deviceId = body.get("deviceId") as string;

  if (!artist || !title || !vote || !deviceId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const value = vote === "+" ? 1 : -1;

  const result = await voteOnSong(artist, title, value, deviceId);

  return NextResponse.json({ message: result.message, success: result.success });
}
