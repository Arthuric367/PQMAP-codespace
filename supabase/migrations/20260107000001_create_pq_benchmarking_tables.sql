-- Migration: Create PQ Benchmarking Standard tables
-- Purpose: Store benchmarking standards and their voltage/duration thresholds for PQ compliance evaluation
-- Date: 2026-01-07

-- Create pq_benchmark_standards table
CREATE TABLE IF NOT EXISTS pq_benchmark_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

-- Create pq_benchmark_thresholds table
CREATE TABLE IF NOT EXISTS pq_benchmark_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id UUID NOT NULL REFERENCES pq_benchmark_standards(id) ON DELETE CASCADE,
  min_voltage DECIMAL(6,3) NOT NULL CHECK (min_voltage >= 0 AND min_voltage <= 100),
  duration DECIMAL(6,3) NOT NULL CHECK (duration >= 0 AND duration <= 1),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_threshold_per_standard UNIQUE (standard_id, min_voltage, duration)
);

-- Create indexes
CREATE INDEX idx_benchmark_standards_active ON pq_benchmark_standards(is_active);
CREATE INDEX idx_benchmark_thresholds_standard ON pq_benchmark_thresholds(standard_id);
CREATE INDEX idx_benchmark_thresholds_sort ON pq_benchmark_thresholds(standard_id, sort_order);

-- Add comments
COMMENT ON TABLE pq_benchmark_standards IS 'International PQ benchmarking standards (IEC, SEMI, ITIC, etc.)';
COMMENT ON TABLE pq_benchmark_thresholds IS 'Voltage/duration thresholds for each benchmarking standard';
COMMENT ON COLUMN pq_benchmark_thresholds.min_voltage IS 'Minimum voltage percentage (0-100%)';
COMMENT ON COLUMN pq_benchmark_thresholds.duration IS 'Duration in seconds (0-1s)';
COMMENT ON COLUMN pq_benchmark_thresholds.sort_order IS 'Display order of thresholds';

-- Insert seed data for three international standards

-- 1. IEC 61000-4-34/11 (IEC Standard for voltage dip immunity)
DO $$
DECLARE
  iec_standard_id UUID;
BEGIN
  INSERT INTO pq_benchmark_standards (name, description, is_active)
  VALUES (
    'IEC 61000-4-34',
    'IEC standard for voltage dip immunity testing for equipment with input current up to 16A per phase',
    true
  )
  RETURNING id INTO iec_standard_id;

  -- IEC thresholds
  INSERT INTO pq_benchmark_thresholds (standard_id, min_voltage, duration, sort_order)
  VALUES
    (iec_standard_id, 100.000, 0.020, 1),
    (iec_standard_id, 40.000, 0.200, 2),
    (iec_standard_id, 70.000, 0.500, 3),
    (iec_standard_id, 80.000, 1.000, 4);

  RAISE NOTICE 'Inserted IEC 61000-4-34 standard with % thresholds', 4;
END $$;

-- 2. SEMI F47 (Semiconductor equipment voltage sag immunity)
DO $$
DECLARE
  semi_standard_id UUID;
BEGIN
  INSERT INTO pq_benchmark_standards (name, description, is_active)
  VALUES (
    'SEMI F47',
    'SEMI standard for voltage sag immunity for semiconductor manufacturing equipment',
    true
  )
  RETURNING id INTO semi_standard_id;

  -- SEMI F47 thresholds (based on semiconductor equipment requirements)
  INSERT INTO pq_benchmark_thresholds (standard_id, min_voltage, duration, sort_order)
  VALUES
    (semi_standard_id, 50.000, 0.020, 1),
    (semi_standard_id, 50.000, 0.200, 2),
    (semi_standard_id, 70.000, 0.500, 3),
    (semi_standard_id, 80.000, 1.000, 4),
    (semi_standard_id, 87.000, 1.000, 5);

  RAISE NOTICE 'Inserted SEMI F47 standard with % thresholds', 5;
END $$;

-- 3. ITIC (Information Technology Industry Council curve)
DO $$
DECLARE
  itic_standard_id UUID;
BEGIN
  INSERT INTO pq_benchmark_standards (name, description, is_active)
  VALUES (
    'ITIC',
    'ITIC curve - Information Technology Industry Council voltage tolerance standard for IT equipment',
    true
  )
  RETURNING id INTO itic_standard_id;

  -- ITIC curve thresholds
  INSERT INTO pq_benchmark_thresholds (standard_id, min_voltage, duration, sort_order)
  VALUES
    (itic_standard_id, 0.000, 0.020, 1),
    (itic_standard_id, 70.000, 0.020, 2),
    (itic_standard_id, 70.000, 0.500, 3),
    (itic_standard_id, 80.000, 1.000, 4),
    (itic_standard_id, 90.000, 1.000, 5);

  RAISE NOTICE 'Inserted ITIC standard with % thresholds', 5;
END $$;

-- Log completion
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Migration completed: Created PQ benchmarking tables with 3 international standards';
END $$;
