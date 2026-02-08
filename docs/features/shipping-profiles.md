# Shipping Profiles 配送档案系统设计文档

> 版本: 1.2  
> 最后更新: 2026-02-08  
> 状态: 已实现

## 1. 概述

### 1.1 背景

Mobazha 原有的配送系统采用 `ShippingOption` + `ShippingService` 的结构，包含复杂的"首重+续重"计费模式。为了提升用户体验和简化配置流程，我们对配送系统进行了重构，采用与 Shopify 对齐的 `Profile → Zone → Rate` 架构。

### 1.2 设计目标

1. **简单易用** - 移除复杂的"首重续重"计费模式，采用简单的固定费率
2. **与 Shopify 对齐** - 采用业界标准的配送档案架构，用户容易理解
3. **渐进式复杂度** - 基础功能简单，高级功能（如 Location Groups）按需显示
4. **无缝迁移** - 自动迁移旧版 `ShippingOption` 数据

## 2. 架构设计

### 2.1 数据模型层级

```
ShippingProfile (配送档案)
├── profileId: string          # 唯一标识
├── name: string               # 档案名称
├── isDefault: boolean         # 是否默认
├── zones: ShippingZone[]      # 配送区域列表
└── locationGroups?: LocationGroup[]  # 发货地点组（渐进式 UI）

ShippingZone (配送区域)
├── id: string                 # 唯一标识
├── name: string               # 区域名称 (如 "国内", "国际")
├── regions: string[]          # ISO 国家代码列表 (如 ["CN", "US"])
└── rates: ShippingRate[]      # 费率列表

ShippingRate (运费费率)
├── id: string                 # 唯一标识
├── name: string               # 费率名称 (如 "标准", "特快")
├── price: string              # 价格
├── currency: string           # 货币代码
├── estimatedDelivery?: string # 预计送达时间
└── freeShippingThreshold?: string  # 免邮门槛

ShippingLocation (发货地点)
├── id: string                 # 唯一标识
├── name: string               # 地点名称
├── address?: string           # 地址
└── isDefault: boolean         # 是否默认

LocationGroup (地点组) - 渐进式 UI
├── id: string                 # 唯一标识
├── locationIds: string[]      # 关联的发货地点 ID
└── zones: ShippingZone[]      # 该地点组的配送区域
```

### 2.2 与 Shopify 架构对比

| Shopify 概念     | Mobazha 实现     | 说明                            |
| ---------------- | ---------------- | ------------------------------- |
| Shipping Profile | ShippingProfile  | 完全对齐                        |
| Shipping Zone    | ShippingZone     | 完全对齐                        |
| Shipping Rate    | ShippingRate     | 支持基于重量/订单金额的条件费率 |
| Location         | ShippingLocation | 完全对齐                        |
| Location Group   | LocationGroup    | 渐进式 UI，仅多地点时显示       |

### 2.3 简化决策

**移除的功能：**

- 首重+续重计费模式（`FIRST_RENEWAL_FEE`）
- 复杂的 `ShippingService` 嵌套结构
- 承运商计算费率（暂不支持）

**保留的功能：**

- 固定费率配送
- 基于重量的条件费率
- 基于订单金额的条件费率
- 免邮门槛
- 多区域支持
- 多档案支持

## 3. 技术实现

### 3.1 后端 (Go/Protobuf)

#### 3.1.1 Protobuf 定义

```protobuf
// listing.proto
message Listing {
  // ... 其他字段 ...
  ShippingProfile shippingProfile = 13;  // 直接嵌入完整配送档案
}

message ShippingProfile {
  string profileID = 1;
  string name = 2;
  bool isDefault = 3;
  repeated ShippingZone zones = 4;
  repeated LocationGroup locationGroups = 5;
}

message ShippingZone {
  string id = 1;
  string name = 2;
  repeated string regions = 3;
  repeated ShippingRate rates = 4;
}

message ShippingRate {
  string id = 1;
  string name = 2;
  string price = 3;
  string currency = 4;
  string estimatedDelivery = 5;
  string freeShippingThreshold = 6;
}

message LocationGroup {
  string id = 1;
  repeated string locationIds = 2;
  repeated ShippingZone zones = 3;
}

message ShippingLocation {
  string id = 1;
  string name = 2;
  string address = 3;
  bool isDefault = 4;
}
```

