# PQMAP Database Schema Documentation

## Overview
Complete database schema for the Power Quality Monitoring and Analysis Platform (PQMAP).

---

## Schema Status

### ✅ Current Base Schema
**Migration:** `20251103020125_create_pqmap_schema.sql`  
**Status:** Applied  
**Date:** November 3, 2025

### ⚠️ Pending Enhancement
**Migration:** `20251209000001_add_sarfi_columns.sql`  
**Status:** NOT YET APPLIED - **YOU MUST RUN THIS FIRST!**  
**Date:** December 9, 2025  
**Purpose:** Adds SARFI-related columns to `pq_events` and `pq_meters`

---

## Table Schemas

### 1. `profiles`
**Purpose:** User profile information linked to auth.users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Links to auth.users |
| `email` | text | NOT NULL | User email address |
| `full_name` | text | NOT NULL | User's full name |
| `role` | user_role | NOT NULL | admin, operator, viewer |
| `department` | text | | Department name |
| `created_at` | timestamptz | DEFAULT now() | Profile creation time |
| `updated_at` | timestamptz | DEFAULT now() | Last update time |

**TypeScript Interface:** `Profile`  
**Status:** ✅ Matches database

---

### 2. `substations`
**Purpose:** Physical substation locations and details

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `name` | text | NOT NULL | Substation name |
| `code` | text | UNIQUE | Substation code |
| `voltage_level` | text | | e.g., "132kV", "11kV", "400kV" |
| `latitude` | decimal(10,6) | | GPS latitude |
| `longitude` | decimal(10,6) | | GPS longitude |
| `region` | text | | Geographic region |
| `status` | substation_status | DEFAULT 'operational' | operational, maintenance, offline |
| `created_at` | timestamptz | DEFAULT now() | Creation timestamp |

**TypeScript Interface:** `Substation`  
**Status:** ✅ Matches database

---

### 3. `pq_meters`
**Purpose:** Power quality monitoring meters/devices

#### Current Schema (Base)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `meter_id` | text | UNIQUE NOT NULL | Meter serial number |
| `substation_id` | uuid | FK → substations | Associated substation |
| `location` | text | | Location within substation |
| `status` | meter_status | DEFAULT 'active' | active, abnormal, inactive |
| `last_communication` | timestamptz | | Last successful comm |
| `firmware_version` | text | | Firmware version |
| `installed_date` | timestamptz | | Installation date |
| `created_at` | timestamptz | DEFAULT now() | Creation timestamp |

#### ⚠️ Columns Added by Migration (NOT YET APPLIED)
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `meter_type` | text | 'PQ Monitor' | Type of meter |
| `voltage_level` | text | | Operating voltage level |

**TypeScript Interface:** `PQMeter`  
**Status:** ⚠️ **TypeScript expects columns that don't exist yet!**

**Migration Required:** `20251209000001_add_sarfi_columns.sql`

---

### 4. `pq_events`
**Purpose:** Power quality events (dips, swells, harmonics, etc.)

#### Current Schema (Base)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `event_type` | event_type | NOT NULL | voltage_dip, voltage_swell, harmonic, etc. |
| `substation_id` | uuid | FK → substations | Affected substation |
| `meter_id` | uuid | FK → pq_meters | Recording meter |
| `timestamp` | timestamptz | NOT NULL | Event occurrence time |
| `duration_ms` | integer | | Event duration in milliseconds |
| `magnitude` | decimal(10,3) | | Event magnitude (voltage %, THD%) |
| `severity` | severity_level | DEFAULT 'low' | critical, high, medium, low |
| `status` | event_status | DEFAULT 'new' | new, acknowledged, investigating, resolved, false |
| `is_mother_event` | boolean | DEFAULT false | Is this a mother event? |
| `parent_event_id` | uuid | FK → pq_events | Links to mother event |
| `root_cause` | text | | Identified root cause |
| `affected_phases` | text[] | DEFAULT ['A','B','C'] | Affected phases |
| `waveform_data` | jsonb | | Waveform data for visualization |
| `created_at` | timestamptz | DEFAULT now() | Creation timestamp |
| `resolved_at` | timestamptz | | Resolution timestamp |

