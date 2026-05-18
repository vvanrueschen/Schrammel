import { NextResponse } from "next/server";
import { getTopRankings } from "@/lib/db";

export async function GET() {
  const rankings = await getTopRankings(10);
  return NextResponse.json(rankings);
}
