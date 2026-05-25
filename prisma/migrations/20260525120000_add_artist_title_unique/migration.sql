-- Deduplicate any existing duplicate songs before adding unique constraint
-- Keeps the row with the lowest azuracastId (arbitrary but deterministic)
DELETE FROM Song
WHERE rowid NOT IN (
  SELECT MIN(rowid)
  FROM Song
  GROUP BY artist, title
);

-- Migrate orphaned votes to point to the surviving song
-- (votes referencing a deleted duplicate's azuracastId are removed since the song is gone)
DELETE FROM Vote
WHERE songId NOT IN (SELECT azuracastId FROM Song);

-- Same for wishes
DELETE FROM Wish
WHERE songId NOT IN (SELECT azuracastId FROM Song);

-- CreateIndex
CREATE UNIQUE INDEX "Song_artist_title_key" ON "Song"("artist", "title");