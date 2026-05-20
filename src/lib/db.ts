import { prisma } from "./prisma";
import type { RankingEntry } from "@/types";

export async function getTopRankings(limit = 10): Promise<RankingEntry[]> {
  const songs = await prisma.song.findMany({
    orderBy: { rating: "desc" },
    take: limit,
    select: { artist: true, title: true, rating: true },
  });
  return songs;
}

export async function voteOnSong(
  artist: string,
  title: string,
  value: number,
  voterIp: string
): Promise<{ success: boolean; message: string }> {
  let song = await prisma.song.findUnique({
    where: { artist_title: { artist, title } },
  });

  if (!song) {
    song = await prisma.song.create({
      data: { artist, title, rating: 0 },
    });
  }

  const existingVote = await prisma.vote.findFirst({
    where: { songId: song.id, voterIp },
  });

  if (existingVote) {
    return { success: false, message: "Du hast diesen Titel bereits bewertet." };
  }

  await prisma.$transaction([
    prisma.vote.create({
      data: { songId: song.id, voterIp, value },
    }),
    prisma.song.update({
      where: { id: song.id },
      data: { rating: { increment: value } },
    }),
  ]);

  return { success: true, message: "Record updated successfully" };
}

export async function createWish(
  artist: string,
  title: string,
  weblink?: string
): Promise<{ success: boolean; message: string }> {
  const existing = await prisma.wish.findFirst({
    where: { artist, title },
  });

  if (existing) {
    return { success: false, message: "Title already exists" };
  }

  await prisma.wish.create({ data: { artist, title, weblink } });
  return { success: true, message: "Record updated successfully" };
}

export async function rateWish(
  wishId: number,
  rating: number
): Promise<{ success: boolean; message: string }> {
  if (rating < 0 || rating > 10) {
    return {
      success: false,
      message: "Es muss eine Bewertung von 0 bis 10 abgegeben werden.",
    };
  }

  await prisma.wish.update({
    where: { id: wishId },
    data: { rating },
  });

  return { success: true, message: "Record updated successfully" };
}

export async function getWishes() {
  return prisma.wish.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllSongs() {
  return prisma.song.findMany({
    orderBy: [{ artist: "asc" }, { title: "asc" }],
  });
}

export async function getBottomRankings(limit = 10): Promise<RankingEntry[]> {
  const songs = await prisma.song.findMany({
    orderBy: { rating: "asc" },
    take: limit,
    select: { artist: true, title: true, rating: true },
  });
  return songs;
}
