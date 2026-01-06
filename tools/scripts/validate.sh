#!/bin/bash
# 完整验证脚本 - 提交前使用

set -e

# 配置
REPORT_DIR="./reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$REPORT_DIR/validation_$TIMESTAMP.md"
LATEST_REPORT="$REPORT_DIR/latest.md"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 初始化报告
mkdir -p "$REPORT_DIR/history"
echo "# 验证报告 - $TIMESTAMP" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 记录结果
declare -A RESULTS

log_step() {
  echo -e "${YELLOW}▶ $1${NC}"
  echo "## $1" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
  echo "✅ **通过**: $1" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
  RESULTS["$1"]="pass"
}

log_failure() {
  echo -e "${RED}❌ $1${NC}"
  echo "❌ **失败**: $1" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
  if [ -f "$2" ]; then
    echo '```' >> "$REPORT_FILE"
    head -50 "$2" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
  fi
  RESULTS["$1"]="fail"
}

echo -e "${YELLOW}🔍 Running full validation...${NC}"
echo ""

# ==================== 验证步骤 ====================

# 1. TypeScript 类型检查
log_step "TypeScript 类型检查"
if pnpm typecheck > /tmp/typecheck.log 2>&1; then
  log_success "类型检查通过"
else
  log_failure "类型检查失败" /tmp/typecheck.log
fi

# 2. ESLint 检查
log_step "ESLint 代码检查"
if pnpm lint > /tmp/lint.log 2>&1; then
  log_success "Lint 检查通过"
else
  log_failure "Lint 检查失败" /tmp/lint.log
fi

# 3. 单元测试
log_step "单元测试"
if pnpm test:unit > /tmp/unit.log 2>&1; then
  log_success "单元测试通过"
else
  log_failure "单元测试失败" /tmp/unit.log
fi

# 4. 构建测试
log_step "构建验证"
if pnpm build > /tmp/build.log 2>&1; then
  log_success "构建成功"
else
  log_failure "构建失败" /tmp/build.log
fi

# ==================== 生成摘要 ====================

echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "## 验证摘要" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

PASS_COUNT=0
FAIL_COUNT=0

for key in "${!RESULTS[@]}"; do
  if [ "${RESULTS[$key]}" == "pass" ]; then
    ((PASS_COUNT++))
  else
    ((FAIL_COUNT++))
  fi
done

echo "| 指标 | 结果 |" >> "$REPORT_FILE"
echo "|------|------|" >> "$REPORT_FILE"
echo "| 通过 | $PASS_COUNT |" >> "$REPORT_FILE"
echo "| 失败 | $FAIL_COUNT |" >> "$REPORT_FILE"
echo "| 总计 | $((PASS_COUNT + FAIL_COUNT)) |" >> "$REPORT_FILE"

# 复制为最新报告
cp "$REPORT_FILE" "$LATEST_REPORT"
mv "$REPORT_FILE" "$REPORT_DIR/history/"

# 输出结果
echo ""
echo "=========================================="
if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}✅ 所有验证通过！${NC}"
  echo ""
  echo -e "报告: ${YELLOW}$LATEST_REPORT${NC}"
  exit 0
else
  echo -e "${RED}❌ 有 $FAIL_COUNT 项验证失败${NC}"
  echo ""
  echo -e "查看详细报告: ${YELLOW}$LATEST_REPORT${NC}"
  exit 1
fi

