import { NextRequest, NextResponse } from "next/server";
import { rateWish } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.formData();
  const wsongid = body.get("wsongid") as string;
  const wrating = body.get("wrating") as string;

  if (!wsongid || !wrating) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const rating = parseInt(wrating, 10);
  const wishId = parseInt(wsongid, 10);

  const result = await rateWish(wishId, rating);
  return NextResponse.json({ message: result.message, success: result.success });
}