#### ⚠️ Columns Added by Migration (NOT YET APPLIED)
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `voltage_level` | text | | Voltage level (400kV, 132kV, 11kV, 380V) |
| `circuit_id` | text | | Circuit identifier |
| `customer_count` | integer | | Number of affected customers |
| `remaining_voltage` | decimal(5,2) | | Remaining voltage percentage |
| `validated_by_adms` | boolean | false | ADMS validation flag |
| `is_special_event` | boolean | false | Special event (exclude from SARFI) |

**Additional columns from mother event grouping:**
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `is_child_event` | boolean | false | Is this a child event? |
| `grouping_type` | text | | automatic, manual |
| `grouped_at` | timestamptz | | When grouped |

**TypeScript Interface:** `PQEvent`  
**Status:** ⚠️ **TypeScript expects columns that don't exist yet!**

**Migration Required:** `20251209000001_add_sarfi_columns.sql`

---

### 5. `customers`
**Purpose:** Customer accounts and service points

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `account_number` | text | UNIQUE NOT NULL | Customer account number |
| `name` | text | NOT NULL | Customer name |
| `address` | text | | Service address |
| `substation_id` | uuid | FK → substations | Serving substation |
| `transformer_id` | text | | Transformer reference |
| `contract_demand_kva` | decimal(10,2) | | Contract demand |
| `customer_type` | customer_type | DEFAULT 'residential' | residential, commercial, industrial |
| `critical_customer` | boolean | DEFAULT false | Is critical customer? |
| `created_at` | timestamptz | DEFAULT now() | Creation timestamp |

**TypeScript Interface:** `Customer`  
**Status:** ✅ Matches database

---

### 6. `event_customer_impact`
**Purpose:** Links events to affected customers

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `event_id` | uuid | FK → pq_events ON DELETE CASCADE | PQ event |
| `customer_id` | uuid | FK → customers ON DELETE CASCADE | Affected customer |
| `impact_level` | text | DEFAULT 'minor' | severe, moderate, minor |
| `estimated_downtime_min` | integer | | Estimated downtime |
| `created_at` | timestamptz | DEFAULT now() | Creation timestamp |

**TypeScript Interface:** `EventCustomerImpact`  
**Status:** ✅ Matches database

---

### 7. `notifications`
**Purpose:** Alert and notification records

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `event_id` | uuid | FK → pq_events | Related event |
| `recipient_email` | text | | Email address |
| `recipient_phone` | text | | SMS number |
| `notification_type` | text | DEFAULT 'email' | email, sms, both |
| `subject` | text | | Notification subject |
| `message` | text | | Notification message |
| `status` | text | DEFAULT 'pending' | pending, sent, failed |
| `sent_at` | timestamptz | | Send timestamp |
| `created_at` | timestamptz | DEFAULT now() | Creation timestamp |

**TypeScript Interface:** `Notification`  
**Status:** ✅ Matches database

---

### 8. `notification_rules`
**Purpose:** Notification automation rules

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `name` | text | NOT NULL | Rule name |
| `event_type` | event_type | | Specific event type filter |
| `severity_threshold` | severity_level | DEFAULT 'medium' | Minimum severity |
| `recipients` | text[] | NOT NULL | Recipient list |
| `include_waveform` | boolean | DEFAULT false | Include waveform? |
| `typhoon_mode_enabled` | boolean | DEFAULT false | Typhoon mode? |
| `active` | boolean | DEFAULT true | Is rule active? |
| `created_at` | timestamptz | DEFAULT now() | Creation timestamp |

**TypeScript Interface:** `NotificationRule`  
**Status:** ✅ Matches database

---

### 9. `pq_service_records`
**Purpose:** Power quality service and consultation records

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `customer_id` | uuid | FK → customers | Customer |
| `service_date` | date | NOT NULL | Service date |
| `service_type` | service_type | NOT NULL | site_survey, harmonic_analysis, etc. |
| `findings` | text | | Service findings |
| `recommendations` | text | | Recommendations |
| `benchmark_standard` | text | | Standard reference |
| `engineer_id` | uuid | FK → profiles | Assigned engineer |
| `created_at` | timestamptz | DEFAULT now() | Creation timestamp |

