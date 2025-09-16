/*
  Warnings:

  - A unique constraint covering the columns `[userId,nameNorm]` on the table `life_areas` will be added.
  - A unique constraint covering the columns `[userId,weekStart,titleNorm]` on the table `weekly_tasks` will be added.
  - The unique constraint covering the columns `[userId,name]` on the table `life_areas` will be dropped.
  - The unique constraint covering the columns `[userId,title,weekStart]` on the table `weekly_tasks` will be dropped.

*/

-- AlterTable: Add normalized columns to life_areas
ALTER TABLE "life_areas" ADD COLUMN "nameNorm" text GENERATED ALWAYS AS (lower(btrim("name"))) STORED;

-- AlterTable: Add normalized columns to weekly_tasks  
ALTER TABLE "weekly_tasks" ADD COLUMN "titleNorm" text GENERATED ALWAYS AS (lower(btrim("title"))) STORED;

-- DropIndex: Remove old case-sensitive unique constraints
DROP INDEX "life_areas_userId_name_key";
DROP INDEX "weekly_tasks_userId_title_weekStart_key";

-- CreateIndex: Add new case-insensitive unique constraints
CREATE UNIQUE INDEX "life_areas_userId_nameNorm_key" ON "life_areas"("userId", "nameNorm");
CREATE UNIQUE INDEX "weekly_tasks_userId_weekStart_titleNorm_key" ON "weekly_tasks"("userId", "weekStart", "titleNorm");

-- Add Signal CHECK constraints for data validation
ALTER TABLE "signals" ADD CONSTRAINT "signals_sleep_check" 
  CHECK (
    ("type" != 'SLEEP') OR 
    ("value" >= 0 AND "value" <= 14 AND ("value" * 4) % 1 = 0)
  );

ALTER TABLE "signals" ADD CONSTRAINT "signals_wellbeing_check" 
  CHECK (
    ("type" != 'WELLBEING') OR 
    ("value" BETWEEN 1 AND 10 AND "value" = floor("value"))
  );

-- Backfill existing data (if any exists)
-- Note: In a real migration, this would happen automatically via the GENERATED ALWAYS AS clause
-- UPDATE "life_areas" SET "nameNorm" = lower(btrim("name")) WHERE "nameNorm" IS NULL;
-- UPDATE "weekly_tasks" SET "titleNorm" = lower(btrim("title")) WHERE "titleNorm" IS NULL;