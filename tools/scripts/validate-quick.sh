#!/bin/bash
# 快速验证脚本 - 开发时使用

set -e

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}⚡ Quick validation...${NC}"

# 1. TypeScript 类型检查
echo -e "${YELLOW}▶ TypeScript check...${NC}"
if pnpm typecheck 2>/dev/null; then
  echo -e "${GREEN}✅ TypeScript OK${NC}"
else
  echo -e "${RED}❌ TypeScript errors${NC}"
  exit 1
fi

# 2. ESLint 检查 (仅 staged 文件)
echo -e "${YELLOW}▶ Lint check...${NC}"
if pnpm lint 2>/dev/null; then
  echo -e "${GREEN}✅ Lint OK${NC}"
else
  echo -e "${RED}❌ Lint errors${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Quick validation passed!${NC}"

