# Artifacts Index (PQMAP)

This page maps the existing `Artifacts/` documentation into a quick reference for Spec Kit-driven work.

## Core Docs (Authoritative)

- `Artifacts/PROJECT_FUNCTION_DESIGN.md`
  - Functional specifications, workflows, acceptance criteria, and change history.

- `Artifacts/DATABASE_SCHEMA.md`
  - Database tables, columns, enums, migration history, and RLS expectations.

- `Artifacts/ARCHITECTURE.md`
  - System architecture, component/service patterns, integration points, security posture.

- `Artifacts/STYLES_GUIDE.md`
  - UI/UX patterns (Export/Import, dropdowns, modals, RefreshKey pattern, etc.).

- `Artifacts/ROADMAP.md`
  - In-progress and planned features by quarter, plus strategic options.

## Supporting Docs

- `Artifacts/README.md`
  - High-level documentation navigation.

## Archive

- `Artifacts/Archive/`
  - Historical implementation notes and retired docs. Use for context only; do not treat as current requirements unless referenced by core docs.

## Practical Guidance (when writing specs/plans)

- Treat `Artifacts/` core docs as the system of record.
- Use the constitution in `memory/constitution.md` as “guardrails” for consistent decisions.
- For any new feature: ensure permissions/roles, schema/migrations, and UI patterns match the documented standards.