**TypeScript Interface:** `PQServiceRecord`  
**Status:** ✅ Matches database

---

### 10. `reports`
**Purpose:** Generated reports and documents

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `report_type` | report_type | NOT NULL | Report type |
| `title` | text | NOT NULL | Report title |
| `period_start` | date | NOT NULL | Report period start |
| `period_end` | date | NOT NULL | Report period end |
| `generated_by` | uuid | FK → profiles | Generator user |
| `file_path` | text | | File storage path |
| `status` | text | DEFAULT 'generating' | generating, completed, failed |
| `created_at` | timestamptz | DEFAULT now() | Creation timestamp |

**TypeScript Interface:** `Report`  
**Status:** ✅ Matches database

---

### 11. `system_health`
**Purpose:** System component health monitoring

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `component` | text | NOT NULL | Component name |
| `status` | text | DEFAULT 'healthy' | healthy, degraded, down |
| `message` | text | | Status message |
| `metrics` | jsonb | | Component metrics |
| `checked_at` | timestamptz | DEFAULT now() | Check timestamp |

**TypeScript Interface:** `SystemHealth`  
**Status:** ✅ Matches database

---

### 12. `sarfi_metrics`
**Purpose:** SARFI (System Average RMS Variation Frequency Index) metrics

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `substation_id` | uuid | FK → substations | Associated substation |
| `period_year` | integer | NOT NULL | Year |
| `period_month` | integer | NOT NULL | Month (1-12) |
| `sarfi_70` | decimal(10,2) | | SARFI-70 value |
| `sarfi_80` | decimal(10,2) | | SARFI-80 value |
| `sarfi_90` | decimal(10,2) | | SARFI-90 value |
| `total_events` | integer | DEFAULT 0 | Total event count |
| `created_at` | timestamptz | DEFAULT now() | Creation timestamp |

**TypeScript Interface:** `SARFIMetrics`  
**Status:** ✅ Matches database

---

### 13. `sarfi_profiles`
**Purpose:** SARFI calculation profiles with weighted factors

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `name` | text | UNIQUE NOT NULL | Profile name |
| `description` | text | | Profile description |
| `year` | integer | NOT NULL | Applicable year |
| `is_active` | boolean | DEFAULT true | Is profile active? |
| `created_by` | uuid | FK → profiles | Creator user |
| `created_at` | timestamptz | DEFAULT now() | Creation timestamp |
| `updated_at` | timestamptz | DEFAULT now() | Update timestamp |

**TypeScript Interface:** `SARFIProfile`  
**Status:** ✅ Matches database

---

### 14. `sarfi_profile_weights`
**Purpose:** Weight factors for meters in SARFI profiles

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `profile_id` | uuid | FK → sarfi_profiles ON DELETE CASCADE | Profile |
| `meter_id` | uuid | FK → pq_meters ON DELETE CASCADE | Meter |
| `weight_factor` | decimal(5,2) | NOT NULL | Weight factor (e.g., 1.0, 1.2, 1.5) |
| `notes` | text | | Weight justification |
| `created_at` | timestamptz | DEFAULT now() | Creation timestamp |
| `updated_at` | timestamptz | DEFAULT now() | Update timestamp |

**Unique Constraint:** `(profile_id, meter_id)`

**TypeScript Interface:** `SARFIProfileWeight`  
**Status:** ✅ Matches database

---

## Custom Types (ENUMs)

### `user_role`
- `admin` - Full system access
- `operator` - Operational access
- `viewer` - Read-only access

### `event_type`
- `voltage_dip` - Voltage dip event
- `voltage_swell` - Voltage swell event
- `harmonic` - Harmonic distortion
- `interruption` - Power interruption
- `transient` - Transient event
- `flicker` - Voltage flicker

### `severity_level`
- `critical` - Critical severity
- `high` - High severity
- `medium` - Medium severity
- `low` - Low severity

### `event_status`
- `new` - New unacknowledged event
- `acknowledged` - Acknowledged by operator
- `investigating` - Under investigation
- `resolved` - Resolved
- `false` - False alarm

### `meter_status`
- `active` - Meter is active and communicating
- `abnormal` - Meter has abnormal status
- `inactive` - Meter is inactive

