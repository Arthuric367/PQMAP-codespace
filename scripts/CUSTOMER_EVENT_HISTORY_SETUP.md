# Customer Event History - Data Setup Guide

## Issue Identified

The **CustomerEventHistoryPanel** is empty because the `event_customer_impact` table has no data. Additionally, the existing backfill script and the `generate_customer_impacts_for_event()` function were referencing `circuit_id` directly from `pq_events` table, but this column was moved to `pq_meters` in migration `20260108000000_remove_duplicate_location_fields.sql`.

## Files Updated

### 1. ✅ Fixed: `scripts/check-customer-impact-status.sql`
- Updated all queries to JOIN `pq_meters` table to get `circuit_id`
- Now correctly checks data availability before backfill

### 2. ✅ Fixed: `scripts/backfill_customer_impacts.sql`
- Updated to get `circuit_id` from `pq_meters` via JOIN
- Will now correctly generate customer impact records

### 3. ✅ Created: `supabase/migrations/20260114000001_fix_customer_impact_function.sql`
- Updated `generate_customer_impacts_for_event()` function
- Function now retrieves `circuit_id` from `pq_meters` table via `meter_id`
- This fixes the automatic trigger for new events

## Setup Steps

### Step 1: Run the Migration (In Supabase SQL Editor)

```sql
-- Copy and run the contents of:
supabase/migrations/20260114000001_fix_customer_impact_function.sql
```

This updates the `generate_customer_impacts_for_event()` function to work with the current schema.

### Step 2: Verify Data Status (In Supabase SQL Editor)

```sql
-- Copy and run the contents of:
scripts/check-customer-impact-status.sql
```

**Expected Results:**
- Check 1: Shows count of active customer-transformer mappings
- Check 2: Shows how many events have circuit_id (via meter)
- Check 3: Shows current customer impact records (likely 0)
- Check 4: Shows sample events that would be backfilled
- Check 5: Shows which circuits have the most events

### Step 3: Create Customer-Transformer Mappings (If Needed)

If Check 1 shows 0 active mappings, you need to create them first:

**Option A: Using the UI**
1. Navigate to the CustomerTransformerMatching component
2. Manually create mappings for customers to substations and circuits

**Option B: Run Bulk Import**
- Use the "Bulk Import" button in CustomerTransformerMatching UI
- Or create a SQL script to INSERT mappings

**Sample Mapping Creation:**
```sql
-- Example: Create mappings for existing customers
INSERT INTO customer_transformer_matching (
  customer_id,
  substation_id,
  circuit_id,
  active,
  created_at,
  updated_at
)
SELECT 
  c.id as customer_id,
  c.substation_id,
  'H1' as circuit_id,  -- Adjust based on your circuit naming
  true as active,
  now() as created_at,
  now() as updated_at
FROM customers c
WHERE c.substation_id IS NOT NULL
ON CONFLICT DO NOTHING;
```

### Step 4: Run Backfill Script (In Supabase SQL Editor)

```sql
-- Copy and run the contents of:
scripts/backfill_customer_impacts.sql
```

This will:
- Loop through all historical events with substation + circuit_id
- Call `generate_customer_impacts_for_event()` for each event
- Create `event_customer_impact` records for matched customers
- Show progress and summary statistics

**Expected Output:**
```
=== BACKFILL CUSTOMER IMPACTS - STARTED ===
Total events in database: 1234
Events with substation + circuit: 987
Active customer mappings found: 150
Starting backfill process...

Progress: 100 customer impacts generated so far...
Progress: 200 customer impacts generated so far...
...

=== BACKFILL COMPLETE ===
Total customer impacts generated: 1456
Average impacts per event: 1.48
```

### Step 5: Test Customer Event History Panel

1. Navigate to EventDetails for any event
2. Go to the "Impact" tab
3. Click on a customer name (should be a blue clickable button)
4. The **CustomerEventHistoryPanel** should slide in from the right
5. You should see the customer's event history for the past 6 months

## Database Schema Notes

### Current Schema (After Migration 20260108000000)

**pq_events:**
- ✅ Has: `meter_id` (FK to pq_meters)
- ❌ NO: `circuit_id`, `voltage_level`, `site_id`, `region`, `oc`

**pq_meters:**
- ✅ Has: `circuit_id`, `voltage_level`, `site_id`, `region`, `oc`

**To Get Circuit ID:**
```sql
-- Correct way (via JOIN)
SELECT pe.*, m.circuit_id, m.voltage_level
FROM pq_events pe
LEFT JOIN pq_meters m ON m.id = pe.meter_id;

-- ❌ Wrong way (will fail)
SELECT circuit_id FROM pq_events;  -- Column doesn't exist!
```

### Customer Impact Logic

**Matching Rules:**
- Match on **BOTH** `substation_id` AND `circuit_id`
- Only active mappings (`active = true`)

**Impact Level Mapping:**
- `critical` → `severe`
- `high` → `moderate`
- `medium` → `minor`
- `low` → `minor`

**Downtime Calculation:**
- `duration_ms / 60000` = minutes
- Rounded to 2 decimals

## Troubleshooting

### Panel is Still Empty After Backfill

1. **Check if impacts were created:**
   ```sql
   SELECT COUNT(*) FROM event_customer_impact;
   ```

2. **Check if customer has impacts:**
   ```sql
   SELECT * FROM event_customer_impact 
   WHERE customer_id = '<customer-id>';
   ```

3. **Check if query is working:**
   - Open browser DevTools → Console
   - Look for Supabase query logs when clicking customer name
   - Check for any error messages

### No Mappings Created

Check if customers have `substation_id`:
```sql
SELECT 
  COUNT(*) as total_customers,
  COUNT(substation_id) as customers_with_substation
FROM customers;
```

### Events Missing circuit_id

Check if meters have `circuit_id` populated:
```sql
SELECT 
  COUNT(*) as total_meters,
  COUNT(circuit_id) as meters_with_circuit
FROM pq_meters;
```

If meters are missing circuit_id, you may need to run a migration to populate them.

## Summary

- ✅ Fixed `generate_customer_impacts_for_event()` function
- ✅ Fixed `backfill_customer_impacts.sql` script
- ✅ Fixed `check-customer-impact-status.sql` verification script
- ✅ All scripts now use correct schema (circuit_id from pq_meters)

**Next Action:** Run the migration, verify data, and execute backfill!
