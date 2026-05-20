import { prisma } from "../src/lib/prisma";
import { cleanupWorstSongs } from "../src/lib/db";

async function main() {
  const targetId = 1;

  const song = await prisma.song.findUnique({
    where: { id: targetId },
  });

  if (!song) {
    console.log("Song not found");
    return;
  }

  console.log("Target song:", song.artist, "-", song.title);

  // Clear existing votes
  await prisma.vote.deleteMany({ where: { songId: targetId } });

  // Create 5 downvotes
  for (let i = 0; i < 5; i++) {
    await prisma.vote.create({
      data: {
        songId: targetId,
        voterIp: `192.168.1.${100 + i}`,
        value: -1,
      },
    });
  }

  // Update rating to -5
  await prisma.song.update({
    where: { id: targetId },
    data: { rating: -5 },
  });

  const updated = await prisma.song.findUnique({
    where: { id: targetId },
    include: { _count: { select: { votes: true } } },
  });
  console.log("After downvotes:", JSON.stringify(updated, null, 2));

  // Run cleanup
  console.log("\n--- Running cleanup ---");
  const result = await cleanupWorstSongs(3);
  console.log("Cleanup result:", JSON.stringify(result, null, 2));

  // Verify deletion
  const deleted = await prisma.song.findUnique({ where: { id: targetId } });
  console.log("\nSong still exists?", deleted !== null);

  await prisma.$disconnect();
}

main().catch(console.error);
