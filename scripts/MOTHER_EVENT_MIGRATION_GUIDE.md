# Migration Guide: Mother Event Logic Update (January 13, 2026)

## Overview
This guide provides step-by-step instructions for applying the mother event logic updates to your Supabase database.

## Migration Files Created

### 1. `20260113000000_update_mother_event_logic.sql`
**Purpose:** Update voltage_dip and voltage_swell events to be mother events

**Changes:**
- All voltage_dip and voltage_swell events without parent_event_id become mother events
- All other event types (harmonic, interruption, transient, flicker) become mother events
- Cleans up orphaned child events
- Validates the changes with count queries

### 2. `20260113000001_add_is_late_event_remove_validated_by_adms.sql`
**Purpose:** Add is_late_event column and remove validated_by_adms column

**Changes:**
- Adds `is_late_event` BOOLEAN column (default: false)
- Removes `validated_by_adms` column
- Adds index on is_late_event for performance
- Includes verification queries

## Application Instructions

### Prerequisites
- Access to Supabase Dashboard or SQL Editor
- Backup recommended before applying migrations

### Step 1: Apply Mother Event Logic Migration

1. Open Supabase Dashboard → SQL Editor
2. Copy content from `supabase/migrations/20260113000000_update_mother_event_logic.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Review the output logs:
   ```
   ✅ Migration completed successfully:
      - voltage_dip mother events: XXX
      - voltage_swell mother events: XXX
      - Other event type mothers: XXX
      - Orphaned children (should be 0): 0
   ```

### Step 2: Apply is_late_event/validated_by_adms Migration

1. Open Supabase Dashboard → SQL Editor
2. Copy content from `supabase/migrations/20260113000001_add_is_late_event_remove_validated_by_adms.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Review the output logs:
   ```
   ✅ Migration verification:
      - is_late_event column exists: true
      - validated_by_adms column removed: true
   ✅ Migration completed successfully
   ```

## Verification Queries

After applying both migrations, run these queries to verify:

```sql
-- Check voltage_dip/voltage_swell mother events
SELECT 
  event_type,
  COUNT(*) as total,
  SUM(CASE WHEN is_mother_event THEN 1 ELSE 0 END) as mother_count,
  SUM(CASE WHEN is_child_event THEN 1 ELSE 0 END) as child_count
FROM pq_events
WHERE event_type IN ('voltage_dip', 'voltage_swell')
GROUP BY event_type;

-- Check other event types
SELECT 
  event_type,
  COUNT(*) as total,
  SUM(CASE WHEN is_mother_event THEN 1 ELSE 0 END) as mother_count,
  SUM(CASE WHEN is_child_event THEN 1 ELSE 0 END) as child_count
FROM pq_events
WHERE event_type IN ('harmonic', 'interruption', 'transient', 'flicker')
GROUP BY event_type;

-- Verify is_late_event column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'pq_events' 
  AND column_name = 'is_late_event';

-- Verify validated_by_adms column removed
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'pq_events' 
  AND column_name = 'validated_by_adms';
-- Should return 0 rows
```

## Frontend Changes Summary

### Files Modified:
1. **src/types/database.ts**
   - Added `is_late_event: boolean` to PQEvent interface
   - Removed `validated_by_adms: boolean` from PQEvent interface

2. **src/components/EventManagement/EventManagement.tsx**
   - Renamed filter: `showOnlyStandaloneEvents` → `showMotherEventsWithoutChildren`
   - Added filter: `showLateEventsOnly`
   - Removed filter: `showOnlyUnvalidated`
   - Updated filter logic for mother events without children
   - Added late event filter logic

3. **src/components/EventManagement/EventDetails.tsx**
   - Removed all `validated_by_adms` references
   - Added `is_late_event` badge in header (orange)
   - Added `false_event` badge in header (red)
   - Added "Mark False" button for mother events
   - New handler: `handleMarkMotherAndChildrenAsFalse()`
   - Updated ungroup child logic to remove `validated_by_adms`

4. **src/services/mother-event-grouping.ts**
   - Updated `ungroupSpecificEvents()` to set `is_mother_event = true` for voltage_dip/voltage_swell

## Expected Behavior After Migration

### Mother Event Rules:
- **voltage_dip & voltage_swell:** Always mother events (even with 0 children)
- **harmonic, interruption, transient, flicker:** Always mother events, cannot be children

### Ungrouping Behavior:
- When ungrouping voltage_dip/voltage_swell children:
  - `is_mother_event` = true
  - `is_child_event` = false
  - `parent_event_id` = null
- Other event types remain as standalone (not mother, not child)

### New Filters:
- "Show only mother events without child" - displays mother events with 0 children
- "Show only late events" - displays events where `is_late_event = true`
- Removed: "Only unvalidated events"

### Mark False Feature:
- Button appears in EventDetails.tsx header for mother events
- Marks mother + all children as false_event = true
- Keeps grouping structure intact (parent_event_id preserved)
- Requires confirmation dialog

## Rollback Instructions

If needed, rollback instructions are included at the bottom of each migration file.

### Rollback Mother Event Logic:
⚠️ **Warning:** This cannot be perfectly rolled back as we don't store the original states.
You would need to restore from a database backup taken before the migration.

### Rollback is_late_event/validated_by_adms:
```sql
BEGIN;

-- Add back validated_by_adms
ALTER TABLE pq_events 
ADD COLUMN validated_by_adms BOOLEAN DEFAULT false NOT NULL;

-- Remove is_late_event
DROP INDEX IF EXISTS idx_pq_events_is_late_event;
ALTER TABLE pq_events 
DROP COLUMN IF EXISTS is_late_event;

COMMIT;
```

## Testing Checklist

After applying migrations:
- [ ] All voltage_dip events are mother events
- [ ] All voltage_swell events are mother events
- [ ] Other event types cannot be children
- [ ] is_late_event column exists with default false
- [ ] validated_by_adms column removed
- [ ] Frontend compiles without TypeScript errors
- [ ] Filters work correctly in EventManagement
- [ ] Late event badge displays in EventDetails
- [ ] Mark False button works for mother events
- [ ] Ungrouping voltage_dip/voltage_swell creates mother events
- [ ] No console errors in browser

## Support

If you encounter issues:
1. Check Supabase logs for SQL errors
2. Verify all migration files applied successfully
3. Run verification queries above
4. Check browser console for frontend errors
5. Review migration output logs for warnings

---
**Migration Date:** January 13, 2026  
**Affected Tables:** pq_events  
**Affected Columns:** is_mother_event, is_child_event, is_late_event, validated_by_adms (removed)  
**Breaking Changes:** validated_by_adms column removed, filter names changed
