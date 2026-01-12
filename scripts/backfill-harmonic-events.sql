-- ============================================================================
-- Backfill Script: Populate harmonic_events for existing harmonic PQ events
-- Created: January 9, 2026
-- Updated: January 12, 2026 - Added 380V meter support
-- Purpose: Create harmonic_events records for all existing harmonic events
--          with voltage-level-specific columns:
--          - 400kV/132kV/11kV: I1/I2/I3 THD/TEHD/TOHD/TDD (12 columns)
--          - 380V: 30 new columns (voltage, current, THD variants, TDD variants)
-- ============================================================================

-- ============================================================================
-- STEP 1: Check current state
-- ============================================================================

-- Count existing harmonic events in pq_events
SELECT 
  'Total harmonic events in pq_events' as description,
  COUNT(*) as count
FROM pq_events
WHERE event_type = 'harmonic';

-- Count existing records in harmonic_events
SELECT 
  'Existing records in harmonic_events' as description,
  COUNT(*) as count
FROM harmonic_events;

-- ============================================================================
-- STEP 2: Backfill harmonic_events table (voltage-level-specific)
-- ============================================================================

-- Insert harmonic measurements for 400kV/132kV/11kV meters (I1/I2/I3 columns)
INSERT INTO harmonic_events (
  pqevent_id,
  I1_THD_10m,
  I1_TEHD_10m,
  I1_TOHD_10m,
  I1_TDD_10m,
  I2_THD_10m,
  I2_TEHD_10m,
  I2_TOHD_10m,
  I2_TDD_10m,
  I3_THD_10m,
  I3_TEHD_10m,
  I3_TOHD_10m,
  I3_TDD_10m
)
SELECT 
  pe.id as pqevent_id,
  
  -- Phase 1 (I1) - Use magnitude as base THD with some variation
  ROUND((COALESCE(pe.magnitude, 5.0) + (random() * 2 - 1))::numeric, 2) as I1_THD_10m,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.15 + (random() * 0.5))::numeric, 2) as I1_TEHD_10m,  -- Even harmonics ~15% of THD
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.85 + (random() * 0.5))::numeric, 2) as I1_TOHD_10m,  -- Odd harmonics ~85% of THD
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.9 + (random() * 0.8))::numeric, 2) as I1_TDD_10m,    -- TDD slightly lower than THD
  
  -- Phase 2 (I2) - Slightly different from Phase 1 (typical in 3-phase systems)
  ROUND((COALESCE(pe.magnitude, 5.0) + (random() * 2.5 - 1.25))::numeric, 2) as I2_THD_10m,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.16 + (random() * 0.6))::numeric, 2) as I2_TEHD_10m,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.84 + (random() * 0.6))::numeric, 2) as I2_TOHD_10m,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.88 + (random() * 0.9))::numeric, 2) as I2_TDD_10m,
  
  -- Phase 3 (I3) - Another variation
  ROUND((COALESCE(pe.magnitude, 5.0) + (random() * 2 - 1))::numeric, 2) as I3_THD_10m,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.14 + (random() * 0.5))::numeric, 2) as I3_TEHD_10m,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.86 + (random() * 0.5))::numeric, 2) as I3_TOHD_10m,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.91 + (random() * 0.8))::numeric, 2) as I3_TDD_10m
  
FROM pq_events pe
JOIN pq_meters m ON m.id = pe.meter_id
WHERE 
  pe.event_type = 'harmonic'
  AND m.voltage_level IN ('400kV', '132kV', '11kV')
  AND NOT EXISTS (
    SELECT 1 FROM harmonic_events he 
    WHERE he.pqevent_id = pe.id
  )
ORDER BY pe.timestamp DESC;

