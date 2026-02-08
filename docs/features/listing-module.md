# Listing 商品模块设计文档

> 版本: 1.1  
> 最后更新: 2026-02-08  
> 状态: 已实现

## 1. 概述

### 1.1 背景

Listing 模块是 Mobazha 去中心化市场的核心功能，负责商品的创建、编辑、展示和管理。最初采用多步向导（Wizard）形式创建商品，后重构为 Shopify 风格的单页表单，提升桌面端信息密度和操作效率。

### 1.2 设计目标

1. **单页表单** - 桌面端多列布局，移动端单列 + 固定底部操作栏
2. **与 Shopify 对齐** - 参照业界标准的商品编辑体验
3. **代码复用** - 创建页和编辑页共享相同的组件和 Hook
4. **类型安全** - 完整的 TypeScript 类型覆盖
5. **多商品类型** - 支持物理商品、数字商品、服务、RWA 代币、加密货币

### 1.3 支持的商品类型

| 类型     | ContractType     | 特殊字段                             |
| -------- | ---------------- | ------------------------------------ |
| 物理商品 | `PHYSICAL_GOOD`  | 成色、重量、配送档案、变体           |
| 数字商品 | `DIGITAL_GOOD`   | 无额外字段                           |
| 服务     | `SERVICE`        | 无额外字段                           |
| RWA 代币 | `RWA_TOKEN`      | 区块链、代币地址、交易模式、接受币种 |
| 加密货币 | `CRYPTOCURRENCY` | 加密货币代码                         |

## 2. 架构设计

### 2.1 数据流

```
用户输入
  ↓
useListingForm (Hook)
  ├── formData: ListingFormData     # 表单状态
  ├── validate()                     # 验证
  └── submit()                       # 提交（内部调用 buildRequestData 转换为 API 格式）
  ↓
productsApi.createListing / updateListing
  ↓
后端 API (POST /ob/listing)
  ↓
店铺商品列表
  ↓
店铺页面 FilterSidebar (分类筛选)
```

### 2.2 页面结构（桌面端）

```
┌─────────────────────────────────────────────────────┐
│ Header                                               │
├──────────┬──────────────────────────────────────────┤
│ 左侧导航  │ 主内容区                                  │
│ (sticky) │                                          │
│          │ ┌──────────────────────────────────────┐ │
│ ● 基本信息│ │ 商品类型选择                          │ │
│ ○ 图片   │ └──────────────────────────────────────┘ │
│ ○ 标签   │ ┌──────────────────────────────────────┐ │
│ ○ 分类   │ │ 基本信息（标题、描述、价格、成色...）   │ │
│ ○ 物流   │ └──────────────────────────────────────┘ │
│ ○ 变体   │ ┌──────────────────────────────────────┐ │
│ ○ 政策   │ │ 图片 / 视频上传                       │ │
│ ○ 优惠券 │ └──────────────────────────────────────┘ │
│ ○ 其他   │ ┌──────────────────────────────────────┐ │
│          │ │ 标签 (TokenInput)                     │ │
│ ┌──────┐ │ └──────────────────────────────────────┘ │
│ │预览卡│ │ ┌──────────────────────────────────────┐ │
│ │ 片  │ │ │ 分类 (TokenInput + 自动补全)          │ │
│ └──────┘ │ └──────────────────────────────────────┘ │
│          │                                          │
│ [发布]   │ ... 物流、变体、政策、优惠券、其他 ...    │
│ [取消]   │                                          │
├──────────┴──────────────────────────────────────────┤
│ Footer                                               │
└─────────────────────────────────────────────────────┘
```

### 2.3 条件渲染逻辑

根据 `formData.contractType` 条件渲染不同的表单区块：

