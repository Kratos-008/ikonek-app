-- Add explicit Leader role support while preserving all existing users.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'LEADER';

-- The role a member is approved to receive when they link an account.
CREATE TYPE "MemberRole" AS ENUM ('YOUTH', 'LEADER');

ALTER TABLE "YouthProfile"
  ADD COLUMN "accountRole" "MemberRole" NOT NULL DEFAULT 'YOUTH',
  ADD COLUMN "registrationCodeHash" TEXT;

ALTER TABLE "User"
  ADD COLUMN "pendingMemberLinkCodeHash" TEXT;

CREATE UNIQUE INDEX "YouthProfile_registrationCodeHash_key"
  ON "YouthProfile"("registrationCodeHash");

-- Existing member and attendance rows are deliberately left intact.
-- Existing unlinked members can receive a fresh code from the Admin-only
-- POST /api/youth/:id/registration-code endpoint; raw codes are never backfilled.
