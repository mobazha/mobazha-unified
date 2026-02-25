# 迁移状态追踪

## 总体进度

- 总功能数: 待完善
- 已完成: 70+ (核心层 + 全部页面 + Mock/API 切换 + 响应式优化 + 真实API对接 + Matrix聊天 + PWA + i18n + 性能优化 + 测试覆盖 + E2E加密 + CI/CD + 监控告警 + 主题系统)
- 进行中: 功能完善
- 未开始: 更多测试覆盖

## Phase 1: 核心层迁移 (基本完成)

| 模块 | 功能         | RN 源文件                   | Web 目标                                 | 状态 | 说明                      |
| ---- | ------------ | --------------------------- | ---------------------------------------- | ---- | ------------------------- |
| Core | 类型定义     | N/A                         | `packages/core/types`                    | ✅   | Product/Order/User/Wallet |
| Core | API 配置     | `api/index.js`              | `packages/core/services/api/config.ts`   | ✅   | 认证/端点配置             |
| Core | API 客户端   | `api/*.js`                  | `packages/core/services/api/client.ts`   | ✅   | 通用请求封装              |
| Core | 商品 API     | `api/products.js`           | `packages/core/services/api/products.ts` | ✅   | 列表/详情/CRUD            |
| Core | 订单 API     | `api/orders.js`             | `packages/core/services/api/orders.ts`   | ✅   | 购买/销售/操作            |
| Core | 用户 API     | `api/profile.js`            | `packages/core/services/api/profile.ts`  | ✅   | 资料/设置                 |
| Core | 钱包 API     | `api/wallet.js`             | `packages/core/services/api/wallet.ts`   | ✅   | 余额/交易                 |
| Core | 用户 Store   | Redux reducers              | `packages/core/stores/userStore.ts`      | ✅   | Zustand 状态              |
| Core | 购物车 Store | Redux reducers              | `packages/core/stores/cartStore.ts`      | ✅   | Zustand 状态              |
| Core | 钱包 Store   | Redux reducers              | `packages/core/stores/walletStore.ts`    | ✅   | Zustand 状态              |
| Core | 商品 Hooks   | N/A                         | `packages/core/hooks/useProducts.ts`     | ✅   | 列表/详情/搜索            |
| Core | 订单 Hooks   | N/A                         | `packages/core/hooks/useOrders.ts`       | ✅   | 列表/详情/操作            |
| Core | 用户 Hooks   | N/A                         | `packages/core/hooks/useProfile.ts`      | ✅   | 资料/在线状态             |
| Core | Matrix 服务  | `services/matrixService.js` | `packages/core/services/matrix/`         | ✅   | 基础框架已完成            |

## Phase 2: UI 组件库 (部分完成)

| 组件            | RN 源                | Web 目标                   | 状态 | 说明               |
| --------------- | -------------------- | -------------------------- | ---- | ------------------ |
| Button          | components/atoms     | packages/ui/components     | ✅   | 基础按钮           |
| Avatar          | components/atoms     | packages/ui/components     | ✅   | 用户头像           |
| Card            | components/atoms     | packages/ui/components     | ✅   | 卡片容器           |
| Container       | N/A                  | packages/ui/layouts        | ✅   | 响应式容器         |
| Grid            | N/A                  | packages/ui/layouts        | ✅   | 网格布局           |
| Stack           | N/A                  | packages/ui/layouts        | ✅   | 堆叠布局           |
| ChatList        | N/A                  | apps/web/components/Chat   | ✅   | 聊天列表           |
| ChatMessages    | N/A                  | apps/web/components/Chat   | ✅   | 消息显示           |
| WalletCard      | N/A                  | apps/web/components/Wallet | ✅   | 钱包卡片           |
| TransactionList | N/A                  | apps/web/components/Wallet | ✅   | 交易列表           |
| OrderCard       | N/A                  | apps/web/components/Order  | ✅   | 订单卡片           |
| ProductCard     | components/templates | packages/ui/components     | ✅   | 商品卡片（含骨架） |
| ProductSection  | N/A                  | apps/web/components        | ✅   | 商品区块           |
| MobileNav       | N/A                  | apps/web/components        | ✅   | 移动端底部导航     |
| ThemeProvider   | N/A                  | apps/web/components        | ✅   | 主题上下文提供者   |
| ThemeSwitcher   | N/A                  | apps/web/components        | ✅   | 主题切换器         |

## Phase 3: 页面迁移 (部分完成)

