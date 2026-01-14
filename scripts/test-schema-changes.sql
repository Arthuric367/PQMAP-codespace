-- =====================================================
-- Quick Test: Verify Schema Changes
-- =====================================================
-- Run this to confirm circuit_id moved from pq_events to pq_meters
-- =====================================================

-- Test 1: Verify circuit_id is NOT in pq_events
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'pq_events' 
  AND column_name IN ('circuit_id', 'voltage_level', 'site_id', 'region', 'oc');
-- Expected: 0 rows (these columns were removed)

-- Test 2: Verify circuit_id IS in pq_meters
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'pq_meters' 
  AND column_name IN ('circuit_id', 'voltage_level', 'site_id', 'region', 'oc');
-- Expected: 5 rows

-- Test 3: Sample JOIN to get circuit_id from events
SELECT 
  pe.id as event_id,
  pe.timestamp,
  s.code as substation,
  m.circuit_id,
  m.voltage_level,
  pe.severity
FROM pq_events pe
LEFT JOIN substations s ON s.id = pe.substation_id
LEFT JOIN pq_meters m ON m.id = pe.meter_id
WHERE pe.substation_id IS NOT NULL
ORDER BY pe.timestamp DESC
LIMIT 10;
-- Expected: Shows events with circuit_id from meters

-- Test 4: Check function signature
SELECT routine_name, routine_type, data_type
FROM information_schema.routines
WHERE routine_name = 'generate_customer_impacts_for_event';
-- Expected: 1 row showing the function exists
