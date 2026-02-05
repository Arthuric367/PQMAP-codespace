# Feature Specification: Event Management Module

**Feature ID**: 02-event-management  
**Created**: 2026-02-02  
**Status**: Living Document  
**Priority**: P0 - Core Module  
**Source**: Artifacts/PROJECT_FUNCTION_DESIGN.md

---

## Table of Contents

1. [Module Overview](#module-overview)
2. [User Stories](#user-stories)
3. [Edge Cases](#edge-cases)
4. [Requirements](#requirements)
5. [Success Criteria](#success-criteria)
6. [Implementation References](#implementation-references)

---

## Module Overview

### Purpose
The Event Management Module is the core operational interface for monitoring, analyzing, and managing power quality events across CLP's electrical grid. It provides comprehensive tools for event grouping, filtering, false event detection, and incident data record (IDR) management.

### Scope
- Event Analysis (tree view and list view)
- Advanced filtering with saveable profiles
- Mother-child event grouping (automatic and manual)
- False event detection and analytics
- IDR (Incident Data Record) management
- Event details with waveform visualization
- Customer impact tracking
- Export functionality (Excel/CSV/PDF)

### Key Business Value
- Reduces event analysis time by 60% through intelligent grouping
- Improves data quality by filtering false events
- Ensures regulatory compliance with complete IDR records
- Provides real-time visibility into grid disturbances

---

## User Stories

### User Story 1: Analyze Events in Tree View and List View
**Priority**: P1  
**Status**: 🟢 Implemented

**As an** operator,  
**I want** to browse and analyze events using both a tree view (mother events + children) and a flat list view,  
**so that** I can quickly understand event grouping and drill into details.

**Why this priority**: This is the core workflow of Event Management and drives most downstream actions (grouping, exporting, IDR updates).

**Acceptance Criteria**:

**AC1: Tree View Display**
- Given: A dataset containing mother and child events
- When: I open Event Management → Event Analysis
- Then: I see grouped events in a tree structure (mother with children) and can expand/collapse groups

**AC2: List View Toggle**
- Given: I want to see events without grouping context
- When: I switch to list view
- Then: I see a flat list of events respecting the same filters

**AC3: Selection and Details**
- Given: I select an event in either view
- When: The selection changes
- Then: Event Details displays the selected event's metadata and related sections (Overview/Technical/Waveform/Customer Impact/IDR)

**Database References**:
- Tables: `pq_events`, `substations`, `pq_meters`
- Key columns: `is_mother_event`, `parent_event_id`, `is_child_event`, `grouping_type`

**Technical Implementation**:
- Component: `src/components/EventManagement/EventManagement.tsx`
- Component: `src/components/EventManagement/EventTreeView.tsx`
- Component: `src/components/EventManagement/EventDetails.tsx`

---

### User Story 2: Filter Events Using Advanced Criteria and Filter Profiles
**Priority**: P1  
**Status**: 🟢 Implemented

**As an** operator,  
**I want** advanced filtering (temporal/type/severity/status/location/magnitude/flags) and saveable filter profiles,  
**so that** I can consistently reproduce the same event subsets.

**Why this priority**: Without filtering and saved profiles, analysis is slow and inconsistent between users and sessions.

**Acceptance Criteria**:

**AC1: Multi-Criteria Filtering**
- Given: I set filters (date range, event type, severity, voltage level)
- When: I apply them
- Then: The displayed events match all criteria simultaneously

**AC2: Filter Profile Management**
- Given: I save the current filters as a profile with a name
- When: I select that profile later
- Then: Filters restore automatically and the same event set is produced

**AC3: False Event Exclusion**
- Given: "Hide false events" is enabled
- When: Events include `false_event = true`
- Then: Those events do not appear in the results

**Filter Categories**:
1. **Temporal**: Start/end date, time range
2. **Event Type**: voltage_dip, voltage_swell, harmonic, interruption, transient, flicker
3. **Severity**: critical, high, medium, low
4. **Status**: new, acknowledged, investigating, resolved
5. **Location**: Voltage levels (400kV, 132kV, 11kV, 380V), circuit IDs, meter IDs, substation IDs
6. **Magnitude**: Duration range (ms), customer count range, remaining voltage (%)
7. **Flags**: Show only mother events, show only unvalidated, hide false events

**Database References**:
- Tables: `pq_events`, `substations`, `pq_meters`
- Key columns: `event_type`, `severity`, `status`, `voltage_level`, `duration_ms`, `customer_count`, `remaining_voltage`, `false_event`, `is_mother_event`, `validated_by_adms`

**Technical Implementation**:
- Component: `src/components/EventManagement/AdvancedFilterModal.tsx`
- Storage: localStorage for filter profiles (key: `eventManagementFilters`, `eventManagementProfiles`)

---

### User Story 3: Group and Ungroup Events (Mother Event Grouping)
**Priority**: P1  
**Status**: 🟢 Implemented

**As an** operator,  
**I want** automatic grouping and manual grouping/ungrouping tools,  
**so that** I can curate event groups and ensure reporting matches operational reality.

**Why this priority**: Grouping directly affects analysis, reporting, exports, and KPIs.

**Acceptance Criteria**:

**AC1: Automatic Grouping Logic**
- Given: Events occur within 10 minutes at the same substation
- When: Grouping is applied automatically
- Then: The first chronological event becomes mother and others become children with `grouping_type = 'automatic'`

**AC2: Manual Grouping**
- Given: I manually select 2+ events in multi-select mode
- When: I click "Group Selected"
- Then: `is_mother_event`, `parent_event_id`, and `grouping_type = 'manual'` reflect the expected mother/child structure

**AC3: Ungrouping Events**
- Given: A mother event with children
- When: I ungroup
- Then: Children have `parent_event_id = null` and mother designation is cleared when no children remain

**Grouping Heuristics**:
- **Temporal Correlation**: Events within 10-minute window
- **Topological Relationship**: Same `substation_id`
- **Mother Selection**: First chronological event OR highest voltage level
- **Automatic Finalization**: Groups committed after buffer timer expires (5 minutes, configurable)

**Database References**:
- Tables: `pq_events`
- Key columns: `is_mother_event`, `parent_event_id`, `is_child_event`, `grouping_type`, `grouped_at`

**Technical Implementation**:
- Component: `src/components/EventManagement/EventOperations.tsx`
- Service: `src/services/mother-event-grouping.ts`

---

### User Story 4: Flag and Analyze False Events
**Priority**: P2  
**Status**: 🟢 Implemented

**As an** operator,  
**I want** configurable false event detection rules plus bulk flag/unflag and analytics,  
**so that** I can reduce noise and improve data quality.

**Why this priority**: False events distort analytics and reporting; controlling them improves trust in the system.

**Acceptance Criteria**:

**AC1: Rule-Based Detection**
- Given: A rule like "short duration spike" (< 100ms with full recovery)
- When: An event matches rule criteria
- Then: The event is flagged as `false_event = true`

**AC2: Bulk Unflag Operations**
- Given: Flagged events exist
- When: I bulk unflag them
- Then: They no longer appear when "hide false events" is enabled

**AC3: Detection Analytics**
- Given: Multiple rules exist
- When: I view detection analytics
- Then: I see statistics (total false events, detection by rule type, confidence levels) that help assess rule effectiveness

**Detection Rule Types**:
1. **Short Duration Spikes**: < 100ms with full voltage recovery
2. **Duplicate Events**: Same meter, similar timestamp (± 5 seconds) and magnitude (± 2%)
3. **Meter Malfunction**: Abnormal meter status + unusual readings
4. **Weather Correlation**: Non-weather events during typhoon (low confidence)
5. **Magnitude Anomaly**: Remaining voltage > 95% for "voltage_dip" events

**Database References**:
- Tables: `pq_events`
- Key columns: `false_event`, `status`, `magnitude`, `remaining_voltage`, `duration_ms`

**Technical Implementation**:
- Component: `src/components/EventManagement/FalseEventConfig.tsx`
- Component: `src/components/EventManagement/FalseEventAnalytics.tsx`
- Utility: `src/utils/falseEventDetection.ts`

---

### User Story 5: Maintain IDR (Incident Data Record) for an Event
**Priority**: P2  
**Status**: 🟢 Implemented

**As an** operator,  
**I want** to edit and save IDR fields for an event,  
**so that** incident reporting and downstream reliability reporting are complete.

**Why this priority**: IDR is a key operational output and is referenced by reporting workflows.

**Acceptance Criteria**:

**AC1: Edit and Persist IDR Fields**
- Given: I open an event's IDR tab
- When: I edit IDR fields and save
- Then: The updated values persist and display correctly on reload

**AC2: Manual/Auto Indicator**
- Given: The event's IDR was auto-created
- When: I view the IDR section
- Then: A manual/auto badge reflects `manual_create_idr` status

**AC3: Read-Only Field Protection**
- Given: Some IDR fields are read-only (timestamp, region from substation)
- When: I edit IDR
- Then: Read-only fields cannot be modified

**IDR Field Groups** (24+ fields):
1. **Basic Info**: IDR No, Timestamp, Region (read-only), OC, Incident Description
2. **Location & Equipment**: Address, Equipment Type, Voltage Level, Circuit ID
3. **Fault Details**: Fault Type, Object Part Group/Code, Damage Group/Code
4. **Cause Analysis**: Cause Group, Cause, PSBG Cause (enum: VEGETATION, DAMAGED BY THIRD PARTY, UNCONFIRMED, ANIMALS/BIRDS/INSECTS), Description
5. **Environment & Operations**: Weather, Outage Type, Total CMI (Customer Minutes Interrupted)

**Database References**:
- Tables: `pq_events`
- Key columns: `idr_no`, `manual_create_idr`, `fault_type`, `weather`, `oc`, `cause_group`, `cause`, `psbg_cause`, `object_part_group`, `object_part_code`, `damage_group`, `damage_code`, `description`, `address`, `equipment_type`, `outage_type`, `total_cmi`

**Technical Implementation**:
- Component: `src/components/EventManagement/EventDetails.tsx` (IDR Tab section)

---

### User Story 6: Export Events to Excel/CSV/PDF
**Priority**: P3  
**Status**: 🟡 Partial

**As an** operator,  
**I want** to export filtered event sets and/or group views,  
**so that** I can share analysis externally.

**Why this priority**: Export is required for offline review and external stakeholder communication.

**Acceptance Criteria**:

**AC1: Multi-Format Export**
- Given: A filtered result set
- When: I export to Excel/CSV/PDF
- Then: The exported file includes expected event fields (ID, timestamp, type, substation, severity, status, duration, magnitude, customer count, cause, mother/child indicators, false event flag, IDR number)

**AC2: Filter Preservation**
- Given: Active filters are applied
- When: I export
- Then: Only filtered events are included in export

**AC3: Group View Export**
- Given: Tree view is active with mother-child relationships
- When: I export
- Then: Hierarchical structure is preserved (indentation or parent ID column)

**Export Columns** (18+ fields):
- Event ID, Timestamp (DD/MM/YYYY HH:mm:ss)
- Event Type, Substation, Circuit ID, Voltage Level
- Severity, Status, Duration (ms), Magnitude (%)
- Remaining Voltage (%), Customer Count, Cause
- Is Mother Event, Is Child Event, Parent Event ID
- Validated by ADMS, False Event, IDR Number, Notes

**Database References**:
- Tables: `pq_events`, `substations`
- Export uses same filtered query as display

**Technical Implementation**:
- Service: `src/services/exportService.ts`
- Libraries: XLSX (Excel), jsPDF (PDF)

**Status Note**: Excel and CSV export fully implemented. PDF export with tree structure pending.

---

### User Story 7: View Waveform Data for Voltage Dip Events
**Priority**: P2  
**Status**: 🟢 Implemented

**As an** operator,  
**I want** to visualize waveform data for voltage dip events,  
**so that** I can analyze the event's voltage profile and verify event characteristics.

**Why this priority**: Waveform visualization is critical for root cause analysis and event verification.

**Acceptance Criteria**:

**AC1: Combined Phase View**
- Given: An event has waveform CSV data
- When: I open the Technical tab
- Then: I see all 3 phases (V1 Red, V2 Green, V3 Blue) in a single combined chart

**AC2: Individual Phase Views**
- Given: I want to focus on a single phase
- When: I toggle to individual view mode
- Then: I see separate V1/V2/V3 charts with phase-specific colors

**AC3: Interactive Zoom and Hover**
- Given: I want to examine specific waveform sections
- When: I use mouse wheel zoom (50%-200%) or hover over points
- Then: I see exact voltage values in tooltips and zoom controls work smoothly

**AC4: Performance with Large Datasets**
- Given: Waveform CSV contains 3586 rows
- When: Chart renders
- Then: Data is downsampled to ~1000 points for smooth rendering without losing critical details

**Waveform Features**:
- Statistics display: Min/Max/RMS values per phase
- Zoom controls: Mouse wheel, +/- buttons, reset button
- CSV format: `Timestamp, V1, V2, V3` stored in `pq_events.waveform_csv`
- Event trigger marking (future): Orange dashed line at event start

**Database References**:
- Tables: `pq_events`
- Key columns: `waveform_csv`, `v1`, `v2`, `v3`, `event_type`

**Technical Implementation**:
- Component: `src/components/EventManagement/WaveformViewer.tsx`
- Component: `src/components/EventManagement/WaveformDisplay.tsx`

---

### User Story 8: Track Customer Impact for Events
**Priority**: P2  
**Status**: 🟢 Implemented

**As an** operator,  
**I want** to view customer impact details for each event,  
**so that** I can assess business impact and prioritize response.

**Why this priority**: Customer impact drives operational priorities and regulatory reporting.

**Acceptance Criteria**:

**AC1: Automatic Impact Generation**
- Given: A new voltage dip event is created
- When: The event has matching circuit relationships in `customer_transformer_matching`
- Then: Customer impact records are automatically created via PostgreSQL trigger

**AC2: Severity Mapping**
- Given: Event has severity level
- When: Customer impacts are generated
- Then: Severity maps correctly (critical→severe, high→moderate, medium/low→minor)

**AC3: Impact Summary Display**
- Given: Event has customer impacts
- When: I view the Customer Impact tab
- Then: I see summary cards (total affected, total CMI) and detailed customer table (account, name, address, severity, downtime)

**AC4: Downtime Calculation**
- Given: Event has duration_ms
- When: Calculating downtime
- Then: `downtime_minutes = duration_ms / 60000`

**Customer Impact Features**:
- Auto-created via trigger on event insert
- Summary cards: Total customers affected, Total CMI (Customer Minutes Interrupted)
- Customer table: Account number, Name, Address, Substation, Severity, Downtime (minutes)
- Historical event tracking per customer

**Database References**:
- Tables: `event_customer_impact`, `customers`, `customer_transformer_matching`, `substations`, `pq_events`
- Key columns: `customer_id`, `event_id`, `impact_severity`, `downtime_minutes`, `estimated_cmi`

**Technical Implementation**:
- Component: `src/components/EventManagement/EventDetails.tsx` (Customer Impact Tab)
- Trigger: PostgreSQL function `create_customer_impact_for_event()`

---

### User Story 9: Configure and Manage PSBG Cause Classification
**Priority**: P3  
**Status**: 🟢 Implemented

**As an** operator,  
**I want** to assign standardized PSBG cause classifications to events,  
**so that** cause reporting follows organizational standards.

**Why this priority**: Standardized cause classification improves reporting consistency and regulatory compliance.

**Acceptance Criteria**:

**AC1: PSBG Cause Selection**
- Given: I edit an event's IDR
- When: I select PSBG Cause dropdown
- Then: I see standard options (VEGETATION, DAMAGED BY THIRD PARTY, UNCONFIRMED, ANIMALS/BIRDS/INSECTS)

**AC2: Cause Priority Display**
- Given: Event has both PSBG cause and IDR cause
- When: Displaying in charts/tables
- Then: PSBG cause takes priority, falls back to IDR cause if PSBG is null

**AC3: Protected Deletion**
- Given: A PSBG cause option is in use by events
- When: Admin attempts to delete from config
- Then: System prevents deletion and shows warning

**AC4: Modal Configuration**
- Given: I open PSBG Config Modal
- When: I view/add/delete causes
- Then: Changes persist and reflect in event dropdowns

**Database References**:
- Tables: `pq_events`
- Key columns: `psbg_cause` (enum: 'VEGETATION', 'DAMAGED BY THIRD PARTY', 'UNCONFIRMED', 'ANIMALS, BIRDS, INSECTS')

**Technical Implementation**:
- Component: `src/components/EventManagement/PSBGConfigModal.tsx`
- Component: `src/components/EventManagement/EventDetails.tsx` (IDR Tab)

---


## Edge Cases

- Large event datasets (performance in tree view, pagination needs)
- Events missing joins (meter/substation missing) should not crash the UI
- Time zone/date range boundary handling (endDate inclusive, midnight)
- Grouping conflicts: selecting events from different substations or far apart in time
- False event detection on non-dip types (rule applicability)
- Concurrent edits: event flagged/unflagged while another user edits IDR

---

## Requirements

### Functional Requirements

Grounded in `Artifacts/PROJECT_FUNCTION_DESIGN.md` → "2. Event Management Module".

- **FR-001**: The module MUST provide an Event Analysis area with tree view (mother + children) and list view.
- **FR-002**: The module MUST support advanced filtering across temporal/type/severity/status/location/magnitude/flags, including `hideFalseEvents`.
- **FR-003**: The module MUST support saved filter profiles (CRUD) to reproduce filter sets.
- **FR-004**: The module MUST support mother event grouping with the documented data structure:
  - mother: `is_mother_event = true`, `parent_event_id = null`, `grouping_type = 'automatic'|'manual'`
  - child: `is_mother_event = false`, `parent_event_id = <mother_id>`, `grouping_type = ...`
- **FR-005**: The module MUST support manual grouping and ungrouping operations (multi-select) and reflect changes immediately in the tree.
- **FR-006**: The module MUST support false event detection workflows:
  - configurable rules
  - bulk flag/unflag
  - analytics for rule effectiveness
- **FR-007**: The module MUST support IDR editing and saving for events, with a manual/auto indicator and read-only enforcement where specified.
- **FR-008**: The module MUST support exporting events to Excel/CSV/PDF using the existing export service patterns.

### Non-Functional Requirements

- **NFR-001**: UI must follow `Artifacts/STYLES_GUIDE.md` patterns (dropdown click-outside, export dropdown, sorting patterns where used).
- **NFR-002**: Changes to grouping/false-event/IDR must respect database role + RLS constraints.
- **NFR-003**: The UI MUST not crash on null/undefined fields (e.g., missing harmonic or meter joins).

### Key Entities

- **PQEvent**: Event record (mother/child flags, timestamps, severity, status, false_event, IDR fields).
- **EventTreeNode**: UI representation of mother event + children.
- **EventFilter**: Filter state for the advanced filtering system.
- **FilterProfile**: Persisted saved filter configuration.
- **Event Customer Impact**: Linked customer impact records (where available).

Related tables/entities (high level; details in `Artifacts/DATABASE_SCHEMA.md`):
- `pq_events`
- `pq_meters`
- `substations`
- `harmonic_events` (when event type is harmonic)
- `event_customer_impact` (customer impacts)

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user can filter by at least 4 categories simultaneously (date + type + severity + voltage level) and results update correctly.
- **SC-002**: A saved filter profile can be created and reloaded to reproduce the same event set.
- **SC-003**: Manual grouping creates a valid mother/child structure (`parent_event_id` set on children; mother marked).
- **SC-004**: False event detection can flag events and "hide false events" removes them from analysis views.
- **SC-005**: IDR updates persist and the manual/auto indicator matches `manual_create_idr`.
- **SC-006**: Export completes successfully for Excel, CSV, and PDF for a filtered dataset.

---

## Implementation References

These are code pointers to keep the spec grounded in the repo (they do not replace the requirements above):

- UI components:
  - `src/components/EventManagement/EventManagement.tsx`
  - `src/components/EventManagement/EventTreeView.tsx`
  - `src/components/EventManagement/EventDetails.tsx`
  - `src/components/EventManagement/EventOperations.tsx`
  - `src/components/EventManagement/FalseEventConfig.tsx`
  - `src/components/EventManagement/FalseEventAnalytics.tsx`
  - `src/components/EventManagement/WaveformDisplay.tsx`

- Services/utilities:
  - `src/services/mother-event-grouping.ts`
  - `src/services/exportService.ts`
  - `src/utils/falseEventDetection.ts`

- Authoritative docs:
  - `Artifacts/PROJECT_FUNCTION_DESIGN.md` (Event Management module section)
  - `Artifacts/STYLES_GUIDE.md`
  - `Artifacts/DATABASE_SCHEMA.md`
  - `Artifacts/ARCHITECTURE.md`
