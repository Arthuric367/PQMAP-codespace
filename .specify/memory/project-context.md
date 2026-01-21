# Project Context: PQMAP

## Product
Power Quality Monitoring and Analysis Platform for CLP.

## Stack
- React 18 + TypeScript + Vite
- Supabase (PostgreSQL) with RLS
- TailwindCSS

## Existing Documentation
See `memory/artifacts-index.md` for the authoritative `Artifacts/` mapping.

## Implementation Conventions (summary)
- Follow architectural patterns in `Artifacts/ARCHITECTURE.md`.
- Follow database schema + migration discipline in `Artifacts/DATABASE_SCHEMA.md`.
- Follow the database role system and RLS posture described in the role-related documentation.
- Follow UI patterns in `Artifacts/STYLES_GUIDE.md` (export/import, dropdown click-outside, RefreshKey for CRUD refresh, etc.).
- Update `Artifacts/` when adding/changing features.
