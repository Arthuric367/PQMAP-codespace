-- ============================================================================
-- NOTIFICATION SYSTEM MIGRATION - VERIFICATION SCRIPT
-- ============================================================================
-- Purpose: Verify that the notification system migration completed successfully
-- Run this after applying migration: 20260114000000_notification_system_migration.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Check that old tables are removed
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    RAISE EXCEPTION 'ERROR: Old table "notifications" still exists!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_rules' AND table_schema = 'public') THEN
    -- Check if it's the NEW notification_rules (has 'conditions' column) or old one
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notification_rules' 
      AND column_name = 'conditions'
    ) THEN
      RAISE EXCEPTION 'ERROR: Old notification_rules table still exists!';
    END IF;
  END IF;
  
  RAISE NOTICE '✓ Old tables successfully removed';
END $$;

-- ----------------------------------------------------------------------------
-- 2. Verify all new tables exist
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  table_names text[] := ARRAY[
    'notification_channels',
    'notification_templates',
    'notification_groups',
    'notification_group_members',
    'notification_rules',
    'notification_logs',
    'notification_system_config'
  ];
  tbl_name text;  -- Renamed to avoid ambiguity
BEGIN
  FOREACH tbl_name IN ARRAY table_names LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = tbl_name
    ) THEN
      RAISE EXCEPTION 'ERROR: Table "%" does not exist!', tbl_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✓ All 7 tables created successfully';
END $$;

-- ----------------------------------------------------------------------------
-- 3. Check row counts (seed data)
-- ----------------------------------------------------------------------------
SELECT 
  '✓ Seed data verification' AS status,
  (SELECT COUNT(*) FROM notification_channels) AS channels_count,
  (SELECT COUNT(*) FROM notification_templates) AS templates_count,
  (SELECT COUNT(*) FROM notification_groups) AS groups_count,
  (SELECT COUNT(*) FROM notification_rules) AS rules_count,
  (SELECT COUNT(*) FROM notification_system_config) AS config_count;

-- Expected:
-- channels_count: 3 (Email, SMS, Teams)
-- templates_count: 2 (Critical Alert, Customer Impact)
-- groups_count: 4 (Emergency, Maintenance, Management, Operations)
-- rules_count: 2
-- config_count: 1

-- ----------------------------------------------------------------------------
-- 4. Verify seeded channels
-- ----------------------------------------------------------------------------
SELECT 
  '✓ Channels verification' AS status,
  name,
  type,
  status,
  (config->>'demo_mode')::boolean AS demo_mode
FROM notification_channels
ORDER BY priority;

-- Expected: 3 rows (Email, SMS, Microsoft Teams), all enabled, demo_mode=true

-- ----------------------------------------------------------------------------
-- 5. Verify seeded templates
-- ----------------------------------------------------------------------------
SELECT 
  '✓ Templates verification' AS status,
  name,
  code,
  status,
  array_length(applicable_channels, 1) AS channel_count,
  jsonb_array_length(variables) AS variable_count,
  approved_by IS NOT NULL AS is_approved
FROM notification_templates
ORDER BY created_at;

-- Expected: 2 rows, both approved, 7 variables each

-- ----------------------------------------------------------------------------
-- 6. Verify seeded groups
-- ----------------------------------------------------------------------------
SELECT 
  '✓ Groups verification' AS status,
  name,
  group_type,
  status,
  (SELECT COUNT(*) FROM notification_group_members WHERE group_id = notification_groups.id) AS member_count
FROM notification_groups
ORDER BY name;

-- Expected: 4 rows (Emergency Response Team, Maintenance Crew, Management, Operations Team)
-- member_count: 0 for all (users need to be assigned manually)

-- ----------------------------------------------------------------------------
-- 7. Verify seeded rules
-- ----------------------------------------------------------------------------
SELECT 
  '✓ Rules verification' AS status,
  r.name,
  t.name AS template_name,
  jsonb_array_length(r.conditions) AS condition_count,
  array_length(r.channels, 1) AS channel_count,
  array_length(r.notification_groups, 1) AS group_count,
  r.active,
  r.typhoon_mode_enabled,
  r.mother_event_only
