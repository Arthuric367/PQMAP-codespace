-- =====================================================
-- Check Customer Impact Status
-- =====================================================
-- Purpose: Verify data before running backfill script
-- Date: January 14, 2026
-- =====================================================

-- Check 1: Active customer-transformer mappings
SELECT 
  '1. Customer Transformer Mappings' as check_name,
  COUNT(*) as active_mappings,
  COUNT(DISTINCT customer_id) as unique_customers,
  COUNT(DISTINCT substation_id) as unique_substations,
  COUNT(DISTINCT circuit_id) as unique_circuits
FROM customer_transformer_matching
WHERE active = true;

-- Check 2: PQ Events available for backfill
SELECT 
  '2. PQ Events Status' as check_name,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE pe.substation_id IS NOT NULL AND m.circuit_id IS NOT NULL) as events_with_circuit,
  COUNT(*) FILTER (WHERE pe.substation_id IS NULL OR m.circuit_id IS NULL) as events_missing_circuit,
  MIN(pe.timestamp) as oldest_event,
  MAX(pe.timestamp) as newest_event
FROM pq_events pe
LEFT JOIN pq_meters m ON m.id = pe.meter_id;

-- Check 3: Current event_customer_impact records
SELECT 
  '3. Existing Customer Impacts' as check_name,
  COUNT(*) as total_impacts,
  COUNT(DISTINCT event_id) as events_with_impacts,
  COUNT(DISTINCT customer_id) as customers_affected
FROM event_customer_impact;

-- Check 4: Sample events that would be backfilled
SELECT 
  '4. Sample Events for Backfill' as analysis,
  pe.id as event_id,
  pe.event_type,
  pe.severity,
  pe.timestamp,
  s.code as substation_code,
  m.circuit_id,
  COUNT(ctm.customer_id) as potential_customer_impacts
FROM pq_events pe
LEFT JOIN substations s ON s.id = pe.substation_id
LEFT JOIN pq_meters m ON m.id = pe.meter_id
LEFT JOIN customer_transformer_matching ctm ON 
  ctm.substation_id = pe.substation_id 
  AND ctm.circuit_id = m.circuit_id
  AND ctm.active = true
LEFT JOIN event_customer_impact eci ON eci.event_id = pe.id
WHERE pe.substation_id IS NOT NULL 
  AND m.circuit_id IS NOT NULL
  AND eci.id IS NULL  -- Events without impacts yet
GROUP BY pe.id, pe.event_type, pe.severity, pe.timestamp, s.code, m.circuit_id
ORDER BY pe.timestamp DESC
LIMIT 10;

-- Check 5: Mapping coverage summary
SELECT 
  '5. Mapping Coverage' as analysis,
  s.code as substation_code,
  m.circuit_id,
  COUNT(DISTINCT pe.id) as events_at_circuit,
  COUNT(DISTINCT ctm.customer_id) as mapped_customers
FROM pq_events pe
JOIN substations s ON s.id = pe.substation_id
LEFT JOIN pq_meters m ON m.id = pe.meter_id
LEFT JOIN customer_transformer_matching ctm ON 
  ctm.substation_id = pe.substation_id 
  AND ctm.circuit_id = m.circuit_id
  AND ctm.active = true
WHERE pe.substation_id IS NOT NULL 
  AND m.circuit_id IS NOT NULL
GROUP BY s.code, m.circuit_id
HAVING COUNT(DISTINCT pe.id) > 0
ORDER BY events_at_circuit DESC
LIMIT 10;
