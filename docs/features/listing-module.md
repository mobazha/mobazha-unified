# Listing 商品模块设计文档

> 版本: 3.0  
> 最后更新: 2026-02-08  
> 状态: 已实现（Shopify 风格全功能 — 含变体/优惠券/状态/尺寸/品牌/分类增强）

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

| 类型     | ContractType     | 特殊字段                                                     |
| -------- | ---------------- | ------------------------------------------------------------ |
| 物理商品 | `PHYSICAL_GOOD`  | 成色、重量(含单位)、包裹尺寸、品牌、库存策略、配送档案、变体 |
| 数字商品 | `DIGITAL_GOOD`   | 数字文件（下载交付）                                         |
| 服务     | `SERVICE`        | 无额外字段                                                   |
| RWA 代币 | `RWA_TOKEN`      | 区块链、代币地址、交易模式、接受币种                         |
| 加密货币 | `CRYPTOCURRENCY` | 加密货币代码                                                 |

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
| 数字文件        |       -       |      v       |    -    |     -     |       -        |
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

| 文件路径                                                    | 说明                                                              |
| ----------------------------------------------------------- | ----------------------------------------------------------------- |
| `apps/web/src/components/Listing/ProductTypeSelector.tsx`   | 商品类型选择器                                                    |
| `apps/web/src/components/Listing/BasicInfoSection.tsx`      | 基本信息区块（标题、描述、价格、成色、重量/单位、包裹尺寸、品牌） |
| `apps/web/src/components/Listing/MediaSection.tsx`          | 图片/视频上传区块（含图片 Alt Text 编辑）                         |
| `apps/web/src/components/Listing/DigitalFileSection.tsx`    | 数字商品文件上传/管理                                             |
| `apps/web/src/components/Listing/RwaTokenFields.tsx`        | RWA 代币专用字段                                                  |
| `apps/web/src/components/Listing/PhysicalGoodFields.tsx`    | 物理商品配送档案选择                                              |
| `apps/web/src/components/Listing/VariantOptionEditor.tsx`   | 变体选项编辑器（Shopify 风格折叠/建议）                           |
| `apps/web/src/components/Listing/VariantInventoryTable.tsx` | 变体库存表格（inline 编辑 + 批量操作）                            |
| `apps/web/src/components/Listing/CouponEditor.tsx`          | 优惠券编辑器（Shopify 风格折扣码/有效期）                         |
| `apps/web/src/components/ui/TokenInput.tsx`                 | 通用 Token/Chip 输入组件                                          |

### 3.3 Hooks

| 文件路径                                    | 说明                      |
| ------------------------------------------- | ------------------------- |
| `packages/core/hooks/useListingForm.ts`     | 表单状态管理、验证、提交  |
| `packages/core/hooks/useStoreCategories.ts` | 店铺分类 + 预定义分类合并 |
| `packages/core/hooks/useProducts.ts`        | 商品列表/详情获取         |

### 3.6 工具函数与数据

| 文件路径                              | 说明                                       |
| ------------------------------------- | ------------------------------------------ |
| `packages/core/utils/variantUtils.ts` | 笛卡尔积、SKU 合并、验证、Shopify 限制常量 |
| `packages/core/data/categories.ts`    | 预定义商品分类常量（按分组组织）           |

### 3.4 API

| 文件路径                                 | 说明               |
| ---------------------------------------- | ------------------ |
| `packages/core/services/api/products.ts` | 商品 CRUD API 封装 |

### 3.5 类型

| 文件路径                                | 说明                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `packages/core/types/product.ts`        | Product、ProductSku、Coupon、WeightUnit、InventoryPolicy、DimensionUnit 等类型 |
| `packages/core/hooks/useListingForm.ts` | ListingFormData、SkuItem、VariantOption、DigitalFile 表单数据接口              |

## 4. 关键数据结构

### 4.1 ListingFormData（表单状态）

