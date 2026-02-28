---
name: pg-tier2-differentiation
description: 'Tier 2 差异化竞争力执行指南（PG-201~PG-206）。AI Store Builder、品牌化、AI 客服、收藏。触发词："差异化", "AI Store Builder", "Tier 2", "PG-201"~"PG-206", "AI 客服".'
---

# Tier 2: 差异化竞争力执行指南

> **目标**：构建 Shopify 做不到的能力，形成 Web3 Shopify 的竞争壁垒。
> **触发词**："差异化"、"AI Store Builder"、"Tier 2"、"PG-201"~"PG-206"
> **前置条件**：Tier 0 全部完成 + Tier 1 PG-101（AdminLayout）+ PG-110（AI 基础设施）完成

## PG-201: 店铺品牌化（Section-based）

### 目标

让每个卖家的店铺有独特的品牌形象，而不是千篇一律的模板。

### 技术方案

1. **Store Config Schema**

```typescript
// packages/core/types/storeConfig.ts
interface StoreConfig {
  theme: {
    primaryColor: string; // 品牌主色
    secondaryColor?: string; // 辅助色
    fontFamily: 'sans' | 'serif' | 'mono';
    borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  };
  sections: StoreSection[];
}

interface StoreSection {
  id: string;
  type: SectionType;
  props: Record<string, unknown>;
  visible: boolean;
}

type SectionType =
  | 'hero'
  | 'announcement-bar'
  | 'featured-products'
  | 'product-grid'
  | 'about'
  | 'trust-badges'
  | 'testimonials'
  | 'faq'
  | 'collections'
  | 'gallery'
  | 'rich-text'
  | 'contact';
```

2. **Section 组件库**

```
apps/web/src/components/store-sections/
├── HeroSection.tsx
├── FeaturedProductsSection.tsx
├── ProductGridSection.tsx
├── AboutSection.tsx
├── TestimonialsSection.tsx
├── CategoriesSection.tsx
├── GallerySection.tsx
├── RichTextSection.tsx
├── ContactSection.tsx
├── NewsletterSection.tsx
└── SectionRenderer.tsx         ← 根据 config 动态渲染
```

3. **配置存储**

Store config 存储在卖家的 Profile 扩展字段中（或独立 API 端点）。

4. **编辑器**

`/admin/settings/storefront` — 拖拽排序 Sections + 编辑 props + 主题色板选择。

### 实施顺序

1. 定义 Schema + 3 个核心 Section（Hero、ProductGrid、About）
2. SectionRenderer 组件
3. Store 页面根据 config 渲染（无 config 时使用默认）
4. Admin 编辑器（简单版：表单编辑，无拖拽）
5. 扩展到 10 个 Section + 拖拽排序

---

## PG-202: AI Store Builder（MVP）

### 目标

卖家用自然语言描述品牌 → AI 生成店铺配置 → 即时预览。

### 技术方案

1. **输入收集**
   - 品牌名称、描述、目标客户
   - 商品类型（实物/数字/服务/RWA）
   - 已上传的商品数据（自动分析）

2. **AI 生成**
   - 调用 LLM API（OpenAI/Claude/本地模型）
   - Prompt：品牌信息 + 可用 Section 列表 + Schema → 输出 StoreConfig JSON
   - 可选：Vision model 分析商品图片 → 推荐色板

3. **即时预览**
   - 生成配置后实时渲染店铺预览
   - 卖家可对话式调整："Logo 再大一点"、"换成深色风格"

4. **实施步骤**
   - Step 1: 手动提供 3-5 个预设配置模板（作为 fallback）
   - Step 2: 接入 LLM 生成 StoreConfig
   - Step 3: 对话式调整
   - Step 4: 基于商品图片的智能推荐

### 关键决策

- LLM API 选择（考虑成本和隐私）
- 是否在客户端调用（API key 安全问题）→ 建议通过后端代理
- 离线 fallback → 预设模板

---

