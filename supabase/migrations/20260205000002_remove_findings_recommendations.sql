-- Migration: Remove findings and recommendations columns from pq_service_records
-- Date: 2026-02-05
-- Reason: These columns are being deprecated in favor of the more structured service_type and content fields

-- BEFORE RUNNING: Check what data exists in these columns
-- Run this query first to see what will be deleted:
--   SELECT id, findings, recommendations 
--   FROM pq_service_records 
--   WHERE findings IS NOT NULL OR recommendations IS NOT NULL;

-- Step 1: Drop the columns
ALTER TABLE pq_service_records
DROP COLUMN IF EXISTS findings;

ALTER TABLE pq_service_records
DROP COLUMN IF EXISTS recommendations;

-- Verification query: Confirm columns are removed
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'pq_service_records' 
-- AND column_name IN ('findings', 'recommendations');
-- Expected: No rows returned
