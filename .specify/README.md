# Spec Kit Workspace (.specify)

This folder contains Spec Kit configuration and “memory” documents used by the `/speckit.*` agent commands.

## How to compare with existing documentation

- Existing project documentation lives in `Artifacts/` (core docs + Archive).
- This folder stores:
  - `memory/`: project principles and context used to generate consistent specs/plans/tasks
  - `templates/`: templates used by Spec Kit commands
  - `scripts/`: helper scripts installed by Spec Kit

Start here:
- `memory/constitution.md`
- `memory/artifacts-index.md`

## Notes

- This folder does not replace `Artifacts/`; it complements it.
- If you update core system behavior (schema, roles/RLS, UI patterns), update `Artifacts/` accordingly.