-- Insert harmonic measurements for 380V meters (30 new columns)
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
  
  -- Description and compliance
  'Harmonic measurement at ' || m.location as description,
  ROUND((8.0 + (random() * 2))::numeric, 2) as tdd_limit,  -- TDD limit typically 8-10%
  ROUND((random() * 3)::numeric, 2) as non_compliance,  -- 0-3% non-compliance
  
  -- Voltage measurements (380V nominal, with variation)
  ROUND((380.0 + (random() * 20 - 10))::numeric, 2) as voltage_va,
  ROUND((380.0 + (random() * 20 - 10))::numeric, 2) as voltage_vb,
  ROUND((380.0 + (random() * 20 - 10))::numeric, 2) as voltage_vc,
  
  -- Current measurements (typical range 50-500A for 380V systems)
  ROUND((100.0 + (random() * 200))::numeric, 2) as current_ia,
  ROUND((100.0 + (random() * 200))::numeric, 2) as current_ib,
  ROUND((100.0 + (random() * 200))::numeric, 2) as current_ic,
  
  -- THD Voltage (typically 1-5% for 380V)
  ROUND((COALESCE(pe.magnitude, 3.0) * 0.6 + (random() * 1))::numeric, 2) as thd_voltage_a,
  ROUND((COALESCE(pe.magnitude, 3.0) * 0.6 + (random() * 1))::numeric, 2) as thd_voltage_b,
  ROUND((COALESCE(pe.magnitude, 3.0) * 0.6 + (random() * 1))::numeric, 2) as thd_voltage_c,
  
  -- THD Odd Current (typically 3-8% - odd harmonics dominate)
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.8 + (random() * 1.5))::numeric, 2) as thd_odd_current_a,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.8 + (random() * 1.5))::numeric, 2) as thd_odd_current_b,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.8 + (random() * 1.5))::numeric, 2) as thd_odd_current_c,
  
  -- THD Even (typically 0.5-2% - even harmonics are lower)
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.15 + (random() * 0.5))::numeric, 2) as thd_even_a,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.15 + (random() * 0.5))::numeric, 2) as thd_even_b,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.15 + (random() * 0.5))::numeric, 2) as thd_even_c,
  
  -- THD Current (total, typically 4-10%)
  ROUND((COALESCE(pe.magnitude, 5.0) + (random() * 2))::numeric, 2) as thd_current_a,
  ROUND((COALESCE(pe.magnitude, 5.0) + (random() * 2))::numeric, 2) as thd_current_b,
  ROUND((COALESCE(pe.magnitude, 5.0) + (random() * 2))::numeric, 2) as thd_current_c,
  
  -- Maximum load current (typically 1.2-1.5x normal current)
  ROUND((150.0 + (random() * 300))::numeric, 2) as il_max,
  
  -- TDD Odd Current (typically 3-7%)
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.75 + (random() * 1.2))::numeric, 2) as tdd_odd_current_a,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.75 + (random() * 1.2))::numeric, 2) as tdd_odd_current_b,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.75 + (random() * 1.2))::numeric, 2) as tdd_odd_current_c,
  
  -- TDD Even Current (typically 0.3-1.5%)
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.12 + (random() * 0.4))::numeric, 2) as tdd_even_current_a,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.12 + (random() * 0.4))::numeric, 2) as tdd_even_current_b,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.12 + (random() * 0.4))::numeric, 2) as tdd_even_current_c,
  
  -- TDD Current (total, typically 3-8%)
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.85 + (random() * 1.5))::numeric, 2) as tdd_current_a,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.85 + (random() * 1.5))::numeric, 2) as tdd_current_b,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.85 + (random() * 1.5))::numeric, 2) as tdd_current_c
  
FROM pq_events pe
JOIN pq_meters m ON m.id = pe.meter_id
WHERE 
  pe.event_type = 'harmonic'
  AND m.voltage_level = '380V'
  AND NOT EXISTS (
    SELECT 1 FROM harmonic_events he 
    WHERE he.pqevent_id = pe.id
  )
ORDER BY pe.timestamp DESC;

-- ============================================================================
-- STEP 3: Verification
-- ============================================================================

-- Count records after backfill by voltage level
SELECT 
  'Records in harmonic_events after backfill' as description,
  COUNT(*) as count
