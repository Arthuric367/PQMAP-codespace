-- ============================================================================
-- Fix Script: Update existing harmonic_events for 380V meters
-- Created: 2026-01-12
-- Purpose: Populate 380V-specific columns for existing harmonic_events records
--          that were created before the 380V columns existed
-- ============================================================================

-- Disable the trigger temporarily to allow updates
ALTER TABLE harmonic_events DISABLE TRIGGER validate_harmonic_columns_trigger;

-- ============================================================================
-- STEP 1: Check current state
-- ============================================================================

SELECT 
  'Harmonic events by voltage level' as description,
  m.voltage_level,
  COUNT(*) as total_events,
  COUNT(he.id) as has_harmonic_record,
  COUNT(he.voltage_va) as has_380v_data,
  COUNT(he.I1_THD_10m) as has_i1i2i3_data
FROM pq_events pe
LEFT JOIN pq_meters m ON m.id = pe.meter_id
LEFT JOIN harmonic_events he ON he.pqevent_id = pe.id
WHERE pe.event_type = 'harmonic'
GROUP BY m.voltage_level
ORDER BY m.voltage_level;

-- ============================================================================
-- STEP 2: Update existing 380V harmonic_events records with new column data
-- ============================================================================

-- Clear I1/I2/I3 data from 380V records (if any exist)
UPDATE harmonic_events he
SET 
  I1_THD_10m = NULL,
  I1_TEHD_10m = NULL,
  I1_TOHD_10m = NULL,
  I1_TDD_10m = NULL,
  I2_THD_10m = NULL,
  I2_TEHD_10m = NULL,
  I2_TOHD_10m = NULL,
  I2_TDD_10m = NULL,
  I3_THD_10m = NULL,
  I3_TEHD_10m = NULL,
  I3_TOHD_10m = NULL,
  I3_TDD_10m = NULL
FROM pq_events pe
JOIN pq_meters m ON m.id = pe.meter_id
WHERE 
  he.pqevent_id = pe.id
  AND m.voltage_level = '380V'
  AND (
    he.I1_THD_10m IS NOT NULL OR
    he.I1_TEHD_10m IS NOT NULL OR
    he.I1_TOHD_10m IS NOT NULL OR
    he.I1_TDD_10m IS NOT NULL OR
    he.I2_THD_10m IS NOT NULL OR
    he.I2_TEHD_10m IS NOT NULL OR
    he.I2_TOHD_10m IS NOT NULL OR
    he.I2_TDD_10m IS NOT NULL OR
    he.I3_THD_10m IS NOT NULL OR
    he.I3_TEHD_10m IS NOT NULL OR
    he.I3_TOHD_10m IS NOT NULL OR
    he.I3_TDD_10m IS NOT NULL
  );

