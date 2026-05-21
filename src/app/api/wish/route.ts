import { NextRequest, NextResponse } from "next/server";
import { createWish, getWishes } from "@/lib/db";
import { broadcastUpdate } from "@/lib/events";

export async function GET() {
  const wishes = await getWishes();
  return NextResponse.json(wishes);
}

export async function POST(request: NextRequest) {
  const body = await request.formData();
  const artist = body.get("artist") as string;
  const title = body.get("title") as string;
  const weblink = body.get("weblink") as string | null;

  if (!artist || !title) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const result = await createWish(artist, title, weblink || undefined);

  if (result.success) {
    broadcastUpdate();
  }

  return NextResponse.json({ message: result.message, success: result.success });
}
