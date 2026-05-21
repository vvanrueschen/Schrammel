import { prisma } from "./prisma";
import type { RankingEntry } from "@/types";

export async function getTopRankings(limit = 10): Promise<RankingEntry[]> {
  const songs = await prisma.song.findMany({
    where: {
      votes: {
        some: {},
      },
      rating: {
        gt: 0,
      },
    },
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
  let song = await prisma.song.findFirst({
    where: { artist, title },
  });

  if (!song) {
    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    song = await prisma.song.create({
      data: { azuracastId: localId, artist, title, rating: 0 },
    });
  }

  const existingVote = await prisma.vote.findFirst({
    where: { songId: song.azuracastId, voterIp },
  });

  if (existingVote) {
    return { success: false, message: "Du hast diesen Titel bereits bewertet." };
  }

  await prisma.$transaction([
    prisma.vote.create({
      data: { songId: song.azuracastId, voterIp, value },
    }),
    prisma.song.update({
      where: { azuracastId: song.azuracastId },
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

export async function voteOnWish(
  wishId: number,
  value: number,
  voterIp: string
): Promise<{ success: boolean; message: string }> {
  const wish = await prisma.wish.findUnique({
    where: { id: wishId },
  });

  if (!wish) {
    return { success: false, message: "Wish not found" };
  }

  const existingVote = await prisma.wishVote.findFirst({
    where: { wishId, voterIp },
  });

  if (existingVote) {
    return { success: false, message: "Du hast diesen Wunsch bereits bewertet." };
  }

  await prisma.$transaction([
    prisma.wishVote.create({
      data: { wishId, voterIp, value },
    }),
    prisma.wish.update({
      where: { id: wishId },
      data: value === 1 ? { upvotes: { increment: 1 } } : { downvotes: { increment: 1 } },
    }),
  ]);

  return { success: true, message: "Record updated successfully" };
}

export async function getWishes() {
  const wishes = await prisma.wish.findMany();
  return wishes.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
}

export async function getAllSongs() {
  return prisma.song.findMany({
    orderBy: [{ artist: "asc" }, { title: "asc" }],
  });
}

export async function getBottomRankings(limit = 10): Promise<RankingEntry[]> {
  const songs = await prisma.song.findMany({
    where: {
      votes: {
        some: {},
      },
      rating: {
        lt: 0,
      },
    },
    orderBy: { rating: "asc" },
    take: limit,
    select: { artist: true, title: true, rating: true },
  });
  return songs;
}

const DELETION_MIN_VOTES = 3;
const DELETION_MAX_RATING = -5;
const DELETION_MAX_COUNT = 10;

export async function cleanupWorstSongs(count = 3): Promise<{
  deleted: { artist: string; title: string; azuracastDeleted: boolean }[];
  count: number;
}> {
  const AZURACAST_API_URL = process.env.AZURACAST_API_URL || "http://vinceberrypi";
  const AZURACAST_API_TOKEN = process.env.AZURACAST_API_TOKEN || "";
  const STATION_ID = 1;
  const safeCount = Math.max(1, Math.min(count, DELETION_MAX_COUNT));

  const eligibleSongs = await prisma.song.findMany({
    where: {
      rating: { lte: DELETION_MAX_RATING },
      votes: {
        some: {},
      },
    },
    orderBy: { rating: "asc" },
    take: DELETION_MAX_COUNT,
    include: {
      _count: {
        select: { votes: true },
      },
    },
  });

  const filteredSongs = eligibleSongs
    .filter((s) => s._count.votes >= DELETION_MIN_VOTES)
    .slice(0, safeCount);

  const deleted: { artist: string; title: string; azuracastDeleted: boolean }[] = [];

  for (const song of filteredSongs) {
    let azuracastDeleted = false;

    if (song.azuracastId) {
      try {
        const response = await fetch(
          `${AZURACAST_API_URL}/api/station/${STATION_ID}/file/${song.azuracastId}`,
          {
            method: "DELETE",
            headers: {
              "X-API-Key": AZURACAST_API_TOKEN,
            },
          }
        );
        azuracastDeleted = response.ok;
      } catch {
        console.error(
          `Failed to delete song "${song.artist} - ${song.title}" from AzuraCast`
        );
      }
    }

    await prisma.$transaction([
      prisma.vote.deleteMany({ where: { songId: song.azuracastId } }),
      prisma.song.delete({ where: { azuracastId: song.azuracastId } }),
    ]);

    deleted.push({
      artist: song.artist,
      title: song.title,
      azuracastDeleted,
    });
  }

  return { deleted, count: deleted.length };
}
