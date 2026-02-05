# PQMAP Constitution

This constitution governs how we evolve PQMAP (Power Quality Monitoring and Analysis Platform for CLP).

## Core Principles

### 1) Single Source of Truth: Artifacts First
The following documents are the authoritative references and must be aligned with any implementation work:

- `Artifacts/PROJECT_FUNCTION_DESIGN.md` (functional requirements + workflows)
- `Artifacts/DATABASE_SCHEMA.md` (schema + migrations + enums + RLS expectations)
- `Artifacts/ARCHITECTURE.md` (system architecture + patterns)
- `Artifacts/STYLES_GUIDE.md` (UI patterns + component conventions)
- `Artifacts/ROADMAP.md` (planned work + sequencing)

If code changes conflict with these, update the documents (or explicitly record why not) before considering the work “done”.

### 2) Database Role System Must Be Respected
PostgreSQL enum/user role mappings and RLS policies are safety-critical. Any change touching auth, permissions, user roles, or RLS must follow the documented role system and avoid introducing invalid enum values or bypasses.

### 3) Schema & Migration Discipline
Database changes must be applied via migrations and kept consistent with the documented schema patterns:

- No silent breaking changes to columns/types without a migration and a documented change note.
- Maintain backward compatibility where practical; if not, provide a migration/rollout plan.

### 4) UI Consistency: Follow the Styles Guide
UI work must follow established UX patterns and tokens:

- Reuse existing components and Tailwind conventions.
- Implement known patterns (e.g., dropdown click-outside handling, export/import patterns, RefreshKey pattern for CRUD lists).
- Do not introduce hard-coded new colors/fonts/shadows outside the design system.

### 5) Minimal Scope, Root-Cause Fixes
Prefer the smallest change that fixes the root cause. Avoid “nice-to-haves” unless explicitly requested. Do not refactor unrelated code while implementing a focused change.

## Technical Baseline

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: Supabase (PostgreSQL)
- **Primary patterns**: Service-layer utilities, documented RLS posture, and documented UI patterns.

## Quality Gates

- TypeScript must pass (no new type errors introduced).
- For changes with CRUD/list UIs, implement RefreshKey-based refresh behavior where applicable.
- Error handling must be user-safe (no leaking secrets/tokens to UI logs).
- Documentation impact must be evaluated for every feature/bugfix.

## Governance

- This constitution overrides any ad-hoc or undocumented conventions.
- Amendments:
	- Patch: clarify wording; no behavioral change.
	- Minor: add/expand a principle or quality gate.
	- Major: remove or materially redefine a principle.
- Any work that changes user-facing workflows, schema, or permissions must include a documentation update (at minimum in `Artifacts/` core docs).

**Version**: 0.1.0 | **Ratified**: 2026-01-21 | **Last Amended**: 2026-01-21
