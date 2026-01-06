#!/bin/bash
# Code Review 触发脚本

echo "📝 Preparing staged changes for Code Review..."
echo ""

# 检查是否有 staged 文件
STAGED_FILES=$(git diff --staged --name-only 2>/dev/null)

if [ -z "$STAGED_FILES" ]; then
  echo "⚠️  No staged files found."
  echo "Please run 'git add' first."
  exit 1
fi

echo "Staged files:"
echo "$STAGED_FILES"
echo ""
echo "=========================================="
echo ""
echo "📋 请在 Cursor 中输入以下内容进行 Code Review:"
echo ""
echo "   review staged"
echo ""
echo "或者直接粘贴以下 diff 内容请求 review:"
echo ""
echo "=========================================="
git diff --staged
echo "=========================================="

