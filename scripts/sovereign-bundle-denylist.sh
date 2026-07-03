#!/usr/bin/env bash
#
# sovereign-bundle-denylist.sh — Two-tier post-build validation for Sovereign bundles.
#
# Run after `VITE_BUILD_TARGET=sovereign vite build` to verify that no
# forbidden external domains, SDK identifiers, or suspicious business
# terms leaked into the production bundle.
#
# Exit codes:
#   0 — clean (or Level 2 informational warnings only)
#   1 — Level 1 hard failure (external domains / SDK identifiers found)
#
# Usage:
#   ./scripts/sovereign-bundle-denylist.sh [dist-dir]
#   Default dist-dir: apps/web/dist

set -euo pipefail

DIST_DIR="${1:-apps/web/dist}"

if [ ! -d "$DIST_DIR" ]; then
  echo "ERROR: dist directory not found: $DIST_DIR"
  echo "Run 'VITE_BUILD_TARGET=sovereign pnpm build --filter @mobazha/web' first."
  exit 1
fi

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

L1_FAIL=0
L2_WARN=0

# ============================================================
# Level 1: Hard failures — external domains & SDK identifiers
# These MUST NOT appear anywhere in the JS/CSS bundle.
# ============================================================
L1_PATTERNS=(
  "telegram-web-app.js"
  "app.mobazha.org"
  "reown.com"
  "discord.com"
  "js.stripe.com"
  "fonts.googleapis.com"
  "fonts.gstatic.com"
  "cdn.jsdelivr.net"
  "@reown/appkit"
  "acquireSaaSToken"
  "matrix.mobazha.org"
  "login.mobazha.org"
  "test-new-login.mobazha.org"
  "miniapp.mobazha.org"
  "miniappdev.mobazha.org"
)

echo "=== Level 1: External Domains & SDK Identifiers ==="
echo ""

for pattern in "${L1_PATTERNS[@]}"; do
  # Search JS and CSS files only (skip source maps, images, fonts)
  matches=$(grep -rl --include='*.js' --include='*.css' --include='*.html' "$pattern" "$DIST_DIR" 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo -e "${RED}FAIL${NC}: '$pattern' found in:"
    echo "$matches" | sed 's/^/  /'
    L1_FAIL=1
  fi
done

if [ "$L1_FAIL" -eq 0 ]; then
  echo -e "${GREEN}PASS${NC}: No external domains or SDK identifiers found."
fi
echo ""

# ============================================================
# Level 2: Warnings — business terms that may appear in i18n,
# type definitions, or legitimate contexts. Requires human review.
# Only match import-path or URL-like patterns, not plain English words.
# ============================================================
L2_PATTERNS=(
  # Match "matrix" only in import/URL context, not plain text
  'import.*matrix'
  'from.*matrix'
  'require.*matrix'
  # Match "discord" in import/URL context
  'import.*discord'
  'from.*discord'
  # Match "stripe" in import/URL context
  'import.*stripe'
  'from.*stripe'
  '@stripe/'
  # Casdoor-specific identifiers
  'casdoor-js-sdk'
  'CasdoorSDK'
)

echo "=== Level 2: Business Term Patterns (review manually) ==="
echo ""

for pattern in "${L2_PATTERNS[@]}"; do
  matches=$(grep -rl --include='*.js' -i "$pattern" "$DIST_DIR" 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo -e "${YELLOW}WARN${NC}: Pattern '$pattern' found in:"
    echo "$matches" | sed 's/^/  /'
    echo ""
    L2_WARN=1
  fi
done

if [ "$L2_WARN" -eq 0 ]; then
  echo -e "${GREEN}PASS${NC}: No suspicious business term patterns found."
fi
echo ""

# ============================================================
# Summary
# ============================================================
echo "=== Summary ==="
if [ "$L1_FAIL" -ne 0 ]; then
  echo -e "${RED}BLOCKED${NC}: Level 1 violations detected. Fix before shipping."
  exit 1
elif [ "$L2_WARN" -ne 0 ]; then
  echo -e "${YELLOW}REVIEW${NC}: Level 2 warnings detected. Manual review recommended."
  echo "(Level 2 is informational and does not block the build.)"
  exit 0
else
  echo -e "${GREEN}CLEAN${NC}: Sovereign bundle passes all checks."
  exit 0
fi
