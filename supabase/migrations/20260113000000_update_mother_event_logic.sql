-- Migration: Update Mother Event Logic for voltage_dip and voltage_swell
-- Date: 2026-01-13
-- Purpose: Ensure all voltage_dip and voltage_swell events are mother events

BEGIN;

-- =====================================================
-- STEP 1: Update voltage_dip and voltage_swell events
-- =====================================================

-- Update all voltage_dip and voltage_swell events that are not currently children
-- to be mother events (even if they have 0 children)
UPDATE pq_events
SET 
  is_mother_event = true,
  is_child_event = false
WHERE 
  event_type IN ('voltage_dip', 'voltage_swell')
  AND parent_event_id IS NULL
  AND is_mother_event = false;

-- Update any voltage_dip/voltage_swell that were incorrectly marked as child without parent
-- (cleanup orphaned child events)
UPDATE pq_events
SET 
  is_mother_event = true,
  is_child_event = false,
  parent_event_id = NULL
WHERE 
  event_type IN ('voltage_dip', 'voltage_swell')
  AND is_child_event = true
  AND parent_event_id IS NULL;

-- =====================================================
-- STEP 2: Ensure other event types are always mothers
-- =====================================================

-- Update harmonic, interruption, transient, flicker events to be mother events
-- and remove any child relationships (they cannot be children)
UPDATE pq_events
SET 
  is_mother_event = true,
  is_child_event = false,
  parent_event_id = NULL
WHERE 
  event_type IN ('harmonic', 'interruption', 'transient', 'flicker')
  AND (is_mother_event = false OR is_child_event = true OR parent_event_id IS NOT NULL);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify voltage_dip/voltage_swell mother events
DO $$
DECLARE
  vdip_mothers INTEGER;
  vswell_mothers INTEGER;
  other_mothers INTEGER;
  orphan_children INTEGER;
BEGIN
  -- Count voltage_dip mother events
  SELECT COUNT(*) INTO vdip_mothers
  FROM pq_events
  WHERE event_type = 'voltage_dip' 
    AND is_mother_event = true 
    AND parent_event_id IS NULL;
  
  -- Count voltage_swell mother events
  SELECT COUNT(*) INTO vswell_mothers
  FROM pq_events
  WHERE event_type = 'voltage_swell' 
    AND is_mother_event = true 
    AND parent_event_id IS NULL;
  
  -- Count other event type mothers
  SELECT COUNT(*) INTO other_mothers
  FROM pq_events
  WHERE event_type IN ('harmonic', 'interruption', 'transient', 'flicker')
    AND is_mother_event = true 
    AND parent_event_id IS NULL;
  
  -- Check for orphaned children (should be 0)
  SELECT COUNT(*) INTO orphan_children
  FROM pq_events
  WHERE is_child_event = true AND parent_event_id IS NULL;
  
  RAISE NOTICE '✅ Migration completed successfully:';
  RAISE NOTICE '   - voltage_dip mother events: %', vdip_mothers;
  RAISE NOTICE '   - voltage_swell mother events: %', vswell_mothers;
  RAISE NOTICE '   - Other event type mothers: %', other_mothers;
  RAISE NOTICE '   - Orphaned children (should be 0): %', orphan_children;
  
  IF orphan_children > 0 THEN
    RAISE WARNING '⚠️  Found % orphaned child events - recommend manual review', orphan_children;
  END IF;
END $$;

COMMIT;

-- =====================================================
-- ROLLBACK INSTRUCTIONS
-- =====================================================
-- To rollback this migration, you would need to restore from backup
-- as we don't have the original is_mother_event/is_child_event states