| 页面       | RN 源                  | Web 目标                      | 状态 | 说明      |
| ---------- | ---------------------- | ----------------------------- | ---- | --------- |
| 首页       | screens/Home.js        | apps/web/app/page.tsx         | ✅   | 基础结构  |
| 店铺页     | screens/StoreDetail.js | apps/web/app/store/[peerId]   | ✅   | 基础结构  |
| 聊天列表   | screens/Chat.js        | apps/web/app/chat/page.tsx    | ✅   | Mock 数据 |
| 聊天详情   | screens/ChatRoom.js    | apps/web/app/chat/[roomId]    | ✅   | Mock 数据 |
| 钱包页     | screens/Wallet.js      | apps/web/app/wallet/page.tsx  | ✅   | Mock 数据 |
| 订单列表   | screens/Orders.js      | apps/web/app/orders/page.tsx  | ✅   | Mock 数据 |
| 订单详情   | screens/OrderDetail.js | apps/web/app/orders/[orderId] | ✅   | Mock 数据 |
| 商品详情   | screens/Listing.js     | apps/web/app/product/[slug]   | ✅   | 完整功能  |
| 搜索页     | screens/Search.js      | apps/web/app/search           | ✅   | 完整功能  |
| 设置页     | screens/Settings.js    | apps/web/app/settings         | ✅   | 完整功能  |
| 用户资料页 | screens/Profile.js     | apps/web/app/profile          | ✅   | 完整功能  |
| 商品创建   | screens/createListing  | apps/web/app/listing/new      | ✅   | 完整功能  |
| 商品编辑   | screens/editListing    | apps/web/app/listing/edit     | ✅   | 完整功能  |
| 购物车     | screens/ShoppingCart   | apps/web/app/cart             | ✅   | 完整功能  |
| 结算页     | screens/Checkout       | apps/web/app/checkout         | ✅   | 完整功能  |

## Phase 4: 基础设施 (已完成)

| 功能     | 目标路径                                | 状态 | 说明                          |
| -------- | --------------------------------------- | ---- | ----------------------------- |
| PWA 支持 | apps/web/public/manifest.json, sw.js    | ✅   | 离线支持、安装提示            |
| 国际化   | packages/core/i18n/                     | ✅   | 9 种语言支持                  |
| 性能优化 | packages/core/utils/performance.ts      | ✅   | 防抖、节流、缓存、懒加载      |
| 测试覆盖 | packages/core/**tests**/                | ✅   | Vitest + Testing Library      |
| E2E 加密 | packages/core/services/matrix/crypto.ts | ✅   | Matrix 端对端加密             |
| CI/CD    | .github/workflows/                      | ✅   | GitHub Actions 自动化         |
| 监控告警 | packages/core/services/monitoring/      | ✅   | 错误追踪、性能监控            |
| 主题系统 | packages/core/theme/                    | ✅   | 6 种主题 + 亮色/暗色/跟随系统 |
| 外部钱包 | packages/core/hooks/useWallet.ts        | ✅   | Web3Modal + 多链支持          |

## Phase 5: UX 重构 (已完成 2026-01-07)

### 移动端紧凑化

| 页面/组件   | 优化内容                                                   | 状态 |
| ----------- | ---------------------------------------------------------- | ---- |
| 首页        | Hero 区域、ProductSection、Categories 间距和字体响应式调整 | ✅   |
| 搜索页      | 搜索框、标签页、卡片间距紧凑化                             | ✅   |
| 聊天页      | ChatList 列表项高度、头像尺寸优化                          | ✅   |
| 设置页      | SettingItem、SettingGroup 紧凑化                           | ✅   |
| 订单页      | OrderCard 间距、字体、按钮紧凑化                           | ✅   |
| 个人主页    | 头部区域、统计数据、产品卡片紧凑化                         | ✅   |
| Marketplace | Featured 卡片、筛选器紧凑化                                | ✅   |

### 桌面端交互增强

| 功能        | 优化内容                             | 状态 |
| ----------- | ------------------------------------ | ---- |
| Button 组件 | 添加 hover shadow、active scale 效果 | ✅   |
| Header 导航 | 添加 hover 高亮效果                  | ✅   |
| Card 组件   | 添加 hover 阴影和 active 缩放        | ✅   |
| ProductCard | 添加图片缩放、卡片提升效果           | ✅   |

### 性能优化

| 功能          | 优化内容                 | 状态 |
| ------------- | ------------------------ | ---- |
| Next.js Image | 配置图片域名、格式、缓存 | ✅   |
| Grid 组件     | 响应式间距优化           | ✅   |
| 图片缓存      | 30 天 CDN 缓存策略       | ✅   |

### 新增规则文件

- `.cursor/rules/mobile-ux-rules.mdc` - 移动端用户体验规则
- `.cursor/rules/desktop-ux-rules.mdc` - 桌面端用户体验规则

## 下一步计划

1. **Professional Grade 路线图** — 前端产品专业化（详见 `docs/PROFESSIONAL_GRADE_ROADMAP.md`）
   - Tier 0: 交易闭环修复（购物车→结账、SEO、评价、全局搜索）
   - Tier 1: Admin/Storefront 分离（Dashboard、商品管理、卖家感知）
   - Tier 2: 差异化竞争力（AI Store Builder、品牌化）
   - Tier 3: 规模化运营（分析、CRM、营销）
2. **Desktop 功能迁移** — 购物车→结账流程、评价提交、搜索、结账优惠券
3. **更多测试** - 提高测试覆盖率
4. **视觉回归测试** - 更新 E2E 截图基准

---

图例: ✅ 完成 | 🔄 进行中 | ⏳ 未开始 | N/A 不适用

最后更新: 2026-02-25
