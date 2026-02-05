-- Script to check data in findings and recommendations columns before deletion
-- Run this BEFORE applying migration 20260205000002_remove_findings_recommendations.sql

-- Count records with data
SELECT 
  'Records with findings' as description,
  COUNT(*) as count
FROM pq_service_records
WHERE findings IS NOT NULL AND findings != ''
UNION ALL
SELECT 
  'Records with recommendations' as description,
  COUNT(*) as count
FROM pq_service_records
WHERE recommendations IS NOT NULL AND recommendations != ''
UNION ALL
SELECT 
  'Records with either field' as description,
  COUNT(*) as count
FROM pq_service_records
WHERE (findings IS NOT NULL AND findings != '') 
   OR (recommendations IS NOT NULL AND recommendations != '');

-- Show sample data that will be deleted
SELECT 
  id,
  case_number,
  service_type,
  service_date,
  LENGTH(findings) as findings_length,
  LEFT(findings, 100) as findings_preview,
  LENGTH(recommendations) as recommendations_length,
  LEFT(recommendations, 100) as recommendations_preview
FROM pq_service_records
WHERE (findings IS NOT NULL AND findings != '') 
   OR (recommendations IS NOT NULL AND recommendations != '')
ORDER BY service_date DESC
LIMIT 20;

-- Export full data to backup (optional)
-- Uncomment below to export all data before deletion
-- SELECT 
--   id,
--   case_number,
--   service_type,
--   service_date,
--   findings,
--   recommendations
-- FROM pq_service_records
-- WHERE (findings IS NOT NULL AND findings != '') 
--    OR (recommendations IS NOT NULL AND recommendations != '');
