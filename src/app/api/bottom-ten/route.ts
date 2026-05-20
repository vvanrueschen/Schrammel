import { NextResponse } from "next/server";
import { getBottomRankings } from "@/lib/db";

export async function GET() {
  const rankings = await getBottomRankings(10);
  return NextResponse.json(rankings);
}
