-- =====================================================
-- ROLLBACK: Restore Location Fields to PQ Events
-- =====================================================
-- Date: January 8, 2026
-- Purpose: Rollback migration that removed duplicate location fields
-- Use this if issues are discovered after migration
-- =====================================================

-- Step 1: Re-add the columns
ALTER TABLE pq_events
  ADD COLUMN IF NOT EXISTS site_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS voltage_level VARCHAR(50),
  ADD COLUMN IF NOT EXISTS circuit_id TEXT,
  ADD COLUMN IF NOT EXISTS region VARCHAR(100),
  ADD COLUMN IF NOT EXISTS oc TEXT;

-- Step 2: Restore data from backup
UPDATE pq_events e
SET 
  site_id = b.site_id,
  voltage_level = b.voltage_level,
  circuit_id = b.circuit_id,
  region = b.region,
  oc = b.oc
FROM pq_events_backup_20260108 b
WHERE e.id = b.id;

-- Step 3: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_pq_events_site_id ON pq_events(site_id);
CREATE INDEX IF NOT EXISTS idx_pq_events_region ON pq_events(region);
CREATE INDEX IF NOT EXISTS idx_pq_events_circuit_id ON pq_events(circuit_id);
CREATE INDEX IF NOT EXISTS idx_pq_events_voltage_level ON pq_events(voltage_level);

-- Step 4: Add back column comments
COMMENT ON COLUMN pq_events.site_id IS 'Site ID reference from PQ meter';
COMMENT ON COLUMN pq_events.region IS 'Region reference from PQ meter';
COMMENT ON COLUMN pq_events.circuit_id IS 'Circuit ID reference from PQ meter';
COMMENT ON COLUMN pq_events.voltage_level IS 'Voltage level reference from PQ meter';
COMMENT ON COLUMN pq_events.oc IS 'Operating center reference from PQ meter';

-- Step 5: Verify restoration
DO $$
DECLARE
  restored_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM pq_events;
  SELECT COUNT(*) INTO restored_count 
  FROM pq_events 
  WHERE site_id IS NOT NULL OR voltage_level IS NOT NULL OR circuit_id IS NOT NULL;
  
  RAISE NOTICE 'Rollback completed. Restored % out of % records with location data.', 
    restored_count, total_count;
END $$;

-- Note: Backup table pq_events_backup_20260108 is preserved for safety
