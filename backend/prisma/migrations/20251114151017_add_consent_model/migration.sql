-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "textVersion" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Consent_bookingId_key" ON "Consent"("bookingId");

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
