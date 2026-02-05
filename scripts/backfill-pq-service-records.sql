-- Backfill Script: Populate PQ Service Records with Realistic Data
-- Date: February 5, 2026
-- Purpose: Add realistic placeholder data to new columns in pq_service_records

-- Step 1: Backfill tariff_group with realistic values
UPDATE pq_service_records
SET tariff_group = CASE 
  WHEN random() < 0.3 THEN 'BT' -- Bulk Tariff (30%)
  WHEN random() < 0.5 THEN 'HT' -- High Tension (20%)
  WHEN random() < 0.7 THEN 'LT' -- Low Tension (20%)
  WHEN random() < 0.85 THEN 'RES' -- Residential (15%)
  ELSE 'IND' -- Industrial (15%)
END
WHERE tariff_group IS NULL;

-- Step 2: Backfill service_charge_amount with realistic amounts (5k - 50k HKD)
UPDATE pq_service_records
SET service_charge_amount = ROUND((5 + random() * 45)::numeric, 2) * 1000
WHERE service_charge_amount IS NULL;

-- Step 3: Backfill party_charged with realistic parties
UPDATE pq_service_records
SET party_charged = CASE 
  WHEN random() < 0.4 THEN 'CLP'
  WHEN random() < 0.6 THEN 'Customer'
  WHEN random() < 0.8 THEN 'AMD'
  ELSE 'Third Party'
END
WHERE party_charged IS NULL;

-- Step 4: Backfill completion_date
-- For older records (>30 days), set completion_date to service_date + random 7-30 days
-- For recent records, leave NULL (in progress)
UPDATE pq_service_records
SET completion_date = service_date + INTERVAL '1 day' * (7 + floor(random() * 24)::int)
WHERE completion_date IS NULL 
  AND service_date < CURRENT_DATE - INTERVAL '30 days'
  AND random() < 0.8; -- 80% completion rate for old records

-- Step 5: Update is_closed based on completion_date
UPDATE pq_service_records
SET is_closed = true,
    is_in_progress = false
WHERE completion_date IS NOT NULL;

-- Step 6: Keep in_progress true for records without completion_date
UPDATE pq_service_records
SET is_closed = false,
    is_in_progress = true
WHERE completion_date IS NULL;

-- Step 7: Backfill planned_reply_date (service_date + 3-5 days)
UPDATE pq_service_records
SET planned_reply_date = service_date + INTERVAL '1 day' * (3 + floor(random() * 3)::int)
WHERE planned_reply_date IS NULL;

-- Step 8: Backfill actual_reply_date (for closed cases, planned_reply_date +/- 1-3 days)
UPDATE pq_service_records
SET actual_reply_date = planned_reply_date + INTERVAL '1 day' * (floor(random() * 7)::int - 3)
WHERE actual_reply_date IS NULL 
  AND is_closed = true
  AND planned_reply_date IS NOT NULL;

-- Step 9: Backfill planned_report_issue_date (service_date + 7-14 days)
UPDATE pq_service_records
SET planned_report_issue_date = service_date + INTERVAL '1 day' * (7 + floor(random() * 8)::int)
WHERE planned_report_issue_date IS NULL;

-- Step 10: Backfill actual_report_issue_date (for closed cases)
UPDATE pq_service_records
SET actual_report_issue_date = planned_report_issue_date + INTERVAL '1 day' * (floor(random() * 10)::int - 5)
WHERE actual_report_issue_date IS NULL 
  AND is_closed = true
  AND planned_report_issue_date IS NOT NULL;

-- Step 11: Backfill completed_before_target
-- TRUE if actual_reply_date <= planned_reply_date
UPDATE pq_service_records
SET completed_before_target = (actual_reply_date <= planned_reply_date)
WHERE actual_reply_date IS NOT NULL 
  AND planned_reply_date IS NOT NULL;