```typescript
interface ListingFormData {
  // 基础信息
  slug?: string;
  title: string;
  shortDescription: string;
  description: string;
  price: string;
  compareAtPrice: string; // 划线价
  pricingCurrency: string;
  contractType: ContractType;
  status: ListingStatus; // 'draft' | 'published' | 'private'

  // 物理商品字段
  condition?: ProductCondition;
  grams?: number;
  weightUnit: WeightUnit; // 'g' | 'kg' | 'lb' | 'oz'
  inventoryPolicy: InventoryPolicy; // 'deny' | 'continue'
  packageLength?: number;
  packageWidth?: number;
  packageHeight?: number;
  dimensionUnit: DimensionUnit; // 'cm' | 'in'
  brand?: string;

  // RWA Token 字段
  blockchain?: BlockchainNetwork;
  tokenAddress?: string;
  tokenStandard?: string;
  cryptoListingCurrencyCode?: string;
  minQuantity?: number;
  maxQuantity?: number;
  acceptedCurrencies?: string[];

  // 媒体
  images: Image[]; // Image 含 alt 字段
  introVideo?: string;
  altIntroVideoLinks?: string[];

  // 分类 & 标签
  tags: string[];
  categories: string[];

  // 配送档案
  shippingProfile?: ShippingProfile;

  // 变体和库存
  options: VariantOption[];
  skus: SkuItem[];
  inventoryTracking: boolean;

  // 数字商品文件
  digitalFiles: DigitalFile[];

  // 其他
  optionalFeatures: OptionalFeature[];
  coupons: Coupon[];
  termsAndConditions: string;
  refundPolicy: string;
  nsfw: boolean;
  processingTime: string;
}
```

### 4.2 SkuItem（变体库存项，Shopify 风格绝对定价）

```typescript
interface SkuItem {
  productID: string;
  selections: { option: string; variant: string }[];
  price: string; // 变体绝对价格（不填则使用基础价格）
  compareAtPrice: string; // 划线价/原价（展示折扣用）
  quantity: number; // 库存数量，-1 = 无限
  images: Image[];
  barcode: string; // 条码（UPC/EAN/ISBN）
  weight: number; // 变体重量（克），覆盖 item.grams
}
```

### 4.3 Coupon（优惠券，Shopify 风格扁平结构）

```typescript
interface Coupon {
  title: string;
  discountCode?: string; // 折扣码（明文）
  hash?: string; // 折扣码哈希
  discountType?: 'PERCENT' | 'FIXED'; // 折扣类型
  percentDiscount?: number; // 百分比折扣（0-100，100 = 免费）
  priceDiscount?: string; // 固定金额折扣
  usageLimit?: number; // 最大使用次数，0 = 无限
  startsAt?: string; // 生效时间（ISO 8601）
  expiresAt?: string; // 过期时间（ISO 8601）
  minimumOrderAmount?: string; // 最低订单金额
}
```

### 4.4 API 请求格式

`buildRequestData()`（`useListingForm` 内部函数，不对外暴露）将 `ListingFormData` 转换为后端 `Product` 格式：

- `title` -> `item.title`
- `shortDescription` -> `item.shortDescription`（非空时发送）
- `description` -> `item.description`
- `price` -> `item.price`（parseFloat）
- `compareAtPrice` -> `item.regularPrice`（非空时发送）
- `images` -> `item.images`（IPFS hash，含 alt 字段）
- `tags` -> `item.tags`
- `categories` -> `item.categories`
- `options` -> `item.options`（变体选项，仅物理商品）
- `skus` -> `item.skus`（SKU 列表，quantity 转 string）
- `condition` -> `item.condition`（仅物理商品）
- `grams` -> `item.grams`（仅物理商品）
- `weightUnit` -> `item.weightUnit`（非默认 'g' 时发送）
- `inventoryPolicy` -> `item.inventoryPolicy`（非默认 'deny' 时发送）
- `packageLength/Width/Height` -> `item.packageLength/Width/Height`（大于 0 时发送）
- `dimensionUnit` -> `item.dimensionUnit`（非默认 'cm' 时发送）
- `brand` -> `item.brand`（非空时发送）
- `coupons` -> `coupons`（按 discountType 只发 percentDiscount 或 priceDiscount）
- `shippingProfile` -> `shippingProfile`（完整配送档案对象，仅物理商品）
- `status` -> `status`（'draft' / 'published' / 'private'）
- `contractType` -> `metadata.contractType`
- `pricingCurrency` -> `metadata.pricingCurrency`

## 5. 变体管理（Shopify 风格）

### 5.1 概述

变体系统参考 Shopify 实现，采用 **选项 + 笛卡尔积** 模型：

- 最多 3 个选项（如颜色、尺寸、材质）
- 每个选项可有多个值
- 自动生成所有组合的 SKU
- 每个 SKU 有独立的 **绝对价格**（非加价/surcharge）

### 5.2 数据流

```
VariantOptionEditor (编辑选项)
  → updateVariantOptions(newOptions)
    → mergeSkus(currentSkus, newOptions, basePrice)
      → 笛卡尔积生成新组合
      → 保留已有 SKU 的用户输入
      → 为新组合创建默认 SKU
    → 同步更新 formData.options + formData.skus
  → VariantInventoryTable (编辑 SKU 属性)
    → updateSkus(newSkus)
```

