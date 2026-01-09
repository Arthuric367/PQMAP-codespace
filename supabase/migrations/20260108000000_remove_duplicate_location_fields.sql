-- =====================================================
-- Remove Duplicate Location Fields from PQ Events
-- =====================================================
-- Date: January 8, 2026
-- Purpose: Remove redundant location fields that duplicate
--          data already available in pq_meters table
-- Fields to remove: site_id, voltage_level, circuit_id, region, oc
-- =====================================================

-- Step 1: Create backup table
CREATE TABLE pq_events_backup_20260108 AS 
SELECT * FROM pq_events;

COMMENT ON TABLE pq_events_backup_20260108 IS 'Backup before removing duplicate location fields';

-- Step 2: Verify all events have meter_id (should return 0)
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM pq_events
  WHERE meter_id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'Found % events without meter_id. These events may lose location data.', orphaned_count;
  ELSE
    RAISE NOTICE 'All events have meter_id. Safe to proceed.';
  END IF;
END $$;

-- Step 3: Drop indexes on columns to be removed
DROP INDEX IF EXISTS idx_pq_events_site_id;
DROP INDEX IF EXISTS idx_pq_events_region;
DROP INDEX IF EXISTS idx_pq_events_circuit_id;
DROP INDEX IF EXISTS idx_pq_events_voltage_level;

-- Step 4: Drop dependent views (will be recreated without duplicate columns)
DROP VIEW IF EXISTS pq_events_ordered CASCADE;

-- Step 5: Remove duplicate columns
ALTER TABLE pq_events
  DROP COLUMN IF EXISTS site_id,
  DROP COLUMN IF EXISTS voltage_level,
  DROP COLUMN IF EXISTS circuit_id,
  DROP COLUMN IF EXISTS region,
  DROP COLUMN IF EXISTS oc;

-- Step 6: Recreate pq_events_ordered view (if it existed)
-- This view now uses meter JOIN to get location data
CREATE OR REPLACE VIEW pq_events_ordered AS
SELECT 
  e.*,
  m.site_id,
  m.voltage_level,
  m.circuit_id,
  m.region,
  m.oc
FROM pq_events e
LEFT JOIN pq_meters m ON m.id = e.meter_id
ORDER BY e.timestamp DESC;

COMMENT ON VIEW pq_events_ordered IS 'View with events ordered by timestamp. Location fields (site_id, voltage_level, circuit_id, region, oc) are joined from pq_meters table.';

-- Step 7: Add helpful comment to meter_id column
COMMENT ON COLUMN pq_events.meter_id IS 
  'Foreign key to pq_meters. Use JOIN to get location data: site_id, voltage_level, circuit_id, region, oc';

-- Step 8: Create index on meter_id if not exists (for JOIN performance)
CREATE INDEX IF NOT EXISTS idx_pq_events_meter_id ON pq_events(meter_id);

-- Step 9: Document the change
COMMENT ON TABLE pq_events IS 
  'Power Quality Events - Location data (site_id, voltage_level, circuit_id, region, oc) moved to pq_meters. Use JOIN on meter_id to retrieve.';

-- Verification Query
-- Run this to verify the migration worked:
/*
SELECT 
  e.id,
  e.event_type,
  e.timestamp,
  e.meter_id,
  m.site_id,
  m.voltage_level,
  m.circuit_id,
  m.region,
  m.oc
FROM pq_events e
LEFT JOIN pq_meters m ON m.id = e.meter_id
LIMIT 10;
*/

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully. Run verification query to confirm.';
END $$;
