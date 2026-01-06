-- Migration: Rename 'active' column to 'enable' in pq_meters table
-- Purpose: Distinguish between operational status (status) and system enablement (enable)
-- Date: 2026-01-06

-- Step 1: Add ip_address column if it doesn't exist (fixes schema cache error)
ALTER TABLE pq_meters 
ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Step 2: Rename 'active' column to 'enable'
ALTER TABLE pq_meters 
RENAME COLUMN active TO enable;

-- Step 3: Add comment to clarify field purpose
COMMENT ON COLUMN pq_meters.enable IS 'System enablement flag - when false, meter is excluded from KPIs and reports';
COMMENT ON COLUMN pq_meters.status IS 'Operational status of the meter (active/abnormal/inactive)';

-- Step 4: Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'pq_meters' 
AND column_name IN ('enable', 'status', 'ip_address')
ORDER BY column_name;

-- Step 5: Show sample data to verify
SELECT 
    meter_id,
    status,
    enable,
    ip_address
FROM pq_meters
LIMIT 5;
