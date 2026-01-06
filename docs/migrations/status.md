# 迁移状态追踪

## 总体进度

- **总页面数**: 113 (来自 mobazha-mobile/screens/)
- **已完成**: 0 (0%)
- **进行中**: 0
- **未开始**: 113

## Core 层迁移状态

### Services

| 源文件                            | 目标文件                      | 状态 | 测试 |
| --------------------------------- | ----------------------------- | ---- | ---- |
| services/matrixService.js         | core/services/matrix.ts       | ⏳   | ⏳   |
| services/matrixCryptoService.js   | core/services/matrixCrypto.ts | ⏳   | ⏳   |
| services/rwaMarketplaceService.js | core/services/rwa.ts          | ⏳   | ⏳   |
| services/tokenLookupService.js    | core/services/token.ts        | ⏳   | ⏳   |
| services/notificationService.js   | core/services/notification.ts | ⏳   | ⏳   |

### Stores (Redux -> Zustand)

| 源文件                   | 目标文件                    | 状态 | 测试 |
| ------------------------ | --------------------------- | ---- | ---- |
| reducers/profile.js      | core/stores/userStore.ts    | ⏳   | ⏳   |
| reducers/listings.js     | core/stores/productStore.ts | ⏳   | ⏳   |
| reducers/order.js        | core/stores/orderStore.ts   | ⏳   | ⏳   |
| reducers/chat.js         | core/stores/chatStore.ts    | ⏳   | ⏳   |
| reducers/wallet.js       | core/stores/walletStore.ts  | ⏳   | ⏳   |
| reducers/shoppingCart.js | core/stores/cartStore.ts    | ⏳   | ⏳   |

### API

| 源文件          | 目标文件                      | 状态 | 测试 |
| --------------- | ----------------------------- | ---- | ---- |
| api/products.js | core/services/api/products.ts | ⏳   | ⏳   |
| api/orders.js   | core/services/api/orders.ts   | ⏳   | ⏳   |
| api/profile.js  | core/services/api/profile.ts  | ⏳   | ⏳   |
| ...             | ...                           | ...  | ...  |

## 页面迁移状态

### 优先级 1: 核心浏览

| 源文件                    | 目标文件                   | 状态 | 测试 |
| ------------------------- | -------------------------- | ---- | ---- |
| screens/listing.js        | app/product/[id]/page.tsx  | ⏳   | ⏳   |
| screens/store.js          | app/store/[id]/page.tsx    | ⏳   | ⏳   |
| screens/searchResult.js   | app/search/page.tsx        | ⏳   | ⏳   |
| screens/categories.js     | app/categories/page.tsx    | ⏳   | ⏳   |
| screens/categoryResult.js | app/category/[id]/page.tsx | ⏳   | ⏳   |

### 优先级 2: 交易流程

| 源文件                  | 目标文件                 | 状态 | 测试 |
| ----------------------- | ------------------------ | ---- | ---- |
| screens/shoppingCart.js | app/cart/page.tsx        | ⏳   | ⏳   |
| screens/checkout.js     | app/checkout/page.tsx    | ⏳   | ⏳   |
| screens/order.js        | app/orders/page.tsx      | ⏳   | ⏳   |
| screens/orderDetails.js | app/orders/[id]/page.tsx | ⏳   | ⏳   |
| screens/wallet.js       | app/wallet/page.tsx      | ⏳   | ⏳   |

### 优先级 3: 用户系统

| 源文件                     | 目标文件                      | 状态 | 测试 |
| -------------------------- | ----------------------------- | ---- | ---- |
| screens/Me.js              | app/profile/page.tsx          | ⏳   | ⏳   |
| screens/settings.js        | app/settings/page.tsx         | ⏳   | ⏳   |
| screens/profileSettings.js | app/settings/profile/page.tsx | ⏳   | ⏳   |

### 优先级 4: 聊天和高级功能

| 源文件                      | 目标文件                          | 状态 | 测试 |
| --------------------------- | --------------------------------- | ---- | ---- |
| screens/MatrixChats.js      | app/chat/page.tsx                 | ⏳   | ⏳   |
| screens/MatrixChatDetail.js | app/chat/[id]/page.tsx            | ⏳   | ⏳   |
| screens/BroadwayMarket.js   | app/rwa/page.tsx                  | ⏳   | ⏳   |
| screens/StoreCommunity.js   | app/store/[id]/community/page.tsx | ⏳   | ⏳   |

## 图例

| 符号 | 含义          |
| ---- | ------------- |
| ✅   | 完成          |
| 🔄   | 进行中        |
| ⏳   | 未开始        |
| ❌   | 已取消/不需要 |

---

最后更新: <!-- 自动更新时间 -->
