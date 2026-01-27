# Specs

This folder contains feature specifications, implementation plans, and task lists generated (or maintained) using GitHub Spec Kit templates in `.specify/templates/`.

## Relationship to Artifacts/

- `Artifacts/` remains the authoritative project documentation set (functional spec, architecture, schema, styles guide, roadmap).
- `specs/` contains work-item/feature-level specifications that reference and stay consistent with `Artifacts/`.

## Structure

Each feature gets its own folder:

```text
specs/[###-feature-name]/
├── spec.md      # Feature Specification (from spec-template)
├── plan.md      # Implementation Plan (from plan-template)
└── tasks.md     # Task list (from tasks-template)
```
