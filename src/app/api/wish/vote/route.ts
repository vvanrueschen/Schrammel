import { NextRequest, NextResponse } from "next/server";
import { voteOnWish } from "@/lib/db";
import { broadcastUpdate } from "@/lib/events";
import { getVoterFingerprint } from "@/lib/fingerprint";

export async function POST(request: NextRequest) {
  const body = await request.formData();
  const wishIdStr = body.get("wishId") as string;
  const vote = body.get("vote") as string;
  const deviceId = (body.get("deviceId") as string)?.trim();

  if (!wishIdStr || !vote || !deviceId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const wishId = parseInt(wishIdStr, 10);
  if (isNaN(wishId) || wishId <= 0) {
    return NextResponse.json({ error: "Invalid wishId" }, { status: 400 });
  }

  if (vote !== "+" && vote !== "-") {
    return NextResponse.json({ error: "Invalid vote value" }, { status: 400 });
  }

  const voterId = getVoterFingerprint(request, deviceId);

  const value = vote === "+" ? 1 : -1;

  const result = await voteOnWish(wishId, value, voterId);

  if (result.success) {
    broadcastUpdate();
  }

  return NextResponse.json({ message: result.message, success: result.success });
}
