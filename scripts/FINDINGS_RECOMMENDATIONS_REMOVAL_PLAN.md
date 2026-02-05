# Findings and Recommendations Removal Plan

## Overview
This document outlines the removal of `findings` and `recommendations` columns from the `pq_service_records` table and the corresponding UI updates required.

## Reason for Removal
- These columns (`findings` and `recommendations`) are redundant with the newer, more structured `content` field
- The detail view toggle provides better organization of service information
- Simplifies data model and reduces maintenance overhead

## Fields That Are NOT Being Removed
**IMPORTANT:** The following fields are ACTIVE and should remain:
- ✅ **`benchmark_standard`** - Used for compliance tracking (IEEE 519, IEC 61000, etc.) and filtering
- ✅ **`engineer_id` / `engineer`** - Tracks which engineer performed the service, auto-assigned from current user
- ✅ **`content`** - Main service description field (replaces findings/recommendations)

Only `findings` and `recommendations` columns are being removed.

---

## Database Changes

### Migration File
**File**: `supabase/migrations/20260205000002_remove_findings_recommendations.sql`

**Actions**:
- Drops `findings` column from `pq_service_records` table
- Drops `recommendations` column from `pq_service_records` table

### Before Running Migration
1. Run the data check script to see what will be deleted:
   ```bash
   # In Supabase SQL Editor
   \i scripts/check-findings-recommendations-data.sql
   ```

2. If needed, export the data for backup before deletion

---

## Components Requiring Updates

### 1. ✅ **PQServices.tsx** (Already Updated)
**Status**: COMPLETED  
**Changes Made**:
- Removed `findings` and `recommendations` from Excel export function (lines 287-288)
- Detail view no longer uses these fields (using `content` instead)

### 2. **AddServiceModal.tsx**
**File**: `src/components/PQServices/AddServiceModal.tsx`  
**Status**: NEEDS UPDATE  
**Lines Affected**: 22-23, 179-180, 207-208, 463-486

**Required Changes**:
- Remove `findings` and `recommendations` from form state (lines 22-23, 207-208)
- Remove `findings` and `recommendations` from insert query (lines 179-180)
- Remove form fields for Findings (lines 463-473)
- Remove form fields for Recommendations (lines 477-487)

### 3. **ViewDetailsModal.tsx**
**File**: `src/components/PQServices/ViewDetailsModal.tsx`  
**Status**: NEEDS UPDATE  
**Lines Affected**: 132-145

**Required Changes**:
- Remove Findings section (lines 132-137)
- Remove Recommendations section (lines 140-145)

### 4. **AffectedCustomerChart.tsx**
**File**: `src/components/Dashboard/AffectedCustomerChart.tsx`  
**Status**: NEEDS UPDATE  
**Lines Affected**: 33-34, 371, 402-403, 1009-1034

**Required Changes**:
- Remove `findings` and `recommendations` from interface (lines 33-34)
- Remove `findings, recommendations` from SELECT query (line 371)
- Remove `findings` and `recommendations` from data mapping (lines 402-403)
- Remove Findings and Recommendations columns from table (lines 1009-1034)

### 5. **AssetManagement.tsx**
**File**: `src/components/AssetManagement.tsx`  
**Status**: NEEDS UPDATE  
**Lines Affected**: 2423-2437

**Required Changes**:
- Remove Findings conditional display (lines 2423-2429)
- Remove Recommendations conditional display (lines 2432-2437)

---

## TypeScript Interface Updates

### PQServiceRecord Interface
**File**: `src/types/database.ts`

**Current**:
```typescript
export interface PQServiceRecord {
  findings: string | null;
  recommendations: string | null;
  // ... other fields
}
```

**After Update**:
```typescript
export interface PQServiceRecord {
  // findings and recommendations removed
  // ... other fields
}
```

---

## Data Impact Analysis

### Usage Summary
The `findings` and `recommendations` columns are currently used in:

| Component | Usage Type | Lines |
|-----------|------------|-------|
| AddServiceModal.tsx | Form input | 22-23, 179-180, 207-208, 463-486 |
| ViewDetailsModal.tsx | Display | 132-145 |
| AffectedCustomerChart.tsx | Table display | 33-34, 371, 402-403, 1009-1034 |
| AssetManagement.tsx | Conditional display | 2423-2437 |
| PQServices.tsx | Export (removed) | ~~287-288~~ |

### Data to be Deleted
Run `scripts/check-findings-recommendations-data.sql` to see:
- Count of records with `findings` data
- Count of records with `recommendations` data
- Sample of data that will be deleted (first 100 characters preview)

**Note**: This data cannot be recovered after migration. If needed, export before running the migration.

---

## Migration Steps

### Step 1: Backup Data (Optional)
```sql
-- Export existing data
SELECT 
  id, case_number, service_type, service_date,
  findings, recommendations
FROM pq_service_records
WHERE (findings IS NOT NULL AND findings != '') 
   OR (recommendations IS NOT NULL AND recommendations != '');
```

### Step 2: Check Data
```bash
# Run the data check script
psql -h <supabase-db-host> -U postgres -d postgres -f scripts/check-findings-recommendations-data.sql
```

### Step 3: Update Code (Do This First!)
Update all 4 components listed above to remove references to `findings` and `recommendations`.

### Step 4: Update TypeScript Interface
Remove `findings` and `recommendations` from `PQServiceRecord` interface in `src/types/database.ts`.

### Step 5: Run Migration
```bash
# Apply the migration
supabase db reset
# or
psql -h <supabase-db-host> -U postgres -d postgres -f supabase/migrations/20260205000002_remove_findings_recommendations.sql
```

### Step 6: Verify
```sql
-- Confirm columns are removed
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pq_service_records' 
AND column_name IN ('findings', 'recommendations');
-- Expected: No rows returned
```

### Step 7: Test UI
- [ ] Test AddServiceModal - form should work without findings/recommendations fields
- [ ] Test ViewDetailsModal - should display service details without findings/recommendations
- [ ] Test AffectedCustomerChart - service table should not show findings/recommendations columns
- [ ] Test AssetManagement - service display should not show findings/recommendations
- [ ] Test PQServices export - Excel should not have findings/recommendations columns

---

## Rollback Plan

If you need to rollback:

```sql
-- Restore columns (data will be lost, cannot recover)
ALTER TABLE pq_service_records
ADD COLUMN findings TEXT;

ALTER TABLE pq_service_records
ADD COLUMN recommendations TEXT;
```

**Note**: This only restores the column structure. Data cannot be recovered unless you have a backup.

---

## Timeline

1. **Today**: Create migration and data check scripts ✅
2. **Next**: Update all 4 components to remove findings/recommendations references
3. **After code update**: Update TypeScript interface
4. **After testing**: Run migration in development
5. **After dev verification**: Run migration in production

---

## Summary

### Files Created
- ✅ `supabase/migrations/20260205000002_remove_findings_recommendations.sql`
- ✅ `scripts/check-findings-recommendations-data.sql`
- ✅ `scripts/FINDINGS_RECOMMENDATIONS_REMOVAL_PLAN.md` (this file)

### Components to Update (4 total)
- ⏸️ AddServiceModal.tsx (remove form fields)
- ⏸️ ViewDetailsModal.tsx (remove display sections)
- ⏸️ AffectedCustomerChart.tsx (remove table columns)
- ⏸️ AssetManagement.tsx (remove conditional display)

### Already Completed
- ✅ PQServices.tsx (removed from export)
- ✅ EventDetails.tsx (already using simple/detail toggle, no findings/recommendations)
- ✅ PQServices.tsx detail view (already using simple/detail toggle, no findings/recommendations)
