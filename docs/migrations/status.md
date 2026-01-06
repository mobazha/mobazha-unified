# 迁移状态追踪

## 总体进度

- 总功能数: 待完善
- 已完成: 28+ (核心层 + 全部页面 + Mock/API 切换 + 响应式优化)
- 进行中: 真实 API 对接
- 未开始: Matrix 聊天集成

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

## 下一步计划

1. **真实 API 对接** - 替换 Mock 数据，连接后端服务
2. **Matrix 聊天集成** - 对接真实 Matrix 服务
3. **PWA 完善** - 添加 Service Worker、离线支持
4. **国际化支持** - i18n 多语言

---

图例: ✅ 完成 | 🔄 进行中 | ⏳ 未开始 | N/A 不适用

最后更新: 2026-01-06