### `substation_status`
- `operational` - Operational
- `maintenance` - Under maintenance
- `offline` - Offline

### `customer_type`
- `residential` - Residential customer
- `commercial` - Commercial customer
- `industrial` - Industrial customer

### `service_type`
- `site_survey` - Site survey service
- `harmonic_analysis` - Harmonic analysis
- `consultation` - Consultation service

### `report_type`
- `supply_reliability` - Supply reliability report
- `annual_pq` - Annual power quality report
- `meter_availability` - Meter availability report
- `customer_impact` - Customer impact report
- `harmonic_analysis` - Harmonic analysis report
- `voltage_quality` - Voltage quality report

---

## Critical Issues Found

### ⚠️ Schema Mismatch Issues

#### 1. **pq_meters Table**
**Problem:** TypeScript interface expects columns that don't exist in database

**Missing Columns:**
- `meter_type` (TEXT)
- `voltage_level` (TEXT)

**Impact:**
- Seed scripts fail when trying to insert these columns
- TypeScript code expects these fields but they're undefined at runtime

**Solution:** Run migration `20251209000001_add_sarfi_columns.sql`

---

#### 2. **pq_events Table**
**Problem:** TypeScript interface expects columns that don't exist in database

**Missing Columns:**
- `voltage_level` (TEXT)
- `circuit_id` (TEXT)
- `customer_count` (INTEGER)
- `remaining_voltage` (DECIMAL)
- `validated_by_adms` (BOOLEAN)
- `is_special_event` (BOOLEAN)

**Impact:**
- SARFI calculations cannot determine voltage thresholds
- Event filtering by voltage level fails
- Special event exclusion doesn't work
- Seed scripts fail

**Solution:** Run migration `20251209000001_add_sarfi_columns.sql`

---

#### 3. **Mother Event Grouping**
**Status:** ✅ Already applied via `20241201000000_add_mother_event_grouping.sql`

**Columns Added:**
- `is_child_event` (BOOLEAN)
- `grouping_type` (TEXT)
- `grouped_at` (TIMESTAMPTZ)

---

## Action Required

### Step 1: Apply Pending Migration ⚠️

You **MUST** run this migration before running any seed scripts:

```sql
-- File: supabase/migrations/20251209000001_add_sarfi_columns.sql
-- Location: /workspaces/codespaces-react/supabase/migrations/20251209000001_add_sarfi_columns.sql
```

**How to Apply:**

#### Option A: Supabase Dashboard (Recommended)
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `20251209000001_add_sarfi_columns.sql`
3. Paste and click "Run"

#### Option B: Supabase CLI
```bash
cd /workspaces/codespaces-react
supabase db push
```

### Step 2: Verify Migration

After running, verify columns exist:

```sql
-- Check pq_meters columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pq_meters' 
ORDER BY ordinal_position;

-- Check pq_events columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pq_events' 
ORDER BY ordinal_position;
```

Expected output should include:
- `pq_meters`: `meter_type`, `voltage_level`
- `pq_events`: `voltage_level`, `circuit_id`, `customer_count`, `remaining_voltage`, `validated_by_adms`, `is_special_event`

### Step 3: Run Seed Script

Only AFTER migration succeeds, run:

```sql
-- File: seed-sarfi-data.sql
-- Location: /workspaces/codespaces-react/seed-sarfi-data.sql
```

---

## Index Summary

### Performance Indexes
- `idx_pq_events_timestamp` - Event timestamp queries
- `idx_pq_events_substation` - Substation event lookup
- `idx_pq_events_meter` - Meter event lookup
- `idx_pq_events_parent` - Mother/child event relationships
- `idx_pq_events_status` - Status filtering
- `idx_pq_events_severity` - Severity filtering
- `idx_pq_events_voltage_level` - Voltage level filtering (NEW)
- `idx_pq_events_circuit_id` - Circuit filtering (NEW)
- `idx_pq_events_validated` - ADMS validation filtering (NEW)
- `idx_pq_events_special` - Special event filtering (NEW)
- `idx_pq_meters_voltage_level` - Meter voltage filtering (NEW)
- `idx_sarfi_metrics_period` - SARFI period queries
- `idx_sarfi_profile_weights_unique` - Profile weight lookups

