-- ============================================================================
-- Backfill Script: Populate IDR (Incident Data Record) for demonstration
-- Created: January 12, 2026
-- Purpose: Create realistic IDR records for 50% of eligible mother events
--          and clear existing IDR data for the other 50%
-- ============================================================================

-- ============================================================================
-- STEP 1: Check current state
-- ============================================================================

SELECT 
  'Total mother events by type' as description,
  event_type,
  COUNT(*) as count
FROM pq_events
WHERE is_mother_event = true
GROUP BY event_type
ORDER BY event_type;

SELECT 
  'Eligible events for IDR (voltage_dip, voltage_swell, harmonic mother events)' as description,
  COUNT(*) as total_eligible
FROM pq_events
WHERE is_mother_event = true
  AND event_type IN ('voltage_dip', 'voltage_swell', 'harmonic');

SELECT 
  'Current IDR records' as description,
  COUNT(*) as count
FROM idr_records;

-- ============================================================================
-- STEP 2: Clear existing IDR data for 50% of events (random selection)
-- ============================================================================

-- Create temporary table to mark which events to keep/clear (50/50 split)
CREATE TEMP TABLE event_idr_split AS
SELECT 
  id,
  event_type,
  ROW_NUMBER() OVER (ORDER BY random()) as rn,
  COUNT(*) OVER () as total_count
FROM pq_events
WHERE is_mother_event = true
  AND event_type IN ('voltage_dip', 'voltage_swell', 'harmonic');

-- Events to clear (second 50%)
CREATE TEMP TABLE events_to_clear AS
SELECT id
FROM event_idr_split
WHERE rn > (total_count / 2);

-- Events to populate with IDR (first 50%)
CREATE TEMP TABLE events_to_populate AS
SELECT id
FROM event_idr_split
WHERE rn <= (total_count / 2);

-- Delete existing IDR records for events to be cleared
DELETE FROM idr_records
WHERE event_id IN (SELECT id FROM events_to_clear);

-- Clear idr_no from pq_events for events to be cleared
UPDATE pq_events
SET idr_no = NULL,
    manual_create_idr = false
WHERE id IN (SELECT id FROM events_to_clear);

SELECT 
  'Cleared IDR data for 50% of events' as status,
  COUNT(*) as events_cleared
FROM events_to_clear;

-- ============================================================================
-- STEP 3: Delete old IDR records for events that will get new data
-- ============================================================================

DELETE FROM idr_records
WHERE event_id IN (SELECT id FROM events_to_populate);

-- ============================================================================
-- STEP 4: Create new IDR records for 50% of events (random selection)
-- ============================================================================

-- Get a random user for uploaded_by
DO $$ 
DECLARE
  random_user_id uuid;
BEGIN
  SELECT id INTO random_user_id
  FROM profiles
  ORDER BY random()
  LIMIT 1;
  
  -- Store in a temp variable for use in INSERT
  CREATE TEMP TABLE IF NOT EXISTS temp_user (user_id uuid);
  DELETE FROM temp_user;
  INSERT INTO temp_user VALUES (random_user_id);
END $$;

