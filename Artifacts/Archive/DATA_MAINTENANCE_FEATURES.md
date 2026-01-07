# Data Maintenance Features

**Last Updated:** January 7, 2026  
**Purpose:** Documentation for master data management features in PQMAP

---

## Overview

The Data Maintenance module provides master data management capabilities for SARFI calculations and PQ compliance benchmarking. These features are accessible from the main navigation sidebar under the "Data Maintenance" section.

---

## 1. Weighting Factors

**Location:** Navigation → Data Maintenance → Weighting Factors  
**Icon:** Scale (⚖️)  
**Access:** Admin, Operator (Viewer: read-only)

### Purpose

Manage customer count and weight factors for SARFI profile calculations. Weight factors determine the relative contribution of each meter to the overall SARFI index.

### Key Features

1. **Profile Selection**
   - Dropdown selector for existing SARFI profiles
   - Displays all meters assigned to selected profile
   - Shows meter details: ID, location, substation, circuit

2. **Customer Count Management**
   - Inline editing with Save/Cancel buttons
   - Integer validation (≥ 0)
   - Real-time weight factor display (5 decimal places)

3. **Auto-calculation**
   - Formula: `weight_factor = customer_count / SUM(all_customer_counts)`
   - Automatic recalculation when any customer count changes
   - Total weight factors always sum to 1.0

4. **Meter Management**
   - Add meter to profile (with search)
   - Remove meter from profile
   - Meter can only belong to one profile at a time

5. **Import/Export**
   - **Import CSV**: Bulk customer count updates
   - **Template Download**: Pre-formatted CSV with instructions
   - **Export Excel**: Full report with metadata
   - **Export CSV**: Data-only format

### Database Tables

- `sarfi_profile_weights` - stores meter weights with customer_count column
- Migration: `20260107000000_add_customer_count_to_weights.sql`

### Component Files

- `src/pages/DataMaintenance/WeightingFactors.tsx` (757 lines)
- `src/services/sarfiService.ts` (enhanced with 8 new functions)

### CSV Import Format

```csv
meter_id,customer_count
PQM-APA-001,1250
PQM-APB-002,875
PQM-AWR-003,1500
```

---

## 2. PQ Benchmarking Standard

**Location:** Navigation → Data Maintenance → PQ Standard  
**Icon:** Target (🎯)  
**Access:** Admin, Operator (Viewer: read-only)

### Purpose

Manage international PQ compliance benchmarking standards and their voltage/duration thresholds for power quality event evaluation.

### Key Features

1. **Standard Management**
   - Create/Edit/Delete benchmarking standards
   - Fields: name, description, is_active
   - Pre-seeded with 3 international standards

2. **Threshold Management**
   - Sortable table (click column headers)
   - Default sort: Duration (s) ascending
   - Inline editing with Save/Cancel buttons
   - Add threshold button (above table)
   - Delete threshold with confirmation

3. **Data Validation**
   - Min. Voltage: 0-100% (3 decimal places)
   - Duration: 0-1 seconds (3 decimal places)
   - Unique constraint per standard (no duplicate voltage+duration)
   - Numeric range validation

4. **Import/Export**
   - **Import CSV**: Bulk threshold updates
   - **Template Download**: Standard-specific template
   - **Export Excel**: Full report with metadata
   - **Export CSV**: Threshold data only

### International Standards (Pre-seeded)

#### 1. IEC 61000-4-34 (4 thresholds)
Voltage dip immunity testing for equipment with input current up to 16A per phase

| Min. Voltage (%) | Duration (s) |
|-----------------|--------------|
| 100.000 | 0.020 |
| 40.000 | 0.200 |
| 70.000 | 0.500 |
| 80.000 | 1.000 |

#### 2. SEMI F47 (5 thresholds)
Voltage sag immunity for semiconductor manufacturing equipment

| Min. Voltage (%) | Duration (s) |
|-----------------|--------------|
| 50.000 | 0.020 |
| 50.000 | 0.200 |
| 70.000 | 0.500 |
| 80.000 | 1.000 |
| 87.000 | 1.000 |