#### 3.1.2 关键文件

| 文件路径                         | 说明                  |
| -------------------------------- | --------------------- |
| `pkg/orders/mbzpb/listing.proto` | Protobuf 定义         |
| `pkg/orders/mbzpb/listing.pb.go` | 生成的 Go 代码        |
| `pkg/models/preferences.go`      | 数据模型和转换函数    |
| `internal/core/listings.go`      | Listing 创建/更新逻辑 |
| `internal/core/preferences.go`   | 用户偏好和迁移逻辑    |

#### 3.1.3 数据转换

```go
// ConvertShippingProfileToProto 将 JSON 格式的 ShippingProfile 转换为 protobuf 格式
func ConvertShippingProfileToProto(profile *ShippingProfile) *pb.ShippingProfile {
    if profile == nil {
        return nil
    }
    pbProfile := &pb.ShippingProfile{
        ProfileID: profile.ProfileID,
        Name:      profile.Name,
        IsDefault: profile.IsDefault,
    }
    // 转换 Zones 和 LocationGroups...
    return pbProfile
}
```

### 3.2 前端 (TypeScript/React)

#### 3.2.1 类型定义

```typescript
// packages/core/types/shippingConfig.ts
export interface ShippingProfile {
  profileId: string;
  name: string;
  isDefault: boolean;
  zones?: ShippingZone[];
  locationGroups?: LocationGroup[];
}

export interface ShippingZone {
  id: string;
  name: string;
  regions: string[];
  rates: ShippingRate[];
}

export interface ShippingRate {
  id: string;
  name: string;
  price: string;
  currency: string;
  estimatedDelivery?: string;
  condition?: RateCondition; // 可选条件（基于重量或订单金额）
  freeShippingThreshold?: FreeShippingThreshold;
}

// 费率条件
export type RateConditionType = 'weight' | 'price';

export interface RateCondition {
  type: RateConditionType;
  minValue: number; // 最小值（重量为克，价格为最小单位）
  maxValue: number; // 最大值（0 表示无上限）
}
```

#### 3.2.2 关键文件

| 文件路径                                            | 说明                                 |
| --------------------------------------------------- | ------------------------------------ |
| `packages/core/types/shippingConfig.ts`             | 类型定义                             |
| `packages/core/types/product.ts`                    | Product 类型（包含 shippingProfile） |
| `packages/core/hooks/useShippingProfiles.ts`        | 配送档案管理 Hook                    |
| `packages/core/hooks/useListingForm.ts`             | Listing 表单 Hook                    |
| `apps/web/src/app/settings/store/shipping/page.tsx` | 配送设置页面                         |
| `apps/web/src/components/Shipping/`                 | 配送相关组件                         |

#### 3.2.3 UI 组件清单

| 组件                       | 文件                           | 说明                                  |
| -------------------------- | ------------------------------ | ------------------------------------- |
| `ShippingProfileCard`      | `ShippingProfileCard.tsx`      | 配送档案卡片，支持展开/折叠、内联编辑 |
| `ShippingZoneCard`         | `ShippingZoneCard.tsx`         | 配送区域卡片                          |
| `ShippingZoneForm`         | `ShippingZoneForm.tsx`         | 配送区域表单（创建/编辑区域和费率）   |
| `ShippingLocationCard`     | `ShippingLocationCard.tsx`     | 发货地点卡片                          |
| `ShippingLocationForm`     | `ShippingLocationForm.tsx`     | 发货地点表单                          |
| `RegionSelector`           | `RegionSelector.tsx`           | 地区选择器                            |
| `ShippingProfileSelector`  | `ShippingProfileSelector.tsx`  | 配送档案选择器（用于 Listing 编辑）   |
| `ShippingTemplateSelector` | `ShippingTemplateSelector.tsx` | 运费模板快速选择                      |
| `ServiceEditor`            | `ServiceEditor.tsx`            | 配送服务编辑器                        |
| `ShippingComparison`       | `ShippingComparison.tsx`       | 配送方案对比                          |
| `ShippingOptionCard`       | `ShippingOptionCard.tsx`       | 配送选项卡片                          |
| `ShippingOptionForm`       | `ShippingOptionForm.tsx`       | 配送选项表单（创建/编辑配送选项）     |

