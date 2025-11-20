-- CreateTable
CREATE TABLE "ReviewSummary" (
  "therapistId" TEXT NOT NULL,
  "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reviewCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReviewSummary_pkey" PRIMARY KEY ("therapistId"),
  CONSTRAINT "ReviewSummary_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE OR REPLACE FUNCTION refresh_review_summary(target_therapist TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO "ReviewSummary" ("therapistId", "averageRating", "reviewCount", "updatedAt")
  SELECT target_therapist,
         COALESCE(AVG("rating"), 0)::double precision,
         COALESCE(COUNT(*), 0)::int,
         now()
  FROM "Review"
  WHERE "therapistId" = target_therapist
  GROUP BY "therapistId"
  ON CONFLICT ("therapistId") DO UPDATE SET
    "averageRating" = EXCLUDED."averageRating",
    "reviewCount" = EXCLUDED."reviewCount",
    "updatedAt" = now();

  -- If tidak ada review tersisa untuk terapis tersebut, hapus summary
  IF NOT EXISTS (SELECT 1 FROM "Review" WHERE "therapistId" = target_therapist) THEN
    DELETE FROM "ReviewSummary" WHERE "therapistId" = target_therapist;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_review_summary()
RETURNS TRIGGER AS $$
DECLARE
  targetId TEXT;
BEGIN
  targetId := COALESCE(NEW."therapistId", OLD."therapistId");
  PERFORM refresh_review_summary(targetId);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER review_summary_after_insert
AFTER INSERT ON "Review"
FOR EACH ROW EXECUTE FUNCTION handle_review_summary();

CREATE TRIGGER review_summary_after_update
AFTER UPDATE ON "Review"
FOR EACH ROW EXECUTE FUNCTION handle_review_summary();

CREATE TRIGGER review_summary_after_delete
AFTER DELETE ON "Review"
FOR EACH ROW EXECUTE FUNCTION handle_review_summary();
