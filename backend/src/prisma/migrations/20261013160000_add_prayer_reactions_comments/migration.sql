-- Additive migration only: preserves all existing iKonek records.
CREATE TABLE "PrayerReaction" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reaction" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PrayerReaction_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PrayerComment" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PrayerComment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PrayerReaction_postId_userId_key" ON "PrayerReaction"("postId", "userId");
CREATE INDEX "PrayerReaction_postId_idx" ON "PrayerReaction"("postId");
CREATE INDEX "PrayerComment_postId_createdAt_idx" ON "PrayerComment"("postId", "createdAt");
ALTER TABLE "PrayerReaction" ADD CONSTRAINT "PrayerReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "PrayerRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrayerReaction" ADD CONSTRAINT "PrayerReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrayerComment" ADD CONSTRAINT "PrayerComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "PrayerRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrayerComment" ADD CONSTRAINT "PrayerComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
