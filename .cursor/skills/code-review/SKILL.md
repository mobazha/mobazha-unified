---
name: code-review
description: Review code for quality, architecture consistency, and adherence to Mobazha project standards using confidence-based filtering. Use when the user asks for code review, staged review, pre-commit review, or says "review", "审查", "检查代码", "帮我看看", "review staged", "提交前检查", "看看代码".
---

# Code Review

## 审查范围

- **已暂存变更**: `git diff --staged`
- **未暂存变更**: `git diff`
- **指定文件**: 按用户要求

## 置信度评分

对每个问题评分 0-100，**只报告置信度 >= 80 的问题**。

| 分数   | 含义                     |
| ------ | ------------------------ |
| 0-25   | 可能是误报或已有问题     |
| 26-50  | 小问题，规范中未明确提及 |
| 51-75  | 真实但影响较小           |
| 76-89  | 重要，需要关注           |
| 90-100 | 关键 Bug 或明确违反规范  |

## 审查维度

| 维度           | 权重 | 检查要点                         |
| -------------- | ---- | -------------------------------- |
| **架构一致性** | 20%  | 代码复用、分层架构、类型定义位置 |
| 代码质量       | 20%  | 命名、结构、可读性、DRY          |
| React 最佳实践 | 15%  | Hooks、性能、组件设计            |
| TypeScript     | 15%  | 类型安全、泛型、禁止 `any`       |
| 迁移一致性     | 10%  | 与原 RN 功能对齐                 |
| 响应式与间距   | 10%  | 断点、布局、内边距、元素间距     |
| 错误处理       | 5%   | try-catch、用户反馈              |
| 测试覆盖       | 5%   | 单元测试完整性                   |

## 架构一致性检查（关键）

详见 `.cursor/rules/code-reuse-rules.mdc`。

- [ ] `apps/` 中无业务类型定义（Props 除外）
- [ ] `apps/` 中无 `transform*`/`map*` 函数
- [ ] 组件不直接调用 `xxxApi.*`，使用 hooks
- [ ] 无跨文件重复逻辑
- [ ] 上下文（如 `viewingContext`）正确传递

完整检查清单（货币、主题、间距等）见 [checklist.md](checklist.md)。

## 输出格式

```markdown
## Code Review 报告

### 📁 审查文件

- file1.ts (+X 行)

### 📊 评分：X/10

### 🔴 必须修复（置信度 90-100）

#### 问题 #1: [问题标题]

- 位置：`file:line`
- 问题：[具体描述]
- 违反规范：[对应规则]
- 建议修复：[代码示例]

### 🟡 建议改进（置信度 80-89）

#### 问题 #N: [问题标题]

- 位置：`file:line`
- 问题：[具体描述]
- 建议修复：[代码示例]

### ✅ 一致性检查

- [x] 架构一致性 — 无违规
- [x] 迁移一致性 — 与原 RN 行为一致

### ✨ 代码亮点

- [描述写得好的代码或良好模式]

### 结论

- [ ] 可以提交
- [ ] 需修复后重新审查
```
