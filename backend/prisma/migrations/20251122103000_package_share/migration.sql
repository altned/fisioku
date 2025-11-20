-- AlterTable
ALTER TABLE "TherapyPackage"
  ADD COLUMN "therapistShareRate" DECIMAL(65,30) NOT NULL DEFAULT 0.7;

-- DropTable
DROP TABLE IF EXISTS "RevenueSetting";
