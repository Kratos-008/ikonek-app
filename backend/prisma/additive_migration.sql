-- Additive migration: preserves all existing events and attendance records.
ALTER TABLE "Event"
ADD COLUMN IF NOT EXISTS "attendanceFinalized" BOOLEAN NOT NULL DEFAULT FALSE;
