-- 2026-04-21 add columns field to csv_sessions
ALTER TABLE "csv_sessions" ADD COLUMN "columns" text[];
