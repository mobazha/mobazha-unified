#!/bin/bash
# Full validation script for pre-commit use.
# Compatible with the macOS-provided Bash 3.x.

set -e

# Configuration
REPORT_DIR="./reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$REPORT_DIR/validation_$TIMESTAMP.md"
LATEST_REPORT="$REPORT_DIR/latest.md"

# Colours
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Initialise the report.
mkdir -p "$REPORT_DIR/history"
echo "# Validation Report - $TIMESTAMP" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Counters
PASS_COUNT=0
FAIL_COUNT=0

log_step() {
  echo -e "${YELLOW}▶ $1${NC}"
  echo "## $1" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
  echo "✅ **Passed**: $1" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
  PASS_COUNT=$((PASS_COUNT + 1))
}

log_failure() {
  echo -e "${RED}❌ $1${NC}"
  echo "❌ **Failed**: $1" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
  if [ -f "$2" ]; then
    echo '```' >> "$REPORT_FILE"
    head -50 "$2" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
  fi
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

echo -e "${YELLOW}🔍 Running full validation...${NC}"
echo ""

# ==================== Validation steps ====================

# 1. TypeScript type checking
log_step "TypeScript type check"
if pnpm typecheck > /tmp/typecheck.log 2>&1; then
  log_success "Type check passed"
else
  log_failure "Type check failed" /tmp/typecheck.log
fi

# 2. ESLint validation
log_step "ESLint check"
if pnpm lint > /tmp/lint.log 2>&1; then
  log_success "Lint check passed"
else
  log_failure "Lint check failed" /tmp/lint.log
fi

# 3. Unit tests
log_step "Unit tests"
if pnpm test:unit > /tmp/unit.log 2>&1; then
  log_success "Unit tests passed"
else
  log_failure "Unit tests failed" /tmp/unit.log
fi

# 4. Production build
log_step "Production build"
if pnpm build > /tmp/build.log 2>&1; then
  log_success "Build passed"
else
  log_failure "Build failed" /tmp/build.log
fi

# ==================== Summary ====================

echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "## Validation Summary" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

TOTAL=$((PASS_COUNT + FAIL_COUNT))

echo "| Metric | Result |" >> "$REPORT_FILE"
echo "|------|------|" >> "$REPORT_FILE"
echo "| Passed | $PASS_COUNT |" >> "$REPORT_FILE"
echo "| Failed | $FAIL_COUNT |" >> "$REPORT_FILE"
echo "| Total | $TOTAL |" >> "$REPORT_FILE"

# Publish the latest report.
cp "$REPORT_FILE" "$LATEST_REPORT"
mv "$REPORT_FILE" "$REPORT_DIR/history/"

# Print the result.
echo ""
echo "=========================================="
if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}✅ All validation checks passed!${NC}"
  echo ""
  echo -e "Report: ${YELLOW}$LATEST_REPORT${NC}"
  exit 0
else
  echo -e "${RED}❌ $FAIL_COUNT validation check(s) failed${NC}"
  echo ""
  echo -e "Detailed report: ${YELLOW}$LATEST_REPORT${NC}"
  exit 1
fi