-- Arrays for random data selection
DO $$
DECLARE
  cause_groups text[] := ARRAY[
    'ENVIRONMENTAL INFLUENCE',
    'THIRD PARTY INFLUENCE',
    'UNIDENTIFIED',
    'DESIGN/MANUFACTURING/INSTALLATION PROB',
    'OPERATIONAL/MAINTENANCE RELATED PROB'
  ];
  causes text[] := ARRAY[
    'VEGETATION',
    'INTERFERED BY THIRD PARTY',
    'UNCONFIRMED',
    'ENVIRONMENTAL',
    'ANIMALS, BIRDS, INSECTS',
    'LIGHTNING',
    'PENDING INVESTIGATION',
    'FOREIGN PARTICLES'
  ];
  statuses text[] := ARRAY['Open', 'Closed', 'Investigation'];
  fault_types text[] := ARRAY['Permanent', 'Temporary'];
  object_part_groups text[] := ARRAY[
    'SOLID-JOINT',
    'OHL TOWER-CONDUCTOR',
    'SOLID-CABLE BODY',
    'OHL STEEL POLE-CONDUCTOR',
    'OHL STEEL POLE-INSULATOR',
    'OHL TOWER-ANCILLARY EQUIPMENT',
    'COMMUNICATION-TERMINATION',
    'EARTH SW-OPERATING MECHANISM (EARTHED)'
  ];
  object_part_codes text[] := ARRAY[
    'POWER CONDUCTOR',
    'SOLID-CABLE BODY CONDUCTOR',
    'SOLID-CABLE BODY INSULATION',
    'LIGHTNING PROTECTION SYSTEM',
    'GLASS',
    'COMMUNICATION-TERMINATION CONDUCTOR'
  ];
  damage_groups text[] := ARRAY[
    'SIGN OF ABNORMAL ACTIVITY',
    'VARIANCE IN SPECIFIED VALUE OR CONDITION',
    'DEVIATION IN NORMAL PHYSICAL STATE',
    'FP-VARIANCE IN SPEC. VALUE OR CONDITION'
  ];
  damage_codes text[] := ARRAY[
    'FLASHOVER',
    'SHORT TO EARTH',
    'EXPLODED',
    'PUNCTURED'
  ];
  weathers text[] := ARRAY[
    'TYPHOON NO.08',
    'FINE',
    'RAIN',
    'THUNDERSTORM',
    'RAINSTORM-AMBER',
    'RAINSTORM-RED'
  ];
  equipment_types text[] := ARRAY['CABLE', 'OHL'];
  equipment_affected text[] := ARRAY[
    'Power Conductor',
    'SOLID-CABLE BODY CONDUCTOR',
    'SOLID-CABLE BODY INSULATION',
    'LIGHTNING PROTECTION SYSTEM',
    'GLASS'
  ];
  outage_types text[] := ARRAY['Planned', 'Unplanned', 'Emergency'];
  
  event_record RECORD;
  idr_counter INTEGER := 1;
  idr_number TEXT;
  random_user_id uuid;
BEGIN
  -- Get the random user ID
  SELECT user_id INTO random_user_id FROM temp_user LIMIT 1;
  
  -- Loop through events to populate
  FOR event_record IN 
    SELECT 
      pe.id,
      pe.event_type,
      pe.timestamp,
      pe.duration_ms,
      pe.v1,
      pe.v2,
      pe.v3,
      pe.address,
      pe.equipment_type as event_equipment_type,
      pe.cause_group as event_cause_group,
      pe.cause as event_cause,
      pe.remarks,
      pe.object_part_group as event_object_part_group,
      pe.object_part_code as event_object_part_code,
      pe.damage_group as event_damage_group,
      pe.damage_code as event_damage_code,
      pe.outage_type as event_outage_type,
      pe.weather as event_weather,
      pe.fault_type as event_fault_type,
      pe.weather_condition,
      pe.responsible_oc,
      pe.total_cmi,
      m.voltage_level
    FROM pq_events pe
    LEFT JOIN pq_meters m ON m.id = pe.meter_id
    WHERE pe.id IN (SELECT id FROM events_to_populate)
    ORDER BY pe.timestamp
  LOOP
    -- Generate IDR number with padding
    idr_number := 'INC-' || LPAD(idr_counter::text, 8, '0');
    
    -- Insert IDR record with realistic data
    INSERT INTO idr_records (
      event_id,
      idr_no,
      status,
      voltage_level,
      duration_ms,
      address,
      equipment_type,
      v1,
      v2,
      v3,
      fault_type,
      cause_group,
      cause,
      remarks,
      object_part_group,
      object_part_code,
      damage_group,
      damage_code,
      outage_type,
      weather,
      weather_condition,
      responsible_oc,
      total_cmi,
      equipment_affected,
      restoration_actions,
      notes,
      uploaded_by,
      upload_source,
      created_at,
      updated_at
    ) VALUES (
      event_record.id,
      idr_number,
      statuses[1 + floor(random() * array_length(statuses, 1))],
      event_record.voltage_level,
      event_record.duration_ms,
      COALESCE(event_record.address, 'Location under investigation'),
      COALESCE(event_record.event_equipment_type, equipment_types[1 + floor(random() * array_length(equipment_types, 1))]),
      event_record.v1,
      event_record.v2,
      event_record.v3,
      COALESCE(event_record.event_fault_type, fault_types[1 + floor(random() * array_length(fault_types, 1))]),
      COALESCE(event_record.event_cause_group, cause_groups[1 + floor(random() * array_length(cause_groups, 1))]),
      COALESCE(event_record.event_cause, causes[1 + floor(random() * array_length(causes, 1))]),
      event_record.remarks,
      COALESCE(event_record.event_object_part_group, object_part_groups[1 + floor(random() * array_length(object_part_groups, 1))]),
      COALESCE(event_record.event_object_part_code, object_part_codes[1 + floor(random() * array_length(object_part_codes, 1))]),
      COALESCE(event_record.event_damage_group, damage_groups[1 + floor(random() * array_length(damage_groups, 1))]),
      COALESCE(event_record.event_damage_code, damage_codes[1 + floor(random() * array_length(damage_codes, 1))]),
      COALESCE(event_record.event_outage_type, outage_types[1 + floor(random() * array_length(outage_types, 1))]),
      COALESCE(event_record.event_weather, weathers[1 + floor(random() * array_length(weathers, 1))]),
      event_record.weather_condition,
      event_record.responsible_oc,
      event_record.total_cmi,
      equipment_affected[1 + floor(random() * array_length(equipment_affected, 1))],
      NULL,  -- restoration_actions
      NULL,  -- notes
      random_user_id,
      'csv_import',
      event_record.timestamp,
      NOW()
    );
    
    -- Update pq_events with IDR number and set manual_create_idr = false
    UPDATE pq_events
    SET 
      idr_no = idr_number,
      manual_create_idr = false
    WHERE id = event_record.id;
    
    idr_counter := idr_counter + 1;
  END LOOP;
