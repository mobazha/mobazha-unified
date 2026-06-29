#!/usr/bin/env bash
# check-codegen-drift.sh — Ensure generated files match the committed merged spec.
#
# Runs openapi-typescript + gen-api-paths.mjs against the committed
# packages/core/api-spec/openapi.json, then checks git diff.
# Exits non-zero if any generated file has drifted.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

echo "=== Regenerating types + paths from committed spec ==="
pnpm --filter @mobazha/core generate:api
pnpm exec prettier --write \
  packages/core/types/api-generated.d.ts \
  packages/core/config/apiPaths.generated.ts

echo "=== Checking for drift ==="
DRIFT_FILES=(
  "packages/core/types/api-generated.d.ts"
  "packages/core/config/apiPaths.generated.ts"
)

DRIFTED=()
for f in "${DRIFT_FILES[@]}"; do
  if ! git diff --quiet -- "$f" 2>/dev/null; then
    DRIFTED+=("$f")
  fi
done

if [ ${#DRIFTED[@]} -gt 0 ]; then
  echo ""
  echo "ERROR: Generated files have drifted from committed versions:"
  for f in "${DRIFTED[@]}"; do
    echo "  - $f"
  done
  echo ""
  echo "Run 'pnpm --filter @mobazha/core generate:api' and commit the results."
  exit 1
fi

echo "OK — all generated files are up to date."
