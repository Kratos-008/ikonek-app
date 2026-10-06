CREATE TABLE IF NOT EXISTS "Attendance" (
  "id" TEXT NOT NULL,
  "youthId" TEXT NOT NULL,
  "userId" TEXT,
  "eventId" TEXT,
  "attendanceDate" TIMESTAMP(3) NOT NULL,
  "dateKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PRESENT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_youthId_dateKey_key"
ON "Attendance"("youthId", "dateKey");

CREATE INDEX IF NOT EXISTS "Attendance_dateKey_idx"
ON "Attendance"("dateKey");

CREATE INDEX IF NOT EXISTS "Attendance_youthId_idx"
ON "Attendance"("youthId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Attendance_youthId_fkey'
  ) THEN
    ALTER TABLE "Attendance"
    ADD CONSTRAINT "Attendance_youthId_fkey"
    FOREIGN KEY ("youthId")
    REFERENCES "YouthProfile"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Attendance_userId_fkey'
  ) THEN
    ALTER TABLE "Attendance"
    ADD CONSTRAINT "Attendance_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Attendance_eventId_fkey'
  ) THEN
    ALTER TABLE "Attendance"
    ADD CONSTRAINT "Attendance_eventId_fkey"
    FOREIGN KEY ("eventId")
    REFERENCES "Event"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;