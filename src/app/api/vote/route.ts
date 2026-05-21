import { NextRequest, NextResponse } from "next/server";
import { voteOnSong } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.formData();
  const title = body.get("title") as string;
  const artist = body.get("artist") as string;
  const vote = body.get("vote") as string;

  if (!artist || !title || !vote) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const value = vote === "+" ? 1 : -1;
  const voterIp = request.ip || request.headers.get("x-forwarded-for") || "127.0.0.1";

  const result = await voteOnSong(artist, title, value, voterIp);

  return NextResponse.json({ message: result.message, success: result.success });
}