### 5.3 组件: VariantOptionEditor

- **初始状态**: 显示 Shopify 风格预设选项建议（尺寸、颜色、材质、款式）+ 自定义按钮
- **折叠式编辑**: 每个选项可展开/折叠，折叠时显示值数量和值摘要
- **Chip 输入**: 变体值以 chip 形式展示，支持回车添加、点击删除
- **排序**: 上下箭头调整选项顺序
- **验证**: 超过限制时显示错误（最多 3 选项、100 组合、名称不重复）

### 5.4 组件: VariantInventoryTable

- **Inline 编辑**: 表格内直接编辑价格、划线价、库存、条码、重量
- **批量编辑**: Checkbox 多选 → 批量设置字段值（Shopify bulk editor 模式）
- **价格逻辑**: SKU 价格留空时使用基础价格，placeholder 显示基础价格
- **无限库存**: 库存留空或 -1 = 无限（显示 ∞）

### 5.5 工具: variantUtils.ts

| 函数                       | 说明                                  |
| -------------------------- | ------------------------------------- |
| `generateCartesianProduct` | 选项组合笛卡尔积生成                  |
| `getSkuKey`                | SKU 唯一键（基于排序后的 selections） |
| `mergeSkus`                | 智能合并 SKU（保留用户输入+增删组合） |
| `createDefaultSku`         | 创建默认 SKU                          |
| `validateVariantOptions`   | 验证 Shopify 限制                     |
| `getVariantLabel`          | 生成变体标签（如 "Red / S"）          |

### 5.6 Shopify 限制常量

| 常量                       | 值  | 说明           |
| -------------------------- | --- | -------------- |
| `MAX_VARIANT_OPTIONS`      | 3   | 最大选项数     |
| `MAX_VARIANT_COMBINATIONS` | 100 | 最大组合数     |
| `MAX_OPTION_VALUES`        | 100 | 单选项最大值数 |

## 6. 优惠券管理（Shopify 风格）

### 6.1 概述

优惠券系统参考 Shopify Discount 功能，采用扁平结构，支持百分比折扣和固定金额折扣。

### 6.2 组件: CouponEditor

- **折叠式管理**: 每个优惠券可展开编辑，折叠时显示折扣码和折扣金额摘要
- **折扣类型切换**: Segmented control 切换百分比/固定金额（% / $ 图标）
- **折扣码**: 自动转大写，类 Shopify 体验
- **有效期**: 开始/结束 datetime-local 选择器
- **限制设置**: 最低订单金额 + 最大使用次数
- **空状态**: 无优惠券时显示引导 CTA

### 6.3 后端对齐

Proto 定义（`listing.proto`）中的 `Coupon` 已从 `oneof` 结构改为扁平字段：

| Proto 字段           | 说明         | 类型             |
| -------------------- | ------------ | ---------------- |
| `title`              | 优惠券名称   | string           |
| `hash`               | 折扣码哈希   | string           |
| `discountCode`       | 折扣码明文   | string           |
| `discountType`       | 折扣类型     | PERCENT \| FIXED |
| `percentDiscount`    | 百分比折扣   | float            |
| `priceDiscount`      | 固定金额折扣 | string           |
| `usageLimit`         | 最大使用次数 | int32            |
| `startsAt`           | 生效时间     | Timestamp        |
| `expiresAt`          | 过期时间     | Timestamp        |
| `minimumOrderAmount` | 最低订单金额 | string           |

## 7. TokenInput 组件

### 7.1 概述

通用的 Token/Chip 输入组件，同时用于标签和分类输入。

### 7.2 Props

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

### 7.3 使用场景

| 场景     | suggestions  | prefix |  normalize  |    createLabel    |
| -------- | :----------: | :----: | :---------: | :---------------: |
| 标签输入 |      -       |  `#`   | 小写+连字符 |         -         |
| 分类输入 | 店铺已有分类 |   -    |      -      | `创建 "{{name}}"` |

### 7.4 交互行为

- **添加**: Enter / 逗号键添加 token
- **删除**: Backspace 键删除最后一个 token，点击 x 删除指定 token
- **导航**: 上下箭头键在建议列表中导航
- **关闭**: Esc 键或点击外部关闭下拉
- **过滤**: 输入时自动过滤建议列表，排除已选中项
- **创建**: 输入值不在建议列表中时，显示"创建新项"选项

### 7.5 标签规范化规则

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

