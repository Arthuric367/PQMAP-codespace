# Quick Fix Summary - Notification Migration Role Error

**Issue:** Invalid enum value 'system_admin' in notification migration  
**Status:** ✅ FIXED  
**Date:** January 14, 2026

---

## TL;DR

### What Went Wrong
Migration used TypeScript roles (`'system_admin'`) instead of database roles (`'admin'`).

### What Was Fixed
Changed 10 locations in migration file from UAM roles to database roles.

### What You Need to Do
1. Ensure you have an admin user
2. Re-run migration: `supabase db push`
3. Run verification script

---

## Quick Fix Details

### Changed Values

| From (WRONG) | To (CORRECT) | Count |
|--------------|--------------|-------|
| `'system_admin'` | `'admin'` | 2 locations |
| `role IN ('system_admin', 'system_owner')` | `role = 'admin'` | 7 policies |
| `role IN ('operator', 'manual_implementator', 'system_admin', 'system_owner')` | `role IN ('operator', 'admin')` | 1 policy |

**Total: 10 replacements**

---

## Re-Run Instructions

### Step 1: Check for Admin User
```sql
SELECT id, email, role FROM profiles;
```

**If no admin user:**
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

### Step 2: Re-apply Migration
```bash
supabase db push
```

### Step 3: Verify Success
```bash
supabase db execute -f supabase/migrations/20260114000001_verify_notification_migration.sql
```

**Expected output:**
- ✓ All 7 tables created
- ✓ 3 channels, 2 templates, 4 groups, 2 rules
- ✓ RLS policies enabled

---

## Valid Database Roles

Use these in SQL:
- ✅ `'admin'`
- ✅ `'operator'`
- ✅ `'viewer'`

**DO NOT USE:**
- ❌ `'system_admin'` (TypeScript only, not in database)
- ❌ `'system_owner'` (TypeScript only, not in database)
- ❌ `'manual_implementator'` (TypeScript only, not in database)
- ❌ `'watcher'` (TypeScript only, not in database)

---

## Permission Summary

| Role | Permissions |
|------|-------------|
| **admin** | Full access, can approve templates |
| **operator** | Can create drafts, view data |
| **viewer** | Read-only |

---

## Troubleshooting

### Error: "invalid input value for enum user_role"
**Cause:** Using wrong role name  
**Fix:** Use `'admin'`, `'operator'`, or `'viewer'` only

### Error: "column reference 'role' is ambiguous"
**Cause:** Unqualified column name  
**Fix:** Use `profiles.role` instead of `role`

### Error: "no rows returned"
**Cause:** No admin user in profiles table  
**Fix:** Promote a user to admin (see Step 1 above)

---

## Next Steps

After migration succeeds:
1. ✅ Verify seed data exists (3 channels, 2 templates, etc.)
2. 📋 Proceed to Day 2: TypeScript types and services
3. 📋 Day 3-5: UI implementation

---

## Full Documentation

- [ROLE_SYSTEM_CLARIFICATION.md](ROLE_SYSTEM_CLARIFICATION.md) - Comprehensive explanation
- [ROLE_ERROR_RESOLUTION.md](ROLE_ERROR_RESOLUTION.md) - Detailed fix analysis
- [NOTIFICATION_SYSTEM_MIGRATION_PLAN.md](NOTIFICATION_SYSTEM_MIGRATION_PLAN.md) - Full implementation plan
- [DAY1_SETUP_GUIDE.md](DAY1_SETUP_GUIDE.md) - Setup instructions

---

**Questions?** Read [ROLE_SYSTEM_CLARIFICATION.md](ROLE_SYSTEM_CLARIFICATION.md) first  
**Still stuck?** Contact DBA or Tech Lead