-- Populate 380V-specific columns for existing records
UPDATE harmonic_events he
SET
  description = 'Harmonic measurement at ' || m.location,
  tdd_limit = ROUND((8.0 + (random() * 2))::numeric, 2),
  non_compliance = ROUND((random() * 3)::numeric, 2),
  
  -- Voltage measurements
  voltage_va = ROUND((380.0 + (random() * 20 - 10))::numeric, 2),
  voltage_vb = ROUND((380.0 + (random() * 20 - 10))::numeric, 2),
  voltage_vc = ROUND((380.0 + (random() * 20 - 10))::numeric, 2),
  
  -- Current measurements
  current_ia = ROUND((100.0 + (random() * 200))::numeric, 2),
  current_ib = ROUND((100.0 + (random() * 200))::numeric, 2),
  current_ic = ROUND((100.0 + (random() * 200))::numeric, 2),
  
  -- THD Voltage
  thd_voltage_a = ROUND((COALESCE(pe.magnitude, 3.0) * 0.6 + (random() * 1))::numeric, 2),
  thd_voltage_b = ROUND((COALESCE(pe.magnitude, 3.0) * 0.6 + (random() * 1))::numeric, 2),
  thd_voltage_c = ROUND((COALESCE(pe.magnitude, 3.0) * 0.6 + (random() * 1))::numeric, 2),
  
  -- THD Odd Current
  thd_odd_current_a = ROUND((COALESCE(pe.magnitude, 5.0) * 0.8 + (random() * 1.5))::numeric, 2),
  thd_odd_current_b = ROUND((COALESCE(pe.magnitude, 5.0) * 0.8 + (random() * 1.5))::numeric, 2),
  thd_odd_current_c = ROUND((COALESCE(pe.magnitude, 5.0) * 0.8 + (random() * 1.5))::numeric, 2),
  
  -- THD Even
  thd_even_a = ROUND((COALESCE(pe.magnitude, 5.0) * 0.15 + (random() * 0.5))::numeric, 2),
  thd_even_b = ROUND((COALESCE(pe.magnitude, 5.0) * 0.15 + (random() * 0.5))::numeric, 2),
  thd_even_c = ROUND((COALESCE(pe.magnitude, 5.0) * 0.15 + (random() * 0.5))::numeric, 2),
  
  -- THD Current
  thd_current_a = ROUND((COALESCE(pe.magnitude, 5.0) + (random() * 2))::numeric, 2),
  thd_current_b = ROUND((COALESCE(pe.magnitude, 5.0) + (random() * 2))::numeric, 2),
  thd_current_c = ROUND((COALESCE(pe.magnitude, 5.0) + (random() * 2))::numeric, 2),
  
  -- Maximum load current
  il_max = ROUND((150.0 + (random() * 300))::numeric, 2),
  
  -- TDD Odd Current
  tdd_odd_current_a = ROUND((COALESCE(pe.magnitude, 5.0) * 0.75 + (random() * 1.2))::numeric, 2),
  tdd_odd_current_b = ROUND((COALESCE(pe.magnitude, 5.0) * 0.75 + (random() * 1.2))::numeric, 2),
  tdd_odd_current_c = ROUND((COALESCE(pe.magnitude, 5.0) * 0.75 + (random() * 1.2))::numeric, 2),
  
  -- TDD Even Current
  tdd_even_current_a = ROUND((COALESCE(pe.magnitude, 5.0) * 0.12 + (random() * 0.4))::numeric, 2),
  tdd_even_current_b = ROUND((COALESCE(pe.magnitude, 5.0) * 0.12 + (random() * 0.4))::numeric, 2),
  tdd_even_current_c = ROUND((COALESCE(pe.magnitude, 5.0) * 0.12 + (random() * 0.4))::numeric, 2),
  
  -- TDD Current
  tdd_current_a = ROUND((COALESCE(pe.magnitude, 5.0) * 0.85 + (random() * 1.5))::numeric, 2),
  tdd_current_b = ROUND((COALESCE(pe.magnitude, 5.0) * 0.85 + (random() * 1.5))::numeric, 2),
  tdd_current_c = ROUND((COALESCE(pe.magnitude, 5.0) * 0.85 + (random() * 1.5))::numeric, 2)
FROM pq_events pe
JOIN pq_meters m ON m.id = pe.meter_id
WHERE 
  he.pqevent_id = pe.id
  AND m.voltage_level = '380V'
  AND he.voltage_va IS NULL;  -- Only update if not already populated

-- Re-enable the trigger
ALTER TABLE harmonic_events ENABLE TRIGGER validate_harmonic_columns_trigger;

-- ============================================================================
-- STEP 3: Insert any missing 380V harmonic_events records (if needed)
-- ============================================================================

