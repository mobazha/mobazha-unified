# Validation Reports

`pnpm validate` writes a timestamped validation report to `reports/history/` and copies the most
recent result to `reports/latest.md`. Use `pnpm report` to view that latest report.

Generated reports are intentionally ignored by Git. This file and `.gitkeep` keep the directory
discoverable without committing machine-specific results.
