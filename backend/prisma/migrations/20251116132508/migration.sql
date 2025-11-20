DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'ChatMessage'
  ) THEN
    CREATE TABLE "ChatMessage" (
      "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
      "bookingId" TEXT NOT NULL,
      "senderId" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
    );

    CREATE INDEX "ChatMessage_bookingId_sentAt_idx"
      ON "ChatMessage" ("bookingId", "sentAt");

    ALTER TABLE "ChatMessage"
      ADD CONSTRAINT "ChatMessage_bookingId_fkey"
      FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;

    ALTER TABLE "ChatMessage"
      ADD CONSTRAINT "ChatMessage_senderId_fkey"
      FOREIGN KEY ("senderId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE IF EXISTS "ChatMessage"
  DROP CONSTRAINT IF EXISTS "ChatMessage_pkey",
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "id" SET DATA TYPE TEXT,
  ADD CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id");
