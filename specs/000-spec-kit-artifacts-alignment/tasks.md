# Tasks: Spec Kit + Artifacts Alignment Baseline

**Input**: Design documents from `specs/000-spec-kit-artifacts-alignment/`
**Prerequisites**: plan.md (required), spec.md (required)

**Tests**: Not applicable (documentation-only work).

**Organization**: Tasks grouped by user story.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 [P] [US1] Create `specs/README.md` describing how `specs/` relates to `Artifacts/`
- [ ] T002 [P] [US3] Ensure `.specify/memory/constitution.md` is PQMAP-specific and not a placeholder template
- [ ] T003 [P] [US3] Create `.specify/memory/artifacts-index.md` mapping the 5 core docs

---

## Phase 2: User Story 1 - Compare Spec Kit vs Artifacts (Priority: P1)

- [ ] T010 [US1] Write `specs/000-spec-kit-artifacts-alignment/spec.md` using the spec template format
- [ ] T011 [US1] Add explicit references to `Artifacts/PROJECT_FUNCTION_DESIGN.md`, `Artifacts/DATABASE_SCHEMA.md`, `Artifacts/ARCHITECTURE.md`, `Artifacts/STYLES_GUIDE.md`, `Artifacts/ROADMAP.md`

---

## Phase 3: User Story 2 - Standard plan and tasks exist for comparison (Priority: P2)

- [ ] T020 [US2] Write `specs/000-spec-kit-artifacts-alignment/plan.md` referencing the real repo structure and stack
- [ ] T021 [US2] Write `specs/000-spec-kit-artifacts-alignment/tasks.md` grouped by user story with file paths

---

## Phase 4: User Story 3 - Guardrails prevent documentation drift (Priority: P3)

- [ ] T030 [US3] Add `.specify/memory/project-context.md` with stack + doc navigation
- [ ] T031 [US3] Add `.specify/README.md` explaining how to compare `.specify/`, `specs/`, and `Artifacts/`

---

## Dependencies & Execution Order

- Setup tasks (Phase 1) can be done in parallel.
- US1 depends on Phase 1 being understood but not technically blocked.
- US2 depends on US1 (plan/tasks should match the spec).
- US3 can be done in parallel but must be consistent with the constitution.
