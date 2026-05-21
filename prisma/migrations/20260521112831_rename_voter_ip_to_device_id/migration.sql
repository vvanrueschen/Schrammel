-- Rename voterIp to deviceId in Vote table
ALTER TABLE "Vote" ADD COLUMN "deviceId" TEXT NOT NULL DEFAULT 'unknown';
UPDATE "Vote" SET "deviceId" = "voterIp";
ALTER TABLE "Vote" DROP COLUMN "voterIp";

-- Rename voterIp to deviceId in WishVote table
ALTER TABLE "WishVote" ADD COLUMN "deviceId" TEXT NOT NULL DEFAULT 'unknown';
UPDATE "WishVote" SET "deviceId" = "voterIp";
ALTER TABLE "WishVote" DROP COLUMN "voterIp";
