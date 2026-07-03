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
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

SPEC="packages/core/api-spec/openapi.json"
TYPES_OUT="$TMP_DIR/api-generated.d.ts"
PATHS_OUT="$TMP_DIR/apiPaths.generated.ts"
OPENAPI_TYPESCRIPT="packages/core/node_modules/.bin/openapi-typescript"
PRETTIER="node_modules/.bin/prettier"

if [ ! -x "$OPENAPI_TYPESCRIPT" ] || [ ! -x "$PRETTIER" ]; then
  echo "ERROR: Required local codegen tools are missing. Run pnpm install first."
  exit 1
fi

"$OPENAPI_TYPESCRIPT" "$SPEC" -o "$TYPES_OUT"
node scripts/gen-api-paths.mjs "$SPEC" "$PATHS_OUT"
"$PRETTIER" --config .prettierrc --write "$TYPES_OUT" "$PATHS_OUT" >/dev/null

echo "=== Checking for drift ==="
DRIFT_PAIRS=(
  "packages/core/types/api-generated.d.ts:$TYPES_OUT"
  "packages/core/config/apiPaths.generated.ts:$PATHS_OUT"
)

DRIFTED=()
for pair in "${DRIFT_PAIRS[@]}"; do
  committed="${pair%%:*}"
  generated="${pair#*:}"
  if ! cmp -s "$committed" "$generated"; then
    DRIFTED+=("$committed")
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
