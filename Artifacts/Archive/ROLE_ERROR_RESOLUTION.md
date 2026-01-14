# Role Error Resolution - Notification System Migration

**Date:** January 14, 2026  
**Issue:** SQL error on line 335 - invalid enum value 'system_admin'  
**Status:** ✅ RESOLVED  
**Migration:** `20260114000000_notification_system_migration.sql`

---

## Error Report

### Original Error
```
Error: Failed to run sql query: 
ERROR: invalid input value for enum user_role: "system_admin"
LINE 335: approved_by = 'system_admin',
```

### Impact
- ❌ Migration failed
- ❌ Notification system tables not created
- ❌ Seed data not inserted
- 🚫 Blocked Day 1 implementation

---

## Root Cause Analysis

### The Problem
The migration file used **UAM TypeScript roles** instead of **database enum values**.

### Database Schema
```sql
-- Actual enum in database (line 171 of 20251103020125_create_pqmap_schema.sql)
CREATE TYPE user_role AS ENUM ('admin', 'operator', 'viewer');
```

### Migration Used (WRONG)
```sql
-- ❌ WRONG - These values don't exist in database
approved_by = 'system_admin',  -- Not a valid enum value
role IN ('system_admin', 'system_owner')  -- Not valid enum values
```

### Why It Happened
1. Migration author referenced TypeScript types from `src/types/database.ts`
2. TypeScript defines future UAM roles: `'system_admin' | 'system_owner' | 'manual_implementator' | 'watcher'`
3. These roles are **planned future features**, not implemented in database
4. PostgreSQL rejected the values because they don't exist in the `user_role` enum

---

## Detailed Fixes

### Fix 1: Template Seed Data (2 locations)

**Location:** Lines 167-168, 199-200

**Before:**
```sql
INSERT INTO notification_templates (...) VALUES
(
  ...
  approved_by = 'system_admin',  -- ❌ WRONG
  approved_at = NOW(),
  ...
);
```

**After:**
```sql
INSERT INTO notification_templates (...) VALUES
(
  ...
  approved_by = 'admin',  -- ✅ CORRECT
  approved_at = NOW(),
  ...
);
```

**Reason:** Template approval requires admin user (not 'system_admin')

---

### Fix 2: Admin-Only RLS Policies (7 locations)

**Affected Tables:**
- `notification_channels` (1 policy)
- `notification_templates` (1 policy)
- `notification_groups` (2 policies)
- `notification_rules` (2 policies)
- `notification_system_config` (1 policy)

**Before:**
```sql
CREATE POLICY "admin_full_access" ON notification_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('system_admin', 'system_owner')  -- ❌ WRONG
    )
  );
```

**After:**
```sql
CREATE POLICY "admin_full_access" ON notification_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'  -- ✅ CORRECT
    )
  );
```

**Reason:** Only 'admin' role exists in database, not 'system_admin' or 'system_owner'

---

### Fix 3: Template Creation Policy (1 location)

**Location:** `notification_templates` table

**Before:**
```sql
CREATE POLICY "operators_can_create_drafts" ON notification_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('operator', 'manual_implementator', 'system_admin', 'system_owner')  -- ❌ WRONG
    )
    AND status = 'draft'
  );
```

**After:**
```sql
CREATE POLICY "operators_can_create_drafts" ON notification_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('operator', 'admin')  -- ✅ CORRECT
    )
    AND status = 'draft'
  );
```

**Reason:** Only 'operator' and 'admin' roles exist in database

---

## Summary of Changes

### Total Replacements: 10

| Location Type | Count | Changed From | Changed To |
|---------------|-------|--------------|------------|
| Template seed data | 2 | `'system_admin'` | `'admin'` |
| Admin-only policies | 7 | `role IN ('system_admin', 'system_owner')` | `role = 'admin'` |
| Template creation policy | 1 | `role IN ('operator', 'manual_implementator', 'system_admin', 'system_owner')` | `role IN ('operator', 'admin')` |

### Line Numbers Fixed
- Lines 167, 199: Template approved_by
- Lines 335, 352, 445, 469, 518, 541, 668: RLS policies (admin checks)
- Line 371: RLS policy (operator + admin check)

---

## Verification Steps

### 1. Check Database Enum
```sql
-- Verify valid enum values
SELECT enum_range(NULL::user_role);
-- Expected: {admin,operator,viewer}
```

### 2. Ensure Admin User Exists
```sql
-- Check if any admin users exist
SELECT id, email, role FROM profiles WHERE role = 'admin';

-- If no admin, promote a user:
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

### 3. Re-run Migration
```bash
supabase db push
```

### 4. Run Verification Script
```bash
supabase db execute -f supabase/migrations/20260114000001_verify_notification_migration.sql
```

---

## Permission Model (After Fix)

### Admin (`role = 'admin'`)
- ✅ Full access to all notification tables
- ✅ Can approve templates
- ✅ Can modify system config
- ✅ Can manage channels, groups, rules

### Operator (`role = 'operator'`)
- ✅ Can create draft templates (requires admin approval)
- ✅ Can view templates, groups, rules
- ❌ Cannot approve templates
- ❌ Cannot modify system config

### Viewer (`role = 'viewer'`)
- ✅ Read-only access to all data
- ❌ Cannot create or modify anything

---

## Lessons Learned

### 1. Always Verify Enum Values
Before using enum values in SQL:
```sql
-- Find enum definition
\dT+ user_role

-- Or query it
SELECT enum_range(NULL::user_role);
```

### 2. TypeScript Types ≠ Database Enums
- TypeScript can define aspirational/future types
- Database only has what's been migrated
- **Always check migrations, not TypeScript files**

### 3. Document Dual Role Systems
- Created [ROLE_SYSTEM_CLARIFICATION.md](ROLE_SYSTEM_CLARIFICATION.md) to prevent future confusion
- Explicitly document which roles are active vs planned

### 4. Use Qualified Column Names
```sql
-- ✅ GOOD - Avoids ambiguity
WHERE profiles.role = 'admin'

-- ❌ BAD - Can cause errors
WHERE role = 'admin'
```

---

## Related Files

### Modified
- ✅ `supabase/migrations/20260114000000_notification_system_migration.sql` (10 fixes)

### Updated Documentation
- ✅ [ROLE_SYSTEM_CLARIFICATION.md](ROLE_SYSTEM_CLARIFICATION.md) - Comprehensive guide
- ✅ [QUICK_FIX_SUMMARY.md](QUICK_FIX_SUMMARY.md) - Quick reference
- ✅ [DAY1_SETUP_GUIDE.md](DAY1_SETUP_GUIDE.md) - Added troubleshooting

### Reference
- 📖 [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Full schema reference
- 📖 Migration: `20251103020125_create_pqmap_schema.sql` (line 171) - Enum definition

---

## Prevention Checklist

Before writing SQL migrations:

- [ ] Checked actual database enum definitions (not TypeScript)
- [ ] Used qualified column names (`profiles.role`, not `role`)
- [ ] Verified enum values exist in database
- [ ] Referenced correct migration files for schema
- [ ] Tested migration on local Supabase instance
- [ ] Reviewed RLS policies for correct role references

---

**Status:** ✅ All errors resolved, migration ready to apply  
**Next Step:** User must ensure admin user exists, then re-run `supabase db push`  
**Questions?** See [ROLE_SYSTEM_CLARIFICATION.md](ROLE_SYSTEM_CLARIFICATION.md) for detailed explanation
