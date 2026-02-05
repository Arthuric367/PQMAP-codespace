-- Backfill Script: Simplify pq_service_records.content field
-- Date: February 5, 2026
-- Purpose: Shorten content/service descriptions to less than 10 words for PQSIS reporting

-- Update content based on service_type to provide concise descriptions
UPDATE pq_service_records
SET content = CASE 
    -- Service type mappings to concise descriptions
    WHEN service_type = 'site_survey' THEN 'Site Survey and Assessment'
    WHEN service_type = 'harmonic_analysis' THEN 'Harmonic Analysis Study'
    WHEN service_type = 'consultation' THEN 'PQ Consultation Service'
    WHEN service_type = 'on_site_study' THEN 'On-Site Power Quality Study'
    WHEN service_type = 'power_quality_audit' THEN 'Power Quality Audit'
    WHEN service_type = 'installation_support' THEN 'Installation Support Service'
    -- For records with existing content, try to simplify
    WHEN content IS NOT NULL AND LENGTH(content) > 50 THEN 
        LEFT(content, 47) || '...'
    -- Keep existing short content
    WHEN content IS NOT NULL THEN content
    -- Default fallback
    ELSE 'PQ Service'
END
WHERE content IS NULL OR LENGTH(content) > 50;

-- Log the update
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count 
    FROM pq_service_records 
    WHERE content IS NOT NULL AND LENGTH(content) <= 50;
    
    RAISE NOTICE '✅ Backfill complete. Total records with simplified content: %', updated_count;
END $$;

-- Verify the results
SELECT 
    service_type,
    content,
    LENGTH(content) as content_length,
    COUNT(*) as record_count
FROM pq_service_records
GROUP BY service_type, content, LENGTH(content)
ORDER BY service_type, content_length DESC;
