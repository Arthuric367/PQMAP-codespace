-- Debug script to check 380V harmonic events
-- Run this to diagnose why 380V columns aren't being populated

-- 1. Check if there are any harmonic events at all
SELECT 
  'Total harmonic events' as check_type,
  COUNT(*) as count
FROM pq_events
WHERE event_type = 'harmonic';

-- 2. Check voltage levels of meters with harmonic events
SELECT 
  'Harmonic events by voltage level' as check_type,
  m.voltage_level,
  COUNT(*) as count
FROM pq_events pe
LEFT JOIN pq_meters m ON m.id = pe.meter_id
WHERE pe.event_type = 'harmonic'
GROUP BY m.voltage_level
ORDER BY m.voltage_level;

-- 3. Check if there are any 380V meters at all
SELECT 
  'Total 380V meters' as check_type,
  COUNT(*) as count
FROM pq_meters
WHERE voltage_level = '380V';

-- 4. Check if any 380V meters have harmonic events
SELECT 
  '380V meters with harmonic events' as check_type,
  COUNT(DISTINCT pe.id) as harmonic_event_count,
  COUNT(DISTINCT m.id) as meter_count
FROM pq_events pe
JOIN pq_meters m ON m.id = pe.meter_id
WHERE pe.event_type = 'harmonic'
  AND m.voltage_level = '380V';

-- 5. Show sample 380V harmonic events (if any)
SELECT 
  'Sample 380V harmonic events' as info,
  pe.id as event_id,
  pe.timestamp,
  m.meter_id,
  m.voltage_level,
  m.location,
  he.pqevent_id as has_harmonic_record
FROM pq_events pe
JOIN pq_meters m ON m.id = pe.meter_id
LEFT JOIN harmonic_events he ON he.pqevent_id = pe.id
WHERE pe.event_type = 'harmonic'
  AND m.voltage_level = '380V'
LIMIT 10;

-- 6. Check existing harmonic_events records for 380V
SELECT 
  'Existing 380V harmonic_events records' as check_type,
  COUNT(*) as count,
  COUNT(CASE WHEN voltage_va IS NOT NULL THEN 1 END) as with_380v_data,
  COUNT(CASE WHEN I1_THD_10m IS NOT NULL THEN 1 END) as with_i1i2i3_data
FROM harmonic_events he
JOIN pq_events pe ON pe.id = he.pqevent_id
JOIN pq_meters m ON m.id = pe.meter_id
WHERE m.voltage_level = '380V';

-- 7. Check exact voltage_level values (might have whitespace or case issues)
SELECT DISTINCT 
  'Distinct voltage_level values' as info,
  voltage_level,
  LENGTH(voltage_level) as length,
  COUNT(*) as meter_count
FROM pq_meters
WHERE voltage_level IS NOT NULL
GROUP BY voltage_level
ORDER BY voltage_level;
