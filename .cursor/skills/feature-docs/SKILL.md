---
name: feature-docs
description: '功能文档索引。查阅 listing/钱包/配送/主题/i18n/账号绑定/settings 等模块的设计文档。触发词："功能文档", "feature docs", "功能设计", "这个模块是怎么设计的".'
---

# 功能文档索引（Feature Docs Index）

## 触发条件

当用户提到以下内容时使用：

- "功能文档"、"feature docs"、"功能设计"、"feature design"
- "查看 listing/商品/钱包/配送/主题/i18n/账号绑定/settings 的设计文档"
- "这个模块是怎么设计的"
- 开发新功能或修改现有功能时需要了解设计背景

## 概述

`docs/features/` 目录下维护着各核心模块的详细设计文档，包含架构设计、数据结构、API 接口、组件清单、i18n 键、迁移状态等信息。开发前应先查阅相关文档，确保实现与整体设计一致。

## 文档索引

### 核心功能模块

| 文档              | 路径                                  | 涵盖内容                                                        | 关联 Skill                          |
| ----------------- | ------------------------------------- | --------------------------------------------------------------- | ----------------------------------- |
| **商品模块**      | `docs/features/listing-module.md`     | 商品创建/编辑、表单架构、5 种商品类型、TokenInput、分类自动补全 | `component-dev`, `ecommerce-ux`     |
| **配送档案**      | `docs/features/shipping-profiles.md`  | Shopify 风格的 Profile→Zone→Rate 架构、后端 Protobuf、数据迁移  | `component-dev`                     |
| **钱包集成**      | `docs/features/wallet-integration.md` | Reown AppKit、useWallet Hook、多链支持、Escrow 合约             | `web3-guide`                        |
| **账号绑定**      | `docs/features/account-binding.md`    | 多 OAuth 账号绑定（Discord/Telegram/Google 等）、Casdoor 集成   | `security-guide`                    |
| **Settings 重构** | `docs/features/settings-redesign.md`  | Shopify 风格页面模式重构、5 Phase 改造计划、AI-Ready 设计       | `component-dev`, `desktop-ux-guide` |

### 基础设施模块

| 文档         | 路径                             | 涵盖内容                                           | 关联 Skill      |
| ------------ | -------------------------------- | -------------------------------------------------- | --------------- |
| **国际化**   | `docs/features/i18n.md`          | useI18n Hook、9 种语言、翻译键规范、新语言添加流程 | `i18n-guide`    |
| **主题系统** | `docs/features/theme-system.md`  | 6 种预设主题、亮暗模式、CSS 变量、防闪烁           | `design-tokens` |
| **UI 组件**  | `docs/features/ui-components.md` | shadcn/ui 组件清单、自定义组件、导入路径           | `component-dev` |

### 元文件

| 文档         | 路径                         | 说明                 |
| ------------ | ---------------------------- | -------------------- |
| **文档模板** | `docs/features/_template.md` | 新功能文档的标准模板 |
| **迁移状态** | `docs/migrations/status.md`  | 各模块迁移完成度追踪 |

## 使用指南

### 1. 开发新功能前

```
1. 检查 docs/features/ 是否有对应文档
2. 有 → 阅读文档，了解架构设计和已有实现
3. 无 → 使用 _template.md 创建新文档，在开发完成后补充
```

### 2. 修改现有功能时

```
1. 阅读对应的 feature doc，确认修改不偏离设计意图
2. 完成修改后，同步更新文档中的：
   - 文件路径（如有新增/移动）
   - 数据结构（如有字段变更）
   - API 接口（如有新增/修改）
   - 迁移状态（如有进展）
   - 版本号和更新日期
```

### 3. 文档与 Skill 的关系

Feature docs 提供**模块级详细设计**（具体到文件路径、数据结构、API 端点），而 Skills 提供**跨模块开发规范**（如代码风格、组件开发模式、安全实践）。两者互补：

- **Feature docs** → "这个模块怎么实现的，涉及哪些文件"
- **Skills** → "实现时应遵循什么规范和最佳实践"

### 4. 创建新文档

使用模板 `docs/features/_template.md`，确保包含：

- 功能 ID、版本、状态
- 架构设计和数据流
- 核心文件路径清单
- 关键数据结构
- API 接口
- i18n 翻译键
- 迁移检查清单

## 各文档关键信息速查

### listing-module.md 要点

- **核心 Hook**: `packages/core/hooks/useListingForm.ts`（表单状态、验证、提交）
- **商品类型**: PHYSICAL_GOOD、DIGITAL_GOOD、SERVICE、RWA_TOKEN、CRYPTOCURRENCY
- **页面**: `apps/web/src/app/listing/new/page.tsx` 和 `edit/[slug]/page.tsx`
- **注意**: `buildRequestData()` 是 `useListingForm` 内部函数，不对外暴露

### shipping-profiles.md 要点

- **类型定义**: `packages/core/types/shippingConfig.ts`（不是 shipping.ts）
- **核心 Hook**: `packages/core/hooks/useShippingProfiles.ts`
- **组件目录**: `apps/web/src/components/Shipping/`（12 个组件）
- **后端**: Protobuf 定义在 `pkg/orders/mbzpb/listing.proto`

### wallet-integration.md 要点

- **核心 Hook**: `packages/core/hooks/useWallet.ts`（基于 AppKit）
- **服务目录**: `packages/core/services/payment/`（不是 wallet/）
- **Escrow**: 独立在 `escrow.ts`，不在 useWallet 中
- **Provider**: 必须在 `AppKitProvider` 内使用

### account-binding.md 要点

- **服务**: `packages/core/services/auth/accountBinding.ts`
- **支持的 OAuth**: Discord、Telegram、Google、GitHub、Apple、WeChat
- **认证中心**: Casdoor

### i18n.md 要点

- **核心 Hook**: `packages/core/hooks/useI18n.ts`
- **翻译文件**: `packages/core/i18n/locales/{en,zh,ja,ko,es,fr,de,ru,pt}.ts`
- **额外导出**: `language`/`setLanguage`（locale 别名）、`supportedLocales`、`localeInfo`

### theme-system.md 要点

- **核心模块**: `packages/core/theme/`（types.ts, themes.ts, useTheme.ts）
- **6 种主题**: classic, crypto, business, cyberpunk, nature, luxury
- **防闪烁**: 内联脚本在 layout.tsx 中

### ui-components.md 要点

- **shadcn/ui**: `apps/web/src/components/ui/`（20+ 组件）
- **自定义组件**: `@mobazha/ui` 包
- **导入**: `import { Button } from '@/components/ui'`

### settings-redesign.md 要点

- **核心变更**: 从 SettingsDrawer 弹框模式迁移到 `/settings/*` 页面路由模式
- **布局**: Shopify Settings Layout — `SettingsSection` 组件，左列描述(2fr) + 右列表单卡片(5fr)
- **组件目录**: `apps/web/src/components/SettingsContent/`（各 Section 的内容组件）
- **布局组件**: `apps/web/src/components/SettingsLayout/`（SettingsSection, SaveBar, PageHeader）
- **Hooks**: `packages/core/hooks/use{Section}Settings.ts`（每个 Section 的业务逻辑）
- **5 Phase 改造**: P0 基础组件 → P1 General 样板 → P2 全部迁移 → P3 切换入口+清理 → P4 打磨 → P5 AI
- **Cursor Rule**: `.cursor/rules/settings-redesign.mdc`（改动 settings 文件时自动应用）
- **禁止**: 在 SettingsDrawer 中新增功能、使用 `openSettings()` 弹框
