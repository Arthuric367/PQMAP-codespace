-- Migration: Add RLS policies for PQ Benchmarking tables
-- Created: 2026-01-12
-- Purpose: Enable Row Level Security and add policies for pq_benchmark_standards and pq_benchmark_thresholds

-- Enable RLS on pq_benchmark_standards table
ALTER TABLE pq_benchmark_standards ENABLE ROW LEVEL SECURITY;

-- Enable RLS on pq_benchmark_thresholds table
ALTER TABLE pq_benchmark_thresholds ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES for pq_benchmark_standards
-- ============================================================================

-- Policy: Allow all authenticated users to SELECT (read) standards
CREATE POLICY "Allow authenticated users to view benchmark standards"
ON pq_benchmark_standards
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow admins and operators to INSERT standards
CREATE POLICY "Allow admins and operators to create benchmark standards"
ON pq_benchmark_standards
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'operator')
  )
);

-- Policy: Allow admins and operators to UPDATE standards
CREATE POLICY "Allow admins and operators to update benchmark standards"
ON pq_benchmark_standards
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'operator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'operator')
  )
);

-- Policy: Allow only admins to DELETE standards
CREATE POLICY "Allow admins to delete benchmark standards"
ON pq_benchmark_standards
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================================================
-- RLS POLICIES for pq_benchmark_thresholds
-- ============================================================================

-- Policy: Allow all authenticated users to SELECT (read) thresholds
CREATE POLICY "Allow authenticated users to view benchmark thresholds"
ON pq_benchmark_thresholds
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow admins and operators to INSERT thresholds
CREATE POLICY "Allow admins and operators to create benchmark thresholds"
ON pq_benchmark_thresholds
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'operator')
  )
);

-- Policy: Allow admins and operators to UPDATE thresholds
CREATE POLICY "Allow admins and operators to update benchmark thresholds"
ON pq_benchmark_thresholds
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'operator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'operator')
  )
);

-- Policy: Allow only admins to DELETE thresholds
CREATE POLICY "Allow admins to delete benchmark thresholds"
ON pq_benchmark_thresholds
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$ 
BEGIN 
  RAISE NOTICE '✅ RLS enabled and policies created for PQ benchmarking tables';
  RAISE NOTICE '   - pq_benchmark_standards: SELECT (all authenticated), INSERT/UPDATE (admin/operator), DELETE (admin only)';
  RAISE NOTICE '   - pq_benchmark_thresholds: SELECT (all authenticated), INSERT/UPDATE (admin/operator), DELETE (admin only)';
END $$;
