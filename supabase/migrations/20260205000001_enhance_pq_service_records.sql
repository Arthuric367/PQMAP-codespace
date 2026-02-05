-- Migration: Enhance PQ Service Records Table
-- Date: February 5, 2026
-- Purpose: Add comprehensive service tracking fields for PQ Services module

-- Add new columns to pq_service_records table
ALTER TABLE pq_service_records
  -- Case tracking
  ADD COLUMN case_number SERIAL,
  ADD COLUMN tariff_group TEXT, -- Customer Premises Tariff Group (e.g., BT, HT)
  
  -- Financial tracking
  ADD COLUMN service_charge_amount DECIMAL(10, 2), -- Service charging amount in HKD (k)
  ADD COLUMN party_charged TEXT, -- Party to be charged (e.g., AMD, CLP, Customer)
  
  -- Date tracking
  ADD COLUMN completion_date DATE, -- Service completion date
  ADD COLUMN planned_reply_date DATE, -- Planned reply date
  ADD COLUMN actual_reply_date DATE, -- Actual reply date
  ADD COLUMN planned_report_issue_date DATE, -- Planned report issue date
  ADD COLUMN actual_report_issue_date DATE, -- Actual report issue date
  
  -- Status tracking
  ADD COLUMN is_closed BOOLEAN DEFAULT false, -- Case closed status
  ADD COLUMN is_in_progress BOOLEAN DEFAULT true, -- Case in-progress status
  ADD COLUMN completed_before_target BOOLEAN, -- Completed before target date
  
  -- Additional information
  ADD COLUMN business_nature TEXT, -- Business nature (e.g., Shopping Centre, Factory)
  ADD COLUMN participant_count INTEGER, -- Number of participants (for education service type)
  
  -- Substation/Circuit information (derived from linked event)
  ADD COLUMN ss132_info TEXT, -- 132kV Primary S/S Name & Txn No.
  ADD COLUMN ss011_info TEXT; -- 11kV Customer S/S Code & Txn No.

-- Create index on case_number for faster lookups
CREATE INDEX idx_pq_service_records_case_number ON pq_service_records(case_number);

-- Create index on completion_date for date range queries
CREATE INDEX idx_pq_service_records_completion_date ON pq_service_records(completion_date);

-- Create index on is_closed and is_in_progress for status filtering
CREATE INDEX idx_pq_service_records_status ON pq_service_records(is_closed, is_in_progress);

-- Add comment to case_number column
COMMENT ON COLUMN pq_service_records.case_number IS 'Auto-generated sequential case number (e.g., 1, 2, 3...)';

-- Add comment to tariff_group column
COMMENT ON COLUMN pq_service_records.tariff_group IS 'Customer premises tariff group classification';

-- Add comment to service_charge_amount column
COMMENT ON COLUMN pq_service_records.service_charge_amount IS 'Service charging amount in HKD (thousands)';

-- Add comment to business_nature column
COMMENT ON COLUMN pq_service_records.business_nature IS 'Nature of customer business (e.g., Shopping Centre, Factory, Office Building)';

-- Add comment to participant_count column
COMMENT ON COLUMN pq_service_records.participant_count IS 'Number of participants (applicable for education service types)';

-- Add comment to ss132_info column
COMMENT ON COLUMN pq_service_records.ss132_info IS '132kV Primary Substation Name & Transformer Number (derived from linked event)';

-- Add comment to ss011_info column
COMMENT ON COLUMN pq_service_records.ss011_info IS '11kV Customer Substation Code & Transformer Number (derived from linked event)';

-- Migration verification query
-- Run this after migration to verify new columns
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns 
-- WHERE table_name = 'pq_service_records' 
-- ORDER BY ordinal_position;