## 8. 分类自动补全

### 8.1 数据来源

分类建议由两个来源合并而成：

1. **预定义分类** - `packages/core/data/categories.ts` 中按分组组织的通用电商分类（Electronics、Fashion、Home 等）
2. **店铺已有分类** - 从卖家自己的商品列表中提取

```
useStoreCategories Hook
  ├── 预定义分类: PREDEFINED_CATEGORIES (from packages/core/data/categories.ts)
  ├── 店铺分类: useUserStore → peerID → productsApi.getStoreListingIndex(peerID)
  │             → flatMap(product.categories) → Set 去重 → sort()
  └── 合并: storeCategories ∪ PREDEFINED_CATEGORIES → Set 去重 → sort()
  └── 返回 { categories, storeCategories, isLoading }
```

### 8.2 闭环流程

```
创建/编辑页输入分类
  → 保存到商品 categories[]
  → 店铺页面 useMemo 提取
  → FilterSidebar 左侧展示为筛选项
  → useStoreCategories 获取
  → 下次创建/编辑时作为建议（合并预定义分类）
```

**关键**: 分类是自由文本，通过预定义分类和自动补全建议来维护一致性。店铺自有分类在合并列表中优先显示。

### 8.3 相关文件

| 文件路径                                          | 说明                              |
| ------------------------------------------------- | --------------------------------- |
| `packages/core/data/categories.ts`                | 预定义分类常量（分组 + 扁平列表） |
| `packages/core/hooks/useStoreCategories.ts`       | 店铺分类 + 预定义分类合并         |
| `apps/web/src/app/store/[peerId]/page.tsx`        | 店铺页面分类提取和筛选            |
| `apps/web/src/components/store/FilterSidebar.tsx` | 桌面端分类筛选侧边栏              |
| `apps/web/src/components/store/FilterSheet.tsx`   | 移动端分类筛选抽屉                |

## 9. 接口依赖

| 端点                        | 方法   | 说明                 |
| --------------------------- | ------ | -------------------- |
| `/ob/listing`               | POST   | 创建商品             |
| `/ob/listing`               | PUT    | 更新商品             |
| `/ob/listing/{slug}`        | GET    | 获取商品详情         |
| `/ob/listing/{slug}`        | DELETE | 删除商品             |
| `/ob/listings`              | GET    | 获取当前用户商品列表 |
| `/ob/listingindex/{peerID}` | GET    | 获取指定店铺商品索引 |

## 10. i18n 翻译键

所有翻译键位于 `listing` 命名空间下。主要分组：

| 分组     | 前缀                           | 示例                               |
| -------- | ------------------------------ | ---------------------------------- |
| 页面标题 | `listing.create/edit`          | `listing.createListing`            |
| 商品类型 | `listing.types.*`              | `listing.types.physicalGood`       |
| 导航标签 | `listing.tabs.*`               | `listing.tabs.general`             |
| 基本信息 | `listing.title/desc/price`     | `listing.titlePlaceholder`         |
| 成色选项 | `listing.conditions.*`         | `listing.conditions.new`           |
| 媒体     | `listing.photos/video`         | `listing.photosHelper`             |
| 图片Alt  | `listing.imageAlt.*`           | `listing.imageAlt.edit`            |
| 标签分类 | `listing.tags/category`        | `listing.enterTag`                 |
| 物流     | `listing.shipping*`            | `listing.shippingProfile`          |
| 变体     | `listing.variant.*`            | `listing.variant.optionName`       |
| 变体错误 | `listing.variant.error.*`      | `listing.variant.error.maxOptions` |
| 政策     | `listing.returnPolicy/terms`   | `listing.returnPolicyPlaceholder`  |
| 优惠券   | `listing.coupon.*`             | `listing.coupon.discountCode`      |
| 库存策略 | `listing.inventoryPolicy.*`    | `listing.inventoryPolicy.label`    |
| 包裹尺寸 | `listing.packageDimensions.*`  | `listing.packageDimensions.label`  |
| 品牌     | `listing.brand.*`              | `listing.brand.label`              |
| RWA      | `listing.rwa*`                 | `listing.blockchain`               |
| 操作状态 | `listing.create/update/delete` | `listing.createSuccess`            |

## 11. 扩展指南

### 11.1 添加新的商品类型

1. 在 `packages/core/types/product.ts` 中扩展 `ContractType`
2. 在 `ProductTypeSelector` 组件中添加新选项
3. 在页面的 `tabs` 数组中配置 `showFor` 条件
4. 在 `useListingForm.ts` 内部的 `buildRequestData()` 函数中处理新类型的数据转换
5. 添加对应的 i18n 翻译

