import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  const schrammelDir = path.join(__dirname, "..", "Schrammel");

  if (!fs.existsSync(schrammelDir)) {
    console.log("Schrammel directory not found, skipping seed.");
    return;
  }

  const files = fs.readdirSync(schrammelDir);
  const audioFiles = files.filter((f) =>
    /\.(mp3|m4a|wav)$/i.test(f)
  );

  console.log(`Found ${audioFiles.length} audio files.`);

  for (const file of audioFiles) {
    const name = file.replace(/\.[^.]+$/, "");
    const match = name.match(/^(.+?)\s*-\s*(.+)$/);

    if (match) {
      const artist = match[1].trim();
      const title = match[2].trim();

      await prisma.song.upsert({
        where: { artist_title: { artist, title } },
        update: {},
        create: {
          artist,
          title,
          filePath: `Schrammel/${file}`,
        },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