#### 3.2.3 Hook 使用示例

```typescript
import { useShippingProfiles } from '@mobazha/core';

function ShippingSettings() {
  const {
    profiles,
    isLoading,
    addProfile,
    updateProfile,
    deleteProfile,
    addZone,
    updateZone,
    deleteZone,
  } = useShippingProfiles();

  // 使用...
}
```

### 3.3 数据流

```
┌─────────────────────────────────────────────────────────────┐
│                        用户界面                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Profile Card│  │ Zone Card   │  │ Rate Editor │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          │                                  │
│  ┌───────────────────────▼───────────────────────┐         │
│  │        useShippingProfiles Hook               │         │
│  │  - profiles, zones, rates 状态管理             │         │
│  │  - CRUD 操作                                   │         │
│  └───────────────────────┬───────────────────────┘         │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                       API 层                                 │
│  profileApi.getSettings() / profileApi.setSettings()         │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                     后端 (Go)                                │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ preferences.go  │  │   listings.go   │                   │
│  │ (存储档案)       │  │ (关联到商品)     │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
│           │                    │                            │
│           └────────┬───────────┘                            │
│                    │                                        │
│  ┌─────────────────▼─────────────────┐                     │
│  │     ConvertShippingProfileToProto │                     │
│  │     (JSON → Protobuf)              │                     │
│  └─────────────────┬─────────────────┘                     │
│                    │                                        │
│  ┌─────────────────▼─────────────────┐                     │
│  │         IPFS / Database           │                     │
│  └───────────────────────────────────┘                     │
└──────────────────────────────────────────────────────────────┘
```

## 4. 数据迁移

### 4.1 自动迁移策略

对于使用旧版 `ShippingOption` 的用户，系统会自动将其迁移到新的 `ShippingProfile` 格式：

```go
// MigrateFromLegacyShippingOptions 将旧版 ShippingOption 迁移到 ShippingProfile
func (prefs *UserPreferences) MigrateFromLegacyShippingOptions() {
    if len(prefs.ShippingOptions) == 0 {
        return
    }

    // 创建默认配送档案
    defaultProfile := &ShippingProfile{
        ProfileID: generateUUID(),
        Name:      "Default Shipping",
        IsDefault: true,
        Zones:     make([]*ShippingZone, 0),
    }

    // 转换每个 ShippingOption 为 ShippingZone
    for _, opt := range prefs.ShippingOptions {
        zone := migrateOptionToZone(opt)
        defaultProfile.Zones = append(defaultProfile.Zones, zone)
    }

    prefs.ShippingProfiles = []*ShippingProfile{defaultProfile}
    prefs.ShippingOptions = nil // 清除旧数据
}
```

### 4.2 迁移映射规则

| 旧字段 (ShippingOption)        | 新字段 (ShippingZone/Rate)       |
| ------------------------------ | -------------------------------- |
| `name`                         | `zone.name`                      |
| `regions`                      | `zone.regions`                   |
| `currency`                     | `rate.currency`                  |
| `services[].name`              | `rate.name`                      |
| `services[].firstFreight`      | `rate.price`                     |
| `services[].estimatedDelivery` | `rate.estimatedDelivery`         |
| `freeShippingThreshold`        | `rates[0].freeShippingThreshold` |

## 5. UI 设计

### 5.1 配送设置页面结构