### 11.2 添加新的表单区块

1. 创建新的 Section 组件（如 `NewSection.tsx`）
2. 在 `TabKey` 类型和 `tabs` 数组中添加新 tab
3. 在页面 JSX 中添加区块，使用 `ref={el => { sectionRefs.current.newKey = el; }}` 绑定
4. 在 `sectionRefs` 初始值中添加新 key
5. 按需配置 `showFor` 控制显示条件

### 11.3 给 TokenInput 添加新功能

| 需求              | 实现方式                                                     |
| ----------------- | ------------------------------------------------------------ |
| 限制最大数量      | 添加 `maxTokens` prop，在 `addToken` 中检查                  |
| 异步搜索建议      | 添加 `onSearch` prop，替代静态 `suggestions`                 |
| 分组建议          | 扩展 `suggestions` 为 `{ group: string; items: string[] }[]` |
| 自定义 token 渲染 | 添加 `renderToken` prop                                      |

### 11.4 分类系统升级路径

当前分类是自由文本 + 预定义分类建议。未来可能的升级路径：

1. ~~**预定义分类 + 自由文本**~~ ✅ 已实现（`packages/core/data/categories.ts`）
2. **层级分类** - 实现 `parentId` 支持树形分类（`ProductCategory.parentId` 类型已预留）
3. **服务端分类 API** - `getCategories()` 从后端获取，替代客户端预定义常量
4. **分组展示** - 在 TokenInput 下拉中按 `CATEGORY_GROUPS` 分组展示建议

## 12. 测试

### 12.1 单元测试

| 文件路径                                             | 说明                     |
| ---------------------------------------------------- | ------------------------ |
| `packages/core/__tests__/utils/variantUtils.test.ts` | 笛卡尔积、SKU 合并、验证 |

运行：`cd packages/core && npx vitest run __tests__/utils/variantUtils.test.ts`

### 12.2 E2E 测试

| 文件路径                                | 说明                         |
| --------------------------------------- | ---------------------------- |
| `apps/web/e2e/listing-variants.spec.ts` | 变体/优惠券创建编辑 E2E 测试 |

运行：`cd apps/web && npx playwright test listing-variants`

## 13. 迁移状态

- [x] 单页表单布局（替代向导）
- [x] 创建页实现
- [x] 编辑页实现
- [x] TokenInput 标签输入
- [x] TokenInput 分类输入 + 自动补全
- [x] useStoreCategories Hook
- [x] 配送档案集成 (Shopify 模式)
- [x] i18n 完整覆盖（en/zh）
- [x] 变体管理完整实现（Shopify 风格绝对定价）
- [x] 优惠券管理完整实现（Shopify 风格扁平结构，支持 100% 折扣）
- [x] 商品克隆功能完善（含 options/skus/coupons）
- [x] 单元测试（variantUtils）
- [x] E2E 测试框架（listing-variants.spec.ts）
- [x] 后端 Proto 对齐（SKU/Coupon/Option 重设计）
- [x] 商品状态管理（draft/published/private + 草稿/发布双按钮）
- [x] 短描述 + 产品级划线价（compareAtPrice）
- [x] 非变体 SKU/Barcode 字段
- [x] 富文本编辑器（RichTextEditor 替代 textarea）
- [x] 数字商品文件交付（DigitalFileSection）
- [x] 变体图片关联（VariantInventoryTable 图片列）
- [x] 处理时间结构化选择 + 退货政策模板
- [x] 重量单位选择（g/kg/lb/oz，Proto Item.weightUnit）
- [x] 库存策略（deny/continue，Proto Item.inventoryPolicy）
- [x] 图片 Alt Text（Proto Image.alt + MediaSection 编辑 UI）
- [x] 包裹尺寸（Proto Item.packageLength/Width/Height/dimensionUnit）
- [x] 品牌字段（Proto Item.brand）
- [x] 预定义分类 + 店铺分类合并建议
- [x] 价格输入货币符号前缀
- [x] 后端验证常量化（ListingStatus/WeightUnit/InventoryPolicy/DimensionUnit 公共常量）

## 14. 相关文档

- [配送档案系统](./shipping-profiles.md) - 配送档案的详细设计
- [Token Standard Guide](../TOKEN_STANDARD_GUIDE.md) - RWA 代币标准
- [UI 组件文档](./ui-components.md) - 通用 UI 组件
- [国际化文档](./i18n.md) - i18n 开发指南