---

## Row Level Security (RLS)

All tables have RLS enabled with policies based on user roles:

### Admin Role
- Full access to all tables (SELECT, INSERT, UPDATE, DELETE)

### Operator Role
- SELECT: All tables
- INSERT/UPDATE: Most operational tables (events, notifications, service records)
- DELETE: Limited to specific records

### Viewer Role
- SELECT: All tables
- No INSERT/UPDATE/DELETE permissions

---

## Relationships Diagram

```
auth.users
    ↓
profiles
    ├── created_by → sarfi_profiles
    ├── generated_by → reports
    └── engineer_id → pq_service_records

substations
    ├── substation_id → pq_meters
    ├── substation_id → pq_events
    ├── substation_id → customers
    └── substation_id → sarfi_metrics

pq_meters
    ├── meter_id → pq_events
    └── meter_id → sarfi_profile_weights

pq_events
    ├── parent_event_id → pq_events (self-reference)
    ├── event_id → event_customer_impact
    └── event_id → notifications

customers
    ├── customer_id → event_customer_impact
    └── customer_id → pq_service_records

sarfi_profiles
    └── profile_id → sarfi_profile_weights
```

---

## Data Integrity

### Foreign Key Constraints
- All foreign keys use `ON DELETE CASCADE` or `ON DELETE SET NULL` appropriately
- Circular references handled properly (e.g., pq_events parent_event_id)

### Unique Constraints
- `profiles.id` → Links to auth.users
- `substations.code` → Unique substation codes
- `pq_meters.meter_id` → Unique meter serial numbers
- `customers.account_number` → Unique account numbers
- `sarfi_profiles.name` → Unique profile names
- `(sarfi_profile_weights.profile_id, meter_id)` → One weight per meter per profile

### Default Values
- All timestamps default to `now()`
- Status fields have appropriate defaults
- Boolean flags default to `false`
- Arrays default to appropriate values (e.g., affected_phases)

---

## TypeScript Interface Validation

### ✅ Interfaces Matching Database
- `Profile`
- `Substation`
- `Customer`
- `EventCustomerImpact`
- `Notification`
- `NotificationRule`
- `PQServiceRecord`
- `Report`
- `SystemHealth`
- `SARFIMetrics`
- `SARFIProfile`
- `SARFIProfileWeight`

### ⚠️ Interfaces Needing Migration
- `PQMeter` - Missing: `meter_type`, `voltage_level`
- `PQEvent` - Missing: `voltage_level`, `circuit_id`, `customer_count`, `remaining_voltage`, `validated_by_adms`, `is_special_event`

**Action:** Apply migration `20251209000001_add_sarfi_columns.sql`

---

## Migration History

| Date | Migration File | Status | Description |
|------|---------------|---------|-------------|
| 2025-11-03 | `20251103020125_create_pqmap_schema.sql` | ✅ Applied | Initial schema creation |
| 2025-11-03 | `20251103021739_fix_security_and_performance_issues.sql` | ✅ Applied | Security and performance fixes |
| 2024-12-01 | `20241201000000_add_mother_event_grouping.sql` | ✅ Applied | Mother event grouping columns |
| 2025-12-09 | `20251209000000_create_sarfi_profiles.sql` | ✅ Applied | SARFI profiles and weights tables |
| 2025-12-09 | `20251209000001_add_sarfi_columns.sql` | ⚠️ **NOT APPLIED** | **REQUIRED: Add SARFI columns** |

---

## Conclusion

### Summary
The database schema is well-designed and mostly complete. However, there is a **critical mismatch** between the TypeScript interfaces and the actual database schema.

### Required Action
**You MUST apply migration `20251209000001_add_sarfi_columns.sql` before:**
- Running seed scripts
- Using SARFI functionality
- Inserting data with voltage_level, circuit_id, etc.

### Schema Health
Once the pending migration is applied:
- ✅ All TypeScript interfaces will match database
- ✅ All seed scripts will work
- ✅ All SARFI functionality will work correctly
- ✅ No data type mismatches

**Status after migration: 100% schema alignment** 🎯
