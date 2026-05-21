-- Redefine tables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Song" (
    "azuracastId" TEXT NOT NULL PRIMARY KEY,
    "artist" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "filePath" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "plays" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_Song" ("artist", "azuracastId", "filePath", "plays", "rating", "title") SELECT "artist", "azuracastId", "filePath", "plays", "rating", "title" FROM "Song";
DROP TABLE "Song";
ALTER TABLE "new_Song" RENAME TO "Song";
CREATE TABLE "new_Vote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "songId" TEXT NOT NULL,
    "voterIp" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vote_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("azuracastId") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Vote" ("createdAt", "id", "songId", "value", "voterIp") SELECT "createdAt", "id", "songId", "value", "voterIp" FROM "Vote";
DROP TABLE "Vote";
ALTER TABLE "new_Vote" RENAME TO "Vote";
CREATE TABLE "new_Wish" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "songId" TEXT,
    "artist" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "weblink" TEXT,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Wish_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("azuracastId") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Wish" ("artist", "createdAt", "downvotes", "id", "songId", "title", "upvotes", "weblink") SELECT "artist", "createdAt", "downvotes", "id", "songId", "title", "upvotes", "weblink" FROM "Wish";
DROP TABLE "Wish";
ALTER TABLE "new_Wish" RENAME TO "Wish";
PRAGMA foreign_keys=ON;
