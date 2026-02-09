-- Migration: Add Manual Voltage Dip Event Creation Fields
-- Date: 2026-02-09
-- Description: Add fields for manual voltage dip event creation workspace

-- Add circuit_id column (TEXT) for transformer circuit identifier
ALTER TABLE pq_events 
  ADD COLUMN IF NOT EXISTS circuit_id TEXT;

-- Add voltage phase columns (DECIMAL) for V1, V2, V3 percentage remaining
ALTER TABLE pq_events 
  ADD COLUMN IF NOT EXISTS v1 DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS v2 DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS v3 DECIMAL(5,2);

-- Add boolean flags for manual event tracking
ALTER TABLE pq_events 
  ADD COLUMN IF NOT EXISTS min_volt_recorded BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS non_clp_system_fault BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS false_event BOOLEAN DEFAULT false;

-- Add comments for clarity
COMMENT ON COLUMN pq_events.circuit_id IS 'Transformer circuit identifier (e.g., H1, H2, H3)';
COMMENT ON COLUMN pq_events.v1 IS 'Phase 1 voltage percentage remaining (0-100%)';
COMMENT ON COLUMN pq_events.v2 IS 'Phase 2 voltage percentage remaining (0-100%)';
COMMENT ON COLUMN pq_events.v3 IS 'Phase 3 voltage percentage remaining (0-100%)';
COMMENT ON COLUMN pq_events.min_volt_recorded IS 'Flag indicating minimum voltage was recorded';
COMMENT ON COLUMN pq_events.non_clp_system_fault IS 'Flag for faults outside CLP system';
COMMENT ON COLUMN pq_events.false_event IS 'Flag for false positive/measurement anomaly (FR Trigger)';

-- Add indexes for filtering performance
CREATE INDEX IF NOT EXISTS idx_pq_events_circuit_id ON pq_events(circuit_id);
CREATE INDEX IF NOT EXISTS idx_pq_events_non_clp_fault ON pq_events(non_clp_system_fault) WHERE non_clp_system_fault = true;
CREATE INDEX IF NOT EXISTS idx_pq_events_min_volt ON pq_events(min_volt_recorded) WHERE min_volt_recorded = true;
CREATE INDEX IF NOT EXISTS idx_pq_events_false_event ON pq_events(false_event) WHERE false_event = true;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'pq_events' 
  AND column_name IN ('circuit_id', 'v1', 'v2', 'v3', 'min_volt_recorded', 'non_clp_system_fault', 'false_event')
ORDER BY ordinal_position;

-- Display success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully';
  RAISE NOTICE 'Added columns:';
  RAISE NOTICE '  - circuit_id (TEXT): Transformer circuit identifier';
  RAISE NOTICE '  - v1, v2, v3 (DECIMAL): Phase voltage percentages';
  RAISE NOTICE '  - min_volt_recorded (BOOLEAN): Minimum voltage flag';
  RAISE NOTICE '  - non_clp_system_fault (BOOLEAN): External fault flag';
  RAISE NOTICE '  - false_event (BOOLEAN): False positive flag (FR Trigger)';
  RAISE NOTICE '';
  RAISE NOTICE 'Field mapping for CSV imports:';
  RAISE NOTICE '  - Tx No → circuit_id';
  RAISE NOTICE '  - VL1 → v1';
  RAISE NOTICE '  - VL2 → v2';
  RAISE NOTICE '  - VL3 → v3';
  RAISE NOTICE '  - FR Trigger → false_event';
END $$;
