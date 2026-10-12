ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "passwordResetCodeHash" TEXT,
  ADD COLUMN IF NOT EXISTS "passwordResetExpiresAt" TIMESTAMP(3);
