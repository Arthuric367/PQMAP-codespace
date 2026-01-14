-- =====================================================
-- Fix generate_customer_impacts_for_event Function
-- =====================================================
-- Purpose: Update function to get circuit_id from pq_meters table
--          (circuit_id was removed from pq_events in migration 20260108000000)
-- Date: January 14, 2026
-- =====================================================

-- Drop and recreate the function with corrected logic
CREATE OR REPLACE FUNCTION generate_customer_impacts_for_event(event_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  v_substation_id UUID;
  v_meter_id UUID;
  v_circuit_id TEXT;
  v_severity TEXT;
  v_duration_ms INTEGER;
  v_impact_level TEXT;
  v_downtime_min NUMERIC;
  v_count INTEGER := 0;
BEGIN
  -- Get event details including meter_id
  SELECT pe.substation_id, pe.meter_id, pe.severity, pe.duration_ms
  INTO v_substation_id, v_meter_id, v_severity, v_duration_ms
  FROM pq_events pe
  WHERE pe.id = event_id_param;

  -- Get circuit_id from meter
  IF v_meter_id IS NOT NULL THEN
    SELECT m.circuit_id
    INTO v_circuit_id
    FROM pq_meters m
    WHERE m.id = v_meter_id;
  END IF;

  -- If event has no substation or circuit, skip
  IF v_substation_id IS NULL OR v_circuit_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Map event severity to impact level
  v_impact_level := CASE v_severity
    WHEN 'critical' THEN 'severe'
    WHEN 'high' THEN 'moderate'
    WHEN 'medium' THEN 'minor'
    WHEN 'low' THEN 'minor'
    ELSE 'minor'
  END;

  -- Calculate downtime in minutes (convert ms to minutes)
  v_downtime_min := CASE 
    WHEN v_duration_ms IS NOT NULL THEN ROUND(v_duration_ms::NUMERIC / 60000, 2)
    ELSE NULL
  END;

  -- Insert customer impacts for all matched customers
  INSERT INTO event_customer_impact (
    event_id,
    customer_id,
    impact_level,
    estimated_downtime_min,
    created_at
  )
  SELECT 
    event_id_param,
    ctm.customer_id,
    v_impact_level,
    v_downtime_min,
    now()
  FROM customer_transformer_matching ctm
  WHERE ctm.substation_id = v_substation_id
    AND ctm.circuit_id = v_circuit_id
    AND ctm.active = true
  ON CONFLICT DO NOTHING;  -- Prevent duplicates

  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_customer_impacts_for_event(UUID) IS 
'Generates event_customer_impact records for all customers mapped to the event''s substation and circuit. Circuit ID is retrieved from pq_meters table via meter_id. Converts duration_ms to minutes for estimated_downtime_min.';

-- Test query to verify function works (uncomment to test)
/*
SELECT 
  pe.id as event_id,
  s.code as substation,
  m.circuit_id,
  generate_customer_impacts_for_event(pe.id) as impacts_created
FROM pq_events pe
JOIN substations s ON s.id = pe.substation_id
LEFT JOIN pq_meters m ON m.id = pe.meter_id
WHERE pe.substation_id IS NOT NULL 
  AND m.circuit_id IS NOT NULL
ORDER BY pe.timestamp DESC
LIMIT 5;
*/