## PG-203: 收藏/愿望单

### 现状

`ProductDetail.tsx` 已有占位符：

```tsx
const [_isWishlist, _setIsWishlist] = useState(false);
const _handleToggleWishlist = useCallback(() => { ... }, []);
```

### 实施步骤

1. **后端 API 设计**（产品未上线，直接设计理想 API）
   - `POST /v1/wishlist/{slug}` — 添加收藏
   - `DELETE /v1/wishlist/{slug}` — 取消收藏
   - `GET /v1/wishlist` — 获取收藏列表
   - 数据持久化在后端，支持跨设备同步

2. **ProductDetail 集成**
   - 激活 wishlist 按钮（心形图标）
   - 点击切换收藏/取消收藏 + toast 反馈
   - 已收藏状态在页面加载时从 API 获取

3. **收藏列表页**
   - `/account/wishlist` — 展示已收藏商品
   - 商品卡片网格 + 移除操作
   - 降价提醒标记（Web3 特色：加密货币价格波动时等价法币变化）

---

## PG-204: 买家发现体验

### 问题

买家在 Mobazha 上只有主动搜索一种发现商品的方式，缺少被动发现（推荐）。

### 实施步骤

1. **"猜你喜欢"推荐**
   - 基于浏览历史和购买记录推荐商品
   - MVP：同类别随机推荐（无需 ML）
   - 集成到：商品详情页底部、购物车页底部、首页

2. **浏览历史**
   - 本地存储最近浏览的商品（localStorage，最多 50 条）
   - "最近浏览"组件 — 横向滚动商品卡片
   - 集成到：个人中心、首页

3. **相关商品**
   - 商品详情页底部 "You may also like"
   - 基于同卖家 + 同类别

4. **Recently Viewed 持久化**
   - MVP：localStorage
   - 后续：同步到用户账号

---

## PG-205: 智能通知中心

### 问题

当前通知系统（`NotificationDropdown`）是统一的，卖家和买家看到同样的界面。需要区分角色视图。

### 实施步骤

1. **Admin 通知视图**
   - `/admin/` 内的通知侧边栏/页面
   - 按优先级分类：新订单（紧急）、库存预警、差评提醒、新评价
   - 一键处理（如"确认订单"可直接从通知操作）

2. **买家订单状态推送**
   - 订单状态变更时的通知卡片
   - Escrow 状态变更提醒
   - 评价邀请（订单完成后 N 天）

3. **通知偏好设置**
   - `/admin/settings/notifications` — 卖家可配置哪些通知要接收

---

## PG-206: AI 客服助手

### 目标

买家在商品页或订单页可以即时获得常见问题的答案，无需等卖家回复。

### 用户场景

```
买家在商品页点击"问一下"
  → 弹出 AI 助手面板
  → 买家问："这个钱包能放多少张卡？"
  → AI 基于商品描述回答："根据商品描述，这款钱包有 6 个卡槽和 1 个零钱袋"
  → 如果 AI 无法回答 → "我帮你转给卖家" → 切换到 Matrix 聊天
```

### 实施步骤

1. **AI 客服面板** — `AIAssistantPanel`
   - 商品页右下角浮动按钮触发
   - 对话式 UI（复用 `AIConversation` 组件）
   - 上下文：当前商品描述 + 卖家政策 + 配送信息

2. **知识构建**
   - 自动从商品描述、店铺政策、配送设置、FAQ 构建上下文
   - System prompt：限制回答范围在商品/店铺信息内，不编造

3. **人工接管**
   - AI 不确定时显示"转给卖家"按钮
   - 点击后打开 Matrix 聊天，自动附带问题上下文

4. **卖家控制**
   - Admin 设置中可开关 AI 客服
   - 可补充自定义 FAQ 供 AI 参考

---

## 完成后更新

1. 更新 `docs/PROFESSIONAL_GRADE_ROADMAP.md` Section 9
2. 新组件文档化到 `docs/features/`
3. i18n key 更新
