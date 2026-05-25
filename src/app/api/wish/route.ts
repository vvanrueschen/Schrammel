import { NextRequest, NextResponse } from "next/server";
import { createWish, getWishes } from "@/lib/db";
import { broadcastUpdate } from "@/lib/events";
import { getVoterFingerprint } from "@/lib/fingerprint";

const MAX_STRING_LENGTH = 255;
const MAX_WEBLINK_LENGTH = 2048;

export async function GET(request: NextRequest) {
  const rawDeviceId = request.nextUrl.searchParams.get("deviceId") || "";
  const voterId = getVoterFingerprint(request, rawDeviceId);
  const wishes = await getWishes(voterId);
  return NextResponse.json(wishes);
}

export async function POST(request: NextRequest) {
  const body = await request.formData();
  const artist = (body.get("artist") as string)?.trim();
  const title = (body.get("title") as string)?.trim();
  const weblink = (body.get("weblink") as string)?.trim() || undefined;

  if (!artist || !title) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (artist.length > MAX_STRING_LENGTH || title.length > MAX_STRING_LENGTH) {
    return NextResponse.json({ error: "Input too long" }, { status: 400 });
  }

  if (weblink && weblink.length > MAX_WEBLINK_LENGTH) {
    return NextResponse.json({ error: "Weblink too long" }, { status: 400 });
  }

  if (weblink && !/^https?:\/\/.+/i.test(weblink)) {
    return NextResponse.json({ error: "Invalid weblink URL" }, { status: 400 });
  }

  const result = await createWish(artist, title, weblink || undefined);

  if (result.success) {
    broadcastUpdate();
  }

  return NextResponse.json({ message: result.message, success: result.success });
}
