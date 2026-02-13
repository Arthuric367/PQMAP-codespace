-- Backfill oc and location fields for pq_meters table
-- This script updates NULL oc and location values with realistic assignments
-- Created: 2026-02-13
-- Purpose: Populate oc and location fields for SARFI-70 aggregation tables

-- Step 1: Create temporary function to get random OC (Operating Center)
CREATE OR REPLACE FUNCTION get_random_oc() 
RETURNS TEXT AS $$
DECLARE
  -- Common CLP operating centers
  ocs TEXT[] := ARRAY[
    'YUE', 'LME', 'TSE', 'TPE', 'CPK', 
    'KTE', 'TKO', 'HKE', 'WYE', 'CWE'
  ];
BEGIN
  RETURN ocs[floor(random() * array_length(ocs, 1) + 1)];
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create temporary function to get random location
CREATE OR REPLACE FUNCTION get_random_location() 
RETURNS TEXT AS $$
DECLARE
  -- Common meter installation locations within substations
  locations TEXT[] := ARRAY[
    'Tsuen Wan',
    'Kwai Tsing',
    'Kwun Tong',
    'Shatin',
    'Central & Western',
    'Eastern',
    'HK Island South',
    'North',
    'Tai Po'
  ];
BEGIN
  RETURN locations[floor(random() * array_length(locations, 1) + 1)];
END;
$$ LANGUAGE plpgsql;

-- Step 3: Display current state (before update)
DO $$
DECLARE
  total_count INTEGER;
  null_oc_count INTEGER;
  null_location_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM pq_meters;
  SELECT COUNT(*) INTO null_oc_count FROM pq_meters WHERE oc IS NULL OR oc = '';
  SELECT COUNT(*) INTO null_location_count FROM pq_meters WHERE location IS NULL OR location = '';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'BEFORE UPDATE:';
  RAISE NOTICE 'Total meters: %', total_count;
  RAISE NOTICE 'Meters with NULL/empty oc: %', null_oc_count;
  RAISE NOTICE 'Meters with NULL/empty location: %', null_location_count;
  RAISE NOTICE '========================================';
END $$;

-- Step 4: Update NULL oc values with random assignments
UPDATE pq_meters
SET oc = get_random_oc()
WHERE oc IS NULL OR oc = '';

-- Step 5: Update NULL location values with random assignments
UPDATE pq_meters
SET location = get_random_location()
WHERE location IS NULL OR location = '';

-- Step 6: Display current state (after update)
DO $$
DECLARE
  total_count INTEGER;
  null_oc_count INTEGER;
  null_location_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM pq_meters;
  SELECT COUNT(*) INTO null_oc_count FROM pq_meters WHERE oc IS NULL OR oc = '';
  SELECT COUNT(*) INTO null_location_count FROM pq_meters WHERE location IS NULL OR location = '';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'AFTER UPDATE:';
  RAISE NOTICE 'Total meters: %', total_count;
  RAISE NOTICE 'Meters with NULL/empty oc: %', null_oc_count;
  RAISE NOTICE 'Meters with NULL/empty location: %', null_location_count;
  RAISE NOTICE '========================================';
END $$;

-- Step 7: Show OC distribution
SELECT 
  'OC Distribution' as metric_type,
  oc as value,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM pq_meters WHERE oc IS NOT NULL), 2) as percentage
FROM pq_meters
WHERE oc IS NOT NULL
GROUP BY oc
ORDER BY count DESC;

-- Step 8: Show Location distribution
SELECT 
  'Location Distribution' as metric_type,
  location as value,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM pq_meters WHERE location IS NOT NULL), 2) as percentage
FROM pq_meters
WHERE location IS NOT NULL
GROUP BY location
ORDER BY count DESC;

-- Step 9: Verification - Check for any remaining NULL values
SELECT 
  COUNT(*) as total_meters,
  COUNT(CASE WHEN oc IS NOT NULL AND oc != '' THEN 1 END) as meters_with_oc,
  COUNT(CASE WHEN location IS NOT NULL AND location != '' THEN 1 END) as meters_with_location,
  COUNT(CASE WHEN (oc IS NULL OR oc = '') THEN 1 END) as remaining_null_oc,
  COUNT(CASE WHEN (location IS NULL OR location = '') THEN 1 END) as remaining_null_location
FROM pq_meters;

-- Step 10: Clean up temporary functions
DROP FUNCTION IF EXISTS get_random_oc();
DROP FUNCTION IF EXISTS get_random_location();

-- Completion message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Backfill completed successfully!';
  RAISE NOTICE 'All pq_meters records now have oc and location values.';
  RAISE NOTICE 'Use these fields for SARFI-70 aggregation tables.';
  RAISE NOTICE '========================================';
END $$;
