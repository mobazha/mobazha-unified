# Unified implementation documentation

This directory documents the Unified repository and evidence tied to its code.
Canonical public product knowledge, user guidance, policy, cross-repository
architecture, and the public roadmap live at <https://docs.mobazha.org>.

## Keep here

- `features/`: module design, file ownership, hooks, types, API usage, and migration state.
- `architecture/PACKAGE_BOUNDARIES.md`: repository dependency and package-promotion rules.
- `releases/`: exact version scope, migrations, known issues, and release evidence.
- `security/` and `legal/`: repository and artifact obligations.
- dated audits, validation reports, and implementation plans that identify their evidence window.

## Do not duplicate here

- project-wide fees, governance, compatibility, distribution, or release-maturity policy;
- user and operator task guidance;
- cross-client standards whose meaning must remain stable across repositories;
- public product outcomes already maintained in the canonical roadmap;
- whitepaper, public RFC, project ADR, or historical supersession records.

Implementation plans may contain file paths, phase checklists, test matrices,
and branch-local decisions. They must link the
[public roadmap](https://docs.mobazha.org/project/roadmap) and must not present
estimates or unfinished work as a public commitment.