```
配送档案设置页面
├── 页面标题 + 添加档案按钮
├── 迁移提示横幅 (如有旧数据)
├── 档案列表
│   ├── 配送档案卡片 (可展开)
│   │   ├── 档案名称
│   │   ├── 默认标记
│   │   ├── 操作菜单 (重命名/删除/设为默认)
│   │   └── 展开区域
│   │       ├── 配送区域卡片
│   │       │   ├── 区域名称
│   │       │   ├── 覆盖地区
│   │       │   ├── 费率列表
│   │       │   └── 编辑/删除按钮
│   │       └── 添加区域按钮
│   └── 空状态 (无档案时显示模板选择器)
│
└── 发货地点管理区域 (仅档案模式显示)
    ├── 标题 + 添加地点按钮
    ├── 发货地点卡片列表
    │   ├── 地点名称
    │   ├── 地址 (可选)
    │   ├── 默认标记
    │   └── 操作按钮 (编辑/删除/设为默认)
    └── 空状态 (无地点时显示引导)
```

### 5.2 渐进式复杂度

**基础模式（单地点）：**

- 显示简单的 Profile → Zone → Rate 结构
- 隐藏 Location Groups 功能

**高级模式（多地点）：**

- 当用户添加多个发货地点时自动显示
- 支持为不同地点组设置不同的配送区域

## 6. 国际化

### 6.1 翻译键结构

```typescript
shipping: {
  // 配送档案
  shippingProfiles: 'Shipping Profiles',
  createProfile: 'Create Shipping Profile',
  // ...

  // 配送区域
  shippingZones: 'Shipping Zones',
  addZone: 'Add Shipping Zone',
  // ...

  // 运费费率
  shippingRates: 'Shipping Rates',
  addRate: 'Add Rate',
  // ...

  // 发货地点
  shippingLocations: 'Shipping Locations',
  addLocation: 'Add Location',
  // ...
}
```

### 6.2 支持的语言

- English (en)
- 中文 (zh)
- 其他语言待添加

## 7. API 参考

### 7.1 获取配送设置

```typescript
// GET /ob/settings
interface SettingsResponse {
  shippingProfiles?: ShippingProfile[];
  shippingLocations?: ShippingLocation[];
  shippingOptions?: ShippingOptionConfig[]; // 旧版，仅用于迁移
}
```

### 7.2 保存配送设置

```typescript
// POST /ob/settings
interface SettingsRequest {
  shippingProfiles?: ShippingProfile[];
  shippingLocations?: ShippingLocation[];
}
```

### 7.3 创建/更新 Listing

```typescript
// POST /ob/listing
interface ListingRequest {
  item: {
    /* ... */
  };
  metadata: {
    /* ... */
  };
  shippingProfile?: ShippingProfile; // 直接嵌入完整配送档案
}
```

## 8. 未来扩展

### 8.1 计划中的功能

1. **按重量计费** - 如有需求可添加简化版本
2. **按价格计费** - 基于订单金额的分层运费
3. **实时运费计算** - 接入第三方物流 API
4. **配送时间预估** - 基于距离和物流商的预估

### 8.2 扩展点

- `ShippingRate.condition` - 已支持基于重量和订单金额的条件（v1.2）
- `ShippingProfile.carriers` - 可添加物流商集成（承运商计算费率）
- `ShippingZone.excludedRegions` - 可添加排除地区功能

## 9. 常见问题

### Q1: 为什么移除"首重续重"计费模式？

"首重续重"模式增加了配置复杂度，但实际使用中大多数卖家都采用固定费率。Shopify 等主流平台也是采用简单的固定费率模式。

### Q2: 如何处理旧数据？

系统会自动检测旧版 `ShippingOption` 数据并提示用户迁移。迁移后，旧数据会被转换为新格式，原有费率信息保留。

### Q3: 为什么不使用 `shippingProfileID` 引用？

评估后发现 Profile ID 引用模式还没有实际应用场景，直接嵌入完整配送档案可以简化实现并避免额外的查找开销。

## 10. 变更历史

| 日期       | 版本 | 变更说明                                                          |
| ---------- | ---- | ----------------------------------------------------------------- |
| 2026-02-03 | 1.0  | 初始版本，完成基础架构重构                                        |
| 2026-02-03 | 1.1  | 添加发货地点管理 UI（ShippingLocationCard、ShippingLocationForm） |
| 2026-02-03 | 1.2  | 添加费率条件支持（基于重量/订单金额），更新 ShippingZoneForm UI   |
