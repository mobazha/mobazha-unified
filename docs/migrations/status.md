# 迁移状态追踪

## 总体进度

- 总功能数: 待完善
- 已完成: 5 (核心层)
- 进行中: 1 (Matrix 服务)
- 未开始: UI 组件、页面

## Phase 1: 核心层迁移 (进行中)

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
| Core | Matrix 服务  | `services/matrixService.js` | `packages/core/services/matrix/`         | 🔄   | 聊天/加密/社区            |

## Phase 2: UI 组件库 (待开始)

| 组件        | RN 源                | Web 目标               | 状态 | 说明     |
| ----------- | -------------------- | ---------------------- | ---- | -------- |
| Button      | components/atoms     | packages/ui/components | ⏳   | 基础按钮 |
| Avatar      | components/atoms     | packages/ui/components | ⏳   | 用户头像 |
| ProductCard | components/templates | packages/ui/components | ⏳   | 商品卡片 |
| ...         | ...                  | ...                    | ⏳   | ...      |

## Phase 3: 页面迁移 (待开始)

| 页面     | RN 源                  | Web 目标                    | 状态 |
| -------- | ---------------------- | --------------------------- | ---- |
| 首页     | screens/Home.js        | apps/web/app/page.tsx       | ⏳   |
| 商品详情 | screens/Listing.js     | apps/web/app/listing/[slug] | ⏳   |
| 店铺页   | screens/StoreDetail.js | apps/web/app/store/[peerId] | ⏳   |
| ...      | ...                    | ...                         | ⏳   |

---

图例: ✅ 完成 | 🔄 进行中 | ⏳ 未开始 | N/A 不适用

最后更新: 2026-01-06