-- Step 12: Backfill business_nature with realistic values
UPDATE pq_service_records
SET business_nature = CASE 
  WHEN random() < 0.15 THEN 'Shopping Centre'
  WHEN random() < 0.30 THEN 'Factory'
  WHEN random() < 0.45 THEN 'Office Building'
  WHEN random() < 0.60 THEN 'Residential Complex'
  WHEN random() < 0.70 THEN 'Data Centre'
  WHEN random() < 0.80 THEN 'Hospital'
  WHEN random() < 0.90 THEN 'Hotel'
  ELSE 'Industrial Plant'
END
WHERE business_nature IS NULL;

-- Step 13: Backfill participant_count (only for consultation and installation_support service types)
UPDATE pq_service_records
SET participant_count = 5 + floor(random() * 26)::int -- Random 5-30 participants
WHERE participant_count IS NULL 
  AND service_type IN ('consultation', 'installation_support');

-- Step 14: Backfill ss132_info and ss011_info from linked events
-- This requires joining with pq_events and pq_meters tables
UPDATE pq_service_records sr
SET 
  ss132_info = COALESCE(m.ss132, 'N/A'),
  ss011_info = COALESCE(m.ss011, 'N/A')
FROM pq_events e
JOIN pq_meters m ON e.meter_id = m.id
WHERE sr.event_id = e.id
  AND sr.event_id IS NOT NULL
  AND (sr.ss132_info IS NULL OR sr.ss011_info IS NULL);

-- Step 15: For service records without linked events, set substation info to 'N/A'
UPDATE pq_service_records
SET 
  ss132_info = 'N/A',
  ss011_info = 'N/A'
WHERE event_id IS NULL
  AND (ss132_info IS NULL OR ss011_info IS NULL);

-- Verification queries
-- Run these after backfill to verify data

-- Check completion rate
SELECT 
  COUNT(*) FILTER (WHERE is_closed = true) as closed_cases,
  COUNT(*) FILTER (WHERE is_in_progress = true) as in_progress_cases,
  COUNT(*) as total_cases,
  ROUND(COUNT(*) FILTER (WHERE is_closed = true)::numeric / COUNT(*)::numeric * 100, 2) as completion_rate_pct
FROM pq_service_records;

-- Check tariff group distribution
SELECT 
  tariff_group,
  COUNT(*) as count,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM pq_service_records)::numeric * 100, 2) as percentage
FROM pq_service_records
WHERE tariff_group IS NOT NULL
GROUP BY tariff_group
ORDER BY count DESC;

-- Check business nature distribution
SELECT 
  business_nature,
  COUNT(*) as count
FROM pq_service_records
WHERE business_nature IS NOT NULL
GROUP BY business_nature
ORDER BY count DESC;

-- Check completed before target rate
SELECT 
  COUNT(*) FILTER (WHERE completed_before_target = true) as completed_on_time,
  COUNT(*) FILTER (WHERE completed_before_target = false) as completed_late,
  COUNT(*) as total_completed,
  ROUND(COUNT(*) FILTER (WHERE completed_before_target = true)::numeric / NULLIF(COUNT(*), 0)::numeric * 100, 2) as on_time_rate_pct
FROM pq_service_records
WHERE completed_before_target IS NOT NULL;

-- Check service charge amount statistics
SELECT 
  MIN(service_charge_amount) as min_charge,
  ROUND(AVG(service_charge_amount)::numeric, 2) as avg_charge,
  MAX(service_charge_amount) as max_charge,
  COUNT(*) as total_records
FROM pq_service_records
WHERE service_charge_amount IS NOT NULL;

-- Sample records to review
SELECT 
  case_number,
  service_date,
  service_type,
  tariff_group,
  service_charge_amount,
  party_charged,
  is_closed,
  is_in_progress,
  completed_before_target,
  business_nature,
  ss132_info,
  ss011_info
FROM pq_service_records
ORDER BY case_number DESC
LIMIT 10;