| 区块            | PHYSICAL_GOOD | DIGITAL_GOOD | SERVICE | RWA_TOKEN | CRYPTOCURRENCY |
| --------------- | :-----------: | :----------: | :-----: | :-------: | :------------: |
| 商品类型选择    |       v       |      v       |    v    |     v     |       v        |
| 基本信息        |       v       |      v       |    v    |  简化版   |       v        |
| RWA 代币字段    |       -       |      -       |    -    |     v     |       -        |
| 图片/视频       |       v       |      v       |    v    |     v     |       v        |
| 标签            |       v       |      v       |    v    |     v     |       v        |
| 分类            |       v       |      v       |    v    |     v     |       v        |
| 物流 (配送档案) |       v       |      -       |    -    |     -     |       -        |
| 变体            |       v       |      -       |    -    |     -     |       -        |
| 退货政策/条款   |       v       |      v       |    v    |     -     |       -        |
| 优惠券          |       v       |      v       |    v    |     -     |       -        |
| 其他设置        |       v       |      v       |    v    |     -     |       -        |

## 3. 核心文件

### 3.1 页面

| 文件路径                                        | 说明       |
| ----------------------------------------------- | ---------- |
| `apps/web/src/app/listing/new/page.tsx`         | 创建商品页 |
| `apps/web/src/app/listing/edit/[slug]/page.tsx` | 编辑商品页 |

### 3.2 组件

| 文件路径                                                  | 说明                                   |
| --------------------------------------------------------- | -------------------------------------- |
| `apps/web/src/components/Listing/ProductTypeSelector.tsx` | 商品类型选择器                         |
| `apps/web/src/components/Listing/BasicInfoSection.tsx`    | 基本信息区块（标题、描述、价格、成色） |
| `apps/web/src/components/Listing/MediaSection.tsx`        | 图片/视频上传区块                      |
| `apps/web/src/components/Listing/RwaTokenFields.tsx`      | RWA 代币专用字段                       |
| `apps/web/src/components/Listing/PhysicalGoodFields.tsx`  | 物理商品配送档案选择                   |
| `apps/web/src/components/ui/TokenInput.tsx`               | 通用 Token/Chip 输入组件               |

### 3.3 Hooks

| 文件路径                                    | 说明                     |
| ------------------------------------------- | ------------------------ |
| `packages/core/hooks/useListingForm.ts`     | 表单状态管理、验证、提交 |
| `packages/core/hooks/useStoreCategories.ts` | 从店铺商品提取已有分类   |
| `packages/core/hooks/useProducts.ts`        | 商品列表/详情获取        |

### 3.4 API

| 文件路径                                 | 说明               |
| ---------------------------------------- | ------------------ |
| `packages/core/services/api/products.ts` | 商品 CRUD API 封装 |

### 3.5 类型

| 文件路径                                | 说明                                         |
| --------------------------------------- | -------------------------------------------- |
| `packages/core/types/product.ts`        | Product、ProductItem、ProductListItem 等类型 |
| `packages/core/hooks/useListingForm.ts` | ListingFormData 表单数据接口                 |

## 4. 关键数据结构

### 4.1 ListingFormData（表单状态）

```typescript
interface ListingFormData {
  slug?: string;
  title: string;
  description: string;
  price: string;
  pricingCurrency: string;
  contractType: ContractType;
  condition?: ProductCondition;
  grams?: number;
  // RWA 专用
  blockchain?: BlockchainNetwork;
  tokenAddress?: string;
  tokenStandard?: string;
  cryptoListingCurrencyCode?: string;
  minQuantity?: number;
  maxQuantity?: number;
  acceptedCurrencies?: string[];
  // 媒体
  images: Image[];
  introVideo?: string;
  altIntroVideoLinks?: string[];
  // 分类 & 标签
  tags: string[];
  categories: string[];
  // 配送
  shippingProfile?: ShippingProfile;
  // 变体
  options: VariantOption[];
  skus: SkuItem[];
  inventoryTracking: boolean;
  // 其他
  optionalFeatures: OptionalFeature[];
  coupons: Coupon[];
  termsAndConditions: string;
  refundPolicy: string;
  nsfw: boolean;
  processingTime: string;
}
```

### 4.2 API 请求格式

