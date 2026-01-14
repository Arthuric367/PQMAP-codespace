-- =====================================================
-- Debug Customer Event History for MTR Corporation (4)
-- =====================================================
-- Customer UUID: 58fedf4b-d1e7-4c53-b64c-cdb6b90ca35b
-- Event ID: 05c92631
-- =====================================================

-- Step 1: Verify customer exists
SELECT 
  'Customer Details' as check_type,
  id,
  name,
  account_number,
  address,
  substation_id
FROM customers
WHERE id = '58fedf4b-d1e7-4c53-b64c-cdb6b90ca35b';

-- Step 2: Check all event_customer_impact records for this customer
SELECT 
  'All Customer Impacts' as check_type,
  eci.id as impact_id,
  eci.event_id,
  eci.customer_id,
  eci.impact_level,
  eci.estimated_downtime_min,
  eci.created_at as impact_created_at
FROM event_customer_impact eci
WHERE eci.customer_id = '58fedf4b-d1e7-4c53-b64c-cdb6b90ca35b'
ORDER BY eci.created_at DESC;

-- Step 3: Check events with timestamps (to see date range)
SELECT 
  'Events with Timestamps' as check_type,
  eci.id as impact_id,
  eci.event_id,
  pe.timestamp as event_timestamp,
  pe.event_type,
  pe.severity,
  pe.substation_id,
  pe.meter_id,
  AGE(now(), pe.timestamp) as age
FROM event_customer_impact eci
JOIN pq_events pe ON pe.id = eci.event_id
WHERE eci.customer_id = '58fedf4b-d1e7-4c53-b64c-cdb6b90ca35b'
ORDER BY pe.timestamp DESC;

-- Step 4: Check the specific event 05c92631
SELECT 
  'Specific Event Check' as check_type,
  pe.id as event_id,
  pe.timestamp,
  pe.event_type,
  pe.severity,
  pe.substation_id,
  pe.meter_id,
  s.name as substation_name,
  s.code as substation_code,
  m.circuit_id,
  m.voltage_level
FROM pq_events pe
LEFT JOIN substations s ON s.id = pe.substation_id
LEFT JOIN pq_meters m ON m.id = pe.meter_id
WHERE pe.id IN (
  SELECT event_id 
  FROM event_customer_impact 
  WHERE customer_id = '58fedf4b-d1e7-4c53-b64c-cdb6b90ca35b'
)
ORDER BY pe.timestamp DESC;

-- Step 5: Test the exact query that CustomerEventHistoryPanel uses
-- (Default: last 6 months)
SELECT 
  'CustomerEventHistoryPanel Query (Last 6 Months)' as check_type,
  eci.*,
  pe.timestamp as event_timestamp,
  pe.event_type,
  pe.severity
FROM event_customer_impact eci
LEFT JOIN pq_events pe ON pe.id = eci.event_id
WHERE eci.customer_id = '58fedf4b-d1e7-4c53-b64c-cdb6b90ca35b'
  AND pe.timestamp >= (now() - interval '6 months')
  AND pe.timestamp <= now()
ORDER BY pe.timestamp DESC;

-- Step 6: Check date range of ALL customer's events
SELECT 
  'Date Range Summary' as check_type,
  COUNT(*) as total_events,
  MIN(pe.timestamp) as oldest_event,
  MAX(pe.timestamp) as newest_event,
  COUNT(*) FILTER (WHERE pe.timestamp >= (now() - interval '6 months')) as events_last_6_months,
  COUNT(*) FILTER (WHERE pe.timestamp >= (now() - interval '1 year')) as events_last_year
FROM event_customer_impact eci
JOIN pq_events pe ON pe.id = eci.event_id
WHERE eci.customer_id = '58fedf4b-d1e7-4c53-b64c-cdb6b90ca35b';

-- Step 7: Check if meter data is available
SELECT 
  'Meter Data Check' as check_type,
  pe.id as event_id,
  pe.timestamp,
  pe.meter_id,
  m.id as meter_exists,
  m.circuit_id,
  m.voltage_level
FROM event_customer_impact eci
JOIN pq_events pe ON pe.id = eci.event_id
LEFT JOIN pq_meters m ON m.id = pe.meter_id
WHERE eci.customer_id = '58fedf4b-d1e7-4c53-b64c-cdb6b90ca35b'
ORDER BY pe.timestamp DESC
LIMIT 10;