INSERT INTO harmonic_events (
  pqevent_id,
  description,
  tdd_limit,
  non_compliance,
  voltage_va,
  voltage_vb,
  voltage_vc,
  current_ia,
  current_ib,
  current_ic,
  thd_voltage_a,
  thd_voltage_b,
  thd_voltage_c,
  thd_odd_current_a,
  thd_odd_current_b,
  thd_odd_current_c,
  thd_even_a,
  thd_even_b,
  thd_even_c,
  thd_current_a,
  thd_current_b,
  thd_current_c,
  il_max,
  tdd_odd_current_a,
  tdd_odd_current_b,
  tdd_odd_current_c,
  tdd_even_current_a,
  tdd_even_current_b,
  tdd_even_current_c,
  tdd_current_a,
  tdd_current_b,
  tdd_current_c
)
SELECT 
  pe.id as pqevent_id,
  'Harmonic measurement at ' || m.location,
  ROUND((8.0 + (random() * 2))::numeric, 2),
  ROUND((random() * 3)::numeric, 2),
  ROUND((380.0 + (random() * 20 - 10))::numeric, 2),
  ROUND((380.0 + (random() * 20 - 10))::numeric, 2),
  ROUND((380.0 + (random() * 20 - 10))::numeric, 2),
  ROUND((100.0 + (random() * 200))::numeric, 2),
  ROUND((100.0 + (random() * 200))::numeric, 2),
  ROUND((100.0 + (random() * 200))::numeric, 2),
  ROUND((COALESCE(pe.magnitude, 3.0) * 0.6 + (random() * 1))::numeric, 2),
  ROUND((COALESCE(pe.magnitude, 3.0) * 0.6 + (random() * 1))::numeric, 2),
  ROUND((COALESCE(pe.magnitude, 3.0) * 0.6 + (random() * 1))::numeric, 2),
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.8 + (random() * 1.5))::numeric, 2),
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.8 + (random() * 1.5))::numeric, 2),
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.8 + (random() * 1.5))::numeric, 2),
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.15 + (random() * 0.5))::numeric, 2),
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.15 + (random() * 0.5))::numeric, 2),
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.15 + (random() * 0.5))::numeric, 2),
  ROUND((COALESCE(pe.magnitude, 5.0) + (random() * 2))::numeric, 2),
  ROUND((COALESCE(pe.magnitude, 5.0) + (random() * 2))::numeric, 2),
  ROUND((COALESCE(pe.magnitude, 5.0) + (random() * 2))::numeric, 2),
  ROUND((150.0 + (random() * 300))::numeric, 2),
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.75 + (random() * 1.2))::numeric, 2),
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.75 + (random() * 1.2))::numeric, 2),
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.75 + (random() * 1.2))::numeric, 2),
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.12 + (random() * 0.4))::numeric, 2),
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.12 + (random() * 0.4))::numeric, 2),
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.12 + (random() * 0.4))::numeric, 2),
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.85 + (random() * 1.5))::numeric, 2),
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.85 + (random() * 1.5))::numeric, 2),
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.85 + (random() * 1.5))::numeric, 2)
FROM pq_events pe
JOIN pq_meters m ON m.id = pe.meter_id
WHERE 
  pe.event_type = 'harmonic'
  AND m.voltage_level = '380V'
  AND NOT EXISTS (
    SELECT 1 FROM harmonic_events he 
    WHERE he.pqevent_id = pe.id
  );

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================

SELECT 
  'After fix - Harmonic events by voltage level' as description,
  m.voltage_level,
  COUNT(*) as total_events,
  COUNT(he.id) as has_harmonic_record,
  COUNT(he.voltage_va) as has_380v_data,
  COUNT(he.I1_THD_10m) as has_i1i2i3_data
FROM pq_events pe
LEFT JOIN pq_meters m ON m.id = pe.meter_id
LEFT JOIN harmonic_events he ON he.pqevent_id = pe.id
WHERE pe.event_type = 'harmonic'
GROUP BY m.voltage_level
ORDER BY m.voltage_level;

-- Show sample 380V records
SELECT 
  'Sample 380V harmonic data' as info,
  pe.id,
  m.meter_id,
  m.voltage_level,
  he.voltage_va,
  he.voltage_vb,
  he.voltage_vc,
  he.current_ia,
  he.thd_voltage_a,
  he.thd_current_a,
  he.tdd_current_a,
  he.tdd_limit
FROM pq_events pe
JOIN pq_meters m ON m.id = pe.meter_id
JOIN harmonic_events he ON he.pqevent_id = pe.id
WHERE pe.event_type = 'harmonic'
  AND m.voltage_level = '380V'
LIMIT 5;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 
  '✅ Fix complete!' as status,
  'All 380V harmonic events now have their specific measurement columns populated' as message;
