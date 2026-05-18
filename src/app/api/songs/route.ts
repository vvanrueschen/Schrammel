import { NextResponse } from "next/server";
import { getAllSongs } from "@/lib/db";

export async function GET() {
  const songs = await getAllSongs();
  return NextResponse.json(songs);
}