FROM notification_rules r
LEFT JOIN notification_templates t ON r.template_id = t.id
ORDER BY r.priority;

-- Expected: 2 rows with proper template associations and group assignments

-- ----------------------------------------------------------------------------
-- 8. Check RLS policies are enabled
-- ----------------------------------------------------------------------------
SELECT 
  '✓ RLS verification' AS status,
  tablename,
  rowsecurity AS rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) AS policy_count
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'notification%'
ORDER BY tablename;

-- Expected: All notification tables have rls_enabled=true and policy_count > 0

-- ----------------------------------------------------------------------------
-- 9. Check indexes exist
-- ----------------------------------------------------------------------------
SELECT 
  '✓ Indexes verification' AS status,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename LIKE 'notification%'
ORDER BY tablename, indexname;

-- Expected: Multiple indexes per table (type, status, created_at, etc.)

-- ----------------------------------------------------------------------------
-- 10. Verify triggers
-- ----------------------------------------------------------------------------
SELECT 
  '✓ Triggers verification' AS status,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table LIKE 'notification%'
ORDER BY event_object_table;

-- Expected: update_updated_at triggers on 5 tables

-- ----------------------------------------------------------------------------
-- 11. Test template variable structure
-- ----------------------------------------------------------------------------
SELECT 
  '✓ Template variables structure' AS status,
  name AS template_name,
  code,
  jsonb_array_length(variables) AS total_variables,
  jsonb_agg(v->>'name') AS variable_names
FROM notification_templates,
LATERAL jsonb_array_elements(variables) AS v
GROUP BY name, code, variables
ORDER BY code;

-- Expected: Both templates have 7 variables with proper structure

-- ----------------------------------------------------------------------------
-- 12. Test rule conditions structure
-- ----------------------------------------------------------------------------
SELECT 
  '✓ Rule conditions structure' AS status,
  name AS rule_name,
  jsonb_array_length(conditions) AS total_conditions,
  jsonb_agg(c->>'field') AS condition_fields,
  jsonb_agg(c->>'operator') AS condition_operators
FROM notification_rules,
LATERAL jsonb_array_elements(conditions) AS c
GROUP BY name, conditions
ORDER BY name;

-- Expected: Rule 1 has 2 conditions, Rule 2 has 2 conditions

-- ----------------------------------------------------------------------------
-- 13. Verify foreign key relationships
-- ----------------------------------------------------------------------------
SELECT 
  '✓ Foreign keys verification' AS status,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name LIKE 'notification%'
ORDER BY tc.table_name, kcu.column_name;

-- Expected: Multiple foreign keys (template_id, group_id, user_id, rule_id, event_id, etc.)

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================
SELECT 
  '========================' AS separator,
  'MIGRATION VERIFICATION COMPLETE' AS status,
  '========================' AS separator2;

SELECT 
  'Tables Created' AS metric,
  COUNT(*) AS value,
  '7 expected' AS expected
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'notification%';

SELECT 
  'Seed Data - Channels' AS metric,
  COUNT(*) AS value,
  '3 expected' AS expected
FROM notification_channels;

SELECT 
  'Seed Data - Templates' AS metric,
  COUNT(*) AS value,
  '2 expected (both approved)' AS expected
FROM notification_templates
WHERE status = 'approved';

SELECT 
  'Seed Data - Groups' AS metric,
  COUNT(*) AS value,
  '4 expected' AS expected
FROM notification_groups;

SELECT 
  'Seed Data - Rules' AS metric,
  COUNT(*) AS value,
  '2 expected (both active)' AS expected
FROM notification_rules
WHERE active = true;

SELECT 
  'RLS Policies' AS metric,
  COUNT(*) AS value,
  '15+ expected' AS expected
FROM pg_policies
WHERE tablename LIKE 'notification%';

-- ============================================================================
-- If all checks pass, you should see:
-- - ✓ All verification checks passed
-- - 7 tables created
-- - 3 channels, 2 templates, 4 groups, 2 rules
-- - RLS enabled on all tables
-- - 15+ policies created
-- ============================================================================
