-- Add persistent youth attendance records without changing existing youth data.
CREATE TABLE "Attendance" (
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

CREATE UNIQUE INDEX "Attendance_youthId_dateKey_key" ON "Attendance"("youthId", "dateKey");
CREATE INDEX "Attendance_dateKey_idx" ON "Attendance"("dateKey");
CREATE INDEX "Attendance_youthId_idx" ON "Attendance"("youthId");

ALTER TABLE "Attendance"
ADD CONSTRAINT "Attendance_youthId_fkey"
FOREIGN KEY ("youthId") REFERENCES "YouthProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attendance"
ADD CONSTRAINT "Attendance_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Attendance"
ADD CONSTRAINT "Attendance_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
