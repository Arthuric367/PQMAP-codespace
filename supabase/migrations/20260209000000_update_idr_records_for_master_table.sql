-- Migration: Update IDR Records for Master Table Feature
-- Created: 2026-02-09
-- Purpose: Convert idr_records to support standalone IDRs before event mapping

-- ============================================================================
-- STEP 1: Drop old constraints and update existing structure
-- ============================================================================

-- Make event_id nullable (IDRs can exist before being mapped to events)
ALTER TABLE idr_records 
  ALTER COLUMN event_id DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS idr_records_event_id_key; -- Remove UNIQUE constraint

-- Make cause nullable (not required for bulk import)
ALTER TABLE idr_records 
  ALTER COLUMN cause DROP NOT NULL;

-- ============================================================================
-- STEP 2: Add new columns for Excel import workflow
-- ============================================================================

-- IDR Core Information (REQUIRED for Excel import)
ALTER TABLE idr_records 
  ADD COLUMN IF NOT EXISTS occurrence_time TIMESTAMPTZ, -- REQUIRED: Timestamp from Excel
  ADD COLUMN IF NOT EXISTS source_substation TEXT, -- SOURCE SUBSTATION column
  ADD COLUMN IF NOT EXISTS incident_location TEXT, -- INCIDENT LOCATION column
  ADD COLUMN IF NOT EXISTS region TEXT, -- REGION column (NR, WER, etc.)
  ADD COLUMN IF NOT EXISTS circuit TEXT; -- Circuit information

-- Sensitive Customer Flag (REQUIRED for Excel import)
ALTER TABLE idr_records 
  ADD COLUMN IF NOT EXISTS affected_sensitive_customer BOOLEAN DEFAULT false; -- REQUIRED field

-- Root Cause Extended Fields
ALTER TABLE idr_records 
  ADD COLUMN IF NOT EXISTS faulty_component TEXT,
  ADD COLUMN IF NOT EXISTS external_internal TEXT CHECK (external_internal IN ('external', 'internal'));

-- Mapping Tracking Fields
ALTER TABLE idr_records 
  ADD COLUMN IF NOT EXISTS is_mapped BOOLEAN DEFAULT false, -- Indicates if IDR is mapped to an event
  ADD COLUMN IF NOT EXISTS mapped_at TIMESTAMPTZ, -- Timestamp when mapped to event
  ADD COLUMN IF NOT EXISTS mapped_by uuid REFERENCES profiles(id); -- User who performed the mapping

-- Update upload_source to include excel_import
ALTER TABLE idr_records 
  ALTER COLUMN upload_source TYPE TEXT,
  ALTER COLUMN upload_source SET DEFAULT 'manual_entry';

-- ============================================================================
-- STEP 3: Update existing records
-- ============================================================================

-- Backfill idr_no for records without it (generate from event_id or ID)
UPDATE idr_records 
SET idr_no = COALESCE(
  idr_no, 
  'IDR-' || SUBSTRING(CAST(id AS TEXT), 1, 8)
)
WHERE idr_no IS NULL;

-- For existing records linked to events, mark them as mapped
UPDATE idr_records 
SET 
  is_mapped = true,
  mapped_at = updated_at,
  occurrence_time = COALESCE(occurrence_time, created_at)
WHERE event_id IS NOT NULL AND is_mapped = false;

-- Backfill occurrence_time from created_at for records without it
UPDATE idr_records 
SET occurrence_time = created_at
WHERE occurrence_time IS NULL;

-- ============================================================================
-- STEP 4: Add NOT NULL constraints after backfill
-- ============================================================================

-- Make occurrence_time NOT NULL after backfill
ALTER TABLE idr_records 
  ALTER COLUMN occurrence_time SET NOT NULL;