`buildRequestData()`（`useListingForm` 内部函数，不对外暴露）将 `ListingFormData` 转换为后端 `Product` 格式：

- `title` -> `item.title`
- `price` -> `item.pricingCurrency + item.price`（带格式化）
- `images` -> `item.images`（IPFS hash）
- `tags` -> `item.tags`
- `categories` -> `item.categories`
- `shippingProfile` -> `shippingProfile`（完整配送档案对象）
- `contractType` -> `metadata.contractType`
- `condition` -> `metadata.condition`

## 5. TokenInput 组件

### 5.1 概述

通用的 Token/Chip 输入组件，同时用于标签和分类输入。

### 5.2 Props

```typescript
interface TokenInputProps {
  tokens: string[]; // 已选中的 token
  onTokensChange: (tokens: string[]) => void; // 变化回调
  suggestions?: string[]; // 自动补全建议列表
  placeholder?: string; // 占位文本
  prefix?: string; // token 显示前缀（如 '#'）
  normalize?: (input: string) => string; // 输入规范化
  createLabel?: string; // "创建新项"文本模板
  className?: string; // 容器类名
  tokenClassName?: string; // token chip 样式
}
```

### 5.3 使用场景

| 场景     | suggestions  | prefix |  normalize  |    createLabel    |
| -------- | :----------: | :----: | :---------: | :---------------: |
| 标签输入 |      -       |  `#`   | 小写+连字符 |         -         |
| 分类输入 | 店铺已有分类 |   -    |      -      | `创建 "{{name}}"` |

### 5.4 交互行为

- **添加**: Enter / 逗号键添加 token
- **删除**: Backspace 键删除最后一个 token，点击 x 删除指定 token
- **导航**: 上下箭头键在建议列表中导航
- **关闭**: Esc 键或点击外部关闭下拉
- **过滤**: 输入时自动过滤建议列表，排除已选中项
- **创建**: 输入值不在建议列表中时，显示"创建新项"选项

### 5.5 标签规范化规则

```typescript
// 来源：桌面端 Selectize.js 配置
input
  .trim()
  .toLowerCase() // 全部小写
  .replace(/#/g, '') // 去除 #
  .replace(/\s+/g, '-') // 空格转连字符
  .replace(/-{2,}/g, '-') // 合并多个连字符
  .replace(/^-|-$/g, ''); // 去除首尾连字符
```

## 6. 分类自动补全

### 6.1 数据来源

```
useStoreCategories Hook
  └── useUserStore → peerID
  └── productsApi.getStoreListingIndex(peerID)
  └── flatMap(product.categories) → Set 去重 → sort()
  └── 返回 string[]
```

### 6.2 闭环流程

```
创建/编辑页输入分类
  → 保存到商品 categories[]
  → 店铺页面 useMemo 提取
  → FilterSidebar 左侧展示为筛选项
  → useStoreCategories 获取
  → 下次创建/编辑时作为建议
```

**关键**: 分类是自由文本，不依赖预定义分类表。一致性通过自动补全建议来维护。

### 6.3 相关文件

| 文件路径                                          | 说明                   |
| ------------------------------------------------- | ---------------------- |
| `packages/core/hooks/useStoreCategories.ts`       | 提取店铺已有分类       |
| `apps/web/src/app/store/[peerId]/page.tsx`        | 店铺页面分类提取和筛选 |
| `apps/web/src/components/store/FilterSidebar.tsx` | 桌面端分类筛选侧边栏   |
| `apps/web/src/components/store/FilterSheet.tsx`   | 移动端分类筛选抽屉     |

## 7. 接口依赖

| 端点                        | 方法   | 说明                 |
| --------------------------- | ------ | -------------------- |
| `/ob/listing`               | POST   | 创建商品             |
| `/ob/listing`               | PUT    | 更新商品             |
| `/ob/listing/{slug}`        | GET    | 获取商品详情         |
| `/ob/listing/{slug}`        | DELETE | 删除商品             |
| `/ob/listings`              | GET    | 获取当前用户商品列表 |
| `/ob/listingindex/{peerID}` | GET    | 获取指定店铺商品索引 |

