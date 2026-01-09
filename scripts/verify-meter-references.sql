-- =====================================================
-- Verification: Check Meter References in Events
-- =====================================================
-- Purpose: Verify data integrity before removing duplicate fields
-- =====================================================

-- 1. Count events without meter_id
SELECT 
  COUNT(*) as events_without_meter,
  COUNT(*) * 100.0 / (SELECT COUNT(*) FROM pq_events) as percentage
FROM pq_events
WHERE meter_id IS NULL;

-- 2. Count events with invalid meter_id (orphaned references)
SELECT 
  COUNT(*) as orphaned_meter_references
FROM pq_events e
WHERE e.meter_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM pq_meters m WHERE m.id = e.meter_id);

-- 3. Compare location data consistency between events and meters
SELECT 
  'site_id_mismatch' as field,
  COUNT(*) as mismatch_count
FROM pq_events e
INNER JOIN pq_meters m ON m.id = e.meter_id
WHERE e.site_id IS DISTINCT FROM m.site_id

UNION ALL

SELECT 
  'voltage_level_mismatch',
  COUNT(*)
FROM pq_events e
INNER JOIN pq_meters m ON m.id = e.meter_id
WHERE e.voltage_level IS DISTINCT FROM m.voltage_level

UNION ALL

SELECT 
  'circuit_id_mismatch',
  COUNT(*)
FROM pq_events e
INNER JOIN pq_meters m ON m.id = e.meter_id
WHERE e.circuit_id IS DISTINCT FROM m.circuit_id

UNION ALL

SELECT 
  'region_mismatch',
  COUNT(*)
FROM pq_events e
INNER JOIN pq_meters m ON m.id = e.meter_id
WHERE e.region IS DISTINCT FROM m.region

UNION ALL

SELECT 
  'oc_mismatch',
  COUNT(*)
FROM pq_events e
INNER JOIN pq_meters m ON m.id = e.meter_id
WHERE e.oc IS DISTINCT FROM m.oc;

-- 4. Show sample of events that would lose location data (no meter_id)
SELECT 
  id,
  event_type,
  timestamp,
  site_id,
  voltage_level,
  circuit_id,
  region,
  oc,
  substation_id
FROM pq_events
WHERE meter_id IS NULL
LIMIT 10;

-- 5. Test JOIN performance with sample query
EXPLAIN ANALYZE
SELECT 
  e.id,
  e.event_type,
  e.timestamp,
  e.severity,
  m.meter_id,
  m.site_id,
  m.voltage_level,
  m.circuit_id,
  m.region,
  m.oc,
  s.name as substation_name
FROM pq_events e
LEFT JOIN pq_meters m ON m.id = e.meter_id
LEFT JOIN substations s ON s.id = e.substation_id
ORDER BY e.timestamp DESC
LIMIT 100;

-- 6. Summary report
SELECT 
  'Total Events' as metric,
  COUNT(*)::TEXT as value
FROM pq_events

UNION ALL

SELECT 
  'Events with meter_id',
  COUNT(*)::TEXT
FROM pq_events
WHERE meter_id IS NOT NULL

UNION ALL

SELECT 
  'Events with valid meter_id',
  COUNT(*)::TEXT
FROM pq_events e
WHERE e.meter_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM pq_meters m WHERE m.id = e.meter_id)

UNION ALL

SELECT 
  'Migration Safety Assessment',
  CASE 
    WHEN (SELECT COUNT(*) FROM pq_events WHERE meter_id IS NULL) = 0 THEN '✅ SAFE - All events have meter_id'
    WHEN (SELECT COUNT(*) FROM pq_events WHERE meter_id IS NULL) < 10 THEN '⚠️  CAUTION - Few events missing meter_id'
    ELSE '❌ UNSAFE - Many events missing meter_id'
  END;