-- Make idr_no NOT NULL (it's the primary identifier)
ALTER TABLE idr_records 
  ALTER COLUMN idr_no SET NOT NULL;

-- Make affected_sensitive_customer NOT NULL (required field)
ALTER TABLE idr_records 
  ALTER COLUMN affected_sensitive_customer SET NOT NULL,
  ALTER COLUMN affected_sensitive_customer SET DEFAULT false;

-- ============================================================================
-- STEP 5: Add new indexes for performance
-- ============================================================================

-- Add UNIQUE constraint to prevent duplicate IDR numbers
ALTER TABLE idr_records 
  ADD CONSTRAINT idr_records_idr_no_unique UNIQUE (idr_no);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_idr_records_occurrence_time ON idr_records(occurrence_time DESC);
CREATE INDEX IF NOT EXISTS idx_idr_records_source_substation ON idr_records(source_substation);
CREATE INDEX IF NOT EXISTS idx_idr_records_region ON idr_records(region);
CREATE INDEX IF NOT EXISTS idx_idr_records_is_mapped ON idr_records(is_mapped);
CREATE INDEX IF NOT EXISTS idx_idr_records_mapped_at ON idr_records(mapped_at DESC);

-- Update foreign key with proper cascade behavior
ALTER TABLE idr_records
  DROP CONSTRAINT IF EXISTS idr_records_event_id_fkey,
  ADD CONSTRAINT idr_records_event_id_fkey 
    FOREIGN KEY (event_id) 
    REFERENCES pq_events(id) 
    ON DELETE SET NULL;  -- When event deleted, unmap IDR instead of deleting it

-- ============================================================================
-- STEP 6: Update RLS policies
-- ============================================================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view all IDR records" ON idr_records;
DROP POLICY IF EXISTS "Users can insert IDR records" ON idr_records;
DROP POLICY IF EXISTS "Users can update their own IDR records" ON idr_records;
DROP POLICY IF EXISTS "Users can delete their own IDR records" ON idr_records;

-- Policy: Authenticated users can view all IDR records
CREATE POLICY "idr_records_select_policy"
  ON idr_records
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert IDR records
CREATE POLICY "idr_records_insert_policy"
  ON idr_records
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update all IDR records
CREATE POLICY "idr_records_update_policy"
  ON idr_records
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete all IDR records
CREATE POLICY "idr_records_delete_policy"
  ON idr_records
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- STEP 7: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN idr_records.event_id IS 'Links to pq_events table (nullable - IDR can exist before event mapping)';
COMMENT ON COLUMN idr_records.idr_no IS 'IDR number (REQUIRED - primary identifier from Excel)';
COMMENT ON COLUMN idr_records.occurrence_time IS 'Event occurrence timestamp (REQUIRED - from Excel OCCURRENCE TIME column)';
COMMENT ON COLUMN idr_records.source_substation IS 'Source substation name (from Excel SOURCE SUBSTATION column)';
COMMENT ON COLUMN idr_records.incident_location IS 'Incident location details (from Excel INCIDENT LOCATION column)';
COMMENT ON COLUMN idr_records.region IS 'Region code (from Excel REGION column - NR, WER, etc.)';
COMMENT ON COLUMN idr_records.affected_sensitive_customer IS 'Flag for sensitive customer impact (REQUIRED - from Excel)';
COMMENT ON COLUMN idr_records.is_mapped IS 'Indicates if IDR has been mapped to a PQ event';
COMMENT ON COLUMN idr_records.mapped_at IS 'Timestamp when IDR was mapped to an event';
COMMENT ON COLUMN idr_records.mapped_by IS 'User who mapped the IDR to an event';
COMMENT ON COLUMN idr_records.upload_source IS 'Source of IDR data: excel_import, csv_import, or manual_entry';

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify the changes
SELECT 
  COUNT(*) as total_records,
  COUNT(event_id) as mapped_records,
  COUNT(*) - COUNT(event_id) as unmapped_records,
  COUNT(CASE WHEN is_mapped = true THEN 1 END) as is_mapped_true
FROM idr_records;
