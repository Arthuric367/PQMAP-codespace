-- Migration: Add 380V-specific harmonic measurement columns
-- Created: 2026-01-12
-- Purpose: Extend harmonic_events table to support 380V meters with different measurement set
--          while maintaining I1/I2/I3 columns for 400kV/132kV/11kV meters

-- Add 380V-specific columns to harmonic_events table
ALTER TABLE harmonic_events
  -- Description and compliance
  ADD COLUMN description TEXT,
  ADD COLUMN tdd_limit NUMERIC,
  ADD COLUMN non_compliance NUMERIC,
  
  -- Voltage measurements (Va, Vb, Vc) for phases A, B, C
  ADD COLUMN voltage_va NUMERIC,
  ADD COLUMN voltage_vb NUMERIC,
  ADD COLUMN voltage_vc NUMERIC,
  
  -- Current measurements (Ia, Ib, Ic) for phases A, B, C
  ADD COLUMN current_ia NUMERIC,
  ADD COLUMN current_ib NUMERIC,
  ADD COLUMN current_ic NUMERIC,
  
  -- THD Voltage measurements for phases A, B, C
  ADD COLUMN thd_voltage_a NUMERIC,
  ADD COLUMN thd_voltage_b NUMERIC,
  ADD COLUMN thd_voltage_c NUMERIC,
  
  -- THD Odd Current measurements for phases A, B, C
  ADD COLUMN thd_odd_current_a NUMERIC,
  ADD COLUMN thd_odd_current_b NUMERIC,
  ADD COLUMN thd_odd_current_c NUMERIC,
  
  -- THD Even measurements for phases A, B, C
  ADD COLUMN thd_even_a NUMERIC,
  ADD COLUMN thd_even_b NUMERIC,
  ADD COLUMN thd_even_c NUMERIC,
  
  -- THD Current measurements for phases A, B, C
  ADD COLUMN thd_current_a NUMERIC,
  ADD COLUMN thd_current_b NUMERIC,
  ADD COLUMN thd_current_c NUMERIC,
  
  -- Maximum load current
  ADD COLUMN il_max NUMERIC,
  
  -- TDD Odd Current measurements for phases A, B, C
  ADD COLUMN tdd_odd_current_a NUMERIC,
  ADD COLUMN tdd_odd_current_b NUMERIC,
  ADD COLUMN tdd_odd_current_c NUMERIC,
  
  -- TDD Even Current measurements for phases A, B, C
  ADD COLUMN tdd_even_current_a NUMERIC,
  ADD COLUMN tdd_even_current_b NUMERIC,
  ADD COLUMN tdd_even_current_c NUMERIC,
  
  -- TDD Current measurements for phases A, B, C
  ADD COLUMN tdd_current_a NUMERIC,
  ADD COLUMN tdd_current_b NUMERIC,
  ADD COLUMN tdd_current_c NUMERIC;

-- Add check constraint to ensure voltage-level-specific columns are used correctly
-- This constraint validates that:
-- 1. 380V meters ONLY have the new 30 columns populated (not I1/I2/I3)
-- 2. 400kV/132kV/11kV meters ONLY have I1/I2/I3 columns populated (not the new 30)
--
-- Note: The constraint uses a subquery to get voltage_level from pq_meters via pq_events
CREATE OR REPLACE FUNCTION validate_harmonic_columns()
RETURNS TRIGGER AS $$
DECLARE
  v_voltage_level TEXT;
  v_has_i1i2i3 BOOLEAN;
  v_has_380v BOOLEAN;
