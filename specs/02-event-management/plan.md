# Implementation Plan: Event Management Module (Baseline)

**Spec**: `specs/02-event-management/spec.md`  
**Created**: 2026-01-21  
**Status**: Draft  

## Goal

Produce a complete, verifiable baseline for the Event Management module that matches the functional design and current code structure, focusing on correctness (grouping/false-event/IDR/export) and consistency with existing UI patterns.

## Principles / Constraints

- **Artifacts remain authoritative**: requirements are grounded in `Artifacts/PROJECT_FUNCTION_DESIGN.md`.
- **Respect DB roles + RLS**: do not bypass Supabase RLS; avoid introducing role enum mismatches.
- **No extra UX**: implement exactly what is required by the spec (no new pages/modals beyond existing patterns).
- **UI consistency**: follow `Artifacts/STYLES_GUIDE.md` patterns for dropdowns, export, sorting, and modal structure.

## Scope

### In scope (baseline)

- Event Analysis: tree + list views; selecting an event updates details.
- Advanced filtering (including hide false events) and filter profile save/load.
- Mother event grouping: automatic + manual grouping/ungrouping.
- False event detection: rule config + bulk flag/unflag + analytics.
- IDR editing and persistence for events.
- Export to Excel/CSV/PDF for filtered sets.

### Out of scope (for this baseline)

- New visualizations beyond existing analytics screens.
- New external integrations (Power BI automation, email delivery, etc.).
- Major schema redesign (only additive migrations if absolutely required and justified).

## Work Breakdown

### Phase 0 — Confirm grounding + contracts

1. Re-check data model expectations:
   - Confirm `pq_events` columns used by UI: `false_event`, `validated_by_adms`, `is_mother_event`, `parent_event_id`, `grouping_type`, `idr_no`, `manual_create_idr`, timestamps.
   - Confirm related joins used in Event Details (meter/substation/harmonic/customer impacts) match current schema.
2. Identify the exact code entry points and responsibilities:
   - UI: `src/components/EventManagement/*`
   - Grouping: `src/services/mother-event-grouping.ts`
   - False-event detection: `src/utils/falseEventDetection.ts`
   - Export: `src/services/exportService.ts`

**Exit criteria**: A short notes section (in PR or issue) listing required fields and the exact services/components involved; no unresolved schema ambiguity.

---

### Phase 1 — Filtering + profiles (P1)

1. Ensure filters are applied consistently to both tree view and list view.
2. Implement/verify `hideFalseEvents` behavior (`false_event === true` excluded).
3. Implement/verify filter profile CRUD (persisted where the current app expects: DB or localStorage).
4. Add sorting if needed and consistent with `Artifacts/STYLES_GUIDE.md` (choose inline sorting or dropdown sorting depending on view width).

**Exit criteria**: Saved profile reproduces the same result set; both views match.

---

### Phase 2 — Grouping operations (P1)

1. Validate automatic grouping rules (10-minute window + substation-based grouping) match functional design and current service implementation.
2. Implement/verify manual multi-select grouping:
   - Choose mother event deterministically (e.g., earliest timestamp or first selected—match existing logic).
   - Update `is_mother_event`, `parent_event_id`, `grouping_type` correctly.
3. Implement/verify ungroup behavior:
   - Clear children `parent_event_id`.
   - Clear mother flags when appropriate.
4. Ensure UI refresh is immediate after grouping changes (use `refreshKey` pattern if parent/child components apply).

**Exit criteria**: Grouping/ungrouping results are correct and visible without reload.

---

### Phase 3 — False event workflows (P2)

1. Confirm rule definitions and how they are stored/applied (existing config component and utility).
2. Implement/verify:
   - rule configuration persistence
   - detection run behavior
   - bulk flag/unflag actions
   - analytics summaries
3. Ensure any constraint such as `false_event = true` requiring `validated_by_adms = true` is respected.

**Exit criteria**: Flagged events are excluded when hide-false enabled; analytics reflects changes.

---

### Phase 4 — IDR editing (P2)

1. Confirm which fields are editable vs read-only.
2. Implement/verify save flow and persistence.
3. Ensure concurrent edits fail gracefully (user-visible error) without corrupting UI state.

**Exit criteria**: IDR edits persist and are visible on reload.

---

### Phase 5 — Export (P3)

1. Ensure exports reflect the filtered dataset and key flags (mother/false/IDR references).
2. Validate export file format matches current `ExportService` structure.
3. Confirm export dropdown behavior matches styles guide (click-outside to close; disabled while exporting).

**Exit criteria**: Excel/CSV/PDF download succeeds for representative datasets.

## Risks & Mitigations

- **RLS blocks updates**: validate permissions early; ensure service layer uses authenticated client.
- **Duplicate services (Erxi-Reporting)**: avoid editing the wrong copy; prefer `src/services/*` as the app source.
- **Performance in tree view**: keep filtering/grouping computations efficient; avoid expensive recomputes on every render.
- **Schema drift**: validate columns against `Artifacts/DATABASE_SCHEMA.md` before changing queries.

## Validation Plan

- Manual QA checklist based on acceptance scenarios in the spec.
- Run lint/typecheck and the dev server.
- If tests exist for these modules, run the smallest relevant set first.

## Deliverables

- `specs/02-event-management/spec.md` (already created)
- `specs/02-event-management/plan.md` (this document)
- `specs/02-event-management/tasks.md` (task checklist)
