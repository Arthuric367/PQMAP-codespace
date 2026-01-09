# Remove Duplicate Location Fields from PQ Events Table

## Problem Statement

The `pq_events` table contains several location-related columns that duplicate data already available in the `pq_meters` table:

- `site_id` (VARCHAR) - duplicates `pq_meters.site_id`
- `voltage_level` (VARCHAR) - duplicates `pq_meters.voltage_level`
- `circuit_id` (TEXT) - duplicates `pq_meters.circuit_id`
- `region` (VARCHAR) - duplicates `pq_meters.region`
- `oc` (TEXT) - duplicates `pq_meters.oc`

Since every `pq_events` record has a `meter_id` foreign key to `pq_meters.id`, these location fields should be retrieved through the JOIN relationship rather than being stored redundantly in the events table.

## Benefits of Removal

1. **Data Integrity**: Single source of truth for location data
2. **Storage Efficiency**: Reduces table size and index overhead
3. **Maintenance**: Easier to update location data (only in meters table)
4. **Consistency**: Prevents data drift between events and meters

## Migration Strategy

### Phase 1: Preparation & Validation (No Downtime)
1. Analyze current usage of duplicate fields
2. Verify all events have valid meter_id references
3. Create backup of pq_events table
4. Update application code to use JOIN queries

### Phase 2: Database Migration (Minimal Downtime)
1. Drop indexes on duplicate columns
2. Remove columns from pq_events table
3. Update TypeScript interfaces
4. Deploy code changes

### Phase 3: Verification
1. Test all event queries with meter joins
2. Verify data integrity
3. Monitor performance

## Current Usage Analysis

### Files Using These Fields:
- **exportService.ts**: Uses `event.voltage_level`, `event.circuit_id`, `event.oc`
- **EventManagement.tsx**: Filters by `event.voltage_level`, `event.circuit_id`
- **EventDetails.tsx**: Displays `event.circuit_id`, `event.voltage_level`
- **EventOperations.tsx**: Shows `event.circuit_id` in delete confirmation
- **FalseEventConfig.tsx**: Displays `event.circuit_id`
- **EventTreeView.tsx**: Shows `event.circuit_id`

## Migration Steps

### Step 1: Update Application Code

All queries that select from `pq_events` should include the meter join:

```typescript
// BEFORE
const { data } = await supabase
  .from('pq_events')
  .select('*');

// AFTER
const { data } = await supabase
  .from('pq_events')
  .select('*, meter:pq_meters!meter_id(site_id, voltage_level, circuit_id, region, oc)');

// Access fields via: event.meter.site_id, event.meter.circuit_id, etc.
```

### Step 2: Update TypeScript Interface

```typescript
// Remove from PQEvent interface:
// - site_id: string | null;
// - voltage_level: string | null;
// - circuit_id: string;
// - region: string | null;
// - oc: string | null;

// Keep only:
// meter_id: string | null;
// meter?: PQMeter; // For joined data
```

### Step 3: Run Database Migration

Execute the migration script (see below)

### Step 4: Update Code References

Replace all direct field access with meter join access:
- `event.site_id` → `event.meter?.site_id`
- `event.voltage_level` → `event.meter?.voltage_level`
- `event.circuit_id` → `event.meter?.circuit_id`
- `event.region` → `event.meter?.region`
- `event.oc` → `event.meter?.oc`

## Rollback Plan

If issues are discovered:
1. Restore from backup table
2. Revert code changes
3. Re-apply columns with migration script in `rollback/` folder

## Timeline

- **Preparation**: 1-2 hours (code updates, testing)
- **Migration**: 5-10 minutes (run SQL script)
- **Verification**: 30 minutes (test all features)

## Risk Assessment

**Risk Level**: Low-Medium

**Mitigations**:
- Full backup before migration
- Test on staging environment first
- Keep rollback script ready
- Monitor application logs after deployment

## Notes

- The `substation_id` field in `pq_events` should be kept as it's a direct event property
- All events should have `meter_id` populated; orphaned events need investigation
- Consider adding a NOT NULL constraint to `meter_id` after cleanup