END $$;

-- Clean up temp tables
DROP TABLE IF EXISTS temp_user;

SELECT 
  'Created IDR records for 50% of events' as status,
  COUNT(*) as idr_records_created
FROM events_to_populate;

-- ============================================================================
-- STEP 5: Verification
-- ============================================================================

-- Count by event type
SELECT 
  'IDR records by event type' as description,
  pe.event_type,
  COUNT(ir.id) as idr_count
FROM idr_records ir
JOIN pq_events pe ON pe.id = ir.event_id
GROUP BY pe.event_type
ORDER BY pe.event_type;

-- Count by status
SELECT 
  'IDR records by status' as description,
  status,
  COUNT(*) as count
FROM idr_records
GROUP BY status
ORDER BY status;

-- Count by cause group
SELECT 
  'IDR records by cause group' as description,
  cause_group,
  COUNT(*) as count
FROM idr_records
GROUP BY cause_group
ORDER BY count DESC
LIMIT 10;

-- Count by fault type
SELECT 
  'IDR records by fault type' as description,
  fault_type,
  COUNT(*) as count
FROM idr_records
GROUP BY fault_type
ORDER BY fault_type;

-- Sample IDR records
SELECT 
  'Sample IDR records' as info,
  ir.idr_no,
  pe.event_type,
  pe.timestamp,
  ir.status,
  ir.cause_group,
  ir.cause,
  ir.fault_type,
  ir.equipment_type,
  ir.upload_source
FROM idr_records ir
JOIN pq_events pe ON pe.id = ir.event_id
ORDER BY ir.idr_no
LIMIT 10;

-- Verify pq_events.idr_no matches idr_records.idr_no
SELECT 
  'Verification: pq_events.idr_no matches idr_records.idr_no' as check_type,
  COUNT(*) as matching_records,
  COUNT(CASE WHEN pe.idr_no != ir.idr_no THEN 1 END) as mismatched_records
FROM pq_events pe
JOIN idr_records ir ON ir.event_id = pe.id
WHERE pe.is_mother_event = true
  AND pe.event_type IN ('voltage_dip', 'voltage_swell', 'harmonic');

-- Count events with and without IDR
SELECT 
  'Mother events with/without IDR' as description,
  COUNT(*) as total_eligible_events,
  COUNT(CASE WHEN pe.idr_no IS NOT NULL THEN 1 END) as with_idr,
  COUNT(CASE WHEN pe.idr_no IS NULL THEN 1 END) as without_idr,
  ROUND(COUNT(CASE WHEN pe.idr_no IS NOT NULL THEN 1 END)::numeric / COUNT(*)::numeric * 100, 1) as percentage_with_idr
FROM pq_events pe
WHERE pe.is_mother_event = true
  AND pe.event_type IN ('voltage_dip', 'voltage_swell', 'harmonic');

-- Check manual_create_idr flag
SELECT 
  'manual_create_idr flag status' as description,
  manual_create_idr,
  COUNT(*) as count
FROM pq_events
WHERE is_mother_event = true
  AND event_type IN ('voltage_dip', 'voltage_swell', 'harmonic')
GROUP BY manual_create_idr
ORDER BY manual_create_idr;

-- Clean up temp tables
DROP TABLE IF EXISTS event_idr_split;
DROP TABLE IF EXISTS events_to_clear;
DROP TABLE IF EXISTS events_to_populate;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 
  '✅ IDR backfill complete!' as status,
  '50% of eligible mother events now have IDR records with realistic demonstration data' as message;
