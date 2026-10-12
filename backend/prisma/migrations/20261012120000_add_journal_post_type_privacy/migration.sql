-- Backward-compatible Journal upgrade. Existing records are preserved.
-- IF NOT EXISTS also accommodates columns previously added directly in a database.
ALTER TABLE "PrayerRequest" ADD COLUMN IF NOT EXISTS "senderName" TEXT;
ALTER TABLE "PrayerRequest" ADD COLUMN IF NOT EXISTS "devotionTitle" TEXT;
ALTER TABLE "PrayerRequest" ADD COLUMN IF NOT EXISTS "biblePassage" TEXT;
ALTER TABLE "PrayerRequest" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- Keep postType nullable so old entries are not incorrectly classified.
ALTER TABLE "PrayerRequest" ADD COLUMN IF NOT EXISTS "postType" TEXT;
-- Existing entries default to PRIVATE, including for admin accounts.
ALTER TABLE "PrayerRequest" ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE "PrayerRequest" ADD COLUMN IF NOT EXISTS "testimony" TEXT;
