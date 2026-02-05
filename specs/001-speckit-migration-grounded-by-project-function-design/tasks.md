# Tasks: Migrate Specs from PROJECT_FUNCTION_DESIGN into Spec Kit Structure

**Input**: Design documents from `Artifacts/PROJECT_FUNCTION_DESIGN.md`
**Prerequisites**: `specs/001-speckit-migration-grounded-by-project-function-design/plan.md` (required)

**Tests**: Not applicable (documentation migration).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 [P] [US3] Confirm `.specify/memory/constitution.md` declares `Artifacts/` as authoritative
- [ ] T002 [P] [US3] Ensure `.specify/memory/artifacts-index.md` lists the 5 core docs
- [ ] T003 [P] [US2] Add/update `specs/README.md` with the spec → plan → tasks workflow

---

## Phase 2: Inventory & Module Map (Grounding)

- [ ] T010 [US1] Extract the module list and sub-modules from `Artifacts/PROJECT_FUNCTION_DESIGN.md`
- [ ] T011 [US1] For each module, identify key repo entry points (components/pages/services/types)
- [ ] T012 [US1] For each module, identify linked schema areas (tables/enums/RLS) in `Artifacts/DATABASE_SCHEMA.md`
- [ ] T013 [US1] For each module, identify required UI patterns in `Artifacts/STYLES_GUIDE.md`

---

## Phase 3: Create Baseline Module Specs (Spec-only)

Create one folder per functional module; each contains `spec.md`.

- [ ] T020 [P] [US1] Create `specs/01-dashboard/spec.md`
- [ ] T021 [P] [US1] Create `specs/02-event-management/spec.md`
- [ ] T022 [P] [US1] Create `specs/03-data-analytics/spec.md`
- [ ] T023 [P] [US1] Create `specs/04-asset-management/spec.md`
- [ ] T024 [P] [US1] Create `specs/05-reporting/spec.md`
- [ ] T025 [P] [US1] Create `specs/06-data-maintenance/spec.md`
- [ ] T026 [P] [US1] Create `specs/07-notifications/spec.md`
- [ ] T027 [P] [US1] Create `specs/08-pq-services/spec.md`
- [ ] T028 [P] [US1] Create `specs/09-user-management/spec.md`
- [ ] T029 [P] [US1] Create `specs/10-scada-substation-management/spec.md`
- [ ] T030 [P] [US1] Create `specs/11-system-health/spec.md`

Each module spec must:
- Link to `Artifacts/PROJECT_FUNCTION_DESIGN.md` and any relevant core docs.
- Include user stories + acceptance scenarios.
- Include FRs and success criteria.

---

## Phase 4: One End-to-End Example (Spec → Plan → Tasks)

- [ ] T040 [US2] Pick a single real change request grounded in functional design (agree scope)
- [ ] T041 [US2] Create `specs/[###-chosen-change]/spec.md`
- [ ] T042 [US2] Create `specs/[###-chosen-change]/plan.md`
- [ ] T043 [US2] Create `specs/[###-chosen-change]/tasks.md`

---

## Phase 5: Governance & Maintenance

- [ ] T050 [US3] Define how to resolve conflicts between `Artifacts/` and `specs/` (Artifacts wins unless explicitly overridden)
- [ ] T051 [US3] Define update triggers: when code changes require updating `Artifacts/` and/or `specs/`
- [ ] T052 [US3] Add a lightweight review checklist for spec completeness (optional: use `/speckit.checklist`)
