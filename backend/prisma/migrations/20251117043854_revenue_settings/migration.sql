DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'RevenueSetting'
  ) THEN
    ALTER TABLE "RevenueSetting" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;
