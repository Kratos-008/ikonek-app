-- iKonek: add mandatory email verification for newly registered accounts.
-- Existing accounts remain verified so current users/admins are not locked out.

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "verificationCodeHash" TEXT;

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "verificationExpiresAt" TIMESTAMP(3);
