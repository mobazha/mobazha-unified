# Mobazha Unified

统一的 React Web 平台，支持响应式全平台（Web/Mobile/Desktop/Mini App）。

## ✨ 功能特性

### 🎨 多主题系统

- **6 种预设主题**: Classic Cyan、Crypto Night、Business Blue、Cyberpunk Pink、Nature Green、Luxury Gold
- **3 种显示模式**: 亮色 / 暗色 / 跟随系统
- **CSS 变量**: 语义化颜色，易于定制
- [详细文档](./docs/features/theme-system.md)

### 🌍 国际化 (i18n)

- **9 种语言**: English、中文、日本語、한국어、Español、Français、Deutsch、Русский、Português
- **本地化格式**: 数字、货币、日期自动格式化
- [详细文档](./docs/features/i18n.md)

### 💰 外部钱包集成

- **Web3Modal**: 支持 MetaMask、WalletConnect 等主流钱包
- **多链支持**: Ethereum、BSC、Polygon、Arbitrum、Optimism、Avalanche
- **智能合约**: 托管交易、安全支付
- [详细文档](./docs/features/wallet-integration.md)

### 💬 Matrix 聊天

- **端对端加密**: 安全的买卖双方通信
- **设备验证**: SAS/Emoji 验证
- **密钥备份**: 安全的消息历史恢复

### 📱 PWA 支持

- **离线访问**: Service Worker 缓存
- **安装提示**: 添加到主屏幕
- **推送通知**: 订单和消息提醒

### ⚡ 性能优化

- **图片优化**: AVIF/WebP 自动转换
- **懒加载**: 组件和图片延迟加载
- **虚拟列表**: 大数据列表高效渲染
- **代码分割**: 按需加载模块

### 🔒 安全特性

- **E2E 加密**: Matrix 端对端加密
- **外部钱包**: 私钥不离开用户设备
- **安全签名**: 所有交易需用户确认

## 项目结构

```
mobazha-unified/
├── apps/
│   └── web/                    # Next.js 14 应用
├── packages/
│   ├── core/                   # 共享核心层 (services/stores/hooks/types)
│   │   ├── hooks/              # React Hooks
│   │   ├── i18n/               # 国际化
│   │   ├── services/           # 服务层 (API/Matrix/监控)
│   │   ├── stores/             # Zustand 状态管理
│   │   ├── theme/              # 主题系统
│   │   ├── types/              # TypeScript 类型
│   │   └── utils/              # 工具函数
│   ├── ui/                     # 共享 UI 组件
│   │   └── components/         # Button/Card/Avatar 等
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

### 环境变量

复制 `.env.example` 到 `.env.local` 并配置：

```env
# API 配置
NEXT_PUBLIC_API_URL=https://api.app.mobazha.org
NEXT_PUBLIC_USE_MOCK_DATA=false

# Matrix 配置
NEXT_PUBLIC_MATRIX_HOMESERVER=https://matrix.mobazha.org

# Web3 配置
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### 开发命令

```bash
# 启动开发服务器
pnpm dev

# 构建
pnpm build

# 运行测试
pnpm test

# 验证 (快速)
pnpm validate:quick

# 验证 (完整)
pnpm validate

# Code Review (staged changes)
pnpm review

# 查看验证报告
pnpm report
```

## 部署

### Vercel

```bash
# 自动部署 (推送到 main 分支)
git push origin main

# 手动部署
vercel --prod
```

### Docker

```bash
# 构建镜像
docker build -t mobazha-web .

# 运行容器
docker run -p 3000:3000 mobazha-web
```

详见 [Vercel 部署文档](./docs/VERCEL_SETUP.md)。

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
docs(features): add theme system documentation
```

## 文档

- [迁移状态](./docs/migrations/status.md)
- [主题系统](./docs/features/theme-system.md)
- [国际化](./docs/features/i18n.md)
- [钱包集成](./docs/features/wallet-integration.md)
- [Vercel 部署](./docs/VERCEL_SETUP.md)

## CI/CD

项目使用 GitHub Actions 自动化：

- **CI**: 每次 PR 自动运行 lint、test、build
- **Deploy**: 推送到 main 自动部署到 Staging
- **Release**: 创建 tag 自动发布到 Production

详见 `.github/workflows/` 目录。

## License

MPL-2.0
