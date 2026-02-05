-- Migration: Create Event Audit Log Table
-- Date: February 5, 2026
-- Purpose: Track all user operations on events for comprehensive audit trail and timeline display

-- Drop existing objects if they exist (for re-running migration)
DROP TABLE IF EXISTS event_audit_log CASCADE;
DROP TYPE IF EXISTS event_operation_type CASCADE;

-- Create operation type enum
CREATE TYPE event_operation_type AS ENUM (
  'event_created',
  'event_detected',
  'marked_false',
  'converted_from_false',
  'grouped_automatic',
  'grouped_manual',
  'ungrouped_full',
  'ungrouped_partial',
  'idr_created',
  'idr_updated',
  'status_changed',
  'severity_changed',
  'cause_updated',
  'psbg_cause_updated',
  'event_modified',
  'batch_marked_false',
  'event_resolved',
  'event_deleted'
);

-- Create event_audit_log table
CREATE TABLE event_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES pq_events(id) ON DELETE CASCADE,
  operation_type event_operation_type NOT NULL,
  operation_details JSONB DEFAULT '{}',
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_event_audit_log_event_id ON event_audit_log(event_id);
CREATE INDEX idx_event_audit_log_operation_type ON event_audit_log(operation_type);
CREATE INDEX idx_event_audit_log_created_at ON event_audit_log(created_at DESC);
CREATE INDEX idx_event_audit_log_user_id ON event_audit_log(user_id);

-- Composite index for common query pattern (event + chronological order)
CREATE INDEX idx_event_audit_log_event_created ON event_audit_log(event_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE event_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all authenticated users to read audit logs
CREATE POLICY "Allow authenticated users to read audit logs"
  ON event_audit_log
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert audit logs
CREATE POLICY "Allow authenticated users to insert audit logs"
  ON event_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Prevent updates to audit logs (immutable)
CREATE POLICY "Prevent updates to audit logs"
  ON event_audit_log
  FOR UPDATE
  TO authenticated
  USING (false);

-- RLS Policy: Prevent deletes to audit logs (only cascade from event deletion)
CREATE POLICY "Prevent manual deletes to audit logs"
  ON event_audit_log
  FOR DELETE
  TO authenticated
  USING (false);

-- Add comment to table
COMMENT ON TABLE event_audit_log IS 'Audit trail for all operations performed on PQ events. Provides comprehensive timeline for event lifecycle tracking.';

-- Add comments to columns
COMMENT ON COLUMN event_audit_log.operation_type IS 'Type of operation performed on the event';
COMMENT ON COLUMN event_audit_log.operation_details IS 'JSON object with operation-specific details: affected_fields, child_event_ids, field_changes, etc.';
COMMENT ON COLUMN event_audit_log.user_id IS 'User who performed the operation (NULL for system/automatic operations)';