#### 3. ITIC (5 thresholds)
Information Technology Industry Council voltage tolerance curve

| Min. Voltage (%) | Duration (s) |
|-----------------|--------------|
| 0.000 | 0.020 |
| 70.000 | 0.020 |
| 70.000 | 0.500 |
| 80.000 | 1.000 |
| 90.000 | 1.000 |

### Database Tables

- `pq_benchmark_standards` - standard definitions
- `pq_benchmark_thresholds` - voltage/duration thresholds
- Migration: `20260107000001_create_pq_benchmarking_tables.sql`

### Component Files

- `src/pages/DataMaintenance/PQBenchmarking.tsx` (860+ lines)
- `src/services/benchmarkingService.ts` (11 functions, 332 lines)

### CSV Import Format

```csv
min_voltage,duration
100.000,0.020
70.000,0.500
80.000,1.000
```

---

## Use Cases

### Weighting Factors
1. **SARFI Calculation**: Compute weighted SARFI indices across meter profiles
2. **Customer Impact**: Track customer count per meter for impact analysis
3. **Load Balancing**: Adjust weights based on customer distribution changes
4. **Profile Management**: Add/remove meters from SARFI monitoring groups

### PQ Benchmarking Standard
1. **Compliance Evaluation**: Compare voltage dip events against international standards
2. **SLA Management**: Define custom thresholds for customer service agreements
3. **Equipment Testing**: Reference standards for equipment immunity testing
4. **Multi-Standard Comparison**: Evaluate events against IEC, SEMI, and ITIC simultaneously

---

## Navigation Structure

```
PQMAP
├── Dashboard
├── Event Management
├── Impact Analysis
├── Asset Management
├── Reports
├── Notifications
├── PQ Services
├── System Health
└── Data Maintenance
    ├── User Management
    ├── SCADA
    ├── Meter Hierarchy
    ├── Customer Transformer
    ├── Weighting Factors      ← NEW (Jan 2026)
    └── PQ Standard             ← NEW (Jan 2026)
```

---

## Development Notes

### Design Patterns Used
- **STYLES_GUIDE.md**: Import/export dropdowns, modal layouts
- **Inline Editing**: Save/Cancel buttons per row
- **Sortable Tables**: Click headers to toggle asc/desc
- **Validation Modals**: Detailed error reporting for imports
- **TypeScript**: Strict typing with database interfaces

### Service Layer Architecture
Both features follow a consistent service pattern:
- CRUD operations (create, read, update, delete)
- Batch operations (import CSV with validation)
- Helper functions (validation, calculation)
- Error handling with user-friendly messages

### Database Design
- UUID primary keys for all tables
- Foreign key constraints with CASCADE delete
- CHECK constraints for numeric ranges
- UNIQUE constraints to prevent duplicates
- Timestamps for audit trail (created_at, updated_at)
- RLS policies for role-based access control

---

## Future Enhancements

### Weighting Factors
- [ ] Bulk edit multiple customer counts
- [ ] Historical weight factor tracking
- [ ] Weight factor comparison across time periods
- [ ] Integration with customer database for auto-population

### PQ Benchmarking Standard
- [ ] Graphical threshold curve visualization
- [ ] Event compliance reporting (% within threshold)
- [ ] Multi-standard simultaneous evaluation
- [ ] Export to engineering report format (PDF with charts)
- [ ] Standard versioning and history tracking

---

## References

- **DATABASE_SCHEMA.md**: Tables 14-16 (sarfi_profile_weights, pq_benchmark_standards, pq_benchmark_thresholds)
- **PROJECT_FUNCTION_DESIGN.md**: Module 6 - Data Maintenance
- **STYLES_GUIDE.md**: Import/Export patterns, Modal layouts
- **IEC 61000-4-34**: International standard for voltage dip immunity
- **SEMI F47**: Semiconductor industry voltage sag standard
- **ITIC Curve**: IT equipment voltage tolerance specification

---

**Status:** ✅ Both features fully implemented and operational (January 7, 2026)
