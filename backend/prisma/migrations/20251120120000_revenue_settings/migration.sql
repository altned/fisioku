-- AlterTable
ALTER TABLE "Payment"
  ADD COLUMN "platformFeeAmount" DECIMAL(65,30),
  ADD COLUMN "platformFeeRate" DECIMAL(65,30),
  ADD COLUMN "therapistShareAmount" DECIMAL(65,30),
  ADD COLUMN "therapistShareRate" DECIMAL(65,30);

-- CreateTable
CREATE TABLE "RevenueSetting" (
  "id" INTEGER NOT NULL,
  "platformFeePercentage" DECIMAL(65,30) NOT NULL DEFAULT 0.3,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RevenueSetting_pkey" PRIMARY KEY ("id")
);
