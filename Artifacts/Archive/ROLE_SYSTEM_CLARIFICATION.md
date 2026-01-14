# Role System Clarification - PQMAP Database vs UAM TypeScript

**Date:** January 14, 2026  
**Purpose:** Clarify the dual role systems to prevent SQL errors and confusion  
**Status:** 🔴 CRITICAL - Read before writing any SQL involving user roles

---

## The Problem

PQMAP uses **TWO different role systems** that can be confused:

1. **Database Roles** (PostgreSQL enum) - ✅ ACTIVE NOW
2. **UAM System Roles** (TypeScript types) - 🚧 PLANNED FUTURE

This causes errors like:
```
ERROR: invalid input value for enum user_role: "system_admin"
```

---

## Database Roles (ACTIVE - Use These in SQL)

### Enum Definition
```sql
CREATE TYPE user_role AS ENUM ('admin', 'operator', 'viewer');
```

**Defined in:** `supabase/migrations/20251103020125_create_pqmap_schema.sql` (line 171)

### Valid Values
- ✅ `'admin'` - Full system access
- ✅ `'operator'` - Create/edit data, limited config
- ✅ `'viewer'` - Read-only access

### Usage in SQL
```sql
-- ✅ CORRECT - Check for admin role
WHERE profiles.role = 'admin'

-- ✅ CORRECT - Check for multiple roles
WHERE profiles.role IN ('admin', 'operator')

-- ❌ WRONG - Using UAM roles
WHERE profiles.role = 'system_admin'  -- THIS WILL FAIL!

-- ❌ WRONG - Mixing role systems
WHERE profiles.role IN ('system_admin', 'system_owner')  -- THIS WILL FAIL!
```

### Current Implementation
- `profiles` table has `role user_role NOT NULL DEFAULT 'viewer'`
- All RLS policies use these 3 roles
- No other roles exist in the database

---

## UAM System Roles (PLANNED - TypeScript Only)

### Type Definition
```typescript
// src/types/database.ts (TypeScript only, NOT in database)
type SystemRole = 
  | 'system_admin'
  | 'system_owner' 
  | 'manual_implementator'
  | 'watcher';
```

### Status
- 🚧 **NOT IMPLEMENTED** - These are planned future features
- 📝 Documented in requirements, not in database schema
- 🔮 May be implemented in future UAM (User Access Management) module
- ⚠️ **DO NOT USE** in SQL migrations or RLS policies

### Why They Exist
- Found in TypeScript type definitions for future features
- Represent granular permissions for advanced workflows
- Intended for future UAM integration (not current system)

---

## How the Confusion Happened

### Timeline
1. **Nov 2025:** Database created with 3 roles (`admin`, `operator`, `viewer`)
2. **Dec 2025:** TypeScript types added for future UAM features (4 roles)
3. **Jan 2026:** Notification migration incorrectly used TypeScript roles in SQL
4. **Result:** SQL errors because enum values don't exist in database

### Root Cause
- Migration author saw TypeScript types and assumed they were database roles
- No clear documentation separating "current database" vs "future TypeScript"
- Confusion between frontend types and backend schema

---

## Rules for Writing SQL

### ✅ DO
1. **Always use database enum values:**
   - `'admin'`, `'operator'`, `'viewer'`

2. **Check enum definition before writing RLS policies:**
   ```sql
   -- Find the enum definition
   SELECT enum_range(NULL::user_role);
   ```

3. **Reference actual database schema:**
   - Check `supabase/migrations/` for enum definitions
   - Don't trust TypeScript types for SQL

4. **Use qualified column names in policies:**
   ```sql
   -- Good - avoids ambiguity
   WHERE profiles.role = 'admin'
   
   -- Bad - can cause "column reference is ambiguous" errors
   WHERE role = 'admin'
   ```

### ❌ DON'T
1. **Never use UAM roles in SQL:**
   - NOT `'system_admin'`, `'system_owner'`, `'manual_implementator'`, `'watcher'`

2. **Don't mix role systems:**
   ```sql
   -- ❌ WRONG - Mixing database and UAM roles
   WHERE role IN ('admin', 'system_admin')
   ```

3. **Don't assume TypeScript types match database enums:**
   - TypeScript can define future/aspirational types
   - Database only has what's been migrated

---

## Permission Model (Current Database)

| Role | Permissions | Use Case |
|------|-------------|----------|
| **admin** | Full access: create, read, update, delete all records | System administrators |
| **operator** | Create/edit data, limited config changes | Daily operations team |
| **viewer** | Read-only access to all data | Analysts, managers |

### RLS Policy Examples

**Admin-only access:**
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

**Admin + Operator access:**
```sql
CREATE POLICY "operators_can_create" ON notification_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'operator')  -- ✅ CORRECT
    )
  );
```

---

## Future UAM Integration

### When UAM is Implemented
1. New table: `uam_roles` (many-to-many with `profiles`)
2. Keep `profiles.role` as primary authorization (admin/operator/viewer)
3. Add `uam_system_role` as secondary granular permissions
4. Update RLS policies to check both role systems

### Migration Strategy
```sql
-- Future migration (not implemented yet)
CREATE TYPE uam_system_role AS ENUM (
  'system_admin',
  'system_owner',
  'manual_implementator',
  'watcher'
);

ALTER TABLE profiles ADD COLUMN uam_role uam_system_role;

-- Policies will check both:
WHERE profiles.role = 'admin' 
   OR profiles.uam_role = 'system_admin'
```

---

## Common Errors and Fixes

### Error 1: Invalid Enum Value
```
ERROR: invalid input value for enum user_role: "system_admin"
```

**Fix:**
```sql
-- ❌ WRONG
approved_by = 'system_admin'

-- ✅ CORRECT
approved_by = 'admin'
```

---

### Error 2: Ambiguous Column Reference
```
ERROR: 42702: column reference "role" is ambiguous
```

**Fix:**
```sql
-- ❌ WRONG
WHERE role = 'admin'

-- ✅ CORRECT
WHERE profiles.role = 'admin'
```

---

### Error 3: Role Not Found in Enum
```
ERROR: invalid input value for enum user_role: "system_owner"
```

**Fix:**
```sql
-- ❌ WRONG
WHERE role IN ('system_admin', 'system_owner')

-- ✅ CORRECT
WHERE role = 'admin'
```

---

## Quick Reference Card

### 🟢 Database Roles (USE THESE IN SQL)
```
admin
operator
viewer
```

### 🔴 UAM Roles (DO NOT USE IN SQL - TypeScript Only)
```
system_admin
system_owner
manual_implementator
watcher
```

### 📋 Checklist Before Writing SQL
- [ ] Am I writing SQL? → Use database roles only
- [ ] Did I check the enum definition? (`user_role` enum)
- [ ] Did I use qualified column names? (`profiles.role`, not just `role`)
- [ ] Did I avoid UAM roles? (no `system_admin`, etc.)

---

## Related Documentation

- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Full schema with enum definitions
- [ROLE_ERROR_RESOLUTION.md](ROLE_ERROR_RESOLUTION.md) - Detailed error fix
- [QUICK_FIX_SUMMARY.md](QUICK_FIX_SUMMARY.md) - Quick reference for fixes
- Migration: `20251103020125_create_pqmap_schema.sql` (line 171) - Enum definition
- Migration: `20260114000000_notification_system_migration.sql` - Fixed RLS policies

---

**Questions?** Contact DBA or Tech Lead  
**Found another role-related error?** Update this document and create GitHub Issue with label `database`
