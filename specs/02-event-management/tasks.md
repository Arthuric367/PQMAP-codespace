# Tasks: Event Management Module (Baseline)

**Spec**: `specs/02-event-management/spec.md`  
**Plan**: `specs/02-event-management/plan.md`  
**Created**: 2026-01-21  
**Status**: Draft  

> Keep tasks small, verifiable, and mapped to spec acceptance scenarios.

## 0) Grounding / Inventory

- [ ] Confirm required `pq_events` fields used by Event Management are present in schema and types
- [ ] Identify/confirm authoritative service files used by the main app (avoid `Erxi-Reporting/*` duplicates)
- [ ] Document expected write operations and their RLS requirements (grouping, false flagging, IDR edits)

## 1) Event Analysis Views (Tree + List)

- [ ] Verify tree view renders mother + children structure and supports expand/collapse
- [ ] Verify list view renders flat list and is consistent with filters
- [ ] Ensure selecting an event updates Event Details reliably (no null crashes)
- [ ] Add/verify empty states (no results, no selection) consistent with existing patterns

## 2) Advanced Filtering + Profiles

- [ ] Ensure filters apply consistently to both tree and list views
- [ ] Implement/verify `hideFalseEvents` filter (`false_event === true` excluded)
- [ ] Implement/verify filter profile save/load (persist in the current system’s expected storage)
- [ ] Implement click-outside close behavior for filter dropdowns (where applicable)

## 3) Mother Event Grouping (Automatic + Manual)

- [ ] Verify automatic grouping behavior matches functional design (10-minute window + substation-based)
- [ ] Implement/verify manual grouping multi-select workflow
- [ ] Implement/verify ungroup workflow
- [ ] Ensure correct field writes: `is_mother_event`, `parent_event_id`, `grouping_type`
- [ ] Ensure UI refreshes immediately after grouping changes (use `refreshKey` pattern if needed)

## 4) False Event Detection (Rules + Bulk Actions + Analytics)

- [ ] Verify rule configuration UI loads/saves correctly
- [ ] Implement/verify detection run uses configured rules
- [ ] Implement/verify bulk flag and bulk unflag actions
- [ ] Ensure constraint requirements are respected (e.g., any `validated_by_adms` dependency)
- [ ] Verify analytics view updates after changes

## 5) IDR Editing

- [ ] Confirm editable vs read-only fields in IDR section
- [ ] Implement/verify save flow persists updates
- [ ] Handle failure cases with user-visible feedback (RLS/validation errors)

## 6) Export (Excel/CSV/PDF)

- [ ] Ensure export uses filtered dataset
- [ ] Verify exported files include key flags (mother/false/IDR references where applicable)
- [ ] Verify export dropdown behavior per styles guide (click-outside, disable while exporting)

## 7) Validation

- [ ] Run `npm run lint` (or project equivalent)
- [ ] Run `npm run build` (or project equivalent)
- [ ] Run the app and manually verify acceptance scenarios in the spec

## 8) Documentation Hygiene

- [ ] Ensure spec references remain accurate if any component/service paths change
- [ ] If implementation introduces a new UI pattern, update `Artifacts/STYLES_GUIDE.md` (only if needed)
