# Active to Enable Field Migration

**Date:** January 6, 2026  
**Purpose:** Rename `active` field to `enable` in pq_meters table to distinguish between operational status and system enablement

---

## Overview

This migration addresses field naming confusion by separating two distinct concepts:
- **`status`**: Operational status (`'active'`, `'abnormal'`, `'inactive'`) - How the meter is performing
- **`enable`**: System enablement flag (`true`/`false`) - Whether the meter is enabled in the system

---

## Changes Summary

### 1. Database Migration

**File:** `/supabase/migrations/20260106000000_rename_active_to_enable.sql`

**Changes:**
- Added `ip_address` column if missing (fixes schema cache error)
- Renamed `active` column to `enable`
- Added column comments for clarity

**To Apply:**
```bash
# Run this SQL script in Supabase SQL Editor
# Or via CLI: supabase db push
```

### 2. Type Definitions

**File:** `/src/types/database.ts`

**Changes:**
```typescript
// Before
interface PQMeter {
  active?: boolean;
  ...
}

// After
interface PQMeter {
  enable?: boolean;  // System enablement flag - when false, meter is excluded from KPIs and reports
  ...
}
```

### 3. Service Layer

**File:** `/src/services/meterHierarchyService.ts`

**Changes:**
- Updated `CreateMeterInput` interface: `active: boolean` → `enable: boolean`
- Updated `getMeterStatistics()` to filter `enable !== false` before counting
- Renamed function: `toggleMeterActive()` → `toggleMeterEnable()`

**KPI Logic:**
```typescript
// Filter enabled meters first
const enabledMeters = data?.filter(m => m.enable !== false) || [];

// Then count by operational status
const active = enabledMeters.filter(m => m.status === 'active').length;
const abnormal = enabledMeters.filter(m => m.status === 'abnormal').length;
const inactive = enabledMeters.filter(m => m.status === 'inactive').length;
```

### 4. MeterHierarchy Component

**File:** `/src/components/MeterHierarchy.tsx`

**Changes:**
- Import: `toggleMeterActive` → `toggleMeterEnable`
- State: `activeFilter` → `enableFilter` with values `'all' | 'enabled' | 'disabled'`
- Handler: `handleToggleActive` → `handleToggleEnable`
- Filter dropdown: Changed options from "Active/Inactive" to "Enabled/Disabled"
- Toggle button: Updated to use `meter.enable` field with "Enable/Disable" titles
- Status badge: Shows "Enabled/Disabled" instead of "Active/Inactive"
- clearFilters: Updated to reset `enableFilter`

### 5. MeterFormModal Component

**File:** `/src/components/MeterHierarchy/MeterFormModal.tsx`

**Changes:**
- Form field: `active` → `enable` with default `meter?.enable !== false`
- Substation query: Added `code` field, ordered by code
- Substation display: Format changed to `{code} - {name}` (e.g., "APA - Airport A")
- Checkbox label: "Active in System" → "Enable in System"

### 6. AssetManagement Component

**File:** `/src/components/AssetManagement.tsx`

**Changes:**
- Statistics: Filter `enable !== false` before counting status types
- Export data: Column name changed from "Active" to "Enable"
- Meter detail display: Label changed from "Active" to "Enable"

### 7. Documentation

**File:** `/Artifacts/STYLES_GUIDE.md`

**Added Section:** "Substation Dropdown Format"

Documents the standard pattern for displaying substations as `{code} - {name}` in dropdown/select elements.

---

## Field Usage Guide

### `enable` field (boolean)
- **Purpose:** System-level flag to include/exclude meters from the system
- **Default:** `true` (enabled)
- **When false:** Meter is excluded from:
  - KPI calculations
  - Dashboard statistics
  - Reports (by default)
- **Display:** "Enabled" / "Disabled"
- **UI Control:** Toggle button with Power icon

### `status` field (enum)
- **Purpose:** Operational state of the meter
- **Values:** `'active'` | `'abnormal'` | `'inactive'`
- **Meaning:**
  - `active`: Meter is operating normally
  - `abnormal`: Meter has issues/anomalies
  - `inactive`: Meter is not responding
- **Display:** Colored status badges
- **Independent of:** `enable` field

---

## KPI Calculation Rules

**Total Meters:** COUNT WHERE `enable = true`  
**Active Meters:** COUNT WHERE `enable = true` AND `status = 'active'`  
**Abnormal Meters:** COUNT WHERE `enable = true` AND `status = 'abnormal'`  
**Inactive Meters:** COUNT WHERE `enable = true` AND `status = 'inactive'`

**Important:** Meters with `enable = false` are:
- ✅ Visible in inventory tables
- ❌ Excluded from KPI calculations
- ❌ Excluded from dashboard statistics
- ❌ Filtered out of reports (by default)

---

## Testing Checklist

- [ ] Run migration script in Supabase
- [ ] Verify `ip_address` column exists
- [ ] Verify `active` column renamed to `enable`
- [ ] Test MeterHierarchy KPI cards show correct totals
- [ ] Test MeterHierarchy enable filter (All/Enabled/Disabled)
- [ ] Test toggle enable button functionality
- [ ] Test MeterFormModal enable checkbox
- [ ] Test substation dropdown shows "CODE - Name" format
- [ ] Test AssetManagement KPI cards exclude disabled meters
- [ ] Test export functionality includes "Enable" column
- [ ] Verify disabled meters still appear in tables
- [ ] Verify disabled meters excluded from KPI counts

---

## Rollback Plan

If needed, rollback using:

```sql
-- Rollback migration
ALTER TABLE pq_meters 
RENAME COLUMN enable TO active;

-- Remove ip_address if it was added by this migration
-- (Only if it didn't exist before)
-- ALTER TABLE pq_meters DROP COLUMN ip_address;
```

Then revert all code changes using git:
```bash
git revert <commit-hash>
```

---

## Files Modified

1. `/supabase/migrations/20260106000000_rename_active_to_enable.sql` - NEW
2. `/src/types/database.ts` - Line 97
3. `/src/services/meterHierarchyService.ts` - Lines 12-40, 375-415
4. `/src/components/MeterHierarchy.tsx` - Multiple sections
5. `/src/components/MeterHierarchy/MeterFormModal.tsx` - Lines 47, 82-93, 694-704
6. `/src/components/AssetManagement.tsx` - Lines 633-640, 676, 1492-1506
7. `/Artifacts/STYLES_GUIDE.md` - Added Substation Dropdown Format section

---

## Next Steps

1. **Apply Migration:** Run the SQL migration script in Supabase
2. **Verify Database:** Check that column rename was successful
3. **Test Application:** Run through the testing checklist above
4. **Update Reports:** Ensure report queries use `enable != false` filter
5. **Monitor:** Watch for any issues after deployment