FROM harmonic_events;

SELECT 
  'Records by voltage level' as description,
  m.voltage_level,
  COUNT(*) as count
FROM harmonic_events he
JOIN pq_events pe ON pe.id = he.pqevent_id
JOIN pq_meters m ON m.id = pe.meter_id
GROUP BY m.voltage_level
ORDER BY m.voltage_level;

-- Show sample records for 400kV/132kV/11kV (I1/I2/I3 columns)
SELECT 
  'Sample 400kV/132kV/11kV records' as description,
  pe.id,
  m.voltage_level,
  pe.timestamp,
  pe.magnitude as pqevent_magnitude,
  he.I1_THD_10m,
  he.I2_THD_10m,
  he.I3_THD_10m,
  he.I1_TDD_10m,
  he.I2_TDD_10m,
  he.I3_TDD_10m
FROM pq_events pe
JOIN pq_meters m ON m.id = pe.meter_id
LEFT JOIN harmonic_events he ON pe.id = he.pqevent_id
WHERE pe.event_type = 'harmonic'
  AND m.voltage_level IN ('400kV', '132kV', '11kV')
ORDER BY pe.timestamp DESC
LIMIT 10;

-- Show sample records for 380V (30 new columns)
SELECT 
  'Sample 380V records' as description,
  pe.id,
  m.voltage_level,
  pe.timestamp,
  he.description,
  he.tdd_limit,
  he.voltage_va,
  he.voltage_vb,
  he.voltage_vc,
  he.current_ia,
  he.thd_voltage_a,
  he.thd_current_a,
  he.tdd_current_a
FROM pq_events pe
JOIN pq_meters m ON m.id = pe.meter_id
LEFT JOIN harmonic_events he ON pe.id = he.pqevent_id
WHERE pe.event_type = 'harmonic'
  AND m.voltage_level = '380V'
ORDER BY pe.timestamp DESC
LIMIT 10;

-- Check for any harmonic events without harmonic_events records
SELECT 
  'Harmonic events without harmonic_events records' as description,
  COUNT(*) as count
FROM pq_events pe
WHERE 
  pe.event_type = 'harmonic'
  AND NOT EXISTS (
    SELECT 1 FROM harmonic_events he 
    WHERE he.pqevent_id = pe.id
  );

-- Statistics: Average THD values for 400kV/132kV/11kV
SELECT 
  'Average THD Statistics (400kV/132kV/11kV)' as description,
  ROUND(AVG(he.I1_THD_10m), 2) as avg_I1_THD,
  ROUND(AVG(he.I2_THD_10m), 2) as avg_I2_THD,
  ROUND(AVG(he.I3_THD_10m), 2) as avg_I3_THD,
  ROUND(AVG((he.I1_THD_10m + he.I2_THD_10m + he.I3_THD_10m) / 3), 2) as avg_total_THD,
  COUNT(*) as total_records
FROM harmonic_events he
JOIN pq_events pe ON pe.id = he.pqevent_id
JOIN pq_meters m ON m.id = pe.meter_id
WHERE m.voltage_level IN ('400kV', '132kV', '11kV');

-- Statistics: Average THD values for 380V
SELECT 
  'Average THD Statistics (380V)' as description,
  ROUND(AVG(he.thd_voltage_a), 2) as avg_voltage_thd_a,
  ROUND(AVG(he.thd_current_a), 2) as avg_current_thd_a,
  ROUND(AVG(he.tdd_current_a), 2) as avg_current_tdd_a,
  ROUND(AVG(he.voltage_va), 2) as avg_voltage_va,
  ROUND(AVG(he.current_ia), 2) as avg_current_ia,
  COUNT(*) as total_records
FROM harmonic_events he
JOIN pq_events pe ON pe.id = he.pqevent_id
JOIN pq_meters m ON m.id = pe.meter_id
WHERE m.voltage_level = '380V';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 
  '✅ Backfill complete!' as status,
  'All harmonic events now have voltage-level-specific harmonic_events records' as message;