## 8. i18n 翻译键

所有翻译键位于 `listing` 命名空间下。主要分组：

| 分组     | 前缀                           | 示例                              |
| -------- | ------------------------------ | --------------------------------- |
| 页面标题 | `listing.create/edit`          | `listing.createListing`           |
| 商品类型 | `listing.types.*`              | `listing.types.physicalGood`      |
| 导航标签 | `listing.tabs.*`               | `listing.tabs.general`            |
| 基本信息 | `listing.title/desc/price`     | `listing.titlePlaceholder`        |
| 成色选项 | `listing.conditions.*`         | `listing.conditions.new`          |
| 媒体     | `listing.photos/video`         | `listing.photosHelper`            |
| 标签分类 | `listing.tags/category`        | `listing.enterTag`                |
| 物流     | `listing.shipping*`            | `listing.shippingProfile`         |
| 变体     | `listing.variants*`            | `listing.addVariant`              |
| 政策     | `listing.returnPolicy/terms`   | `listing.returnPolicyPlaceholder` |
| 优惠券   | `listing.coupons*`             | `listing.addCoupon`               |
| RWA      | `listing.rwa*`                 | `listing.blockchain`              |
| 操作状态 | `listing.create/update/delete` | `listing.createSuccess`           |

## 9. 扩展指南

### 9.1 添加新的商品类型

1. 在 `packages/core/types/product.ts` 中扩展 `ContractType`
2. 在 `ProductTypeSelector` 组件中添加新选项
3. 在页面的 `tabs` 数组中配置 `showFor` 条件
4. 在 `useListingForm.ts` 内部的 `buildRequestData()` 函数中处理新类型的数据转换
5. 添加对应的 i18n 翻译

### 9.2 添加新的表单区块

1. 创建新的 Section 组件（如 `NewSection.tsx`）
2. 在 `TabKey` 类型和 `tabs` 数组中添加新 tab
3. 在页面 JSX 中添加区块，使用 `ref={el => { sectionRefs.current.newKey = el; }}` 绑定
4. 在 `sectionRefs` 初始值中添加新 key
5. 按需配置 `showFor` 控制显示条件

### 9.3 给 TokenInput 添加新功能

| 需求              | 实现方式                                                     |
| ----------------- | ------------------------------------------------------------ |
| 限制最大数量      | 添加 `maxTokens` prop，在 `addToken` 中检查                  |
| 异步搜索建议      | 添加 `onSearch` prop，替代静态 `suggestions`                 |
| 分组建议          | 扩展 `suggestions` 为 `{ group: string; items: string[] }[]` |
| 自定义 token 渲染 | 添加 `renderToken` prop                                      |

### 9.4 分类系统升级路径

当前分类是自由文本。未来可能的升级路径：

1. **预定义分类 + 自由文本** - 添加平台级分类目录，同时保留自由输入
2. **层级分类** - 实现 `parentId` 支持树形分类（`ProductCategory.parentId` 类型已预留）
3. **服务端分类 API** - `getCategories()` 从后端获取，替代客户端提取

## 10. 迁移状态

- [x] 单页表单布局（替代向导）
- [x] 创建页实现
- [x] 编辑页实现
- [x] TokenInput 标签输入
- [x] TokenInput 分类输入 + 自动补全
- [x] useStoreCategories Hook
- [x] 配送档案集成 (Shopify 模式)
- [x] i18n 完整覆盖（en/zh）
- [ ] 变体管理完整实现
- [ ] 优惠券管理完整实现
- [ ] 商品克隆功能完善
- [ ] 单元测试
- [ ] E2E 测试

## 11. 相关文档

- [配送档案系统](./shipping-profiles.md) - 配送档案的详细设计
- [Token Standard Guide](../TOKEN_STANDARD_GUIDE.md) - RWA 代币标准
- [UI 组件文档](./ui-components.md) - 通用 UI 组件
- [国际化文档](./i18n.md) - i18n 开发指南
