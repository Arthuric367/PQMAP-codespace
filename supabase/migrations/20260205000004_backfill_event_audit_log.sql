-- Migration: Backfill Event Audit Log from Existing Data
-- Date: February 5, 2026
-- Purpose: Populate audit log table with historical operations that can be inferred from existing data

-- Backfill: Event Creation
-- All events have a created_at timestamp, use this to log initial creation
INSERT INTO event_audit_log (event_id, operation_type, operation_details, user_id, created_at)
SELECT 
  id AS event_id,
  'event_created'::event_operation_type AS operation_type,
  jsonb_build_object(
    'source', 'backfill_migration',
    'note', 'Initial event creation'
  ) AS operation_details,
  NULL AS user_id, -- Unknown user for historical data
  created_at
FROM pq_events
WHERE created_at IS NOT NULL;

-- Backfill: Event Detection
-- Use timestamp field to log when event was detected
INSERT INTO event_audit_log (event_id, operation_type, operation_details, user_id, created_at)
SELECT 
  id AS event_id,
  'event_detected'::event_operation_type AS operation_type,
  jsonb_build_object(
    'source', 'backfill_migration',
    'event_type', event_type,
    'duration_ms', duration_ms,
    'severity', severity
  ) AS operation_details,
  NULL AS user_id,
  timestamp
FROM pq_events
WHERE timestamp IS NOT NULL;

-- Backfill: Automatic Grouping
-- Events with grouped_at and grouping_type = 'automatic'
INSERT INTO event_audit_log (event_id, operation_type, operation_details, user_id, created_at)
SELECT 
  id AS event_id,
  'grouped_automatic'::event_operation_type AS operation_type,
  jsonb_build_object(
    'source', 'backfill_migration',
    'is_mother_event', is_mother_event,
    'parent_event_id', parent_event_id
  ) AS operation_details,
  NULL AS user_id,
  grouped_at
FROM pq_events
WHERE grouped_at IS NOT NULL 
  AND grouping_type = 'automatic';

-- Backfill: Manual Grouping
-- Events with grouped_at and grouping_type = 'manual'
INSERT INTO event_audit_log (event_id, operation_type, operation_details, user_id, created_at)
SELECT 
  id AS event_id,
  'grouped_manual'::event_operation_type AS operation_type,
  jsonb_build_object(
    'source', 'backfill_migration',
    'is_mother_event', is_mother_event,
    'parent_event_id', parent_event_id
  ) AS operation_details,
  NULL AS user_id,
  grouped_at
FROM pq_events
WHERE grouped_at IS NOT NULL 
  AND grouping_type = 'manual';

-- Backfill: Marked as False Event
-- Parse remarks field for "[Marked as false event on YYYY-MM-DD]" pattern
INSERT INTO event_audit_log (event_id, operation_type, operation_details, user_id, created_at)
SELECT 
  id AS event_id,
  'marked_false'::event_operation_type AS operation_type,
  jsonb_build_object(
    'source', 'backfill_migration',
    'note', 'Parsed from remarks field'
  ) AS operation_details,
  NULL AS user_id,
  -- Extract date from remarks and convert to timestamp
  (substring(remarks from '\[Marked as false event.*?(\d{4}-\d{2}-\d{2})')::DATE + TIME '00:00:00') AS created_at
FROM pq_events
WHERE false_event = true
  AND remarks IS NOT NULL
  AND remarks ~ '\[Marked as false event.*?\d{4}-\d{2}-\d{2}\]';

-- Backfill: Marked as False Event (entire group)
-- Parse remarks for "[Marked as false event (entire group) on YYYY-MM-DD]" pattern
INSERT INTO event_audit_log (event_id, operation_type, operation_details, user_id, created_at)
SELECT 
  id AS event_id,
  'batch_marked_false'::event_operation_type AS operation_type,
  jsonb_build_object(
    'source', 'backfill_migration',
    'note', 'Entire group marked as false',
    'is_mother_event', is_mother_event
  ) AS operation_details,
  NULL AS user_id,
  (substring(remarks from '\[Marked as false event \(entire group\).*?(\d{4}-\d{2}-\d{2})')::DATE + TIME '00:00:00') AS created_at
FROM pq_events
WHERE false_event = true
  AND remarks IS NOT NULL
  AND remarks ~ '\[Marked as false event \(entire group\).*?\d{4}-\d{2}-\d{2}\]';

-- Backfill: Converted from False Event
-- Parse remarks for "[Converted from false event on YYYY-MM-DD]" pattern
INSERT INTO event_audit_log (event_id, operation_type, operation_details, user_id, created_at)
SELECT 
  id AS event_id,
  'converted_from_false'::event_operation_type AS operation_type,
  jsonb_build_object(
    'source', 'backfill_migration',
    'note', 'Parsed from remarks field'
  ) AS operation_details,
  NULL AS user_id,
  (substring(remarks from '\[Converted from false event.*?(\d{4}-\d{2}-\d{2})')::DATE + TIME '00:00:00') AS created_at
FROM pq_events
WHERE false_event = false
  AND remarks IS NOT NULL
  AND remarks ~ '\[Converted from false event.*?\d{4}-\d{2}-\d{2}\]';

-- Backfill: Event Resolved
-- Events with resolved_at timestamp
INSERT INTO event_audit_log (event_id, operation_type, operation_details, user_id, created_at)
SELECT 
  id AS event_id,
  'event_resolved'::event_operation_type AS operation_type,
  jsonb_build_object(
    'source', 'backfill_migration',
    'final_status', status
  ) AS operation_details,
  NULL AS user_id,
  resolved_at
FROM pq_events
WHERE resolved_at IS NOT NULL;

-- Backfill: IDR Created
-- Events with IDR records can be inferred from idr_records table
INSERT INTO event_audit_log (event_id, operation_type, operation_details, user_id, created_at)
SELECT 
  event_id,
  'idr_created'::event_operation_type AS operation_type,
  jsonb_build_object(
    'source', 'backfill_migration',
    'idr_no', idr_no,
    'manual_create', (SELECT manual_create_idr FROM pq_events WHERE id = event_id)
  ) AS operation_details,
  uploaded_by AS user_id,
  created_at
FROM idr_records
WHERE event_id IS NOT NULL;

-- Log completion
DO $$
DECLARE
  total_logs INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_logs FROM event_audit_log;
  RAISE NOTICE 'Event audit log backfill complete. Total audit log entries: %', total_logs;
END $$;
