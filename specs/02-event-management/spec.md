# Feature Specification: Event Management Module (Baseline)

**Feature Branch**: `[02-event-management-baseline]`  
**Created**: 2026-01-21  
**Status**: Draft  
**Input**: User description: "Start migrating the Event Management module spec from Artifacts/PROJECT_FUNCTION_DESIGN.md into Spec Kit format (baseline module spec)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Analyze events in tree view and list view (Priority: P1)

As an operator, I want to browse and analyze events using both a tree view (mother events + children) and a flat list view so I can quickly understand event grouping and drill into details.

**Why this priority**: This is the core workflow of Event Management and drives most downstream actions (grouping, exporting, IDR updates).

**Independent Test**: Using the Event Management UI, a user can switch between tree/list views, select an event, and see the details panel update accordingly.

**Acceptance Scenarios**:

1. **Given** a dataset containing mother and child events, **When** I open Event Management → Event Analysis, **Then** I see grouped events in a tree structure (mother with children) and can expand/collapse groups.
2. **Given** I want to see events without grouping context, **When** I switch to list view, **Then** I see a flat list of events respecting the same filters.
3. **Given** I select an event in either view, **When** the selection changes, **Then** Event Details displays the selected event’s metadata and related sections (waveform/harmonic/impact/IDR).

---

### User Story 2 - Filter events using advanced criteria and filter profiles (Priority: P1)

As an operator, I want advanced filtering (temporal/type/severity/status/location/magnitude/flags) and saveable filter profiles so I can consistently reproduce the same event subsets.

**Why this priority**: Without filtering and saved profiles, analysis is slow and inconsistent between users and sessions.

**Independent Test**: Apply multiple filters, save as a profile, reload the profile, and verify the same results are shown.

**Acceptance Scenarios**:

1. **Given** I set filters (date range, event type, severity, voltage level), **When** I apply them, **Then** the displayed events match the criteria.
2. **Given** I save the current filters as a profile, **When** I select that profile later, **Then** filters restore and the same event set is produced.
3. **Given** “Hide false events” is enabled, **When** events include `false_event = true`, **Then** those events do not appear in the results.

---

### User Story 3 - Group and ungroup events (mother event grouping) (Priority: P1)

As an operator, I want automatic grouping and manual grouping/ungrouping tools so I can curate event groups and ensure reporting matches operational reality.

**Why this priority**: Grouping directly affects analysis, reporting, exports, and KPIs.

**Independent Test**: Select multiple events in multi-select mode, group them, and verify one becomes the mother and others become children; then ungroup.

**Acceptance Scenarios**:

1. **Given** events occur within 10 minutes at the same substation, **When** grouping is applied automatically, **Then** the first chronological event becomes mother and others are children as described in the functional design.
2. **Given** I manually select events, **When** I group them, **Then** `is_mother_event`, `parent_event_id`, and `grouping_type` reflect the expected mother/child structure.
3. **Given** a mother event with children, **When** I ungroup, **Then** children have `parent_event_id = null` and mother designation is cleared when no children remain.

---

### User Story 4 - Flag and analyze false events (Priority: P2)

As an operator, I want configurable false event detection rules plus bulk flag/unflag and analytics so I can reduce noise and improve data quality.

**Why this priority**: False events distort analytics and reporting; controlling them improves trust in the system.

**Independent Test**: Configure detection rules, run detection on a set, confirm events are flagged/unflagged and analytics update.

**Acceptance Scenarios**:

1. **Given** a rule like “short duration spike”, **When** an event matches rule criteria, **Then** the event is flagged as `false_event = true`.
2. **Given** flagged events exist, **When** I bulk unflag them, **Then** they no longer appear when “hide false events” is enabled.
3. **Given** multiple rules exist, **When** I view detection analytics, **Then** I can see statistics that help assess rule effectiveness.

---

### User Story 5 - Maintain IDR (Incident Data Record) for an event (Priority: P2)

As an operator, I want to edit and save IDR fields for an event so incident reporting and downstream reliability reporting are complete.

**Why this priority**: IDR is a key operational output and is referenced by reporting workflows.

**Independent Test**: Select an event, edit IDR fields, save, reload the event, and verify the data persists.

**Acceptance Scenarios**:

1. **Given** I open an event, **When** I edit IDR fields and save, **Then** the updated values persist and display in the IDR section.
2. **Given** the event’s IDR was auto-created, **When** I view the IDR section, **Then** a manual/auto indicator reflects `manual_create_idr`.
3. **Given** some IDR fields are read-only (timestamp, region from substation), **When** I edit IDR, **Then** read-only fields cannot be modified.

---

### User Story 6 - Export events to Excel/CSV/PDF (Priority: P3)

As an operator, I want to export filtered event sets and/or a group view so I can share analysis externally.

**Why this priority**: Export is required for offline review and external stakeholder communication.

**Independent Test**: Apply filters, export in each format, and verify the file downloads and includes expected columns.

**Acceptance Scenarios**:

1. **Given** a filtered result set, **When** I export to Excel/CSV/PDF, **Then** the exported file includes the expected event fields (including mother/false/IDR references where applicable).
2. **Given** there are mother/child relationships, **When** I export, **Then** mother/false status is reflected in export output.

---

### Edge Cases

- Large event datasets (performance in tree view, pagination needs)
- Events missing joins (meter/substation missing) should not crash the UI
- Time zone/date range boundary handling (endDate inclusive, midnight)
- Grouping conflicts: selecting events from different substations or far apart in time
- False event detection on non-dip types (rule applicability)
- Concurrent edits: event flagged/unflagged while another user edits IDR

## Requirements *(mandatory)*

### Functional Requirements

Grounded in `Artifacts/PROJECT_FUNCTION_DESIGN.md` → “2. Event Management Module”.

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

### Key Entities *(include if feature involves data)*

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

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can filter by at least 4 categories simultaneously (date + type + severity + voltage level) and results update correctly.
- **SC-002**: A saved filter profile can be created and reloaded to reproduce the same event set.
- **SC-003**: Manual grouping creates a valid mother/child structure (`parent_event_id` set on children; mother marked).
- **SC-004**: False event detection can flag events and “hide false events” removes them from analysis views.
- **SC-005**: IDR updates persist and the manual/auto indicator matches `manual_create_idr`.
- **SC-006**: Export completes successfully for Excel, CSV, and PDF for a filtered dataset.

## Implementation References (non-authoritative)

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