BEGIN
  -- Get voltage level from pq_meters via pq_events
  SELECT m.voltage_level INTO v_voltage_level
  FROM pq_events e
  JOIN pq_meters m ON m.id = e.meter_id
  WHERE e.id = NEW.pqevent_id;
  
  -- Check if I1/I2/I3 columns are populated
  v_has_i1i2i3 := (
    NEW.I1_THD_10m IS NOT NULL OR NEW.I1_TEHD_10m IS NOT NULL OR 
    NEW.I1_TOHD_10m IS NOT NULL OR NEW.I1_TDD_10m IS NOT NULL OR
    NEW.I2_THD_10m IS NOT NULL OR NEW.I2_TEHD_10m IS NOT NULL OR 
    NEW.I2_TOHD_10m IS NOT NULL OR NEW.I2_TDD_10m IS NOT NULL OR
    NEW.I3_THD_10m IS NOT NULL OR NEW.I3_TEHD_10m IS NOT NULL OR 
    NEW.I3_TOHD_10m IS NOT NULL OR NEW.I3_TDD_10m IS NOT NULL
  );
  
  -- Check if 380V columns are populated
  v_has_380v := (
    NEW.description IS NOT NULL OR NEW.tdd_limit IS NOT NULL OR 
    NEW.non_compliance IS NOT NULL OR NEW.voltage_va IS NOT NULL OR
    NEW.voltage_vb IS NOT NULL OR NEW.voltage_vc IS NOT NULL OR
    NEW.current_ia IS NOT NULL OR NEW.current_ib IS NOT NULL OR
    NEW.current_ic IS NOT NULL OR NEW.thd_voltage_a IS NOT NULL OR
    NEW.thd_voltage_b IS NOT NULL OR NEW.thd_voltage_c IS NOT NULL OR
    NEW.thd_odd_current_a IS NOT NULL OR NEW.thd_odd_current_b IS NOT NULL OR
    NEW.thd_odd_current_c IS NOT NULL OR NEW.thd_even_a IS NOT NULL OR
    NEW.thd_even_b IS NOT NULL OR NEW.thd_even_c IS NOT NULL OR
    NEW.thd_current_a IS NOT NULL OR NEW.thd_current_b IS NOT NULL OR
    NEW.thd_current_c IS NOT NULL OR NEW.il_max IS NOT NULL OR
    NEW.tdd_odd_current_a IS NOT NULL OR NEW.tdd_odd_current_b IS NOT NULL OR
    NEW.tdd_odd_current_c IS NOT NULL OR NEW.tdd_even_current_a IS NOT NULL OR
    NEW.tdd_even_current_b IS NOT NULL OR NEW.tdd_even_current_c IS NOT NULL OR
    NEW.tdd_current_a IS NOT NULL OR NEW.tdd_current_b IS NOT NULL OR
    NEW.tdd_current_c IS NOT NULL
  );
  
  -- Validate voltage-level-specific column usage
  IF v_voltage_level = '380V' THEN
    IF v_has_i1i2i3 THEN
      RAISE EXCEPTION '380V meters cannot have I1/I2/I3 columns populated';
    END IF;
  ELSIF v_voltage_level IN ('400kV', '132kV', '11kV') THEN
    IF v_has_380v THEN
      RAISE EXCEPTION '400kV/132kV/11kV meters cannot have 380V-specific columns populated';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate columns on insert and update
DROP TRIGGER IF EXISTS validate_harmonic_columns_trigger ON harmonic_events;
CREATE TRIGGER validate_harmonic_columns_trigger
  BEFORE INSERT OR UPDATE ON harmonic_events
  FOR EACH ROW
  EXECUTE FUNCTION validate_harmonic_columns();

-- Add comment documenting the voltage-level-specific column usage
COMMENT ON TABLE harmonic_events IS 
  'Harmonic event measurements with voltage-level-specific columns:
  - 400kV/132kV/11kV meters: Use I1_THD_10m, I1_TEHD_10m, I1_TOHD_10m, I1_TDD_10m, I2_*, I3_* (12 columns)
  - 380V meters: Use description, tdd_limit, non_compliance, voltage_*, current_*, thd_*, il_max, tdd_* (30 columns)
  Constraint enforced via validate_harmonic_columns() trigger function.';

-- Create indexes for commonly queried 380V columns
CREATE INDEX IF NOT EXISTS idx_harmonic_events_voltage_va ON harmonic_events(voltage_va) WHERE voltage_va IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_harmonic_events_current_ia ON harmonic_events(current_ia) WHERE current_ia IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_harmonic_events_thd_voltage_a ON harmonic_events(thd_voltage_a) WHERE thd_voltage_a IS NOT NULL;

-- Grant necessary permissions (maintains RLS from original migration)
GRANT SELECT, INSERT, UPDATE, DELETE ON harmonic_events TO authenticated;
GRANT SELECT ON harmonic_events TO anon;
