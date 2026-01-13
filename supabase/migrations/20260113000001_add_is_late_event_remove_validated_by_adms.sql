-- Migration: Add is_late_event and Remove validated_by_adms
-- Date: 2026-01-13
-- Purpose: 
--   1. Add is_late_event column (flagged by upstream PQMS/CPDIS)
--   2. Remove validated_by_adms column (ADMS integration cancelled)

BEGIN;

-- =====================================================
-- STEP 1: Add is_late_event column
-- =====================================================

ALTER TABLE pq_events 
ADD COLUMN IF NOT EXISTS is_late_event BOOLEAN DEFAULT false NOT NULL;

-- Add comment
COMMENT ON COLUMN pq_events.is_late_event IS 
  'Flagged by PQMS/CPDIS if event created_at is 15+ minutes after timestamp';

-- Create index for filtering late events
CREATE INDEX IF NOT EXISTS idx_pq_events_is_late_event 
  ON pq_events(is_late_event) 
  WHERE is_late_event = true;

-- =====================================================
-- STEP 2: Remove validated_by_adms column
-- =====================================================

-- Drop dependent view first
DROP VIEW IF EXISTS pq_events_ordered CASCADE;

-- Drop the column (ADMS integration cancelled)
ALTER TABLE pq_events 
DROP COLUMN IF EXISTS validated_by_adms;

-- Recreate the view without validated_by_adms column
CREATE OR REPLACE VIEW pq_events_ordered AS
SELECT * FROM pq_events
ORDER BY timestamp DESC;

-- =====================================================
-- STEP 3: Update RLS policies if needed
-- =====================================================

-- No RLS policy changes needed - is_late_event follows same access rules
-- as other event fields (authenticated users can read, operators/admins can write)

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  late_event_col_exists BOOLEAN;
  validated_adms_col_exists BOOLEAN;
BEGIN
  -- Check if is_late_event column exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'pq_events' 
      AND column_name = 'is_late_event'
  ) INTO late_event_col_exists;
  
  -- Check if validated_by_adms column exists (should be false)
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'pq_events' 
      AND column_name = 'validated_by_adms'
  ) INTO validated_adms_col_exists;
  
  RAISE NOTICE '✅ Migration verification:';
  RAISE NOTICE '   - is_late_event column exists: %', late_event_col_exists;
  RAISE NOTICE '   - validated_by_adms column removed: %', NOT validated_adms_col_exists;
  
  IF NOT late_event_col_exists THEN
    RAISE EXCEPTION '❌ Migration failed: is_late_event column was not created';
  END IF;
  
  IF validated_adms_col_exists THEN
    RAISE EXCEPTION '❌ Migration failed: validated_by_adms column was not removed';
  END IF;
  
  RAISE NOTICE '✅ Migration completed successfully';
END $$;

COMMIT;

-- =====================================================
-- ROLLBACK INSTRUCTIONS
-- =====================================================
-- To rollback this migration:
-- 
-- BEGIN;
-- 
-- -- Add back validated_by_adms
-- ALTER TABLE pq_events 
-- ADD COLUMN validated_by_adms BOOLEAN DEFAULT false NOT NULL;
-- 
-- -- Remove is_late_event
-- DROP INDEX IF EXISTS idx_pq_events_is_late_event;
-- ALTER TABLE pq_events 
-- DROP COLUMN IF EXISTS is_late_event;
-- 
-- COMMIT;
