# Mobazha Unified

统一的 React Web 平台，支持响应式全平台（Web/Mobile/Desktop/Mini App）。

## 项目结构

```
mobazha-unified/
├── apps/
│   └── web/                    # Next.js 14 应用
├── packages/
│   ├── core/                   # 共享核心层 (services/stores/hooks/types)
│   ├── ui/                     # 共享 UI 组件
│   └── config/                 # 共享配置
├── tools/
│   └── scripts/                # 构建/验证/Review 脚本
├── docs/
│   ├── features/               # 功能规格文档
│   └── migrations/             # 迁移状态追踪
└── reports/                    # 验证报告
```

## 开发

### 环境要求

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### 安装依赖

```bash
pnpm install
```

### 开发命令

```bash
# 启动开发服务器
pnpm dev

# 构建
pnpm build

# 验证 (快速)
pnpm validate:quick

# 验证 (完整)
pnpm validate

# Code Review (staged changes)
pnpm review

# 查看验证报告
pnpm report
```

## 提交规范

每次提交前请确保：

1. `pnpm validate:quick` 通过
2. 运行 `pnpm review` 进行 Code Review
3. 使用规范的提交信息格式

### 提交信息格式

```
<type>(<scope>): <subject>

类型: feat | refactor | fix | test | docs | chore
范围: core | ui | web | config
```

### 示例

```
feat(core): add useProducts hook
refactor(core): migrate matrixService to TypeScript
fix(ui): ProductCard responsive layout
test(core): add useProducts unit tests
```

## 迁移状态

查看 [迁移状态文档](./docs/migrations/status.md)。

## License

MPL-2.0
